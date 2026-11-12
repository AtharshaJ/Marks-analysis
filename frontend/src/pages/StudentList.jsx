
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './StudentList.css'

function StudentList() {
    const { classId } = useParams()
    const navigate = useNavigate()

    const [students, setStudents] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
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
                    `${API_BASE_URL}/api/term-tests/${classId}/students`,
                    { credentials: 'include' }
                )

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.message || 'Unable to retrieve students.'
                    )
                }

                setStudents(result.students || [])
                setSelectedClass(result.class)

            } catch (error) {
                console.error('Student list error:', error)
                setError(error.message)
            } finally {
                setLoading(false)
            }
        }

        fetchStudents()
    }, [classId])

    // Search students by index number or name
    const filteredStudents = students.filter(student => {
        const searchText = search.toLowerCase()

        return (
            String(student.index_number)
                .toLowerCase()
                .includes(searchText) ||
            student.student_name
                .toLowerCase()
                .includes(searchText)
        )
    })

    return (
        <div className="student-list-page">

            {/* Header */}
            <header className="student-list-header">

                <div className="student-list-brand">
                    <div className="student-list-brand-icon">
                        MA
                    </div>

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

            {/* Main Content */}
            <main className="student-list-main">

                {/* Page Title */}
                <div className="student-list-title">
                    <span>TERM TEST MANAGEMENT</span>

                    <h1>
                        {selectedClass?.class_name || 'Student List'}
                    </h1>

                    <p>
                        View the students registered in this class.
                        Student records are displayed in index number order.
                    </p>
                </div>

                {/* Student Card */}
                <div className="student-list-card">

                    <section className="student-list-section">

                        <h2>Student Records</h2>

                        <p>
                            {selectedClass
                                ? `Class: ${selectedClass.class_name}`
                                : 'Student information'}
                        </p>

                        <div className="student-list-actions">
    <button
        className="student-list-subjects-btn"
        onClick={() =>
            navigate(`/employee/term-tests/${classId}/subjects`)
        }
    >
        View Subjects →
    </button>
</div>

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
                                {/* Student Count */}
                                <div className="student-list-info">
                                    <strong>
                                        Total Students: {students.length}
                                    </strong>

                                    <span>
                                        Showing {filteredStudents.length} students
                                    </span>
                                </div>

                                {/* Search */}
                                <div className="student-list-search">
                                    <input
                                        type="text"
                                        placeholder="Search by index number or student name..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>

                                {/* Student Table */}
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
                                                </tr>
                                            </thead>

                                            <tbody>
    {filteredStudents.map((student, index) => (
        <tr
            key={student.id}
            className="student-clickable-row"
            onClick={() =>
                navigate(
                    `/employee/term-tests/${classId}/students/${student.id}`
                )
            }
        >
            <td>{index + 1}</td>
            <td>{student.index_number}</td>
            <td>{student.student_name}</td>
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

export default StudentList
