import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js';
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all employees - Administrator only
router.get('/', verifySession, requireAdmin, async (req, res) => {
    try {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('id, teacher_id, full_name, designation, is_active, password_reset_enabled')
            .order('id', { ascending: true });

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            employees
        });

    } catch (error) {
        console.error('Fetching employees error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve employee list.'
        });
    }
});

// Create a new employee
// Only logged-in Administrators can access this endpoint
router.post('/add', verifySession, requireAdmin, async (req, res) => {
    try {
        const {
            teacher_id,
            full_name,
            designation,
            custom_designation
        } = req.body;

        // Validate required fields
        if (!teacher_id || !full_name || !designation) {
            return res.status(400).json({
                success: false,
                message: 'Please provide TR ID, full name and designation.'
            });
        }

        const cleanTeacherId = String(teacher_id).trim();
        const cleanFullName = String(full_name).trim();

        // Determine final designation
        const finalDesignation =
            designation === 'Other'
                ? String(custom_designation || '').trim()
                : String(designation).trim();

        if (!cleanFullName || !finalDesignation) {
            return res.status(400).json({
                success: false,
                message: 'Please enter valid employee details.'
            });
        }

        // Step 1: Insert employee and obtain auto-generated ID
        const { data: employee, error: insertError } = await supabase
            .from('employees')
            .insert({
                teacher_id: cleanTeacherId,
                full_name: cleanFullName,
                designation: finalDesignation
            })
            .select('id, teacher_id, full_name, designation')
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'An employee with this TR ID already exists.'
                });
            }

            throw insertError;
        }

        // Step 2: Generate password using employee name and auto ID
        const namePart = cleanFullName
            .replace(/\s+/g, '')
            .slice(0, 5)
            .toLowerCase();

        const generatedPassword = namePart + employee.id;

        // Step 3: Hash password
        const hashedPassword = await bcrypt.hash(generatedPassword, 12);

        // Step 4: Update employee record with password hash
        const { error: updateError } = await supabase
            .from('employees')
            .update({ password: hashedPassword })
            .eq('id', employee.id);

        if (updateError) {
            throw updateError;
        }

        // Step 5: Return initial password once
        return res.status(201).json({
            success: true,
            message: 'Employee created successfully.',
            employee,
            initialPassword: generatedPassword
        });

    } catch (error) {
        console.error('Employee creation error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to create employee.'
        });
    }
});

// Enable or disable password reset for an employee
// Only logged-in Administrators can access this endpoint
router.patch('/:id/password-reset', verifySession, requireAdmin, async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const { enabled } = req.body;

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid reset status.'
            });
        }

        const { data: employee, error } = await supabase
            .from('employees')
            .update({ password_reset_enabled: enabled })
            .eq('id', employeeId)
            .select('id, teacher_id, full_name, password_reset_enabled')
            .maybeSingle();

        if (error) throw error;

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: enabled
                ? 'Password reset enabled for this employee.'
                : 'Password reset disabled for this employee.',
            employee
        });

    } catch (error) {
        console.error('Password reset permission error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update password reset permission.'
        });
    }
});

// Activate or deactivate an employee account
// Only the Administrator can access this endpoint
router.patch('/:id/status', verifySession, requireAdmin, async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const { is_active } = req.body;

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid employee ID.'
            });
        }

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid account status.'
            });
        }

        const updateData = {
            is_active,
            ...(is_active ? {} : { password_reset_enabled: false })
        };

        const { data: employee, error } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', employeeId)
            .select('id, teacher_id, full_name, designation, is_active, password_reset_enabled')
            .maybeSingle();

        if (error) throw error;

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found.'
            });
        }

        // Revoke all existing sessions when an account is deactivated
        if (!is_active) {
            const { error: sessionError } = await supabase
                .from('user_sessions')
                .delete()
                .eq('user_type', 'employee')
                .eq('user_id', employeeId);

            if (sessionError) throw sessionError;
        }

        return res.status(200).json({
            success: true,
            message: is_active
                ? 'Employee account activated successfully.'
                : 'Employee account deactivated successfully.',
            employee
        });

    } catch (error) {
        console.error('Account status update error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update employee account status.'
        });
    }
});

export default router;