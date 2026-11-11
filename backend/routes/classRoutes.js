
import express from 'express'
import supabase from '../supabase.js'
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// Get all class divisions
// Only the Administrator can access this endpoint
router.get('/', verifySession, requireAdmin, async (req, res) => {
    try {
        const { data: classes, error: classError } = await supabase
            .from('class_divisions')
            .select('id, grade, division, class_name, class_teacher_id')
            .order('grade', { ascending: true })
            .order('division', { ascending: true })

        if (classError) throw classError

        const teacherIds = classes
            .map(classItem => classItem.class_teacher_id)
            .filter(id => id !== null)

        let teachers = []

        if (teacherIds.length > 0) {
            const { data, error: teacherError } = await supabase
                .from('employees')
                .select('id, teacher_id, full_name, designation, is_active')
                .in('id', teacherIds)

            if (teacherError) throw teacherError

            teachers = data || []
        }

        const formattedClasses = classes.map(classItem => {
            const assignedTeacher = teachers.find(
                teacher => teacher.id === classItem.class_teacher_id
            )

            return {
                ...classItem,
                class_teacher: assignedTeacher || null
            }
        })

        // Fetch all active employees whose designation is Teacher
const { data: allActiveTeachers, error: eligibleTeacherError } = await supabase
    .from('employees')
    .select('id, teacher_id, full_name')
    .eq('designation', 'Teacher')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

if (eligibleTeacherError) throw eligibleTeacherError

// For Add Class, show only teachers who are not assigned
const assignedTeacherIds = classes
    .map(classItem => classItem.class_teacher_id)
    .filter(id => id !== null)

const unassignedTeachers = (allActiveTeachers || []).filter(
    teacher => !assignedTeacherIds.includes(teacher.id)
)

return res.status(200).json({
    success: true,
    count: formattedClasses.length,
    classes: formattedClasses,
    eligibleTeachers: unassignedTeachers,
    allActiveTeachers: allActiveTeachers || []
})

    } catch (error) {
        console.error('Class list error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve class divisions.'
        })
    }
})


// Get all class divisions for the Teacher Dashboard
router.get('/teacher-classes', verifySession, async (req, res) => {
    try {
        // Only authenticated employees can access this endpoint
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const { data: classes, error } = await supabase
            .from('class_divisions')
            .select('id, grade, division, class_name')
            .order('grade', { ascending: true })
            .order('division', { ascending: true })

        if (error) throw error

        return res.status(200).json({
            success: true,
            count: classes.length,
            classes: classes
        })

    } catch (error) {
        console.error('Teacher class list error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve class divisions.'
        })
    }
})


// Add a new class division
router.post('/', verifySession, requireAdmin, async (req, res) => {
    try {
        const { grade, division, classTeacherId } = req.body

        const numericGrade = Number(grade)

        if (
            grade === undefined ||
            grade === null ||
            grade === '' ||
            !Number.isInteger(numericGrade) ||
            numericGrade < 1 ||
            numericGrade > 13
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid grade between 1 and 13.'
            })
        }

        let cleanDivision = null

        if (
            division !== undefined &&
            division !== null &&
            String(division).trim() !== ''
        ) {
            cleanDivision = String(division).trim().toUpperCase()

            if (!/^[A-Z]+$/.test(cleanDivision)) {
                return res.status(400).json({
                    success: false,
                    message: 'Division must contain letters only (e.g. A, B or C).'
                })
            }
        }

        const className = cleanDivision
            ? `Grade ${numericGrade}-${cleanDivision}`
            : `Grade ${numericGrade}`

        let selectedTeacher = null

        if (
            classTeacherId !== undefined &&
            classTeacherId !== null &&
            classTeacherId !== ''
        ) {
            const numericTeacherId = Number(classTeacherId)

            if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a valid class teacher.'
                })
            }

            const { data: teacher, error: teacherError } = await supabase
                .from('employees')
                .select('id, teacher_id, full_name, designation, is_active')
                .eq('id', numericTeacherId)
                .maybeSingle()

            if (teacherError) throw teacherError

            if (
                !teacher ||
                teacher.designation !== 'Teacher' ||
                !teacher.is_active
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'The selected employee is not an active teacher.'
                })
            }

            selectedTeacher = teacher
        }

        const { data: newClass, error } = await supabase
            .from('class_divisions')
            .insert({
                grade: numericGrade,
                division: cleanDivision,
                class_name: className,
                class_teacher_id: selectedTeacher?.id || null
            })
            .select('id, grade, division, class_name, class_teacher_id')
            .single()

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This class already exists or the selected teacher is already assigned to another class.'
                })
            }

            throw error
        }

        return res.status(201).json({
            success: true,
            message: `${className} added successfully.`,
            class: {
                ...newClass,
                class_teacher: selectedTeacher
            }
        })

    } catch (error) {
        console.error('Add class error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to add the class. Please try again.'
        })
    }
})


