
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import supabase from '../supabase.js';
import {
    verifySession,
    requireAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Session duration: 7 days
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/'
};

// Create a secure random session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash the session token before storing it
function hashSessionToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

// Login
router.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body;

        if (
            typeof loginId !== 'string' ||
            typeof password !== 'string' ||
            !loginId.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your login ID and password.'
            });
        }

        const cleanLoginId = loginId.trim();

        let user = null;
        let userType = null;
        let passwordHash = null;

        // Check Administrator account first
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('id, username, password')
            .eq('username', cleanLoginId)
            .maybeSingle();

        if (adminError) throw adminError;

        if (admin) {
            user = {
                id: admin.id,
                username: admin.username,
                role: 'admin'
            };

            userType = 'admin';
            passwordHash = admin.password;

        } else {
            // Check Employee account
            const { data: employee, error: employeeError } = await supabase
                .from('employees')
                .select('id, teacher_id, full_name, designation, password, is_active')
                .eq('teacher_id', cleanLoginId)
                .maybeSingle();

            if (employeeError) throw employeeError;

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid login credentials.'
                });
            }

            // Reject inactive employee accounts
            if (!employee.is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account is inactive. Please contact the Administrator.'
                });
            }

            user = {
                id: employee.id,
                teacher_id: employee.teacher_id,
                full_name: employee.full_name,
                designation: employee.designation,
                role: 'employee'
            };

            userType = 'employee';
            passwordHash = employee.password;
        }

        // Verify password
        if (!passwordHash) {
            return res.status(401).json({
                success: false,
                message: 'Invalid login credentials.'
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Invalid login credentials.'
            });
        }

        // Generate session token
        const sessionToken = generateSessionToken();

        // Store only its SHA-256 hash
        const tokenHash = hashSessionToken(sessionToken);

        const expiresAt = new Date(
            Date.now() + SESSION_DURATION
        ).toISOString();

        const { error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                token_hash: tokenHash,
                user_type: userType,
                user_id: user.id,
                expires_at: expiresAt
            });

        if (sessionError) throw sessionError;

        // Send session token in an HttpOnly cookie
        res.cookie('sessionToken', sessionToken, SESSION_COOKIE_OPTIONS);
        return res.json({
            success: true,
            message: 'Login successful.',
            user
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to process login.'
        });
    }
});


// Get currently logged-in user
router.get('/me', verifySession, async (req, res) => {
    try {
        let user;

        if (req.user.type === 'admin') {
            const { data, error } = await supabase
                .from('admins')
                .select('id, username')
                .eq('id', req.user.id)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                return res.status(401).json({
                    success: false,
                    message: 'Account not found.'
                });
            }

            user = {
                ...data,
                role: 'admin'
            };

        } else {
            // Fetch employee details and class assignment in parallel
            const [employeeResult, classResult] = await Promise.all([
                supabase
                    .from('employees')
                    .select('id, teacher_id, full_name, designation')
                    .eq('id', req.user.id)
                    .maybeSingle(),

                supabase
                    .from('class_divisions')
                    .select('id, class_name, grade')
                    .eq('class_teacher_id', req.user.id)
                    .maybeSingle()
            ]);

            const { data, error } = employeeResult;
            const { data: assignedClass, error: classError } = classResult;

            if (error) throw error;
            if (classError) throw classError;

            if (!data) {
                return res.status(401).json({
                    success: false,
                    message: 'Account not found.'
                });
            }

            user = {
                ...data,
                role: 'employee',
                class_assignment: assignedClass || null
            };
        }

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Get user error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve account details.'
        });
    }
});


// Logout
router.post('/logout', async (req, res) => {
    try {
        const sessionToken = req.cookies?.sessionToken;

        if (sessionToken) {
            const tokenHash = hashSessionToken(sessionToken);

            const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('token_hash', tokenHash);

            if (error) throw error;
        }

        res.clearCookie('sessionToken', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/'
        });

        return res.json({
            success: true,
            message: 'Logged out successfully.'
        });

    } catch (error) {
        console.error('Logout error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to log out.'
        });
    }
});

