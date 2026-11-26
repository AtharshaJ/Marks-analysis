
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './StudentProgressReport.css'
import API_URL from '../config';

function StudentProgressReport({ user }) {
    const { classId, studentId } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const API_BASE_URL = API_URL;

    const yearId = searchParams.get('yearId')
    const termId = searchParams.get('termId')

    const [report, setReport] = useState(null)
    const [performanceSummary, setPerformanceSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchReport = async () => {
            if (!termId) {
                setError('No academic term was selected.')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError('')

                const [reportResponse, summaryResponse] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/student-progress-reports/${classId}/students/${studentId}?termId=${termId}`,
                        { credentials: 'include' }
                    ),
                    fetch(
                        `${API_BASE_URL}/api/student-performance/${classId}/students/${studentId}/summary?termId=${termId}`,
                        { credentials: 'include' }
                    )
                ])

                const [reportResult, summaryResult] = await Promise.all([
                    reportResponse.json(),
                    summaryResponse.json()
                ])

                if (!reportResponse.ok) {
                    throw new Error(
                        reportResult.message || 'Unable to load student report.'
                    )
                }

                if (!summaryResponse.ok) {
                    throw new Error(
                        summaryResult.message || 'Unable to load performance summary.'
                    )
                }

                setReport(reportResult)
                setPerformanceSummary(summaryResult.summary)

            } catch (err) {
                console.error('Student progress report error:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchReport()
    }, [classId, studentId, termId])

    if (loading) {
        return <div className="progress-report-message">Loading report...</div>
    }

    if (error) {
        return (
            <div className="progress-report-message progress-report-error">
                {error}
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        )
    }

    if (!report) {
        return <div className="progress-report-message">Report not found.</div>
    }

    const { student, class: studentClass, academicTerm, subjects, marks } = report

    const markMap = {}
    marks.forEach(mark => {
        const key = mark.subject_id
            ? `regular-${mark.subject_id}`
            : `al-${mark.al_subject_no}`

        markMap[key] = mark.marks
    })

    const getSubjectKey = subject =>
        subject.subject_type === 'al'
            ? `al-${subject.al_subject_no}`
            : `regular-${subject.subject_id}`

    const formatMark = value =>
        value === undefined || value === null ? '—' : value

    return (
        <div className="progress-report-page">
            <div className="progress-report-actions">
                <button onClick={() => navigate(-1)}>Back</button>
                <button onClick={() => window.print()}>Print Report</button>
            </div>

            <article className="progress-report-paper">
                <header className="progress-report-heading">

                    <img
                        src="/school-logo.jpg"
                        alt="School Logo"
                        className="progress-report-logo"
                    />

                    <h1>Thondaimanaru Veerakaththipillai Maha Vidyalayam</h1>

                    <h2>STUDENT PROGRESS REPORT</h2>

                </header>
                <section className="progress-report-student-info">
                    <div>
                        <strong>Student Name:</strong> {student.student_name}
                    </div>
                    <div>
                        <strong>Index Number:</strong> {student.index_number}
                    </div>
                    <div>
                        <strong>Class:</strong> {studentClass.class_name}
                    </div>
                    <div>
                        <strong>Academic Year:</strong> {academicTerm.academic_year?.year || yearId || '—'}
                    </div>
                    <div>
                        <strong>Term:</strong> {academicTerm.term_name}
                    </div>
                </section>

                <table className="progress-report-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Subject</th>
                            <th>Student's Marks</th>
                            <th>Class Highest</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subject, index) => {
                            const key = getSubjectKey(subject)

                            return (
                                <tr key={key}>
                                    <td>{index + 1}</td>
                                    <td>{subject.subject_name}</td>
                                    <td>{formatMark(markMap[key])}</td>
                                    <td>{formatMark(subject.highest_mark)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <section className="progress-report-summary">
                    <h3>Overall Performance</h3>

                    {performanceSummary?.status === 'complete' ? (
                        <div className="progress-report-summary-grid">
                            <div>
                                <span>Total</span>
                                <strong>{performanceSummary.total}</strong>
                            </div>
                            <div>
                                <span>Average</span>
                                <strong>{performanceSummary.average}</strong>
                            </div>
                            <div>
                                <span>Class Rank</span>
                                <strong>{performanceSummary.classRank}</strong>
                            </div>
                            <div>
                                <span>Division Rank</span>
                                <strong>{performanceSummary.divisionRank}</strong>
                            </div>
                        </div>
                    ) : (
                        <p>
                            Performance summary pending — marks entered for{' '}
                            {performanceSummary?.completedSubjectCount ?? 0} of{' '}
                            {performanceSummary?.requiredSubjectCount ?? 0} required subjects.
                        </p>
                    )}
                </section>

                <section className="progress-report-remarks">
                    <strong>Class Teacher's Remarks:</strong>
                    <div></div>
                </section>

                <section className="progress-report-signatures">
                    <div>
                        <span>Class Teacher</span>
                        <small>Signature: __________________</small>
                        <small>Date: __________________</small>
                    </div>
                    <div>
                        <span>Principal</span>
                        <small>Signature: __________________</small>
                        <small>Date: __________________</small>
                    </div>
                    <div>
                        <span>Parent / Guardian</span>
                        <small>Signature: __________________</small>
                        <small>Date: __________________</small>
                    </div>
                </section>
            </article>
        </div>
    )
}

export default StudentProgressReport
