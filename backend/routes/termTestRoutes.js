
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()


// Get available academic years and their terms
router.get('/academic-years', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const { data: academicYears, error } = await supabase
            .from('academic_years')
            .select(`
                id,
                year,
                is_active,
                academic_terms (
                    id,
                    term_number,
                    term_name
                )
            `)
            .order('year', { ascending: false })

        if (error) throw error

        const sortedYears = (academicYears || []).map(item => ({
            ...item,
            academic_terms: (item.academic_terms || []).sort(
                (a, b) => a.term_number - b.term_number
            )
        }))

        return res.status(200).json({
            success: true,
            academicYears: sortedYears
        })

    } catch (error) {
        console.error('Academic years retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve academic years.'
        })
    }
})

// Get students belonging to a selected class for Term Tests
router.get('/:classId/students', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)

        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class selection.'
            })
        }

        // Check whether the selected class exists
        const { data: selectedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, class_name, grade, division')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Selected class does not exist.'
            })
        }

        // Retrieve active students in the selected class
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, index_number, student_name')
            .eq('class_id', classId)
            .eq('is_active', true)

        if (studentError) throw studentError

        // Sort by index number (natural ascending order)
        const sortedStudents = (students || []).sort((a, b) =>
            String(a.index_number).localeCompare(
                String(b.index_number),
                undefined,
                { numeric: true, sensitivity: 'base' }
            )
        )

        return res.status(200).json({
            success: true,
            class: selectedClass,
            count: sortedStudents.length,
            students: sortedStudents
        })

    } catch (error) {
        console.error('Term test student list error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve students.'
        })
    }
})


// Get the subjects studied by an individual student
router.get('/:classId/students/:studentId/subjects', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)
        const studentId = Number(req.params.studentId)

        if (
            !Number.isInteger(classId) || classId <= 0 ||
            !Number.isInteger(studentId) || studentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class or student selection.'
            })
        }

        // Verify the selected class
        const { data: selectedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, class_name, grade')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Selected class does not exist.'
            })
        }

        // Verify that the student belongs to this class
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, index_number, student_name, class_id')
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

        const grade = selectedClass.grade
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

       // Grades 12–13: Common A/L subjects + student's selected Choice subjects
else if (grade >= 12 && grade <= 13) {

    // Get the student's selected A/L subjects
    const { data: selectedSubjects, error: selectedError } = await supabase
        .from('al_student_subjects')
        .select('subject_no')
        .eq('student_id', studentId)

    if (selectedError) throw selectedError

    const selectedSubjectNumbers = (selectedSubjects || []).map(item =>
        String(item.subject_no).trim()
    )

    // Retrieve all Common subjects
    const { data: commonSubjects, error: commonError } = await supabase
        .from('al_subjects')
        .select('subject_no, subject_name, subject_type')
        .eq('subject_type', 'Common')

    if (commonError) throw commonError

    // Retrieve the student's selected Choice subjects
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

    // Combine Common and selected Choice subjects
    const allALSubjects = [
        ...(commonSubjects || []),
        ...choiceSubjects
    ]

    // Remove any accidental duplicates
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
}
        

        else {
            return res.status(400).json({
                success: false,
                message: 'Unsupported student grade.'
            })
        }

        subjects.sort((a, b) =>
            a.subject_name.localeCompare(b.subject_name)
        )

        return res.status(200).json({
            success: true,
            student,
            class: selectedClass,
            count: subjects.length,
            subjects
        })

    } catch (error) {
        console.error('Student subjects retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve student subjects.'
        })
    }
})

