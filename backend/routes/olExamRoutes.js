
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()


// Check whether the logged-in user is an employee
const checkEmployee = (req, res) => {
    if (req.user?.type !== 'employee') {
        res.status(403).json({
            success: false,
            message: 'Employee access required.'
        })

        return false
    }

    return true
}


// Get O/L common subjects and basket subjects
router.get('/subjects', verifySession, async (req, res) => {
    try {
        if (!checkEmployee(req, res)) return

        // Get the six common O/L subjects
        const { data: commonSubjects, error: commonError } = await supabase
            .from('subjects')
            .select('id, subject_name')
            .eq('subject_group', 'OL')
            .is('basket_id', null)
            .order('subject_name')

        if (commonError) throw commonError

        // Get all O/L basket subjects
        const { data: basketSubjects, error: basketError } = await supabase
            .from('subjects')
            .select(`
                id,
                subject_name,
                basket_id,
                subject_baskets (
                    basket_name,
                    group_id,
                    subject_groups (
                        group_name
                    )
                )
            `)
            .eq('subject_group', 'OL')
            .not('basket_id', 'is', null)
            .order('subject_name')

        if (basketError) throw basketError

        const baskets = {
            'Basket 1': [],
            'Basket 2': [],
            'Basket 3': []
        }

        ;(basketSubjects || []).forEach(subject => {
            const basket = subject.subject_baskets?.basket_name

            if (baskets[basket]) {
                baskets[basket].push({
                    id: subject.id,
                    subject_name: subject.subject_name
                })
            }
        })

        return res.status(200).json({
            success: true,
            commonSubjects: commonSubjects || [],
            baskets
        })

    } catch (error) {
        console.error('O/L subjects retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve O/L subjects.'
        })
    }
})


// Get O/L students and their results for a selected year
router.get('/year/:examYear', verifySession, async (req, res) => {
    try {
        if (!checkEmployee(req, res)) return

        const examYear = Number(req.params.examYear)

        if (!Number.isInteger(examYear) || examYear < 2000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination year.'
            })
        }

        // Get registered students
        const { data: students, error: studentsError } = await supabase
            .from('ol_students')
            .select(`
                id,
                exam_year,
                index_number,
                student_name,
                basket1_subject_id,
                basket2_subject_id,
                basket3_subject_id
            `)
            .eq('exam_year', examYear)

        if (studentsError) throw studentsError

        // Get all entered grades for these students
        const studentIds = (students || []).map(student => student.id)

        let results = []

        if (studentIds.length > 0) {
            const { data: grades, error: gradesError } = await supabase
                .from('ol_student_results')
                .select('student_id, subject_id, grade')
                .in('student_id', studentIds)

            if (gradesError) throw gradesError

            results = grades || []
        }

        // Sort students by index number
        const sortedStudents = (students || []).sort((a, b) =>
            String(a.index_number).localeCompare(
                String(b.index_number),
                undefined,
                { numeric: true, sensitivity: 'base' }
            )
        )

        return res.status(200).json({
            success: true,
            count: sortedStudents.length,
            students: sortedStudents,
            results
        })

    } catch (error) {
        console.error('O/L students retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve O/L students and results.'
        })
    }
})


