
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get subject inclusion settings for a class
router.get('/:classId', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)

        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class selection.'
            })
        }

        // Get class information and assigned Class Teacher
        const { data: selectedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, grade, class_teacher_id')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Selected class does not exist.'
            })
        }

        const grade = Number(selectedClass.grade)

        // Grades 12–13 use automatic A/L subject inclusion rules
        if (grade >= 12 && grade <= 13) {
            return res.status(200).json({
                success: true,
                requiresManualSelection: false,
                isClassTeacher: false,
                settings: []
            })
        }

        if (grade < 1 || grade > 11) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported class grade.'
            })
        }

        // Get active students in this class
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', classId)
            .eq('is_active', true)

        if (studentError) throw studentError

        const studentIds = (students || []).map(student => student.id)

        let subjectIds = []

        if (studentIds.length > 0) {
            if (grade <= 5) {
                // Grades 1–5: All Primary subjects
                const { data, error } = await supabase
                    .from('subjects')
                    .select('id')
                    .eq('subject_group', 'Primary')

                if (error) throw error

                subjectIds = (data || []).map(subject => subject.id)

            } else {
                // Grades 6–11: Core + selected basket subjects
                const subjectGroup =
                    grade <= 9 ? 'Junior Secondary' : 'OL'

                const { data: coreSubjects, error: coreError } =
                    await supabase
                        .from('subjects')
                        .select('id')
                        .eq('subject_group', subjectGroup)
                        .is('basket_id', null)

                if (coreError) throw coreError

                const { data: selections, error: selectionError } =
                    await supabase
                        .from('student_basket_subjects')
                        .select('subject_id')
                        .in('student_id', studentIds)

                if (selectionError) throw selectionError

                subjectIds = [
                    ...(coreSubjects || []).map(subject => subject.id),
                    ...(selections || []).map(item => item.subject_id)
                ]
            }
        }

        subjectIds = [...new Set(subjectIds)]

        // Retrieve existing inclusion settings
        let settings = []

        if (subjectIds.length > 0) {
            const { data, error } = await supabase
                .from('class_subject_settings')
                .select('id, subject_id, include_in_total')
                .eq('class_id', classId)
                .in('subject_id', subjectIds)

            if (error) throw error

            settings = data || []

            // Create default settings for subjects without settings
            const existingIds = new Set(
                settings.map(item => Number(item.subject_id))
            )

            const missingIds = subjectIds.filter(
                id => !existingIds.has(Number(id))
            )

            if (missingIds.length > 0) {
                const newSettings = missingIds.map(subjectId => ({
                    class_id: classId,
                    subject_id: subjectId,
                    al_subject_no: null,
                    include_in_total: true
                }))

                const { data: inserted, error: insertError } = await supabase
                    .from('class_subject_settings')
                    .insert(newSettings)
                    .select('id, subject_id, include_in_total')

                if (insertError) throw insertError

                settings = [...settings, ...(inserted || [])]
            }
        }

        return res.status(200).json({
            success: true,
            requiresManualSelection: true,
            isClassTeacher:
                Number(selectedClass.class_teacher_id) ===
                Number(req.user.id),
            settings
        })

    } catch (error) {
        console.error('Subject settings retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve subject inclusion settings.'
        })
    }
})


// Update subject inclusion settings (Class Teacher only)
router.put('/:classId', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)
        const { subjectId, includeInTotal } = req.body

        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class selection.'
            })
        }

        if (
            !Number.isInteger(Number(subjectId)) ||
            Number(subjectId) <= 0 ||
            typeof includeInTotal !== 'boolean'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid subject ID and inclusion value are required.'
            })
        }

        // Verify the selected class and its assigned Class Teacher
        const { data: selectedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, grade, class_teacher_id')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Selected class does not exist.'
            })
        }

        const grade = Number(selectedClass.grade)

        // Manual selection is only available for Grades 1–11
        if (grade < 1 || grade > 11) {
            return res.status(400).json({
                success: false,
                message: 'Manual subject inclusion is only available for Grades 1–11.'
            })
        }

        // Only the assigned Class Teacher can make changes
        if (
            Number(selectedClass.class_teacher_id) !==
            Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Only the assigned Class Teacher can update subject inclusion settings.'
            })
        }

        // Verify that the subject belongs to this class
        const { data: setting, error: settingError } = await supabase
            .from('class_subject_settings')
            .select('id')
            .eq('class_id', classId)
            .eq('subject_id', Number(subjectId))
            .maybeSingle()

        if (settingError) throw settingError

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: 'Subject setting not found for this class.'
            })
        }

        // Update the inclusion setting
        const { data: updatedSetting, error: updateError } = await supabase
            .from('class_subject_settings')
            .update({
                include_in_total: includeInTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', setting.id)
            .select('id, subject_id, include_in_total')
            .single()

        if (updateError) throw updateError

        return res.status(200).json({
            success: true,
            message: 'Subject inclusion setting updated successfully.',
            setting: updatedSetting
        })

    } catch (error) {
        console.error('Subject settings update error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to update subject inclusion setting.'
        })
    }
})


export default router
