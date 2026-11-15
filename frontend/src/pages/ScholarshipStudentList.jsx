
import { useEffect, useState } from 'react'
import CustomDropdown from '../components/CustomDropdown'
import './ScholarshipStudentList.css'

function ScholarshipStudentList() {
    const [students, setStudents] = useState([])
    const [selectedDivision, setSelectedDivision] = useState('All')
    const [marks, setMarks] = useState({})
    const [saving, setSaving] = useState({})
    const [saveMessages, setSaveMessages] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const fetchStudents = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/scholarship/students`,
                { credentials: 'include' }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to retrieve students.'
                )
            }

            const studentList = result.students || []

            setStudents(studentList)

            const initialMarks = {}

            studentList.forEach(student => {
                initialMarks[student.id] =
                    student.marks == null ? '' : String(student.marks)
            })

            setMarks(initialMarks)
        } catch (error) {
            console.error('Scholarship student list error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

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

        const student = students.find(item => item.id === studentId)

        if (!student) return

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
                `${API_BASE_URL}/api/scholarship/${student.class_id}/students/${studentId}/marks`,
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
                previous.map(item =>
                    item.id === studentId
                        ? { ...item, marks: result.result.marks }
                        : item
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

    const divisions = [
        'All',
        ...new Set(
            students.map(student => String(student.division))
        )
    ]

    const filteredStudents = students.filter(student => {
        const searchText = search.toLowerCase()

        const matchesDivision =
            selectedDivision === 'All' ||
            String(student.division) === selectedDivision

        const matchesSearch =
            String(student.index_number).toLowerCase().includes(searchText) ||
            student.student_name.toLowerCase().includes(searchText)

        return matchesDivision && matchesSearch
    })

    const completedCount = students.filter(
        student => student.marks !== null && student.marks !== undefined
    ).length

    const pendingCount = students.length - completedCount

    return (
        <div className="scholarship-results-page">

            <div className="scholarship-results-summary">
                <div>
                    <span>Total Students</span>
                    <strong>{students.length}</strong>
                </div>

                <div>
                    <span>Completed</span>
                    <strong>{completedCount}</strong>
                </div>

                <div>
                    <span>Pending</span>
                    <strong>{pendingCount}</strong>
                </div>
            </div>

            <section className="scholarship-student-section">

                <div className="scholarship-section-heading">
                    <div>
                        <h2>Scholarship Student Records</h2>
                        <p>
                            Enter or update Grade 5 Scholarship Examination marks.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="scholarship-refresh-button"
                        onClick={fetchStudents}
                        disabled={loading}
                    >
                        ↻ Refresh
                    </button>
                </div>

                <div className="scholarship-filters">

                    <input
                        type="text"
                        placeholder="Search by student name or index number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                    <div className="scholarship-filter-dropdown">
                        <CustomDropdown
                            value={selectedDivision}
                            options={divisions.map(division => ({
                                value: division,
                                label: division === 'All'
                                    ? 'All Divisions'
                                    : `Division ${division}`
                            }))}
                            onChange={setSelectedDivision}
                            placeholder="Select Division"
                        />
                    </div>

                </div>

                {error && (
                    <div className="scholarship-error-message">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="scholarship-empty-state">
                        Loading student records...
                    </div>
                ) : error ? null : filteredStudents.length === 0 ? (
                    <div className="scholarship-empty-state">
                        <h3>
                            {students.length === 0
                                ? 'No Grade 5 students found'
                                : 'No students found'}
                        </h3>
                        <p>
                            {students.length === 0
                                ? 'There are currently no active Grade 5 student records.'
                                : 'Try changing your search or division filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="scholarship-table-wrapper">
                        <table className="scholarship-student-table">

                            <thead>
                                <tr>
                                    <th>No.</th>
                                    <th>School Index No.</th>
                                    <th>Student Name</th>
                                    <th>Division</th>
                                    <th>Scholarship Marks (/200)</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStudents.map((student, index) => (
                                    <tr key={student.id}>
                                        <td>{index + 1}</td>

                                        <td>{student.index_number}</td>

                                        <td>{student.student_name}</td>

                                        <td>{student.division}</td>

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
                                            <span className={`scholarship-status ${
                                                student.marks !== null &&
                                                student.marks !== undefined
                                                    ? 'completed'
                                                    : 'pending'
                                            }`}>
                                                {student.marks !== null &&
                                                student.marks !== undefined
                                                    ? 'Completed'
                                                    : 'Pending'}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="scholarship-save-button"
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
                                                <div className={
                                                    saveMessages[student.id] ===
                                                    'Marks saved successfully.'
                                                        ? 'scholarship-save-success'
                                                        : 'scholarship-save-error'
                                                }>
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

            </section>
        </div>
    )
}

export default ScholarshipStudentList