// Get all unique subjects studied by active students in a class
router.get('/:classId/subjects', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)

        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class selection.'
            })
        }

        // Get class information
        const { data: selectedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, class_name, grade, division, class_teacher_id')
            .eq('id', classId)
            .maybeSingle()

        if (classError) throw classError

        if (!selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Selected class does not exist.'
            })
        }

        // Get active students in this class
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, index_number, student_name')
            .eq('class_id', classId)
            .eq('is_active', true)

        if (studentError) throw studentError

        const studentIds = (students || []).map(student => student.id)

        const grade = Number(selectedClass.grade)
        let subjects = []

        if (studentIds.length > 0) {

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
                    subject_type: 'regular',
                    registered_student_ids: studentIds
                }))
            }

            // Grades 6–9: Core + selected basket subjects
            else if (grade >= 6 && grade <= 9) {
                const { data: coreSubjects, error: coreError } = await supabase
                    .from('subjects')
                    .select('id, subject_name')
                    .eq('subject_group', 'Junior Secondary')
                    .is('basket_id', null)

                if (coreError) throw coreError

                const { data: selections, error: selectionError } = await supabase
                    .from('student_basket_subjects')
                    .select('student_id, subject_id')
                    .in('student_id', studentIds)

                if (selectionError) throw selectionError

                const subjectIds = [
                    ...new Set((selections || []).map(item => item.subject_id))
                ]

                let basketSubjects = []

                if (subjectIds.length > 0) {
                    const { data, error } = await supabase
                        .from('subjects')
                        .select('id, subject_name')
                        .eq('subject_group', 'Junior Secondary')
                        .in('id', subjectIds)

                    if (error) throw error

                    basketSubjects = data || []
                }

                subjects = [
                    ...(coreSubjects || []).map(subject => ({
                        subject_id: subject.id,
                        al_subject_no: null,
                        subject_name: subject.subject_name,
                        subject_type: 'regular',
                        registered_student_ids: studentIds
                    })),
                    ...basketSubjects.map(subject => ({
                        subject_id: subject.id,
                        al_subject_no: null,
                        subject_name: subject.subject_name,
                        subject_type: 'regular',
                        registered_student_ids: (selections || [])
                            .filter(item => item.subject_id === subject.id)
                            .map(item => item.student_id)
                    }))
                ]
            }

            // Grades 10–11: O/L core + selected basket subjects
            else if (grade >= 10 && grade <= 11) {
                const { data: coreSubjects, error: coreError } = await supabase
                    .from('subjects')
                    .select('id, subject_name')
                    .eq('subject_group', 'OL')
                    .is('basket_id', null)

                if (coreError) throw coreError

                const { data: selections, error: selectionError } = await supabase
                    .from('student_basket_subjects')
                    .select('student_id, subject_id')
                    .in('student_id', studentIds)

                if (selectionError) throw selectionError

                const subjectIds = [
                    ...new Set((selections || []).map(item => item.subject_id))
                ]

                let basketSubjects = []

                if (subjectIds.length > 0) {
                    const { data, error } = await supabase
                        .from('subjects')
                        .select('id, subject_name')
                        .eq('subject_group', 'OL')
                        .in('id', subjectIds)

                    if (error) throw error

                    basketSubjects = data || []
                }

                subjects = [
                    ...(coreSubjects || []).map(subject => ({
                        subject_id: subject.id,
                        al_subject_no: null,
                        subject_name: subject.subject_name,
                        subject_type: 'regular',
                        registered_student_ids: studentIds
                    })),
                    ...basketSubjects.map(subject => ({
                        subject_id: subject.id,
                        al_subject_no: null,
                        subject_name: subject.subject_name,
                        subject_type: 'regular',
                        registered_student_ids: (selections || [])
                            .filter(item => item.subject_id === subject.id)
                            .map(item => item.student_id)
                    }))
                ]
            }

            // Grades 12–13: Common A/L subjects + students' selected Choice subjects
else if (grade >= 12 && grade <= 13) {

    // Get all students' selected A/L subjects
    const { data: selections, error: selectionError } = await supabase
        .from('al_student_subjects')
        .select('student_id, subject_no')
        .in('student_id', studentIds)

    if (selectionError) throw selectionError

    // Retrieve the complete A/L subject catalogue
    const { data: alSubjects, error: alSubjectsError } = await supabase
        .from('al_subjects')
        .select('subject_no, subject_name, subject_type')

    if (alSubjectsError) throw alSubjectsError

    // Build the class subject list
    subjects = (alSubjects || [])
        .filter(subject => {
            const subjectType = String(subject.subject_type).trim()

            // Common subjects are included for everyone
            if (subjectType === 'Common') return true

            // Choice subjects are included only if selected
            return (selections || []).some(item =>
                String(item.subject_no).trim() ===
                String(subject.subject_no).trim()
            )
        })
        .map(subject => {

            const isCommon =
                String(subject.subject_type).trim() === 'Common'

            return {
                subject_id: null,
                al_subject_no: subject.subject_no,
                subject_name: subject.subject_name,

                // Keep this as 'al' because the frontend uses it
                // to distinguish A/L subjects from regular subjects.
                subject_type: 'al',

                // Preserve the actual catalogue category separately
                al_subject_type: subject.subject_type,

                registered_student_ids: isCommon
                    ? studentIds
                    : (selections || [])
                        .filter(item =>
                            String(item.subject_no).trim() ===
                            String(subject.subject_no).trim()
                        )
                        .map(item => item.student_id)
            }
        })
}

            else {
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported class grade.'
                })
            }
        } else if (grade < 1 || grade > 13) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported class grade.'
            })
        }

        subjects.sort((a, b) =>
            a.subject_name.localeCompare(b.subject_name)
        )

        return res.status(200).json({
            success: true,
            class: selectedClass,
            studentCount: studentIds.length,
            count: subjects.length,
            subjects
        })

    } catch (error) {
        console.error('Class subjects retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve class subjects.'
        })
    }
})


