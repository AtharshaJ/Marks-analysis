
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import supabase from '../supabase.js';
import { verifySession } from '../middleware/authMiddleware.js';

const router = express.Router();

// Session duration: 7 days
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

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
                .select('id, teacher_id, full_name, designation, password')
                .eq('teacher_id', cleanLoginId)
                .maybeSingle();

            if (employeeError) throw employeeError;

            if (!employee) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid login credentials.'
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
        res.cookie('sessionToken', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_DURATION,
            path: '/'
        });

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
            const { data, error } = await supabase
                .from('employees')
                .select('id, teacher_id, full_name, designation')
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
                role: 'employee'
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
            secure: process.env.NODE_ENV === 'production',
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

export default router;
