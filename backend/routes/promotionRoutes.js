
import express from 'express'
import supabase from '../supabase.js'

import {
    verifySession,
    requireAdmin
} from '../middleware/authMiddleware.js'

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
            { p_group: group }
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


// Execute student promotion
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
            {
                p_group: group,
                p_exam_year: examYear
            }
        )

        if (error) throw error

        return res.json(data)

    } catch (error) {
        console.error('Promotion execution error:', error)

        return res.status(500).json({
            success: false,
            message: 'Promotion failed. Please check the server logs.'
        })
    }
})

// Delete Scholarship examination records
router.delete('/clear-scholarship', verifySession, requireAdmin, async (req, res) => {
    try {
        // TODO: Add Scholarship deletion logic here

        return res.status(501).json({
            success: false,
            message: 'Scholarship deletion is not implemented yet.'
        })

    } catch (error) {
        console.error('Scholarship deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to delete Scholarship records.'
        })
    }
})

// Delete O/L examination records
router.delete('/clear-ol', verifySession, requireAdmin, async (req, res) => {
    try {
        // TODO: Add O/L deletion logic here

        return res.status(501).json({
            success: false,
            message: 'O/L deletion is not implemented yet.'
        })

    } catch (error) {
        console.error('O/L deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to delete O/L records.'
        })
    }
})

// Delete A/L examination records
router.delete('/clear-al', verifySession, requireAdmin, async (req, res) => {
    try {
        // TODO: Add A/L deletion logic here

        return res.status(501).json({
            success: false,
            message: 'A/L deletion is not implemented yet.'
        })

    } catch (error) {
        console.error('A/L deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to delete A/L records.'
        })
    }
})


// ========================================
// CLEAR SCHOLARSHIP EXAMINATION DATA
// ========================================

router.delete('/clear-scholarship', verifySession, requireAdmin, async (req, res) => {
    try {
        const { data: deletedRecords, error } = await supabase
            .from('scholarship_exam_results')
            .delete()
            .gte('exam_year', 2000)
            .select('exam_year')

        if (error) throw error

        return res.status(200).json({
            success: true,
            exam_type: 'Scholarship',
            deleted_count: deletedRecords.length,
            message: 'Scholarship examination data cleared successfully.'
        })

    } catch (error) {
        console.error('Scholarship deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to clear Scholarship examination data.'
        })
    }
})


// ========================================
// CLEAR O/L EXAMINATION DATA
// ========================================

router.delete('/clear-ol', verifySession, requireAdmin, async (req, res) => {
    try {
        // Get all O/L examination student IDs
        const { data: students, error: studentsError } = await supabase
            .from('ol_students')
            .select('id')

        if (studentsError) throw studentsError

        const studentIds = (students || []).map(student => student.id)

        let deletedResultsCount = 0
        let deletedStudentsCount = 0

        if (studentIds.length > 0) {
            // Delete grades first
            const { data: deletedResults, error: resultsError } = await supabase
                .from('ol_student_results')
                .delete()
                .in('student_id', studentIds)
                .select('student_id')

            if (resultsError) throw resultsError

            deletedResultsCount = deletedResults.length

            // Then delete O/L examination students
            const { data: deletedStudents, error: deleteStudentsError } =
                await supabase
                    .from('ol_students')
                    .delete()
                    .in('id', studentIds)
                    .select('id')

            if (deleteStudentsError) throw deleteStudentsError

            deletedStudentsCount = deletedStudents.length
        }

        return res.status(200).json({
            success: true,
            exam_type: 'O/L',
            deleted_students: deletedStudentsCount,
            deleted_results: deletedResultsCount,
            message: 'O/L examination data cleared successfully.'
        })

    } catch (error) {
        console.error('O/L deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to clear O/L examination data.'
        })
    }
})


// ========================================
// CLEAR A/L EXAMINATION DATA
// ========================================

router.delete('/clear-al', verifySession, requireAdmin, async (req, res) => {
    try {
        // Get all A/L examination student IDs
        const { data: students, error: studentsError } = await supabase
            .from('al_exam_students')
            .select('id')

        if (studentsError) throw studentsError

        const studentIds = (students || []).map(student => student.id)

        let deletedResultsCount = 0
        let deletedStudentsCount = 0

        if (studentIds.length > 0) {
            // Delete final results first
            const { data: deletedResults, error: resultsError } = await supabase
                .from('al_final_results')
                .delete()
                .in('student_id', studentIds)
                .select('student_id')

            if (resultsError) throw resultsError

            deletedResultsCount = deletedResults.length

            // Then delete A/L examination students
            const { data: deletedStudents, error: deleteStudentsError } =
                await supabase
                    .from('al_exam_students')
                    .delete()
                    .in('id', studentIds)
                    .select('id')

            if (deleteStudentsError) throw deleteStudentsError

            deletedStudentsCount = deletedStudents.length
        }

        return res.status(200).json({
            success: true,
            exam_type: 'A/L',
            deleted_students: deletedStudentsCount,
            deleted_results: deletedResultsCount,
            message: 'A/L examination data cleared successfully.'
        })

    } catch (error) {
        console.error('A/L deletion error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to clear A/L examination data.'
        })
    }
})



export default router
