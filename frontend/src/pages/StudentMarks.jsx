
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import './StudentMarks.css'
import API_URL from '../config';


function StudentMarks({ user }) {
    const { classId, studentId } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const API_BASE_URL = API_URL;



    const [student, setStudent] = useState(null)
    const [selectedClass, setSelectedClass] = useState(null)
    const [classStudents, setClassStudents] = useState([])
    const [subjects, setSubjects] = useState([])
    const [selectedYearId] = useState(searchParams.get('yearId') || '')
    const [selectedTermId] = useState(searchParams.get('termId') || '')

    const [marks, setMarks] = useState({})
    const [marksLoading, setMarksLoading] = useState(false)
    const [marksError, setMarksError] = useState('')

    const [performanceSummary, setPerformanceSummary] = useState(null)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState('')

    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const currentStudentIndex = classStudents.findIndex(
        item => String(item.id) === String(studentId)
    )

    const previousStudent =
        currentStudentIndex > 0
            ? classStudents[currentStudentIndex - 1]
            : null

    const nextStudent =
        currentStudentIndex >= 0 && currentStudentIndex < classStudents.length - 1
            ? classStudents[currentStudentIndex + 1]
            : null

    const navigateToStudent = (targetStudent) => {
        if (!targetStudent) return

        navigate(
            `/employee/term-tests/${classId}/students/${targetStudent.id}?yearId=${selectedYearId}&termId=${selectedTermId}`
        )
    }

    // Load student, subjects and academic years
    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setLoading(true)
                setError('')

                const [
                    studentsResponse,
                    subjectsResponse
                ] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students`,
                        { credentials: 'include' }
                    ),
                    fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/subjects`,
                        { credentials: 'include' }
                    )
                ])

                const [
                    studentsResult,
                    subjectsResult
                ] = await Promise.all([
                    studentsResponse.json(),
                    subjectsResponse.json()
                ])

                if (!studentsResponse.ok) {
                    throw new Error(
                        studentsResult.message || 'Unable to load student.'
                    )
                }

                if (!subjectsResponse.ok) {
                    throw new Error(
                        subjectsResult.message || 'Unable to load subjects.'
                    )
                }



                const currentStudent = studentsResult.students.find(
                    item => String(item.id) === String(studentId)
                )

                if (!currentStudent) {
                    throw new Error('Student not found in this class.')
                }

                setStudent(currentStudent)
                setSelectedClass(studentsResult.class)
                setClassStudents(studentsResult.students || [])
                setSubjects(subjectsResult.subjects || [])

            } catch (error) {
                console.error('Student marks page error:', error)
                setError(error.message)
            } finally {
                setLoading(false)
            }
        }

        fetchPageData()
    }, [classId, studentId])

    // Load saved marks whenever the selected term changes
    useEffect(() => {
        const fetchMarks = async () => {
            if (!selectedTermId) {
                setMarks({})
                setMarksError('')
                return
            }

            try {
                setMarksLoading(true)
                setMarksError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/marks?termId=${selectedTermId}`,
                    { credentials: 'include' }
                )

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.message || 'Unable to load saved marks.'
                    )
                }

                const savedMarks = {}

                result.marks.forEach(mark => {
                    const key = mark.subject_id
                        ? `regular-${mark.subject_id}`
                        : `al-${mark.al_subject_no}`

                    savedMarks[key] = String(mark.marks)
                })

                setMarks(savedMarks)

            } catch (error) {
                console.error('Error loading marks:', error)
                setMarksError(error.message)
            } finally {
                setMarksLoading(false)
            }
        }

        fetchMarks()
    }, [classId, studentId, selectedTermId])

    // Load performance summary whenever the selected term changes
    useEffect(() => {
        const fetchPerformanceSummary = async () => {
            if (!selectedTermId) {
                setPerformanceSummary(null)
                setSummaryError('')
                return
            }

            try {
                setSummaryLoading(true)
                setSummaryError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/student-performance/${classId}/students/${studentId}/summary?termId=${selectedTermId}`,
                    { credentials: 'include' }
                )

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.message || 'Unable to load performance summary.'
                    )
                }

                setPerformanceSummary(result.summary)

            } catch (error) {
                console.error('Error loading performance summary:', error)
                setSummaryError(error.message)
                setPerformanceSummary(null)
            } finally {
                setSummaryLoading(false)
            }
        }

        fetchPerformanceSummary()
    }, [classId, studentId, selectedTermId])



    const handleSaveMarks = async () => {
        if (!selectedYearId || !selectedTermId) {
            setSaveMessage('Please select an academic year and term.')
            return
        }

        const marksToSave = subjects.map(subject => {
            const key = subject.subject_type === 'al'
                ? `al-${subject.al_subject_no}`
                : `regular-${subject.subject_id}`

            return {
                subject_id: subject.subject_type === 'al'
                    ? null
                    : subject.subject_id,

                al_subject_no: subject.subject_type === 'al'
                    ? subject.al_subject_no
                    : null,

                marks: marks[key] ?? ''
            }
        })

        try {
            setSaving(true)
            setSaveMessage('')

            const response = await fetch(
                `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/marks`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        termId: Number(selectedTermId),
                        marks: marksToSave
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to save marks.')
            }

            setSaveMessage('Marks saved successfully!')

            setSummaryLoading(true)
            setSummaryError('')

            // Refresh summary and saved marks simultaneously
            try {
                const [summaryResponse, marksResponse] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/student-performance/${classId}/students/${studentId}/summary?termId=${selectedTermId}`,
                        { credentials: 'include' }
                    ),
                    fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/marks?termId=${selectedTermId}`,
                        { credentials: 'include' }
                    )
                ])

                const [summaryResult, marksResult] = await Promise.all([
                    summaryResponse.json(),
                    marksResponse.json()
                ])

                if (summaryResponse.ok) {
                    setPerformanceSummary(summaryResult.summary)
                } else {
                    setSummaryError(
                        summaryResult.message || 'Unable to refresh performance summary.'
                    )
                }

                if (marksResponse.ok) {
                    const savedMarks = {}

                    marksResult.marks.forEach(mark => {
                        const key = mark.subject_id
                            ? `regular-${mark.subject_id}`
                            : `al-${mark.al_subject_no}`

                        savedMarks[key] = String(mark.marks)
                    })

                    setMarks(savedMarks)
                }

            } finally {
                setSummaryLoading(false)
            }

        } catch (error) {
            console.error('Error saving marks:', error)
            setSaveMessage(error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="student-marks-page">

            <header className="student-marks-header">
                <div className="student-marks-brand">
                    <div className="student-marks-brand-icon">MA</div>

                    <div>
                        <h2>Marks <span>Analysis</span></h2>
                        <p>Teacher Portal</p>
                    </div>
                </div>
                <button
                    className="student-marks-back-btn"
                    onClick={() =>
                        navigate(
                            `/employee/term-tests/${classId}/students?yearId=${selectedYearId}&termId=${selectedTermId}`
                        )
                    }
                >
                    ← Back to Student List
                </button>
            </header>

            <main className="student-marks-main">

                <div className="student-marks-title">
                    <span>TERM TEST MANAGEMENT</span>
                    <h1>Student Marks</h1>
                    <p>View and manage individual student term test marks.</p>
                </div>

                {loading ? (
                    <div className="student-marks-message">
                        Loading student information...
                    </div>
                ) : error ? (
                    <div className="student-marks-error">
                        {error}
                    </div>
                ) : (
                    <>
                        <section className="student-marks-profile">

                            <h2>Student Information</h2>

                            <div className="student-marks-profile-grid">

                                <div>
                                    <span>Student Name</span>
                                    <strong>{student?.student_name}</strong>
                                </div>

                                <div>
                                    <span>Index Number</span>
                                    <strong>{student?.index_number}</strong>
                                </div>

                                <div>
                                    <span>Class</span>
                                    <strong>{selectedClass?.class_name}</strong>
                                </div>

                                <div>
                                    <span>Teacher</span>
                                    <strong>{user.full_name}</strong>
                                </div>

                            </div>

                            <div className="student-navigation">
                                <button
                                    type="button"
                                    onClick={() => navigateToStudent(previousStudent)}
                                    disabled={!previousStudent}
                                >
                                    ← Previous Student
                                </button>

                                <span>
                                    Student {currentStudentIndex + 1} of {classStudents.length}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => navigateToStudent(nextStudent)}
                                    disabled={!nextStudent}
                                >
                                    Next Student →
                                </button>
                            </div>

                        </section>

                        <section className="student-performance-summary">

                            <h2>Performance Summary</h2>

                            {!selectedTermId ? (
                                <p>Please select an academic term to view the summary.</p>
                            ) : summaryLoading ? (
                                <p>Calculating performance summary...</p>
                            ) : summaryError ? (
                                <p className="student-marks-error">{summaryError}</p>
                            ) : performanceSummary?.status === 'pending' ? (
                                <p>
                                    Pending — Marks entered for{' '}
                                    {performanceSummary.completedSubjectCount} of{' '}
                                    {performanceSummary.requiredSubjectCount} required subjects.
                                </p>
                            ) : performanceSummary?.status === 'complete' ? (
                                <div className="student-performance-grid">

                                    <div className="student-performance-card">
                                        <span>Total</span>
                                        <strong>{performanceSummary.total}</strong>
                                    </div>

                                    <div className="student-performance-card">
                                        <span>Average</span>
                                        <strong>{performanceSummary.average}</strong>
                                    </div>

                                    <div className="student-performance-card">
                                        <span>Class Rank</span>
                                        <strong>{performanceSummary.classRank}</strong>
                                    </div>

                                    <div className="student-performance-card">
                                        <span>Division Rank</span>
                                        <strong>{performanceSummary.divisionRank}</strong>
                                    </div>

                                </div>
                            ) : (
                                <p>Performance summary is not available.</p>
                            )}

                        </section>

                        <section className="student-marks-entry">

                            <h2>Term Test Marks</h2>



                            <div className="student-marks-subjects">
                                <h3>Subjects</h3>

                                {!selectedTermId ? (
                                    <p>Please select an academic year and term to enter marks.</p>
                                ) : marksLoading ? (
                                    <p>Loading saved marks...</p>
                                ) : marksError ? (
                                    <p className="student-marks-error">{marksError}</p>
                                ) : subjects.length === 0 ? (
                                    <p>No registered subjects found.</p>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>No.</th>
                                                <th>Subject</th>
                                                <th>Marks</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {subjects.map((subject, index) => {
                                                const key = subject.subject_type === 'al'
                                                    ? `al-${subject.al_subject_no}`
                                                    : `regular-${subject.subject_id}`

                                                return (
                                                    <tr key={key}>
                                                        <td>{index + 1}</td>
                                                        <td>{subject.subject_name}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                placeholder="Enter marks"
                                                                value={marks[key] ?? ''}
                                                                onChange={e =>
                                                                    setMarks(prev => ({
                                                                        ...prev,
                                                                        [key]: e.target.value
                                                                    }))
                                                                }
                                                                className="student-mark-input"
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="student-marks-save-section">

                                <button
                                    type="button"
                                    className="student-report-btn"
                                    onClick={() =>
                                        navigate(
                                            `/employee/term-tests/${classId}/students/${student.id}/report?yearId=${selectedYearId}&termId=${selectedTermId}`
                                        )
                                    }
                                    disabled={!selectedTermId || !selectedYearId}
                                >
                                    View Report
                                </button>

                                <button
                                    type="button"
                                    className="student-marks-save-btn"
                                    onClick={handleSaveMarks}
                                    disabled={!selectedTermId || saving || marksLoading}
                                >
                                    {saving ? 'Saving...' : 'Save Marks'}
                                </button>

                                {saveMessage && (
                                    <p className={
                                        saveMessage.includes('successfully')
                                            ? 'student-marks-save-success'
                                            : 'student-marks-save-error'
                                    }>
                                        {saveMessage}
                                    </p>
                                )}

                            </div>

                        </section>
                    </>
                )}

            </main>

        </div>
    )
}

export default StudentMarks