// Edit an existing class division
router.patch('/:id', verifySession, requireAdmin, async (req, res) => {
    try {
        const classId = Number(req.params.id)
        const { grade, division, classTeacherId } = req.body

        // Validate class ID
        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class ID.'
            })
        }

        // Validate grade
        const numericGrade = Number(grade)

        if (
            grade === undefined ||
            grade === null ||
            grade === '' ||
            !Number.isInteger(numericGrade) ||
            numericGrade < 1 ||
            numericGrade > 13
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid grade between 1 and 13.'
            })
        }

        // Validate division
        let cleanDivision = null

        if (
            division !== undefined &&
            division !== null &&
            String(division).trim() !== ''
        ) {
            cleanDivision = String(division).trim().toUpperCase()

            if (!/^[A-Z]+$/.test(cleanDivision)) {
                return res.status(400).json({
                    success: false,
                    message: 'Division must contain letters only (e.g. A, B or C).'
                })
            }
        }

        const className = cleanDivision
            ? `Grade ${numericGrade}-${cleanDivision}`
            : `Grade ${numericGrade}`

        // Validate optional class teacher ID
        let numericTeacherId = null

        if (
            classTeacherId !== undefined &&
            classTeacherId !== null &&
            classTeacherId !== ''
        ) {
            numericTeacherId = Number(classTeacherId)

            if (
                !Number.isInteger(numericTeacherId) ||
                numericTeacherId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a valid class teacher.'
                })
            }
        }

        // Call the Supabase database function
        const { data, error } = await supabase.rpc(
            'update_class_with_teacher',
            {
                p_class_id: classId,
                p_grade: numericGrade,
                p_division: cleanDivision,
                p_class_teacher_id: numericTeacherId
            }
        )

        if (error) {
            console.error('Class update database error:', error.message)

            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This class name already exists.'
                })
            }

            if (error.code === 'P0001') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                })
            }

            throw error
        }

        // Handle the returned class
        const updatedClass = Array.isArray(data) ? data[0] : data

        if (!updatedClass) {
            return res.status(404).json({
                success: false,
                message: 'Class not found.'
            })
        }

        // Fetch the assigned teacher's details
        let selectedTeacher = null

        if (updatedClass.class_teacher_id !== null) {
            const { data: teacher, error: teacherError } = await supabase
                .from('employees')
                .select('id, teacher_id, full_name, designation, is_active')
                .eq('id', updatedClass.class_teacher_id)
                .maybeSingle()

            if (teacherError) throw teacherError

            selectedTeacher = teacher
        }

        return res.status(200).json({
            success: true,
            message: `${className} updated successfully.`,
            class: {
                ...updatedClass,
                class_teacher: selectedTeacher
            }
        })

    } catch (error) {
        console.error('Update class error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to update the class. Please try again.'
        })
    }
})

// Delete a class division
router.delete('/:id', verifySession, requireAdmin, async (req, res) => {
    try {
        const classId = Number(req.params.id)

        if (!Number.isInteger(classId) || classId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid class ID.'
            })
        }

        const { data: deletedClass, error } = await supabase
            .from('class_divisions')
            .delete()
            .eq('id', classId)
            .select('id, class_name')
            .maybeSingle()

        if (error) throw error

        if (!deletedClass) {
            return res.status(404).json({
                success: false,
                message: 'Class not found.'
            })
        }

        return res.status(200).json({
            success: true,
            message: `${deletedClass.class_name} deleted successfully.`
        })

    } catch (error) {
        console.error('Delete class error:', error.message)

        return res.status(500).json({
            success: false,
            message: 'Unable to delete the class. Please try again.'
        })
    }
})