// Register a new O/L student
router.post('/students', verifySession, async (req, res) => {
    try {
        if (!checkEmployee(req, res)) return

        const {
            exam_year,
            index_number,
            student_name,
            basket1_subject_id,
            basket2_subject_id,
            basket3_subject_id
        } = req.body

        const examYear = Number(exam_year)
        const cleanIndexNumber = String(index_number || '').trim()
        const cleanStudentName = String(student_name || '').trim()

        const subjectIds = [
            Number(basket1_subject_id),
            Number(basket2_subject_id),
            Number(basket3_subject_id)
        ]

        if (!Number.isInteger(examYear) || examYear < 2000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination year.'
            })
        }

        if (!cleanIndexNumber || !cleanStudentName) {
            return res.status(400).json({
                success: false,
                message: 'Index number and student name are required.'
            })
        }

        if (
            subjectIds.some(id => !Number.isInteger(id) || id <= 0) ||
            new Set(subjectIds).size !== 3
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select three different basket subjects.'
            })
        }

        // Check whether the selected subjects belong to the correct baskets
        const { data: selectedSubjects, error: subjectError } = await supabase
            .from('subjects')
            .select(`
                id,
                subject_group,
                basket_id,
                subject_baskets (
                    basket_name
                )
            `)
            .in('id', subjectIds)

        if (subjectError) throw subjectError

        const expectedBaskets = ['Basket 1', 'Basket 2', 'Basket 3']

        const validSelections = subjectIds.every((id, index) => {
            const subject = selectedSubjects?.find(item => item.id === id)

            return (
                subject &&
                subject.subject_group === 'OL' &&
                subject.subject_baskets?.basket_name === expectedBaskets[index]
            )
        })

        if (!validSelections || selectedSubjects?.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid subject from each O/L basket.'
            })
        }

        // Insert student
        const { data: student, error: insertError } = await supabase
            .from('ol_students')
            .insert({
                exam_year: examYear,
                index_number: cleanIndexNumber,
                student_name: cleanStudentName,
                basket1_subject_id: subjectIds[0],
                basket2_subject_id: subjectIds[1],
                basket3_subject_id: subjectIds[2],
                created_by: req.user?.teacher_id || null
            })
            .select()
            .single()

        if (insertError) {
            if (insertError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This index number already exists for this examination year.'
                })
            }

            throw insertError
        }

        return res.status(201).json({
            success: true,
            message: 'O/L student registered successfully.',
            student
        })

    } catch (error) {
        console.error('O/L student registration error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to register O/L student.'
        })
    }
})


// Add or update an O/L subject grade
router.post('/grades', verifySession, async (req, res) => {
    try {
        if (!checkEmployee(req, res)) return

        const { student_id, subject_id, grade } = req.body

        const studentId = Number(student_id)
        const subjectId = Number(subject_id)
        const cleanGrade = String(grade || '').trim().toUpperCase()

        const allowedGrades = ['A', 'B', 'C', 'S', 'W']

        if (
            !Number.isInteger(studentId) ||
            studentId <= 0 ||
            !Number.isInteger(subjectId) ||
            subjectId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student or subject.'
            })
        }

        if (!allowedGrades.includes(cleanGrade)) {
            return res.status(400).json({
                success: false,
                message: 'Grade must be A, B, C, S or W.'
            })
        }

        // Check whether this subject belongs to this student
        const { data: student, error: studentError } = await supabase
            .from('ol_students')
            .select(`
                id,
                basket1_subject_id,
                basket2_subject_id,
                basket3_subject_id
            `)
            .eq('id', studentId)
            .maybeSingle()

        if (studentError) throw studentError

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'O/L student not found.'
            })
        }

        // Get the six common subjects
        const { data: commonSubjects, error: commonError } = await supabase
            .from('subjects')
            .select('id')
            .eq('subject_group', 'OL')
            .is('basket_id', null)

        if (commonError) throw commonError

        const allowedSubjectIds = [
            ...(commonSubjects || []).map(subject => Number(subject.id)),
            Number(student.basket1_subject_id),
            Number(student.basket2_subject_id),
            Number(student.basket3_subject_id)
        ]

        if (!allowedSubjectIds.includes(subjectId)) {
            return res.status(400).json({
                success: false,
                message: 'This subject is not assigned to this student.'
            })
        }

        // Insert or update the grade
        const { data: result, error: saveError } = await supabase
            .from('ol_student_results')
            .upsert(
                {
                    student_id: studentId,
                    subject_id: subjectId,
                    grade: cleanGrade,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'student_id,subject_id'
                }
            )
            .select()
            .single()

        if (saveError) throw saveError

        return res.status(200).json({
            success: true,
            message: 'O/L grade saved successfully.',
            result
        })

    } catch (error) {
        console.error('O/L grade saving error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to save O/L grade.'
        })
    }
})


export default router
