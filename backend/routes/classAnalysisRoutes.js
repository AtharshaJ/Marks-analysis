
import express from 'express'
import supabase from '../supabase.js'
import { verifySession } from '../middleware/authMiddleware.js'

const router = express.Router()

const round2 = value =>
    Math.round((value + Number.EPSILON) * 100) / 100

const getGrade = average => {
    if (average >= 75) return 'A'
    if (average >= 65) return 'B'
    if (average >= 50) return 'C'
    if (average >= 35) return 'S'
    return 'F'
}


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
        group.sort((a, b) => b.rawAverage - a.rawAverage)

        let previousAverage = null
        let currentRank = 0

        group.forEach((student, index) => {
            if (
                previousAverage === null ||
                Math.abs(student.rawAverage - previousAverage) > 0.000000001
            ) {
                currentRank = index + 1
                previousAverage = student.rawAverage
            }

            ranks.set(student.id, currentRank)
        })
    })

    return ranks
}


// All class analysis routes require login
router.use(verifySession)

// Only employees can access class analysis
const requireEmployee = (req, res, next) => {
    if (req.user?.type !== 'employee') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Employees only.'
        })
    }

    next()
}

router.use(requireEmployee)



router.get('/:classId/summary', async (req, res) => {
    try {
        const classId = Number(req.params.classId)
        const termId = Number(req.query.termId)

        // Validate IDs
        if (
            !Number.isInteger(classId) || classId <= 0 ||
            !Number.isInteger(termId) || termId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class or academic term.'
            })
        }

        // Get the selected class
        const { data: selectedClass, error: classError } =
            await supabase
                .from('class_divisions')
                .select('id, class_name, grade, division')
                .eq('id', classId)
                .single()

        if (classError || !selectedClass) {
            return res.status(404).json({
                success: false,
                message: 'Class not found.'
            })
        }

        // Validate class grade
        const grade = Number(selectedClass.grade)

        if (grade < 1 || grade > 13) {
            return res.status(400).json({
                success: false,
                message: 'Unsupported class grade.'
            })
        }

        // Get the selected academic term
        const { data: academicTerm, error: termError } =
            await supabase
                .from('academic_terms')
                .select(`
                    id,
                    term_name,
                    academic_year:academic_years (
                        id,
                        year
                    )
                `)
                .eq('id', termId)
                .single()

        if (termError || !academicTerm) {
            return res.status(404).json({
                success: false,
                message: 'Academic term not found.'
            })
        }

        // Get active students in this class
        const { data: students, error: studentsError } =
            await supabase
                .from('students')
                .select(`
                    id,
                    index_number,
                    student_name,
                    class_id,
                    al_stream_id
                `)
                .eq('class_id', classId)
                .eq('is_active', true)
                .order('index_number')

        if (studentsError) throw studentsError

        if (!students || students.length === 0) {
            return res.status(200).json({
                success: true,
                class: selectedClass,
                academicTerm,
                studentCount: 0,
                students: [],
                message: 'No active students found in this class.'
            })
        }

        const studentIds = students.map(student => student.id)


const requiredSubjects = new Map()

students.forEach(student => {
    requiredSubjects.set(student.id, [])
})



// GRADES 1–5: All Primary subjects are required
if (grade >= 1 && grade <= 5) {
    const { data: subjects, error: subjectsError } =
        await supabase
            .from('subjects')
            .select('id, subject_name')
            .eq('subject_group', 'Primary')

    if (subjectsError) throw subjectsError

    students.forEach(student => {
        requiredSubjects.set(
            student.id,
            (subjects || []).map(subject => ({
                key: `regular-${subject.id}`,
                subjectId: subject.id,
                subjectName: subject.subject_name,
                subjectType: 'regular'
            }))
        )
    })
}



// GRADES 6–11: Core subjects + selected basket subjects
else if (grade >= 6 && grade <= 11) {
    const subjectGroup =
        grade <= 9 ? 'Junior Secondary' : 'OL'

    // Get all subjects in the relevant subject group
    const { data: subjects, error: subjectsError } =
        await supabase
            .from('subjects')
            .select('id, subject_name, basket_id')
            .eq('subject_group', subjectGroup)

    if (subjectsError) throw subjectsError

    // Core subjects have no basket
    const coreSubjects = (subjects || [])
        .filter(subject => subject.basket_id === null)

    // Get each student's selected basket subjects
    const { data: basketSelections, error: basketError } =
        await supabase
            .from('student_basket_subjects')
            .select('student_id, subject_id')
            .in('student_id', studentIds)

    if (basketError) throw basketError

    // Get subject inclusion settings for this class
    const { data: settings, error: settingsError } =
        await supabase
            .from('class_subject_settings')
            .select('subject_id, include_in_total')
            .eq('class_id', classId)

    if (settingsError) throw settingsError

    const settingsMap = new Map()

    ;(settings || []).forEach(setting => {
        settingsMap.set(
            Number(setting.subject_id),
            setting.include_in_total
        )
    })

    students.forEach(student => {
        const selectedBasketIds = (basketSelections || [])
            .filter(item => item.student_id === student.id)
            .map(item => Number(item.subject_id))

        const selectedSubjects = (subjects || []).filter(subject => {
            const isCore = subject.basket_id === null
            const isSelectedBasket = selectedBasketIds.includes(
                Number(subject.id)
            )

            return isCore || isSelectedBasket
        })

        const includedSubjects = selectedSubjects.filter(subject => {
            // Include by default if no setting exists
            return settingsMap.has(Number(subject.id))
                ? settingsMap.get(Number(subject.id)) === true
                : true
        })

        requiredSubjects.set(
            student.id,
            includedSubjects.map(subject => ({
                key: `regular-${subject.id}`,
                subjectId: subject.id,
                subjectName: subject.subject_name,
                subjectType: 'regular'
            }))
        )
    })
}



// GRADES 12–13: Only the three selected Choice subjects
else if (grade >= 12 && grade <= 13) {
    // Get each student's registered A/L subjects
    const { data: selections, error: selectionsError } =
        await supabase
            .from('al_student_subjects')
            .select('student_id, subject_no')
            .in('student_id', studentIds)

    if (selectionsError) throw selectionsError

    // Get valid Choice subjects
    const { data: choiceSubjects, error: choiceError } =
        await supabase
            .from('al_subjects')
            .select('subject_no, subject_name')
            .eq('subject_type', 'Choice')

    if (choiceError) throw choiceError

    const choiceMap = new Map(
        (choiceSubjects || []).map(subject => [
            String(subject.subject_no).trim(),
            subject.subject_name
        ])
    )

    students.forEach(student => {
        const selectedChoices = [
            ...new Set(
                (selections || [])
                    .filter(item => item.student_id === student.id)
                    .map(item => String(item.subject_no).trim())
                    .filter(subjectNo => choiceMap.has(subjectNo))
            )
        ]

        requiredSubjects.set(
            student.id,
            selectedChoices.map(subjectNo => ({
                key: `al-${subjectNo}`,
                subjectNo,
                subjectName: choiceMap.get(subjectNo),
                subjectType: 'al'
            }))
        )
    })
}


// Retrieve marks for all students in the selected term
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

;(allMarks || []).forEach(mark => {
    const key = mark.subject_id !== null
        ? `regular-${mark.subject_id}`
        : `al-${String(mark.al_subject_no).trim()}`

    marksMap.get(mark.student_id)?.set(key, Number(mark.marks))
})



// Calculate each student's performance
const summaries = students.map(student => {
    const subjectList = requiredSubjects.get(student.id) || []
    const studentMarks = marksMap.get(student.id)

    // A/L students must have exactly three Choice subjects
    const hasCorrectALSelection =
        grade < 12 || subjectList.length === 3

    const completedMarks = subjectList
        .map(subject => studentMarks?.get(subject.key))
        .filter(mark =>
            mark !== null &&
            mark !== undefined &&
            Number.isFinite(Number(mark))
        )

    const isComplete =
        subjectList.length > 0 &&
        hasCorrectALSelection &&
        completedMarks.length === subjectList.length

    if (!isComplete) {
        return {
            id: student.id,
            indexNumber: student.index_number,
            studentName: student.student_name,
            status: 'pending',
            total: null,
            average: null,
            rawAverage: null,
            grade: null,
            requiredSubjectCount: subjectList.length,
            completedSubjectCount: completedMarks.length,
            classRank: null
        }
    }

    const total = completedMarks.reduce(
        (sum, mark) => sum + Number(mark),
        0
    )

    const rawAverage = total / subjectList.length

    return {
        id: student.id,
        indexNumber: student.index_number,
        studentName: student.student_name,
        status: 'complete',
        total: round2(total),
        average: round2(rawAverage),
        rawAverage,
        grade: getGrade(rawAverage),
        requiredSubjectCount: subjectList.length,
        completedSubjectCount: completedMarks.length,
        classRank: null
    }
})

// Calculate rankings for students with complete results
const completedStudents = summaries.filter(
    student => student.status === 'complete'
)

const classRanks = assignRanks(
    completedStudents,
    () => classId
)

summaries.forEach(student => {
    if (student.status === 'complete') {
        student.classRank = classRanks.get(student.id) ?? null
    }
})


const completeCount = completedStudents.length
const pendingCount = summaries.length - completeCount

const classAverage = completeCount > 0
    ? round2(
        completedStudents.reduce(
            (sum, student) => sum + student.rawAverage,
            0
        ) / completeCount
    )
    : null

const highestAverage = completeCount > 0
    ? round2(
        Math.max(...completedStudents.map(student => student.rawAverage))
    )
    : null

const lowestAverage = completeCount > 0
    ? round2(
        Math.min(...completedStudents.map(student => student.rawAverage))
    )
    : null

// Overall grade distribution
const gradeDistribution = {
    A: 0,
    B: 0,
    C: 0,
    S: 0,
    F: 0
}

completedStudents.forEach(student => {
    gradeDistribution[student.grade]++
})


const subjectStatistics = new Map()

students.forEach(student => {
    const subjects = requiredSubjects.get(student.id) || []
    const studentMarks = marksMap.get(student.id)

    subjects.forEach(subject => {
        const mark = studentMarks?.get(subject.key)

        if (
            mark === null ||
            mark === undefined ||
            !Number.isFinite(Number(mark))
        ) {
            return
        }

        if (!subjectStatistics.has(subject.key)) {
            subjectStatistics.set(subject.key, {
                subjectId: subject.subjectId ?? null,
                subjectNo: subject.subjectNo ?? null,
                subjectName: subject.subjectName,
                subjectType: subject.subjectType,
                marks: []
            })
        }

        subjectStatistics.get(subject.key).marks.push(Number(mark))
    })
})

const subjectAnalysis = Array.from(subjectStatistics.values()).map(subject => {
    const total = subject.marks.reduce((sum, mark) => sum + mark, 0)

    return {
        subjectId: subject.subjectId,
        subjectNo: subject.subjectNo,
        subjectName: subject.subjectName,
        subjectType: subject.subjectType,
        studentCount: subject.marks.length,
        average: round2(total / subject.marks.length),
        highestMark: Math.max(...subject.marks),
        lowestMark: Math.min(...subject.marks)
    }
})


return res.status(200).json({
    success: true,

    class: selectedClass,
    academicTerm,

    overview: {
        totalStudents: students.length,
        completedStudents: completeCount,
        pendingStudents: pendingCount,
        classAverage,
        highestAverage,
        lowestAverage
    },

    gradeDistribution,

    students: summaries.sort((a, b) => {
        if (a.status !== b.status) {
            return a.status === 'complete' ? -1 : 1
        }

        if (a.status === 'complete') {
            return a.classRank - b.classRank
        }

        return String(a.indexNumber).localeCompare(
    String(b.indexNumber),
    undefined,
    { numeric: true }
)
    }),

    subjects: subjectAnalysis
})

    } catch (error) {
        console.error('Class analysis retrieval error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve class analysis data.'
        })
    }
})



export default router
