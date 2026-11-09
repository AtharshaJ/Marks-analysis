
import crypto from 'crypto';
import supabase from '../supabase.js';

// Hash the session token
function hashSessionToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

// Verify whether the user has an active session
export async function verifySession(req, res, next) {
    try {
        const sessionToken = req.cookies?.sessionToken;

        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to continue.'
            });
        }

        const tokenHash = hashSessionToken(sessionToken);

        const { data: session, error } = await supabase
            .from('user_sessions')
            .select('id, user_type, user_id, expires_at')
            .eq('token_hash', tokenHash)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (error) throw error;

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.'
            });
        }

        req.user = {
            id: session.user_id,
            type: session.user_type
        };

        req.sessionId = session.id;

        next();

    } catch (error) {
        console.error('Session verification error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to verify your session.'
        });
    }
}

// Check whether the logged-in user is an Administrator
export function requireAdmin(req, res, next) {
    if (req.user?.type !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Administrator access required.'
        });
    }

    next();
}
