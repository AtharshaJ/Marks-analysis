
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './StudentProgressReport.css'

function PrintAllStudentReports({ user }) {
    const { classId } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const yearId = searchParams.get('yearId')
    const termId = searchParams.get('termId')

    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false

        const fetchAllReports = async () => {
            if (!termId) {
                setError('Please select an academic term first.')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError('')

                // Fetch all active students in the selected class.
               const studentsResponse = await fetch(
    `${API_BASE_URL}/api/term-tests/${classId}/students`,
    {
        credentials: 'include',
        cache: 'no-store'
    }
)

                const studentsResult = await studentsResponse.json()

                if (!studentsResponse.ok) {
                    throw new Error(
                        studentsResult.message || 'Unable to load students.'
                    )
                }

                const students = studentsResult.students || []

                if (students.length === 0) {
                    throw new Error('There are no active students in this class.')
                }

                // Fetch each student's report and performance summary.
                const allReports = await Promise.all(
                    students.map(async student => {
                        const [reportResponse, summaryResponse] =
                            await Promise.all([
                                fetch(
                                    `${API_BASE_URL}/api/student-progress-reports/${classId}/students/${student.id}?termId=${termId}`,
                                    { credentials: 'include' }
                                ),
                                fetch(
                                    `${API_BASE_URL}/api/student-performance/${classId}/students/${student.id}/summary?termId=${termId}`,
                                    { credentials: 'include' }
                                )
                            ])

                        const [reportResult, summaryResult] =
                            await Promise.all([
                                reportResponse.json(),
                                summaryResponse.json()
                            ])

                        if (!reportResponse.ok) {
                            throw new Error(
                                `Report failed for ${student.student_name}: ${reportResult.message || 'Unknown error'}`
                            )
                        }

                        if (!summaryResponse.ok) {
                            throw new Error(
                                `Performance summary failed for ${student.student_name}: ${summaryResult.message || 'Unknown error'}`
                            )
                        }

                        return {
                            report: reportResult,
                            performanceSummary: summaryResult.summary
                        }
                    })
                )

                if (!cancelled) {
                    setReports(allReports)
                }

            } catch (err) {
                console.error('Print all reports error:', err)

                if (!cancelled) {
                    setError(err.message)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchAllReports()

        return () => {
            cancelled = true
        }
    }, [classId, termId])

    useEffect(() => {
    if (!loading && !error && reports.length > 0) {
        window.print()
    }
}, [loading, error, reports])

    if (loading) {
        return (
            <div className="progress-report-message">
                Preparing student reports... Please wait.
            </div>
        )
    }

    if (error) {
        return (
            <div className="progress-report-message progress-report-error">
                <p>{error}</p>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        )
    }

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
                <button onClick={() => window.print()}>
                    Print All Reports
                </button>
            </div>

            {reports.map(({ report, performanceSummary }) => {
                const {
                    student,
                    class: studentClass,
                    academicTerm,
                    subjects,
                    marks
                } = report

                const markMap = {}

                marks.forEach(mark => {
                    const key = mark.subject_id
                        ? `regular-${mark.subject_id}`
                        : `al-${mark.al_subject_no}`

                    markMap[key] = mark.marks
                })

                return (
                    <article
                        className="progress-report-paper"
                        key={student.id}
                    >
                        <header className="progress-report-heading">
                            <h1>
                                Thondaimanaru Veerakaththipillai Maha Vidyalayam
                            </h1>
                            <h2>STUDENT PROGRESS REPORT</h2>
                        </header>

                        <section className="progress-report-student-info">
                            <div>
                                <strong>Student Name:</strong>{' '}
                                {student.student_name}
                            </div>
                            <div>
                                <strong>Index Number:</strong>{' '}
                                {student.index_number}
                            </div>
                            <div>
                                <strong>Class:</strong>{' '}
                                {studentClass.class_name}
                            </div>
                            <div>
                                <strong>Academic Year:</strong>{' '}
                                {academicTerm.academic_years?.year || yearId || '—'}
                            </div>
                            <div>
                                <strong>Term:</strong>{' '}
                                {academicTerm.term_name}
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
                                            <td>
                                                {formatMark(subject.highest_mark)}
                                            </td>
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
                                    {performanceSummary?.completedSubjectCount ?? 0}{' '}
                                    of{' '}
                                    {performanceSummary?.requiredSubjectCount ?? 0}{' '}
                                    required subjects.
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
                )
            })}
        </div>
    )
}

export default PrintAllStudentReports
