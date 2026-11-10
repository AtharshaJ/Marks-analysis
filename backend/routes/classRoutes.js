
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

export default router