// Employee password reset
// The Administrator must enable password reset before this endpoint can be used.
router.post('/reset-password', async (req, res) => {
    try {
        const {
            teacher_id,
            newPassword,
            confirmPassword
        } = req.body;

        // Validate the submitted details
        if (
            typeof teacher_id !== 'string' ||
            typeof newPassword !== 'string' ||
            typeof confirmPassword !== 'string' ||
            !teacher_id.trim() ||
            !newPassword ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please complete all fields.'
            });
        }

        const cleanTeacherId = teacher_id.trim();

        // Check password length
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Your new password must contain at least 8 characters.'
            });
        }

        // Check password confirmation
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'The passwords do not match.'
            });
        }

        // Find the employee and check reset permission
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, teacher_id, is_active, password_reset_enabled')
            .eq('teacher_id', cleanTeacherId)
            .maybeSingle();

        if (employeeError) throw employeeError;

        if (
            !employee ||
            !employee.is_active ||
            !employee.password_reset_enabled
        ) {
            return res.status(403).json({
                success: false,
                message: 'Password reset is not enabled for this account. Please contact the Administrator.'
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and disable reset permission
        // The extra condition prevents using the same permission twice.
        const { data: updatedEmployee, error: updateError } = await supabase
            .from('employees')
            .update({
                password: hashedPassword,
                password_reset_enabled: false
            })
            .eq('id', employee.id)
            .eq('password_reset_enabled', true)
            .select('id')
            .maybeSingle();

        if (updateError) throw updateError;

        if (!updatedEmployee) {
            return res.status(403).json({
                success: false,
                message: 'Password reset is no longer enabled. Please contact the Administrator.'
            });
        }

        // Revoke all existing sessions for this employee
        const { error: sessionError } = await supabase
            .from('user_sessions')
            .delete()
            .eq('user_type', 'employee')
            .eq('user_id', employee.id);

        if (sessionError) throw sessionError;

        return res.status(200).json({
            success: true,
            message: 'Your password has been changed successfully. Please log in using your new password.'
        });

    } catch (error) {
        console.error('Password reset error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to reset your password. Please try again.'
        });
    }
});


// Update Administrator Username
router.put(
    '/admin/update-username',
    verifySession,
    requireAdmin,
    async (req, res) => {
        try {
            const { newUsername, currentPassword } = req.body;

            if (
                typeof newUsername !== 'string' ||
                typeof currentPassword !== 'string' ||
                !newUsername.trim() ||
                !currentPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please complete all fields.'
                });
            }

            const cleanUsername = newUsername.trim();

            if (cleanUsername.length < 3 || cleanUsername.length > 30) {
                return res.status(400).json({
                    success: false,
                    message: 'Username must contain 3–30 characters.'
                });
            }

            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .select('id, username, password')
                .eq('id', req.user.id)
                .maybeSingle();

            if (adminError) throw adminError;

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator account not found.'
                });
            }

            const passwordMatches = await bcrypt.compare(
                currentPassword,
                admin.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect.'
                });
            }

            const { data: existingAdmin, error: existingError } = await supabase
                .from('admins')
                .select('id')
                .eq('username', cleanUsername)
                .neq('id', admin.id)
                .maybeSingle();

            if (existingError) throw existingError;

            if (existingAdmin) {
                return res.status(409).json({
                    success: false,
                    message: 'This username is already in use.'
                });
            }

            const { error: updateError } = await supabase
                .from('admins')
                .update({ username: cleanUsername })
                .eq('id', admin.id);

            if (updateError) throw updateError;

            return res.json({
                success: true,
                message: 'Username updated successfully.',
                username: cleanUsername
            });

        } catch (error) {
            console.error('Admin username update error:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to update username.'
            });
        }
    }
);


// Update Administrator Password
router.put(
    '/admin/update-password',
    verifySession,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                currentPassword,
                newPassword,
                confirmPassword
            } = req.body;

            if (
                typeof currentPassword !== 'string' ||
                typeof newPassword !== 'string' ||
                typeof confirmPassword !== 'string' ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please complete all fields.'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must contain at least 8 characters.'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New passwords do not match.'
                });
            }

            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .select('id, password')
                .eq('id', req.user.id)
                .maybeSingle();

            if (adminError) throw adminError;

            if (!admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator account not found.'
                });
            }

            const passwordMatches = await bcrypt.compare(
                currentPassword,
                admin.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect.'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);

            const { error: updateError } = await supabase
                .from('admins')
                .update({ password: hashedPassword })
                .eq('id', admin.id);

            if (updateError) throw updateError;

            return res.json({
                success: true,
                message: 'Password updated successfully.'
            });

        } catch (error) {
            console.error('Admin password update error:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to update password.'
            });
        }
    }
);


export default router;
