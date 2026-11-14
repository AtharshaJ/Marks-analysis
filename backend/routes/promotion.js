
import express from 'express'
import supabase from '../supabase.js'
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

const validGroups = ['1-11', '12-13']

// Preview promotion
router.get('/preview/:group', verifySession, requireAdmin, async (req, res) => {
    try {
        const { group } = req.params

        if (!validGroups.includes(group)) {
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

        return res.json(data)

    } catch (error) {
        console.error('Promotion preview error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to generate promotion preview.'
        })
    }
})


// Execute promotion
router.post('/execute', verifySession, requireAdmin, async (req, res) => {
    try {
       const { group, examYear } = req.body

        if (!validGroups.includes(group)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid promotion group.'
            })
        }

        const currentYear = new Date().getFullYear()

if (
    !Number.isInteger(examYear) ||
    examYear < currentYear - 2 ||
    examYear > currentYear
) {
    return res.status(400).json({
        success: false,
        message: 'Invalid examination year.'
    })
}

        const { data, error } = await supabase.rpc(
            'execute_student_promotion',
            { p_group: group }
        )

        if (error) throw error

        return res.json({
            ...data,
            message: 'Student promotion completed successfully.'
        })

    } catch (error) {
        console.error('Promotion execution error:', error)

        return res.status(500).json({
            success: false,
            message: 'Promotion failed. No partial changes should have been committed.'
        })
    }
})

export default router
