
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

// GET all preserved A/L examination records
router.get('/', verifySession, requireEmployee, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('al_exam_results')
            .select('*')
            .order('exam_year', { ascending: false })
            .order('full_name', { ascending: true })

        if (error) throw error

        return res.json({
            success: true,
            students: data || []
        })

    } catch (error) {
        console.error('Fetch A/L results error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve A/L examination records.'
        })
    }
})

// UPDATE A/L examination results
router.put('/:id', verifySession, requireEmployee, async (req, res) => {
    try {
        const resultId = Number(req.params.id)

        const {
            exam_index_number,
            subject_1_grade,
            subject_2_grade,
            subject_3_grade,
            cgt_marks,
            general_english_grade,
            z_score,
            district_rank,
            island_rank
        } = req.body

        if (!Number.isInteger(resultId) || resultId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination record ID.'
            })
        }

        // Validate examination index number
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

        // Validate subject and General English grades
        const grades = [
            subject_1_grade,
            subject_2_grade,
            subject_3_grade,
            general_english_grade
        ]

        for (const grade of grades) {
            if (
                grade !== null &&
                grade !== undefined &&
                grade !== '' &&
                !validGrades.includes(grade)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Grades must be A, B, C, S, F or empty.'
                })
            }
        }

        // Validate numeric values
        const validateNumber = (value, fieldName, max = null) => {
            if (value === null || value === undefined || value === '') {
                return { valid: true, value: null }
            }

            const number = Number(value)

            if (
                !Number.isFinite(number) ||
                (max !== null && number > max)
            ) {
                return {
                    valid: false,
                    message: `Invalid ${fieldName}.`
                }
            }

            return { valid: true, value: number }
        }

        const cgt = validateNumber(cgt_marks, 'CGT marks', 100)
        const zScore = validateNumber(z_score, 'Z-score')

        const districtRank = validateNumber(
            district_rank,
            'district rank'
        )

        const islandRank = validateNumber(
            island_rank,
            'island rank'
        )

        if (!cgt.valid || !zScore.valid ||
            !districtRank.valid || !islandRank.valid) {
            return res.status(400).json({
                success: false,
                message:
                    cgt.message ||
                    zScore.message ||
                    districtRank.message ||
                    islandRank.message
            })
        }

        if (
            (districtRank.value !== null &&
                (!Number.isInteger(districtRank.value) ||
                    districtRank.value < 1)) ||
            (islandRank.value !== null &&
                (!Number.isInteger(islandRank.value) ||
                    islandRank.value < 1))
        ) {
            return res.status(400).json({
                success: false,
                message: 'Ranks must be positive whole numbers.'
            })
        }

        // Check that the permanent examination record exists
        const { data: existingRecord, error: fetchError } =
            await supabase
                .from('al_exam_results')
                .select('id')
                .eq('id', resultId)
                .maybeSingle()

        if (fetchError) throw fetchError

        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                message: 'A/L examination record not found.'
            })
        }

        // Update examination results
        const { data, error } = await supabase
            .from('al_exam_results')
            .update({
                exam_index_number:
                    exam_index_number?.trim() || null,

                subject_1_grade: subject_1_grade || null,
                subject_2_grade: subject_2_grade || null,
                subject_3_grade: subject_3_grade || null,

                cgt_marks: cgt.value,
                general_english_grade:
                    general_english_grade || null,

                z_score: zScore.value,
                district_rank: districtRank.value,
                island_rank: islandRank.value,

                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .select('*')
            .single()

        if (error) throw error

        return res.json({
            success: true,
            message: 'A/L examination results saved successfully.',
            student: data
        })

    } catch (error) {
        console.error('Update A/L results error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to save A/L examination results.'
        })
    }
})

export default router
