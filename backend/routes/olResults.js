
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

const validGrades = ['A', 'B', 'C', 'S', 'F']

// Check that the logged-in user is an employee
const requireEmployee = (req, res, next) => {
    if (req.user?.type !== 'employee') {
        return res.status(403).json({
            success: false,
            message: 'Employee access required.'
        })
    }

    next()
}

// GET all preserved O/L examination records
router.get('/', verifySession, requireEmployee, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ol_exam_results')
            .select('*')
            .order('class_name', { ascending: true })
            .order('full_name', { ascending: true })

        if (error) throw error

        return res.json({
            success: true,
            students: data || []
        })

    } catch (error) {
        console.error('Fetch O/L results error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve O/L examination records.'
        })
    }
})

// UPDATE examination index number and nine subject grades
router.put('/:id', verifySession, requireEmployee, async (req, res) => {
    try {
        const resultId = Number(req.params.id)
        const { exam_index_number, grades } = req.body

        if (!Number.isInteger(resultId) || resultId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination record ID.'
            })
        }

        if (
            exam_index_number !== null &&
            exam_index_number !== undefined &&
            (typeof exam_index_number !== 'string' ||
                exam_index_number.length > 50)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination index number.'
            })
        }

        if (!Array.isArray(grades) || grades.length !== 9) {
            return res.status(400).json({
                success: false,
                message: 'Exactly nine subject grades are required.'
            })
        }

        // Retrieve the existing permanent record
        const { data: existingRecord, error: fetchError } = await supabase
            .from('ol_exam_results')
            .select('id, subject_results')
            .eq('id', resultId)
            .single()

        if (fetchError || !existingRecord) {
            return res.status(404).json({
                success: false,
                message: 'O/L examination record not found.'
            })
        }

        const existingSubjects = existingRecord.subject_results

        if (!Array.isArray(existingSubjects) || existingSubjects.length !== 9) {
            return res.status(400).json({
                success: false,
                message: 'The saved subject registrations are invalid.'
            })
        }

        // Validate and match grades using the original subject IDs
        const gradeMap = new Map()

        for (const item of grades) {
            const subjectId = Number(item.subject_id)
            const grade = item.grade === '' ? null : item.grade

            if (
                !Number.isInteger(subjectId) ||
                gradeMap.has(subjectId) ||
                (grade !== null && !validGrades.includes(grade))
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or duplicate subject grade information.'
                })
            }

            gradeMap.set(subjectId, grade)
        }

        const existingIds = existingSubjects.map(subject =>
            Number(subject.subject_id)
        )

        if (
            existingIds.some(id => !gradeMap.has(id)) ||
            gradeMap.size !== existingIds.length
        ) {
            return res.status(400).json({
                success: false,
                message: 'Submitted grades do not match the registered subjects.'
            })
        }

        // Preserve original subject details and update grades only
        const updatedSubjects = existingSubjects.map(subject => ({
            ...subject,
            grade: gradeMap.get(Number(subject.subject_id))
        }))

        const { data, error } = await supabase
            .from('ol_exam_results')
            .update({
                exam_index_number: exam_index_number?.trim() || null,
                subject_results: updatedSubjects,
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select('*')
            .single()

        if (error) throw error

        return res.json({
            success: true,
            message: 'O/L examination results saved successfully.',
            student: data
        })

    } catch (error) {
        console.error('Update O/L results error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to save O/L examination results.'
        })
    }
})

export default router
