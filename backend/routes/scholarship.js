
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get Grade 5 students and their Scholarship results

// Get all Grade 5 students and their Scholarship results
router.get('/students', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        // Retrieve all active Grade 5 students with their class details
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select(`
                id,
                index_number,
                student_name,
                class_id,
                class_divisions!inner (
                    id,
                    grade,
                    division,
                    class_name
                )
            `)
            .eq('is_active', true)
            .eq('class_divisions.grade', 5)
            .order('index_number', { ascending: true })

        if (studentsError) throw studentsError

        // Retrieve previously saved Scholarship marks
        const studentIds = students.map(student => student.id)

        let results = []

        if (studentIds.length > 0) {
            const { data, error } = await supabase
                .from('scholarship_results')
                .select('student_id, marks')
                .in('student_id', studentIds)

            if (error) throw error

            results = data || []
        }

        const resultMap = new Map(
            results.map(result => [
                Number(result.student_id),
                result.marks
            ])
        )

        const studentsWithMarks = students.map(student => ({
            id: student.id,
            index_number: student.index_number,
            student_name: student.student_name,
            class_id: student.class_id,
            class_name: student.class_divisions.class_name,
            division: student.class_divisions.division,
            marks: resultMap.has(Number(student.id))
                ? resultMap.get(Number(student.id))
                : null
        }))

        return res.status(200).json({
            success: true,
            count: studentsWithMarks.length,
            students: studentsWithMarks
        })

    } catch (error) {
        console.error('Scholarship student retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve Scholarship student records.'
        })
    }
})



// Save or update a student's Scholarship marks
router.post('/:classId/students/:studentId/marks', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)
        const studentId = Number(req.params.studentId)
        const { marks } = req.body

        if (
            !Number.isInteger(classId) || classId <= 0 ||
            !Number.isInteger(studentId) || studentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class or student ID.'
            })
        }

        if (
            marks === null ||
            marks === undefined ||
            marks === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please enter the Scholarship marks.'
            })
        }

        const numericMark = Number(marks)

        if (
            !Number.isFinite(numericMark) ||
            numericMark < 0 ||
            numericMark > 200 ||
            !/^\d{1,3}(\.\d{1,2})?$/.test(String(marks).trim())
        ) {
            return res.status(400).json({
                success: false,
                message: 'Marks must be between 0 and 200 with up to two decimal places.'
            })
        }

        // Verify that the selected class is Grade 5
        const { data: classInfo, error: classError } = await supabase
            .from('class_divisions')
            .select('id, grade')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!classInfo || Number(classInfo.grade) !== 5) {
            return res.status(404).json({
                success: false,
                message: 'Grade 5 class not found.'
            })
        }

        // Verify that the student belongs to this class
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('id', studentId)
            .eq('class_id', classId)
            .eq('is_active', true)
            .maybeSingle()

        if (studentError) throw studentError

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found in this class.'
            })
        }

        // Insert a new result or update the existing result
        const { data: savedResult, error: saveError } = await supabase
            .from('scholarship_results')
            .upsert(
                {
                    student_id: studentId,
                    marks: numericMark,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'student_id'
                }
            )
            .select()
            .single()

        if (saveError) throw saveError

        return res.status(200).json({
            success: true,
            message: 'Scholarship marks saved successfully.',
            result: savedResult
        })

    } catch (error) {
        console.error('Scholarship marks saving error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to save Scholarship marks.'
        })
    }
})


export default router
