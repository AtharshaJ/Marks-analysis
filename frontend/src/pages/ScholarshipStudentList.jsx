
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './ScholarshipStudentList.css'

function ScholarshipStudentList() {
    const { classId } = useParams()
    const navigate = useNavigate()

    const [students, setStudents] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [marks, setMarks] = useState({})
    const [saving, setSaving] = useState({})
    const [saveMessages, setSaveMessages] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/scholarship/${classId}/students`,
                    { credentials: 'include' }
                )

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.message || 'Unable to retrieve students.'
                    )
                }

                if (Number(result.class?.grade) !== 5) {
                    throw new Error(
                        'Scholarship results are only available for Grade 5.'
                    )
                }

                setStudents(result.students || [])
                setSelectedClass(result.class)

                const initialMarks = {}

                ;(result.students || []).forEach(student => {
                    initialMarks[student.id] =
                        student.marks === null ? '' : String(student.marks)
                })

                setMarks(initialMarks)

            } catch (error) {
                console.error('Scholarship student list error:', error)
                setError(error.message)
            } finally {
                setLoading(false)
            }
        }

        fetchStudents()
    }, [classId])

    const handleMarksChange = (studentId, value) => {
        setMarks(previous => ({
            ...previous,
            [studentId]: value
        }))

        setSaveMessages(previous => ({
            ...previous,
            [studentId]: ''
        }))
    }

    const handleSaveMarks = async (studentId) => {
        const enteredMarks = marks[studentId]

        if (enteredMarks === undefined || enteredMarks.trim() === '') {
            setSaveMessages(previous => ({
                ...previous,
                [studentId]: 'Please enter the marks.'
            }))
            return
        }

        const numericMarks = Number(enteredMarks)

        if (
            !Number.isFinite(numericMarks) ||
            numericMarks < 0 ||
            numericMarks > 200 ||
            !/^\d{1,3}(\.\d{1,2})?$/.test(enteredMarks.trim())
        ) {
            setSaveMessages(previous => ({
                ...previous,
                [studentId]: 'Enter a value from 0 to 200 (maximum 2 decimals).'
            }))
            return
        }

        try {
            setSaving(previous => ({
                ...previous,
                [studentId]: true
            }))

            setSaveMessages(previous => ({
                ...previous,
                [studentId]: ''
            }))

            const response = await fetch(
                `${API_BASE_URL}/api/scholarship/${classId}/students/${studentId}/marks`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        marks: numericMarks
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to save marks.'
                )
            }

            setStudents(previous =>
                previous.map(student =>
                    student.id === studentId
                        ? { ...student, marks: result.result.marks }
                        : student
                )
            )

            setMarks(previous => ({
                ...previous,
                [studentId]: String(result.result.marks)
            }))

            setSaveMessages(previous => ({
                ...previous,
                [studentId]: 'Marks saved successfully.'
            }))

        } catch (error) {
            console.error('Scholarship marks saving error:', error)

            setSaveMessages(previous => ({
                ...previous,
                [studentId]: error.message
            }))
        } finally {
            setSaving(previous => ({
                ...previous,
                [studentId]: false
            }))
        }
    }

    const filteredStudents = students.filter(student => {
        const searchText = search.toLowerCase()

        return (
            String(student.index_number).toLowerCase().includes(searchText) ||
            student.student_name.toLowerCase().includes(searchText)
        )
    })

    return (
        <div className="student-list-page">

            <header className="student-list-header">
                <div className="student-list-brand">
                    <div className="student-list-brand-icon">MA</div>

                    <div>
                        <h2>Marks <span>Analysis</span></h2>
                        <p>Teacher Portal</p>
                    </div>
                </div>

                <button
                    className="student-list-back-btn"
                    onClick={() => navigate('/employee')}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <main className="student-list-main">

                <div className="student-list-title">
                    <span>GRADE 5 SCHOLARSHIP EXAMINATION</span>

                    <h1>
                        {selectedClass?.class_name || 'Student List'}
                    </h1>

                    <p>
                        View Grade 5 students and manage their
                        Scholarship Examination results.
                    </p>
                </div>

                <div className="student-list-card">
                    <section className="student-list-section">

                        <h2>Student Records</h2>

                        <p>
                            {selectedClass
                                ? `Class: ${selectedClass.class_name}`
                                : 'Student information'}
                        </p>

                        {loading ? (
                            <div className="student-list-message">
                                Loading student records...
                            </div>
                        ) : error ? (
                            <div className="student-list-error">
                                {error}
                            </div>
                        ) : (
                            <>
                                <div className="student-list-info">
                                    <strong>
                                        Total Students: {students.length}
                                    </strong>

                                    <span>
                                        Showing {filteredStudents.length} students
                                    </span>
                                </div>

                                <div className="student-list-search">
                                    <input
                                        type="text"
                                        placeholder="Search by index number or student name..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>

                                {filteredStudents.length === 0 ? (
                                    <div className="student-list-message">
                                        {students.length === 0
                                            ? 'No active students found in this class.'
                                            : 'No students match your search.'}
                                    </div>
                                ) : (
                                    <div className="student-table-wrapper">
                                        <table className="student-list-table">
                                            <thead>
                                                <tr>
                                                    <th>No.</th>
                                                    <th>Index Number</th>
                                                    <th>Student Name</th>
                                                    <th>Scholarship Marks ( / 200)</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredStudents.map((student, index) => (
                                                    <tr key={student.id}>
                                                        <td>{index + 1}</td>

                                                        <td>{student.index_number}</td>

                                                        <td>{student.student_name}</td>

                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="200"
                                                                step="0.01"
                                                                placeholder="Enter marks"
                                                                value={marks[student.id] ?? ''}
                                                                onChange={e =>
                                                                    handleMarksChange(
                                                                        student.id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                disabled={saving[student.id]}
                                                                onClick={() =>
                                                                    handleSaveMarks(student.id)
                                                                }
                                                            >
                                                                {saving[student.id]
                                                                    ? 'Saving...'
                                                                    : 'Save'}
                                                            </button>

                                                            {saveMessages[student.id] && (
                                                                <div
                                                                    className={
                                                                        saveMessages[student.id] ===
                                                                        'Marks saved successfully.'
                                                                            ? 'scholarship-save-success'
                                                                            : 'scholarship-save-error'
                                                                    }
                                                                >
                                                                    {saveMessages[student.id]}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                    </section>
                </div>
            </main>
        </div>
    )
}

export default ScholarshipStudentList
