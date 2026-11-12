
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './StudentMarks.css'

function StudentMarks({ user }) {
    const { classId, studentId } = useParams()
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [student, setStudent] = useState(null)
    const [selectedClass, setSelectedClass] = useState(null)
    const [subjects, setSubjects] = useState([])
    const [academicYears, setAcademicYears] = useState([])

    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedTermId, setSelectedTermId] = useState('')

    const [marks, setMarks] = useState({})
    const [marksLoading, setMarksLoading] = useState(false)
    const [marksError, setMarksError] = useState('')

    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    

    // Load student, subjects and academic years
    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setLoading(true)
                setError('')

                const [
                    studentsResponse,
                    subjectsResponse,
                    yearsResponse
                ] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students`,
                        { credentials: 'include' }
                    ),
                    fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/subjects`,
                        { credentials: 'include' }
                    ),
                    fetch(
                        `${API_BASE_URL}/api/term-tests/academic-years`,
                        { credentials: 'include' }
                    )
                ])

                const [
                    studentsResult,
                    subjectsResult,
                    yearsResult
                ] = await Promise.all([
                    studentsResponse.json(),
                    subjectsResponse.json(),
                    yearsResponse.json()
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

                if (!yearsResponse.ok) {
                    throw new Error(
                        yearsResult.message || 'Unable to load academic years.'
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
                setSubjects(subjectsResult.subjects || [])
                setAcademicYears(yearsResult.academicYears || [])

                // Select active academic year if available
                const activeYear = (yearsResult.academicYears || [])
                    .find(year => year.is_active)

                if (activeYear) {
                    setSelectedYearId(String(activeYear.id))

                    const firstTerm = [...activeYear.academic_terms]
                        .sort((a, b) => a.term_number - b.term_number)[0]

                    if (firstTerm) {
                        setSelectedTermId(String(firstTerm.id))
                    }
                }

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

    const selectedYear = academicYears.find(
        year => String(year.id) === selectedYearId
    )

    const availableTerms = selectedYear?.academic_terms || []

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

        // Reload the saved marks from the database
        const marksResponse = await fetch(
            `${API_BASE_URL}/api/term-tests/${classId}/students/${studentId}/marks?termId=${selectedTermId}`,
            { credentials: 'include' }
        )

        const marksResult = await marksResponse.json()

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
                        navigate(`/employee/term-tests/${classId}/students`)
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

                        </section>

                        <section className="student-marks-entry">

                            <h2>Term Test Marks</h2>

                            <div className="student-marks-selectors">

                                <div>
                                    <label>Academic Year</label>

                                    <select
                                        value={selectedYearId}
                                        onChange={e => {
                                            setSelectedYearId(e.target.value)
                                            setSelectedTermId('')
                                        }}
                                    >
                                        <option value="">
                                            Select Academic Year
                                        </option>

                                        {academicYears.map(year => (
                                            <option
                                                key={year.id}
                                                value={year.id}
                                            >
                                                {year.year}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label>Term</label>

                                    <select
                                        value={selectedTermId}
                                        onChange={e =>
                                            setSelectedTermId(e.target.value)
                                        }
                                        disabled={!selectedYearId}
                                    >
                                        <option value="">
                                            Select Term
                                        </option>

                                        {availableTerms.map(term => (
                                            <option
                                                key={term.id}
                                                value={term.id}
                                            >
                                                {term.term_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>

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
