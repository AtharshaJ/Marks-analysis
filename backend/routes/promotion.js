
import express from 'express'
import supabase from '../supabase.js'
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Preview student promotion
router.get('/preview', verifySession, requireAdmin, async (req, res) => {
    try {
        const { group } = req.query

        if (!['1-11', '12-13'].includes(group)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid promotion group.'
            })
        }

        const { data, error } = await supabase.rpc(
            'preview_student_promotion',
            {
                p_group: group
            }
        )

        if (error) throw error

        return res.status(200).json({
            success: true,
            preview: data
        })

    } catch (error) {
        console.error('Promotion preview error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to generate the promotion preview.'
        })
    }
})


// Execute student promotion
router.post('/execute', verifySession, requireAdmin, async (req, res) => {
    try {
        const { group, examYear } = req.body

        if (!['1-11', '12-13'].includes(group)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid promotion group.'
            })
        }

        const numericYear = Number(examYear)

        if (
            !Number.isInteger(numericYear) ||
            numericYear < new Date().getFullYear() - 2 ||
            numericYear > new Date().getFullYear()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid examination year.'
            })
        }

        const { data, error } = await supabase.rpc(
            'execute_student_promotion',
            {
                p_group: group,
                p_exam_year: numericYear
            }
        )

        if (error) throw error

        if (!data?.success) {
            return res.status(400).json({
                success: false,
                message: 'Student promotion was not completed.'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Student promotion completed successfully.',
            summary: data
        })

    } catch (error) {
        console.error('Promotion execution error:', error)

        return res.status(500).json({
            success: false,
            message: error.message ||
                'Unable to execute student promotion.'
        })
    }
})

export default router
