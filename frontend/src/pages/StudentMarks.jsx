
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

    const selectedYear = academicYears.find(
        year => String(year.id) === selectedYearId
    )

    const availableTerms = selectedYear?.academic_terms || []

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

                                {subjects.length === 0 ? (
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
                                            {subjects.map((subject, index) => (
                                                <tr
                                                    key={
                                                        subject.subject_type === 'al'
                                                            ? subject.al_subject_no
                                                            : subject.subject_id
                                                    }
                                                >
                                                    <td>{index + 1}</td>
                                                    <td>{subject.subject_name}</td>
                                                    <td>--</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