// Add a student to the logged-in Class Teacher's assigned class

// Register a student with the required basket subject selections

router.post('/students', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        const {
            indexNumber,
            studentName,
            selectedSubjects,
            alStreamId,
            alSubjectNumbers
        } = req.body

        const cleanIndexNumber = String(indexNumber || '').trim()
        const cleanStudentName = String(studentName || '').trim()

        if (!cleanIndexNumber || cleanIndexNumber.length > 30) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid student index number.'
            })
        }

        if (!cleanStudentName || cleanStudentName.length > 150) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid student name.'
            })
        }

        // Find the Class Teacher's assigned class
        const { data: assignedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, class_name, grade')
            .eq('class_teacher_id', req.user.id)
            .maybeSingle()

        if (classError) throw classError

        if (!assignedClass) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned as a Class Teacher.'
            })
        }

        const grade = assignedClass.grade

        // A/L student registration: Grades 12 and 13
        if (grade === 12 || grade === 13) {
            const streamId = Number(alStreamId)

            if (!Number.isInteger(streamId) || streamId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select an A/L stream.'
                })
            }

            if (
                !Array.isArray(alSubjectNumbers) ||
                alSubjectNumbers.length !== 3
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select exactly three A/L subjects.'
                })
            }

            const subjectNumbers = alSubjectNumbers.map(
                subjectNo => String(subjectNo || '').trim()
            )

            if (
                subjectNumbers.some(subjectNo => !subjectNo) ||
                new Set(subjectNumbers).size !== 3
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select three different A/L subjects.'
                })
            }

            const { data: newStudent, error: registerError } =
                await supabase.rpc(
                    'register_al_student_with_subjects',
                    {
                        p_index_number: cleanIndexNumber,
                        p_student_name: cleanStudentName,
                        p_class_id: assignedClass.id,
                        p_stream_id: streamId,
                        p_subject_nos: subjectNumbers
                    }
                )

            if (registerError) {
                if (registerError.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        message: 'A student with this index number already exists.'
                    })
                }

                if (registerError.code === 'P0001') {
                    return res.status(400).json({
                        success: false,
                        message: registerError.message
                    })
                }

                throw registerError
            }

            return res.status(201).json({
                success: true,
                message: `${cleanStudentName} added to ${assignedClass.class_name} successfully.`,
                student: {
                    ...newStudent,
                    class_name: assignedClass.class_name
                }
            })
        }

        // Existing registration for Grades 1–11
        if (
            !selectedSubjects ||
            typeof selectedSubjects !== 'object' ||
            Array.isArray(selectedSubjects)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid basket subject selections.'
            })
        }

        let subjectGroup = null

        if (grade >= 6 && grade <= 9) {
            subjectGroup = 'Junior Secondary'
        } else if (grade >= 10 && grade <= 11) {
            subjectGroup = 'OL'
        }

        let availableSubjects = []

        if (subjectGroup) {
            const { data, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, subject_name, basket_name')
                .eq('subject_group', subjectGroup)
                .not('basket_name', 'is', null)

            if (subjectsError) throw subjectsError

            availableSubjects = data || []
        }

        const basketNames = [
            ...new Set(
                availableSubjects.map(subject => subject.basket_name)
            )
        ].sort()

        if (grade >= 6 && grade <= 9) {
            if (
                basketNames.length !== 1 ||
                basketNames[0] !== 'Aesthetics'
            ) {
                throw new Error(
                    'The Aesthetics basket is not configured correctly.'
                )
            }
        } else if (grade >= 10 && grade <= 11) {
            if (basketNames.length !== 3) {
                throw new Error(
                    `Grade ${grade} requires exactly three configured baskets.`
                )
            }
        }

        const selectedBasketNames = Object.keys(selectedSubjects).sort()

        if (
            JSON.stringify(selectedBasketNames) !==
            JSON.stringify(basketNames)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please select one subject from every required basket.'
            })
        }

        const selectionsForDatabase = []

        for (const basketName of basketNames) {
            const subjectId = String(
                selectedSubjects[basketName] || ''
            )

            if (!/^\d+$/.test(subjectId) || Number(subjectId) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Please select a valid subject from ${basketName}.`
                })
            }

            const matchingSubject = availableSubjects.find(
                subject =>
                    String(subject.id) === subjectId &&
                    subject.basket_name === basketName
            )

            if (!matchingSubject) {
                return res.status(400).json({
                    success: false,
                    message: `The selected subject does not belong to ${basketName}.`
                })
            }

            selectionsForDatabase.push({
                basket_name: basketName,
                subject_id: subjectId
            })
        }

        const { data: newStudent, error: registerError } =
            await supabase.rpc(
                'register_student_with_basket_subjects',
                {
                    p_index_number: cleanIndexNumber,
                    p_student_name: cleanStudentName,
                    p_class_id: assignedClass.id,
                    p_selected_subjects: selectionsForDatabase
                }
            )

        if (registerError) {
            if (registerError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'A student with this index number already exists.'
                })
            }

            throw registerError
        }

        return res.status(201).json({
            success: true,
            message: `${cleanStudentName} added to ${assignedClass.class_name} successfully.`,
            student: {
                ...newStudent,
                class_name: assignedClass.class_name
            }
        })

    } catch (error) {
        console.error('Add student error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to add the student. Please try again.'
        })
    }
})



// Get basket subjects according to the Class Teacher's assigned grade

router.get('/student-subject-options', verifySession, async (req, res) => {
    try {
        if (req.user?.type !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employee access required.'
            })
        }

        // Find the Class Teacher's assigned class
        const { data: assignedClass, error: classError } = await supabase
            .from('class_divisions')
            .select('id, class_name, grade')
            .eq('class_teacher_id', req.user.id)
            .maybeSingle()

        if (classError) throw classError

        if (!assignedClass) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned as a Class Teacher.'
            })
        }

        const grade = assignedClass.grade

        // A/L subject and stream options for Grades 12 and 13
        if (grade === 12 || grade === 13) {
            const [
                { data: streams, error: streamError },
                { data: subjects, error: subjectError }
            ] = await Promise.all([
                supabase
                    .from('al_streams')
                    .select('id, stream_name')
                    .order('stream_name'),

                supabase
                    .from('al_subjects')
                    .select('subject_no, subject_name, subject_type')
                    .order('subject_name')
            ])

            if (streamError) throw streamError
            if (subjectError) throw subjectError

            return res.status(200).json({
                success: true,
                grade,
                class_name: assignedClass.class_name,
                registration_type: 'AL',
                streams: streams || [],
                alSubjects: subjects || [],
                baskets: []
            })
        }

        // Existing basket subject options for other grades
        let subjectGroup = null

        if (grade >= 6 && grade <= 9) {
            subjectGroup = 'Junior Secondary'
        } else if (grade >= 10 && grade <= 11) {
            subjectGroup = 'OL'
        }

        // Grades 1–5 do not require basket selections
        if (!subjectGroup) {
            return res.status(200).json({
                success: true,
                grade,
                class_name: assignedClass.class_name,
                registration_type: 'STANDARD',
                baskets: []
            })
        }

        const { data: subjects, error: subjectsError } = await supabase
            .from('subjects')
            .select('id, subject_name, subject_group, basket_name')
            .eq('subject_group', subjectGroup)
            .not('basket_name', 'is', null)
            .order('basket_name', { ascending: true })
            .order('subject_name', { ascending: true })

        if (subjectsError) throw subjectsError

        const basketMap = {}

        subjects.forEach(subject => {
            if (!basketMap[subject.basket_name]) {
                basketMap[subject.basket_name] = []
            }

            basketMap[subject.basket_name].push({
                id: subject.id,
                subject_name: subject.subject_name
            })
        })

        const baskets = Object.entries(basketMap).map(
            ([basket_name, options]) => ({
                basket_name,
                subjects: options
            })
        )

        return res.status(200).json({
            success: true,
            grade,
            class_name: assignedClass.class_name,
            registration_type: 'STANDARD',
            subject_group: subjectGroup,
            baskets
        })

    } catch (error) {
        console.error('Student subject options error:', error)

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve subject options.'
        })
    }
})

export default router