// Get a student's marks for a selected academic term
router.get('/:classId/students/:studentId/marks', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const classId = Number(req.params.classId)
        const studentId = Number(req.params.studentId)
        const termId = Number(req.query.termId)

        if (
            !Number.isInteger(classId) || classId <= 0 ||
            !Number.isInteger(studentId) || studentId <= 0 ||
            !Number.isInteger(termId) || termId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class, student or academic term.'
            })
        }

        // Verify that the student belongs to the selected class
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, index_number, student_name, class_id')
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

        // Verify that the academic term exists
        const { data: academicTerm, error: termError } = await supabase
            .from('academic_terms')
            .select(`
                id,
                term_number,
                term_name,
                academic_years (
                    id,
                    year
                )
            `)
            .eq('id', termId)
            .maybeSingle()

        if (termError) throw termError

        if (!academicTerm) {
            return res.status(404).json({
                success: false,
                message: 'Academic term not found.'
            })
        }

        // Retrieve existing marks
        const { data: marks, error: marksError } = await supabase
            .from('student_marks')
            .select(`
                id,
                subject_id,
                al_subject_no,
                marks,
                updated_at
            `)
            .eq('student_id', studentId)
            .eq('academic_term_id', termId)

        if (marksError) throw marksError

        return res.status(200).json({
            success: true,
            student,
            academicTerm,
            count: (marks || []).length,
            marks: marks || []
        })

    } catch (error) {
        console.error('Student marks retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve student marks.'
        })
    }
})


// Save or update a student's marks
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
        const { termId, marks } = req.body

        if (
            !Number.isInteger(classId) || classId <= 0 ||
            !Number.isInteger(studentId) || studentId <= 0 ||
            !Number.isInteger(Number(termId)) || Number(termId) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class, student or academic term.'
            })
        }

        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one mark entry is required.'
            })
        }

        // Verify student belongs to the selected class
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

        // Verify academic term
        const { data: academicTerm, error: termError } = await supabase
            .from('academic_terms')
            .select('id')
            .eq('id', Number(termId))
            .maybeSingle()

        if (termError) throw termError

        if (!academicTerm) {
            return res.status(404).json({
                success: false,
                message: 'Academic term not found.'
            })
        }


// Verify the student's registered subjects
const { data: classInfo, error: classInfoError } = await supabase
    .from('class_divisions')
    .select('grade')
    .eq('id', classId)
    .maybeSingle()

if (classInfoError) throw classInfoError

if (!classInfo) {
    return res.status(404).json({
        success: false,
        message: 'Class not found.'
    })
}

const grade = Number(classInfo.grade)

const allowedRegularSubjectIds = new Set()
const allowedALSubjectNos = new Set()

if (grade >= 1 && grade <= 5) {

    // Primary subjects
    const { data, error } = await supabase
        .from('subjects')
        .select('id')
        .eq('subject_group', 'Primary')

    if (error) throw error

    data.forEach(subject => {
        allowedRegularSubjectIds.add(Number(subject.id))
    })

} else if (grade >= 6 && grade <= 11) {

    const subjectGroup = grade <= 9
        ? 'Junior Secondary'
        : 'OL'

    // Get compulsory/core subjects
    const { data: coreSubjects, error: coreError } = await supabase
        .from('subjects')
        .select('id')
        .eq('subject_group', subjectGroup)
        .is('basket_id', null)

    if (coreError) throw coreError

    coreSubjects.forEach(subject => {
        allowedRegularSubjectIds.add(Number(subject.id))
    })

    // Get subjects selected by this student
    const { data: selectedSubjects, error: selectedError } =
        await supabase
            .from('student_basket_subjects')
            .select('subject_id')
            .eq('student_id', studentId)

    if (selectedError) throw selectedError

    const selectedSubjectIds = selectedSubjects.map(
        subject => subject.subject_id
    )

    if (selectedSubjectIds.length > 0) {

        const { data: validSelectedSubjects, error: validError } =
            await supabase
                .from('subjects')
                .select('id')
                .in('id', selectedSubjectIds)
                .eq('subject_group', subjectGroup)

        if (validError) throw validError

        validSelectedSubjects.forEach(subject => {
            allowedRegularSubjectIds.add(Number(subject.id))
        })
    }

} else if (grade >= 12 && grade <= 13) {

    // Get the student's selected Choice subjects
    const { data: selectedSubjects, error: selectedError } = await supabase
        .from('al_student_subjects')
        .select('subject_no')
        .eq('student_id', studentId)

    if (selectedError) throw selectedError

    selectedSubjects.forEach(subject => {
        allowedALSubjectNos.add(String(subject.subject_no).trim())
    })

    // Get all Common A/L subjects
    const { data: commonSubjects, error: commonError } = await supabase
        .from('al_subjects')
        .select('subject_no')
        .eq('subject_type', 'Common')

    if (commonError) throw commonError

    // Allow Common subjects for every A/L student
    commonSubjects.forEach(subject => {
        allowedALSubjectNos.add(String(subject.subject_no).trim())
    })

} else {
    return res.status(400).json({
        success: false,
        message: 'Unsupported student grade.'
    })
}


        // Validate all entries before saving anything
        const seenSubjects = new Set()
        const entriesToSave = []
        const entriesToClear = []

        for (const entry of marks) {
            const subjectId = entry.subject_id
            const alSubjectNo = entry.al_subject_no
            const hasRegularSubject = subjectId !== null && subjectId !== undefined
            const hasALSubject = alSubjectNo !== null && alSubjectNo !== undefined

            if (hasRegularSubject === hasALSubject) {
                return res.status(400).json({
                    success: false,
                    message: 'Each entry must contain exactly one subject identifier.'
                })
            }

            const subjectKey = hasRegularSubject
                ? `regular-${subjectId}`
                : `al-${alSubjectNo}`

            if (seenSubjects.has(subjectKey)) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate subject entries are not allowed.'
                })
            }

            seenSubjects.add(subjectKey)

            const identifier = hasRegularSubject
                ? Number(subjectId)
                : String(alSubjectNo).trim()

            if (
                hasRegularSubject &&
                (!Number.isInteger(identifier) || identifier <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid subject ID.'
                })
            }

            if (hasALSubject && !identifier) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid A/L subject number.'
                })
            }

            // Reject subjects not registered for this student
