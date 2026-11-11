
import express from 'express';
import supabase from '../supabase.js';
import { verifySession, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all subject management data
router.get('/', verifySession, requireAdmin, async (req, res) => {
    try {
        const [
            groupsResult,
            streamsResult,
            basketsResult,
            subjectsResult,
            alSubjectsResult
        ] = await Promise.all([
            supabase
                .from('subject_groups')
                .select('id, group_name')
                .order('id'),

            supabase
                .from('al_streams')
                .select('id, stream_name')
                .order('id'),

            supabase
                .from('subject_baskets')
                .select('id, group_id, stream_id, basket_name')
                .order('id'),

            supabase
                .from('subjects')
                .select('id, subject_name, subject_group, basket_id')
                .neq('subject_group', 'AL')
                .order('subject_name'),

            supabase
                .from('al_subjects')
                .select('subject_no, subject_name, subject_type')
                .order('subject_no')
        ]);

        const errors = [
            groupsResult.error,
            streamsResult.error,
            basketsResult.error,
            subjectsResult.error,
            alSubjectsResult.error
        ].filter(Boolean);

        if (errors.length > 0) throw errors[0];

        res.json({
            success: true,
            groups: groupsResult.data,
            streams: streamsResult.data,
            baskets: basketsResult.data,
            subjects: subjectsResult.data,
            alSubjects: alSubjectsResult.data
        });

    } catch (error) {
        console.error('Subject data loading error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to load subject information.'
        });
    }
});


// Add a Primary, Junior Secondary or O/L subject
router.post('/', verifySession, requireAdmin, async (req, res) => {
    try {
        const { subject_name, subject_group, basket_id, stream_id } = req.body;

        if (typeof subject_name !== 'string' || !subject_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Subject name is required.'
            });
        }

        const allowedGroups = [
            'Primary',
            'Junior Secondary',
            'OL'
        ];

        if (!allowedGroups.includes(subject_group)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject group. Use the separate A/L subject form for A/L subjects.'
            });
        }

        // Compulsory subjects cannot belong to a basket or stream
        if (basket_id === undefined || basket_id === null) {
            if (stream_id !== undefined && stream_id !== null) {
                return res.status(400).json({
                    success: false,
                    message: 'Compulsory subjects cannot be assigned to a stream.'
                });
            }
        } else {
            const { data: basket, error: basketError } = await supabase
                .from('subject_baskets')
                .select(`
                    id,
                    stream_id,
                    subject_groups!inner(group_name)
                `)
                .eq('id', basket_id)
                .maybeSingle();

            if (basketError) throw basketError;

            if (!basket) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected basket does not exist.'
                });
            }

            if (basket.subject_groups.group_name !== subject_group) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected basket does not belong to this subject group.'
                });
            }

            if (basket.stream_id !== null) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid stream assignment for this subject group.'
                });
            }
        }

        const { data: subject, error } = await supabase
            .from('subjects')
            .insert({
                subject_name: subject_name.trim(),
                subject_group,
                basket_id: basket_id ?? null,
                
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This subject already exists in the selected group or basket.'
                });
            }

            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Subject added successfully.',
            subject
        });

    } catch (error) {
        console.error('Subject creation error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to add subject.'
        });
    }
});


// Add a new A/L subject
router.post('/al', verifySession, requireAdmin, async (req, res) => {
    try {
        const { subject_no, subject_name, subject_type } = req.body;

        if (
            typeof subject_no !== 'string' ||
            !subject_no.trim() ||
            typeof subject_name !== 'string' ||
            !subject_name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Subject number and subject name are required.'
            });
        }

        if (!['Common', 'Choice'].includes(subject_type)) {
            return res.status(400).json({
                success: false,
                message: 'Subject type must be Common or Choice.'
            });
        }

        const { data: subject, error } = await supabase
            .from('al_subjects')
            .insert({
                subject_no: subject_no.trim(),
                subject_name: subject_name.trim(),
                subject_type
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This A/L subject number already exists.'
                });
            }

            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'A/L subject added successfully.',
            subject
        });

    } catch (error) {
        console.error('A/L subject creation error:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint
});

        res.status(500).json({
            success: false,
            message: 'Unable to add A/L subject.'
        });
    }
});


// Edit an existing A/L subject
router.patch('/al/:subject_no', verifySession, requireAdmin, async (req, res) => {
    try {
        const oldSubjectNo = req.params.subject_no;

        const { subject_no, subject_name, subject_type } = req.body;

        if (
            typeof subject_no !== 'string' ||
            !subject_no.trim() ||
            typeof subject_name !== 'string' ||
            !subject_name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: 'Subject number and subject name are required.'
            });
        }

        if (!['Common', 'Choice'].includes(subject_type)) {
            return res.status(400).json({
                success: false,
                message: 'Subject type must be Common or Choice.'
            });
        }

        const { data: subject, error } = await supabase
            .from('al_subjects')
            .update({
                subject_no: subject_no.trim(),
                subject_name: subject_name.trim(),
                subject_type
            })
            .eq('subject_no', oldSubjectNo)
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This A/L subject number is already in use.'
                });
            }

            throw error;
        }

        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'A/L subject not found.'
            });
        }

        res.json({
            success: true,
            message: 'A/L subject updated successfully.',
            subject
        });

    } catch (error) {
        console.error('A/L subject update error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to update A/L subject.'
        });
    }
});


// Add a new A/L stream
router.post('/streams', verifySession, requireAdmin, async (req, res) => {
    try {
        const { stream_name } = req.body;

        if (typeof stream_name !== 'string' || !stream_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Stream name is required.'
            });
        }

        const { data: stream, error } = await supabase
            .from('al_streams')
            .insert({
                stream_name: stream_name.trim()
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This A/L stream already exists.'
                });
            }

            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'A/L stream added successfully.',
            stream
        });

    } catch (error) {
        console.error('A/L stream creation error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to add A/L stream.'
        });
    }
});


// Rename an existing A/L stream
router.patch('/streams/:id', verifySession, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { stream_name } = req.body;

        if (typeof stream_name !== 'string' || !stream_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Stream name is required.'
            });
        }

        const { data: stream, error } = await supabase
            .from('al_streams')
            .update({
                stream_name: stream_name.trim()
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'This A/L stream name is already in use.'
                });
            }

            throw error;
        }

        if (!stream) {
            return res.status(404).json({
                success: false,
                message: 'A/L stream not found.'
            });
        }

        res.json({
            success: true,
            message: 'A/L stream renamed successfully.',
            stream
        });

    } catch (error) {
        console.error('A/L stream update error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to rename A/L stream.'
        });
    }
});


// Rename an existing Primary, Junior Secondary or O/L subject
router.patch('/:id', verifySession, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { subject_name } = req.body;

        if (typeof subject_name !== 'string' || !subject_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'New subject name is required.'
            });
        }

        const { data: subject, error } = await supabase
            .from('subjects')
            .update({
                subject_name: subject_name.trim()
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'A subject with this name already exists in the selected group or basket.'
                });
            }

            throw error;
        }

        if (!subject) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found.'
            });
        }

        res.json({
            success: true,
            message: 'Subject renamed successfully.',
            subject
        });

    } catch (error) {
        console.error('Subject rename error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to rename subject.'
        });
    }
});

export default router;
