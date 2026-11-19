
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

import employeeRoutes from './routes/employeeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js'
import subjectRoutes from './routes/subjectRoutes.js';
import termTestRoutes from './routes/termTestRoutes.js'
import subjectSettingsRoutes from './routes/subjectSettings.js'
import studentPerformanceRoutes from './routes/studentPerformance.js'
import studentProgressReportRoutes from './routes/studentProgressReportRoutes.js'
import classAnalysisRoutes from './routes/classAnalysisRoutes.js'
import scholarshipExamRoutes from './routes/scholarshipExamRoutes.js'
import olExamRoutes from './routes/olExamRoutes.js'
import alExamRoutes from './routes/alExamRoutes.js'
import promotionRoutes from './routes/promotionRoutes.js'


const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use('/api/student-performance', studentPerformanceRoutes)
app.use('/api/student-progress-reports', studentProgressReportRoutes)
app.use('/api/class-analysis', classAnalysisRoutes)
app.use('/api/scholarship-exams', scholarshipExamRoutes)
app.use('/api/ol-results', olExamRoutes)
app.use('/api/al-results', alExamRoutes)
app.use('/api/promotion', promotionRoutes)

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({
        message: 'Marks Analysis API is running!'
    });
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
