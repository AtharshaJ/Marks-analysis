
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

// All student progress report routes require login
router.use(verifySession)

// Only employees can access student progress reports
const requireEmployee = (req, res, next) => {
    if (req.user?.type !== 'employee') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Employees only.'
        })
    }

    next()
}


router.get('/:classId/students/:studentId', requireEmployee, async (req, res) => {
    try {
        const { classId, studentId } = req.params
        const { termId } = req.query

        if (!termId || !Number.isInteger(Number(termId)) || Number(termId) <= 0) {
    return res.status(400).json({
        success: false,
        message: 'Invalid academic term selection.'
    })
}

        // Get class information
const numericClassId = Number(classId)

if (!Number.isInteger(numericClassId) || numericClassId <= 0) {
    return res.status(400).json({
        success: false,
        message: 'Invalid class selection.'
    })
}

const { data: classData, error: classError } = await supabase
    .from('class_divisions')
    .select('id, class_name, grade, division')
    .eq('id', numericClassId)
    .maybeSingle()

if (classError) throw classError

if (!classData) {
    return res.status(404).json({
        success: false,
        message: 'Class not found.'
    })
}

        // Get student information
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, index_number, student_name, class_id')
            .eq('id', studentId)
            .eq('class_id', classId)
            .single()

        if (studentError || !student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found in this class.'
            })
        }

        // Get selected academic term and year
        const { data: academicTerm, error: termError } = await supabase
            .from('academic_terms')
            .select(`
                id,
                term_name,
                term_number,
                academic_year_id,
                academic_years (
                    id,
                    year
                )
            `)
            .eq('id', termId)
            .single()

        if (termError || !academicTerm) {
            return res.status(404).json({
                success: false,
                message: 'Academic term not found.'
            })
        }

        
    
        // Get the student's registered subjects
        const grade = classData.grade
        let subjects = []

        // Grades 1–5: All Primary subjects
        if (grade >= 1 && grade <= 5) {
            const { data, error } = await supabase
                .from('subjects')
                .select('id, subject_name')
                .eq('subject_group', 'Primary')
                .order('subject_name')

            if (error) throw error

            subjects = (data || []).map(subject => ({
                subject_id: subject.id,
                al_subject_no: null,
                subject_name: subject.subject_name,
                subject_type: 'regular'
            }))
        }

        // Grades 6–9: Junior Secondary core + selected Aesthetics
        else if (grade >= 6 && grade <= 9) {
            const { data: coreSubjects, error: coreError } = await supabase
                .from('subjects')
                .select('id, subject_name')
                .eq('subject_group', 'Junior Secondary')
                .is('basket_id', null)

            if (coreError) throw coreError

            const { data: selectedSubjects, error: selectedError } = await supabase
                .from('student_basket_subjects')
                .select('subject_id')
                .eq('student_id', studentId)

            if (selectedError) throw selectedError

            const selectedIds = (selectedSubjects || [])
                .map(item => item.subject_id)

            let basketSubjects = []

            if (selectedIds.length > 0) {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('id, subject_name')
                    .eq('subject_group', 'Junior Secondary')
                    .in('id', selectedIds)

                if (error) throw error

                basketSubjects = data || []
            }

            subjects = [...(coreSubjects || []), ...basketSubjects]
                .map(subject => ({
                    subject_id: subject.id,
                    al_subject_no: null,
                    subject_name: subject.subject_name,
                    subject_type: 'regular'
                }))
        }

        // Grades 10–11: O/L core + selected basket subjects
        else if (grade >= 10 && grade <= 11) {
            const { data: coreSubjects, error: coreError } = await supabase
                .from('subjects')
                .select('id, subject_name')
                .eq('subject_group', 'OL')
                .is('basket_id', null)

            if (coreError) throw coreError

            const { data: selectedSubjects, error: selectedError } = await supabase
                .from('student_basket_subjects')
                .select('subject_id')
                .eq('student_id', studentId)

            if (selectedError) throw selectedError

            const selectedIds = (selectedSubjects || [])
                .map(item => item.subject_id)

            let basketSubjects = []

            if (selectedIds.length > 0) {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('id, subject_name')
                    .eq('subject_group', 'OL')
                    .in('id', selectedIds)

                if (error) throw error

                basketSubjects = data || []
            }

            subjects = [...(coreSubjects || []), ...basketSubjects]
                .map(subject => ({
                    subject_id: subject.id,
                    al_subject_no: null,
                    subject_name: subject.subject_name,
                    subject_type: 'regular'
                }))
        }

        // Grades 12–13: All Common + student's selected Choice subjects
        else if (grade >= 12 && grade <= 13) {
            const { data: selectedSubjects, error: selectedError } = await supabase
                .from('al_student_subjects')
                .select('subject_no')
                .eq('student_id', studentId)

            if (selectedError) throw selectedError

            const selectedSubjectNumbers = (selectedSubjects || [])
                .map(item => String(item.subject_no).trim())

            const { data: commonSubjects, error: commonError } = await supabase
                .from('al_subjects')
                .select('subject_no, subject_name, subject_type')
                .eq('subject_type', 'Common')

            if (commonError) throw commonError

            let choiceSubjects = []

            if (selectedSubjectNumbers.length > 0) {
                const { data, error } = await supabase
                    .from('al_subjects')
                    .select('subject_no, subject_name, subject_type')
                    .in('subject_no', selectedSubjectNumbers)
                    .eq('subject_type', 'Choice')

                if (error) throw error

                choiceSubjects = data || []
            }

            const allALSubjects = [
                ...(commonSubjects || []),
                ...choiceSubjects
            ]

            const uniqueSubjects = [
                ...new Map(
                    allALSubjects.map(subject => [
                        String(subject.subject_no).trim(),
                        subject
                    ])
                ).values()
            ]

            subjects = uniqueSubjects.map(subject => ({
                subject_id: null,
                al_subject_no: subject.subject_no,
                subject_name: subject.subject_name,
                subject_type: 'al',
                al_subject_type: subject.subject_type
            }))
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unsupported student grade.'
            })
        }

        subjects.sort((a, b) =>
            a.subject_name.localeCompare(b.subject_name)
        )



        // Get student's saved marks
        const { data: marks, error: marksError } = await supabase
            .from('student_marks')
            .select('id, subject_id, al_subject_no, marks')
            .eq('student_id', studentId)
            .eq('academic_term_id', termId)

        if (marksError) {
            throw marksError
        }

