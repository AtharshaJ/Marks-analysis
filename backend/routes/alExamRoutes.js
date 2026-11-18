
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

// Check employee access
const requireEmployee = (req, res, next) => {
    if (req.user?.type !== 'employee') {
        return res.status(403).json({
            success: false,
            message: 'Employee access required.'
        })
    }

    next()
}

// ========================================
// GET AVAILABLE STREAMS
// ========================================

router.get('/streams', verifySession, requireEmployee, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('al_streams')
            .select('id, stream_name')
            .order('stream_name')

        if (error) throw error

        res.json({
            success: true,
            streams: data
        })
    } catch (error) {
        console.error('A/L streams error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to load streams.'
        })
    }
})


// ========================================
// GET SUBJECTS FOR A SELECTED STREAM
// ========================================

router.get('/subjects/:streamId', verifySession, requireEmployee, async (req, res) => {
    try {
        const streamId = Number(req.params.streamId)

        if (!Number.isInteger(streamId) || streamId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid stream.'
            })
        }

        const { data: commonSubjects, error: commonError } =
            await supabase
                .from('al_subjects')
                .select('subject_no, subject_name, subject_type')
                .eq('subject_type', 'Common')
                .order('subject_name')

        if (commonError) throw commonError

        const { data: assignments, error: assignmentError } =
            await supabase
                .from('al_stream_subjects')
                .select(`
                    subject_no,
                    al_subjects (
                        subject_no,
                        subject_name,
                        subject_type
                    )
                `)
                .eq('stream_id', streamId)

        if (assignmentError) throw assignmentError

        const choiceSubjects = assignments
            .map(item => item.al_subjects)
            .filter(subject => subject && subject.subject_type === 'Choice')
            .sort((a, b) =>
                a.subject_name.localeCompare(b.subject_name)
            )

        res.json({
            success: true,
            commonSubjects,
            choiceSubjects
        })
    } catch (error) {
        console.error('A/L subjects error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to load A/L subjects.'
        })
    }
})


// ========================================
// GET STUDENTS AND RESULTS FOR YEAR + STREAM
// ========================================

router.get('/:examYear/:streamId', verifySession, requireEmployee, async (req, res) => {
    try {
        const examYear = Number(req.params.examYear)
        const streamId = Number(req.params.streamId)

        if (
            !Number.isInteger(examYear) ||
            !Number.isInteger(streamId) ||
            streamId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid examination year or stream.'
            })
        }

        const { data: students, error: studentError } =
            await supabase
                .from('al_exam_students')
                .select(`
                    *,
                    al_streams (
                        stream_name
                    )
                `)
                .eq('exam_year', examYear)
.eq('stream_id', streamId)
.order('exam_index_number')

        if (studentError) throw studentError

        const studentIds = students.map(student => student.id)

        let results = []

        if (studentIds.length > 0) {
            const { data, error } = await supabase
                .from('al_final_results')
                .select('*')
                .in('student_id', studentIds)

            if (error) throw error

            results = data
        }

        res.json({
            success: true,
            count: students.length,
            students,
            results
        })
    } catch (error) {
        console.error('A/L students error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to load A/L examination records.'
        })
    }
})


// ========================================
// REGISTER A/L EXAMINATION STUDENT
// ========================================

