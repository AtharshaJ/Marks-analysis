
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './supabase.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js'
import subjectRoutes from './routes/subjectRoutes.js';
import termTestRoutes from './routes/termTestRoutes.js'
import subjectSettingsRoutes from './routes/subjectSettings.js'

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/employees', employeeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes)
app.use('/api/subjects', subjectRoutes);
app.use('/api/term-tests', termTestRoutes)
app.use('/api/subject-settings', subjectSettingsRoutes)

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({
        message: 'Marks Analysis API is running!'
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('teacher_id')
            .limit(1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Supabase database connected successfully!',
            data
        });

    } catch (error) {
        console.error('Database connection error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