// Get all active students in the selected class
        const { data: classStudents, error: studentsError } = await supabase
            .from('students')
            .select('id')
            .eq('class_id', classId)
            .eq('is_active', true)

        if (studentsError) throw studentsError

        const classStudentIds = (classStudents || []).map(
            student => student.id
        )

        // Get subject registrations for students in this class
        let basketRegistrations = []
        let alRegistrations = []

        if (grade >= 6 && grade <= 11) {
            const { data, error } = await supabase
                .from('student_basket_subjects')
                .select('student_id, subject_id')
                .in('student_id', classStudentIds)

            if (error) throw error

            basketRegistrations = data || []
        }

        if (grade >= 12 && grade <= 13) {
            const { data, error } = await supabase
                .from('al_student_subjects')
                .select('student_id, subject_no')
                .in('student_id', classStudentIds)

            if (error) throw error

            alRegistrations = data || []
        }


        

        // Get marks for all students in this class and selected term
        let classMarks = []

        if (classStudentIds.length > 0) {
            const { data, error } = await supabase
                .from('student_marks')
                .select('student_id, subject_id, al_subject_no, marks')
                .in('student_id', classStudentIds)
                .eq('academic_term_id', termId)

            if (error) throw error

            classMarks = data || []
        }

        // Calculate the highest mark for each subject
        
        // Calculate the highest mark for each subject
        subjects = subjects.map(subject => {

            let registeredStudentIds = classStudentIds

            if (subject.subject_type === 'al') {

                // Common A/L subjects are available to everyone
                if (subject.al_subject_type === 'Choice') {
                    registeredStudentIds = alRegistrations
                        .filter(item =>
                            String(item.subject_no).trim() ===
                            String(subject.al_subject_no).trim()
                        )
                        .map(item => item.student_id)
                }

            } else {

                // Basket subjects are compared only among registered students.
                // Core subjects are compared among all active class students.
                const subjectRegistrations = basketRegistrations.filter(
                    item => item.subject_id === subject.subject_id
                )

                if (subjectRegistrations.length > 0) {
                    registeredStudentIds = subjectRegistrations.map(
                        item => item.student_id
                    )
                }
            }

            const matchingMarks = classMarks.filter(mark => {

                if (!registeredStudentIds.includes(mark.student_id)) {
                    return false
                }

                if (subject.subject_type === 'al') {
                    return (
                        String(mark.al_subject_no).trim() ===
                        String(subject.al_subject_no).trim()
                    )
                }

                return mark.subject_id === subject.subject_id
            })

            const highestMark = matchingMarks.length > 0
                ? Math.max(...matchingMarks.map(mark => Number(mark.marks)))
                : null

            return {
                ...subject,
                highest_mark: highestMark
            }
        })



     res.json({
    success: true,
    student,
    class: classData,
    academicTerm: {
        ...academicTerm,
        academic_year: academicTerm.academic_years
    },
    subjects,
    marks
})

    } catch (error) {
        console.error('Progress report error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve student progress report.'
        })
    }
})


export default router