router.post('/students', verifySession, requireEmployee, async (req, res) => {
    try {
        const {
    exam_year,
    exam_index_number,
    full_name,
    stream_id,
    subject_1_no,
    subject_2_no,
    subject_3_no
} = req.body

        if (
    !exam_year ||
    !exam_index_number?.trim() ||
    !full_name?.trim() ||
    !stream_id ||
    !subject_1_no ||
    !subject_2_no ||
    !subject_3_no
){
            return res.status(400).json({
                success: false,
                message: 'Please complete all required student details.'
            })
        }

        const selectedSubjects = [
            subject_1_no,
            subject_2_no,
            subject_3_no
        ]

        if (new Set(selectedSubjects).size !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Please select three different subjects.'
            })
        }

        // Check stream
        const { data: stream, error: streamError } =
            await supabase
                .from('al_streams')
                .select('id')
                .eq('id', stream_id)
                .maybeSingle()

        if (streamError) throw streamError

        if (!stream) {
            return res.status(400).json({
                success: false,
                message: 'Selected stream does not exist.'
            })
        }

        // Check that all three subjects belong to this stream
        const { data: assignments, error: assignmentError } =
            await supabase
                .from('al_stream_subjects')
                .select('subject_no')
                .eq('stream_id', stream_id)
                .in('subject_no', selectedSubjects)

        if (assignmentError) throw assignmentError

        if (assignments.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'One or more selected subjects are not available for this stream.'
            })
        }

        const { data, error } = await supabase
            .from('al_exam_students')
            .insert([{
                exam_year,
                exam_index_number: exam_index_number.trim(),
                full_name: full_name.trim(),
                stream_id,
                subject_1_no,
                subject_2_no,
                subject_3_no
            }])
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                   message: 'This examination index number is already registered for the selected examination year.'
                })
            }

            throw error
        }

        res.status(201).json({
            success: true,
            message: 'A/L student registered successfully.',
            student: data
        })
    } catch (error) {
        console.error('A/L registration error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to register A/L student.'
        })
    }
})


// ========================================
// SAVE OR UPDATE A/L FINAL RESULTS
// ========================================

router.post('/results', verifySession, requireEmployee, async (req, res) => {
    try {
        const {
            student_id,
            subject_1_grade,
            subject_2_grade,
            subject_3_grade,
            cgt_marks,
            general_english_grade,
            z_score,
            island_rank,
            district_rank
        } = req.body

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required.'
            })
        }

        const allowedGrades = ['A', 'B', 'C', 'S', 'W', 'AB']

        const grades = [
            subject_1_grade,
            subject_2_grade,
            subject_3_grade,
            general_english_grade
        ]

        for (const grade of grades) {
            if (
                grade !== undefined &&
                grade !== null &&
                grade !== '' &&
                !allowedGrades.includes(grade)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid grade entered.'
                })
            }
        }

        const optionalNumber = value =>
            value === '' || value === undefined || value === null
                ? null
                : Number(value)

        const cgtValue = optionalNumber(cgt_marks)
        const zScoreValue = optionalNumber(z_score)
        const islandRankValue = optionalNumber(island_rank)
        const districtRankValue = optionalNumber(district_rank)

        if (
            cgtValue !== null &&
            (!Number.isFinite(cgtValue) || cgtValue < 0 || cgtValue > 100)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Common General Test marks must be between 0 and 100.'
            })
        }

        if (
            zScoreValue !== null &&
            !Number.isFinite(zScoreValue)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Z-score.'
            })
        }

        for (const rank of [islandRankValue, districtRankValue]) {
            if (
                rank !== null &&
                (!Number.isInteger(rank) || rank <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Ranks must be positive whole numbers.'
                })
            }
        }

        // Check student exists
        const { data: student, error: studentError } =
            await supabase
                .from('al_exam_students')
                .select('id')
                .eq('id', student_id)
                .maybeSingle()

        if (studentError) throw studentError

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'A/L student not found.'
            })
        }

        const { data, error } = await supabase
            .from('al_final_results')
            .upsert([{
                student_id,
                subject_1_grade: subject_1_grade || null,
                subject_2_grade: subject_2_grade || null,
                subject_3_grade: subject_3_grade || null,
                cgt_marks: cgtValue,
                general_english_grade: general_english_grade || null,
                z_score: zScoreValue,
                island_rank: islandRankValue,
                district_rank: districtRankValue,
                updated_at: new Date().toISOString()
            }], {
                onConflict: 'student_id'
            })
            .select()
            .single()

        if (error) throw error

        res.json({
            success: true,
            message: 'A/L final results saved successfully.',
            result: data
        })
    } catch (error) {
        console.error('A/L results error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to save A/L final results.'
        })
    }
})

export default router
