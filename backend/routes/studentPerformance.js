
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()


// Round a number to 2 decimal places
const round2 = value =>
    Math.round((value + Number.EPSILON) * 100) / 100


// Generate competition ranks: 1, 1, 3
function assignRanks(students, getGroupKey) {
    const groups = new Map()

    students.forEach(student => {
        const groupKey = getGroupKey(student)

        if (!groups.has(groupKey)) {
            groups.set(groupKey, [])
        }

        groups.get(groupKey).push(student)
    })

    const ranks = new Map()

    groups.forEach(group => {
        group.sort((a, b) => b.average - a.average)

        let previousAverage = null
        let currentRank = 0

        group.forEach((student, index) => {
            if (
                previousAverage === null ||
                Math.abs(student.average - previousAverage) > 0.000000001
            ) {
                currentRank = index + 1
                previousAverage = student.average
            }

            ranks.set(student.id, currentRank)
        })
    })

    return ranks
}


// Get a student's performance summary for a selected academic term
router.get(
    '/:classId/students/:studentId/summary',
    verifySession,
    async (req, res) => {
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


            // Verify class, student and academic term simultaneously
            const [
                { data: selectedClass, error: classError },
                { data: selectedStudent, error: selectedStudentError },
                { data: academicTerm, error: termError }
            ] = await Promise.all([
                supabase
                    .from('class_divisions')
                    .select('id, grade')
                    .eq('id', classId)
                    .maybeSingle(),

                supabase
                    .from('students')
                    .select('id, class_id, al_stream_id')
                    .eq('id', studentId)
                    .eq('class_id', classId)
                    .eq('is_active', true)
                    .maybeSingle(),

                supabase
                    .from('academic_terms')
                    .select('id')
                    .eq('id', termId)
                    .maybeSingle()
            ])

            if (classError) throw classError
            if (selectedStudentError) throw selectedStudentError
            if (termError) throw termError

            if (!selectedClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found.'
                })
            }

            const grade = Number(selectedClass.grade)

            if (grade < 1 || grade > 13) {
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported class grade.'
                })
            }

            if (!selectedStudent) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found in this class.'
                })
            }

            if (!academicTerm) {
                return res.status(404).json({
                    success: false,
                    message: 'Academic term not found.'
                })
            }


            // Get all class divisions belonging to this grade
            const { data: gradeClasses, error: gradeClassesError } =
                await supabase
                    .from('class_divisions')
                    .select('id, grade')
                    .eq('grade', grade)

            if (gradeClassesError) throw gradeClassesError

            const classIds = (gradeClasses || []).map(item => item.id)

            // Get active students in the same grade
            let cohortQuery = supabase
                .from('students')
                .select('id, class_id, al_stream_id')
                .in('class_id', classIds)
                .eq('is_active', true)

            // A/L division rankings must stay within the same stream
            if (grade >= 12 && grade <= 13) {
                if (selectedStudent.al_stream_id === null) {
                    cohortQuery = cohortQuery.is('al_stream_id', null)
                } else {
                    cohortQuery = cohortQuery.eq(
                        'al_stream_id',
                        selectedStudent.al_stream_id
                    )
                }
            }

            const { data: cohortStudents, error: cohortError } =
                await cohortQuery

            if (cohortError) throw cohortError

            const students = cohortStudents || []
            const studentIds = students.map(item => item.id)

            if (!studentIds.includes(studentId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Student is not included in the ranking group.'
                })
            }

            // Each student's required subjects will be stored here
            const requiredSubjects = new Map()

            students.forEach(student => {
                requiredSubjects.set(student.id, [])
            })


            // GRADES 1–5: All Primary subjects
            if (grade >= 1 && grade <= 5) {
                const { data: subjects, error } = await supabase
                    .from('subjects')
                    .select('id')
                    .eq('subject_group', 'Primary')

                if (error) throw error

                students.forEach(student => {
                    requiredSubjects.set(
                        student.id,
                        (subjects || []).map(subject => `regular-${subject.id}`)
                    )
                })
            }


            // GRADES 6–11: Core + selected basket subjects,

            else if (grade >= 6 && grade <= 11) {
                const subjectGroup =
                    grade <= 9 ? 'Junior Secondary' : 'OL'

                const [
                    { data: subjects, error: subjectsError },
                    { data: basketSelections, error: basketError },
                    { data: settings, error: settingsError }
                ] = await Promise.all([
                    supabase
                        .from('subjects')
                        .select('id, basket_id')
                        .eq('subject_group', subjectGroup),

                    supabase
                        .from('student_basket_subjects')
                        .select('student_id, subject_id')
                        .in('student_id', studentIds),

                    supabase
                        .from('class_subject_settings')
                        .select('class_id, subject_id, include_in_total')
                        .in('class_id', classIds)
                ])

                if (subjectsError) throw subjectsError
                if (basketError) throw basketError
                if (settingsError) throw settingsError

                const coreSubjectIds = (subjects || [])
                    .filter(subject => subject.basket_id === null)
                    .map(subject => Number(subject.id))

                const settingsMap = new Map()

                    ; (settings || []).forEach(setting => {
                        settingsMap.set(
                            `${setting.class_id}-${setting.subject_id}`,
                            setting.include_in_total
                        )
                    })

                students.forEach(student => {
                    const selectedBasketIds = (basketSelections || [])
                        .filter(item => item.student_id === student.id)
                        .map(item => Number(item.subject_id))

                    const allSubjectIds = [
                        ...new Set([
                            ...coreSubjectIds,
                            ...selectedBasketIds
                        ])
                    ]

                    const includedIds = allSubjectIds.filter(subjectId => {
                        const settingKey =
                            `${student.class_id}-${subjectId}`

                        return settingsMap.has(settingKey)
                            ? settingsMap.get(settingKey) === true
                            : true
                    })

                    requiredSubjects.set(
                        student.id,
                        includedIds.map(id => `regular-${id}`)
                    )
                })
            }



            // GRADES 12–13: Only each student's three selected Choice subjects.
            // Common subjects are not included in the summary.
            else if (grade >= 12 && grade <= 13) {
                const { data: selections, error: selectionsError } =
                    await supabase
                        .from('al_student_subjects')
                        .select('student_id, subject_no')
                        .in('student_id', studentIds)

                if (selectionsError) throw selectionsError

                const { data: choiceSubjects, error: choiceError } =
                    await supabase
                        .from('al_subjects')
                        .select('subject_no')
                        .eq('subject_type', 'Choice')

                if (choiceError) throw choiceError

                const validChoiceNumbers = new Set(
                    (choiceSubjects || []).map(subject =>
                        String(subject.subject_no).trim()
                    )
                )

                students.forEach(student => {
                    const selectedChoices = [
                        ...new Set(
                            (selections || [])
                                .filter(item => item.student_id === student.id)
                                .map(item => String(item.subject_no).trim())
                                .filter(subjectNo =>
                                    validChoiceNumbers.has(subjectNo)
                                )
                        )
                    ]

                    requiredSubjects.set(
                        student.id,
                        selectedChoices.map(subjectNo => `al-${subjectNo}`)
                    )
                })
            }


            // Retrieve marks for all students in this ranking group
            const { data: allMarks, error: marksError } =
                await supabase
                    .from('student_marks')
                    .select('student_id, subject_id, al_subject_no, marks')
                    .eq('academic_term_id', termId)
                    .in('student_id', studentIds)

            if (marksError) throw marksError

            // Organise marks by student and subject
            const marksMap = new Map()

            students.forEach(student => {
                marksMap.set(student.id, new Map())
            })

                ; (allMarks || []).forEach(mark => {
                    const key = mark.subject_id !== null
                        ? `regular-${mark.subject_id}`
                        : `al-${String(mark.al_subject_no).trim()}`

                    marksMap.get(mark.student_id)?.set(key, mark.marks)
                })


            // Calculate totals and averages
            const summaries = students.map(student => {
                const subjectKeys = requiredSubjects.get(student.id) || []
                const studentMarks = marksMap.get(student.id)

                // A/L students must have exactly three selected Choice subjects.
                const hasCorrectALSelection =
                    grade < 12 || subjectKeys.length === 3

                const completedMarks = subjectKeys
                    .map(key => studentMarks?.get(key))
                    .filter(mark =>
                        mark !== null &&
                        mark !== undefined &&
                        Number.isFinite(Number(mark))
                    )

                const isComplete =
                    subjectKeys.length > 0 &&
                    hasCorrectALSelection &&
                    completedMarks.length === subjectKeys.length

                if (!isComplete) {
                    return {
                        id: student.id,
                        classId: student.class_id,
                        alStreamId: student.al_stream_id,
                        status: 'pending',
                        total: null,
                        average: null,
                        requiredSubjectCount: subjectKeys.length,
                        completedSubjectCount: completedMarks.length,
                        classRank: null,
                        divisionRank: null
                    }
                }

                const total = completedMarks.reduce(
                    (sum, mark) => sum + Number(mark),
                    0
                )

                const average = total / subjectKeys.length

                return {
                    id: student.id,
                    classId: student.class_id,
                    alStreamId: student.al_stream_id,
                    status: 'complete',
                    total: round2(total),
                    average: round2(average),
                    rawAverage: average,
                    requiredSubjectCount: subjectKeys.length,
                    completedSubjectCount: completedMarks.length,
                    classRank: null,
                    divisionRank: null
                }
            })


            // Only students with complete marks receive ranks
            const completedStudents = summaries.filter(
                student => student.status === 'complete'
            )

            const classRanks = assignRanks(
                completedStudents,
                student => student.classId
            )

            const divisionRanks = assignRanks(
                completedStudents,
                student => grade >= 12
                    ? `${grade}-${student.alStreamId ?? 'null'}`
                    : String(grade)
            )

            // Use the unrounded average for rank comparisons
            const rankStudents = completedStudents.map(student => ({
                ...student,
                average: student.rawAverage
            }))

            const finalClassRanks = assignRanks(
                rankStudents,
                student => student.classId
            )

            const finalDivisionRanks = assignRanks(
                rankStudents,
                student => grade >= 12
                    ? `${grade}-${student.alStreamId ?? 'null'}`
                    : String(grade)
            )

            const selectedSummary = summaries.find(
                student => student.id === studentId
            )

            if (selectedSummary.status === 'complete') {
                selectedSummary.classRank =
                    finalClassRanks.get(studentId) ?? null

                selectedSummary.divisionRank =
                    finalDivisionRanks.get(studentId) ?? null
            }

            return res.status(200).json({
                success: true,
                termId,
                grade,
                summary: {
                    status: selectedSummary.status,
                    total: selectedSummary.total,
                    average: selectedSummary.average,
                    classRank: selectedSummary.classRank,
                    divisionRank: selectedSummary.divisionRank,
                    requiredSubjectCount:
                        selectedSummary.requiredSubjectCount,
                    completedSubjectCount:
                        selectedSummary.completedSubjectCount
                }
            })

        } catch (error) {
            console.error('Student performance summary error:', error)

            return res.status(500).json({
                success: false,
                message: 'Unable to calculate student performance summary.'
            })
        }
    }
)


export default router
