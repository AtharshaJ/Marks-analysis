import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../supabase.js';
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

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

export default router;