if (
    hasRegularSubject &&
    !allowedRegularSubjectIds.has(identifier)
) {
    return res.status(400).json({
        success: false,
        message: 'This regular subject is not registered for the student.'
    })
}

if (
    hasALSubject &&
    !allowedALSubjectNos.has(identifier)
) {
    return res.status(400).json({
        success: false,
        message: 'This A/L subject is not registered for the student.'
    })
}

            // Explicit clear action
            if (entry.clear === true) {
                entriesToClear.push(
                    hasRegularSubject
                        ? { subject_id: identifier, al_subject_no: null }
                        : { subject_id: null, al_subject_no: identifier }
                )
                continue
            }

            // Blank values do not change existing marks
            if (
                entry.marks === null ||
                entry.marks === undefined ||
                entry.marks === ''
            ) {
                continue
            }

            const numericMark = Number(entry.marks)

            if (
                !Number.isFinite(numericMark) ||
                numericMark < 0 ||
                numericMark > 100 ||
                !/^\d{1,3}(\.\d{1,2})?$/.test(String(entry.marks).trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Marks must be between 0 and 100 with up to two decimal places.'
                })
            }

            entriesToSave.push({
                student_id: studentId,
                academic_term_id: Number(termId),
                subject_id: hasRegularSubject ? identifier : null,
                al_subject_no: hasALSubject ? identifier : null,
                marks: numericMark,
                updated_at: new Date().toISOString()
            })
        }

        
        // Save new marks and update existing ones
        for (const entry of entriesToSave) {
            let existingQuery = supabase
                .from('student_marks')
                .select('id')
                .eq('student_id', studentId)
                .eq('academic_term_id', Number(termId))

            if (entry.subject_id !== null) {
                existingQuery = existingQuery.eq(
                    'subject_id',
                    entry.subject_id
                )
            } else {
                existingQuery = existingQuery.eq(
                    'al_subject_no',
                    entry.al_subject_no
                )
            }

            const { data: existingMark, error: lookupError } =
                await existingQuery.maybeSingle()

            if (lookupError) throw lookupError

            if (existingMark) {
                // Update the existing mark
                const { error: updateError } = await supabase
                    .from('student_marks')
                    .update({
                        marks: entry.marks,
                        updated_at: entry.updated_at
                    })
                    .eq('id', existingMark.id)

                if (updateError) throw updateError

            } else {
                // Insert a new mark
                const { error: insertError } = await supabase
                    .from('student_marks')
                    .insert(entry)

                if (insertError) throw insertError
            }
        }

        // Explicitly clear selected marks
        for (const entry of entriesToClear) {
            let query = supabase
                .from('student_marks')
                .delete()
                .eq('student_id', studentId)
                .eq('academic_term_id', Number(termId))

            if (entry.subject_id !== null) {
                query = query.eq('subject_id', entry.subject_id)
            } else {
                query = query.eq('al_subject_no', entry.al_subject_no)
            }

            const { error } = await query

            if (error) throw error
        }

        return res.status(200).json({
            success: true,
            message: 'Student marks saved successfully.',
            savedCount: entriesToSave.length,
            clearedCount: entriesToClear.length
        })

    } catch (error) {
        console.error('Student marks saving error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to save student marks.'
        })
    }
})



export default router
