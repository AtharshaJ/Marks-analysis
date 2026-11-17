
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()


// Get scholarship examination results for a selected year
router.get('/:examYear', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const examYear = Number(req.params.examYear)

        if (!Number.isInteger(examYear) || examYear < 2000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination year.'
            })
        }

        const { data: results, error } = await supabase
            .from('scholarship_exam_results')
            .select('*')
            .eq('exam_year', examYear)

        if (error) throw error

        const sortedResults = (results || []).sort((a, b) =>
            String(a.index_number).localeCompare(
                String(b.index_number),
                undefined,
                { numeric: true, sensitivity: 'base' }
            )
        )

        return res.status(200).json({
            success: true,
            count: sortedResults.length,
            results: sortedResults
        })

    } catch (error) {
        console.error('Scholarship results retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve scholarship results.'
        })
    }
})


// Add a scholarship examination result
router.post('/', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const { exam_year, index_number, student_name, marks } = req.body

        const examYear = Number(exam_year)
        const numericMarks = Number(marks)
        const cleanIndexNumber = String(index_number || '').trim()
        const cleanStudentName = String(student_name || '').trim()

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
            marks === '' ||
            marks === null ||
            marks === undefined ||
            !Number.isFinite(numericMarks) ||
            numericMarks < 0 ||
            numericMarks > 200
        ) {
            return res.status(400).json({
                success: false,
                message: 'Marks must be between 0 and 200.'
            })
        }

        const { data: result, error } = await supabase
            .from('scholarship_exam_results')
            .insert({
                exam_year: examYear,
                index_number: cleanIndexNumber,
                student_name: cleanStudentName,
                marks: numericMarks,
                created_by: req.user?.teacher_id || null
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This index number already exists for this examination year.'
                })
            }

            throw error
        }

        return res.status(201).json({
            success: true,
            message: 'Scholarship result added successfully.',
            result
        })

    } catch (error) {
        console.error('Scholarship result adding error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to add scholarship result.'
        })
    }
})


export default router
