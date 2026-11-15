
import { useEffect, useState } from 'react'
import CustomDropdown from '../components/CustomDropdown'
import './ScholarshipStudentList.css'
import './OLResults.css'

function OLResults() {

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedClass, setSelectedClass] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(null)

    const [examIndexNumber, setExamIndexNumber] = useState('')
    const [grades, setGrades] = useState([])
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    // Fetch preserved O/L student records
    const fetchStudents = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/ol-results`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to load students.')
            }

            setStudents(result.students || [])

        } catch (error) {
            console.error('Fetch O/L students error:', error)
            setError(error.message || 'Unable to load students.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    // Open a student's result popup
    const openStudent = (index) => {
        const student = filteredStudents[index]

        if (!student) return

        setSelectedIndex(index)
        setExamIndexNumber(student.exam_index_number || '')
        setGrades(
            (student.subject_results || []).map(subject => ({
                subject_id: subject.subject_id,
                subject_name: subject.subject_name,
                subject_type: subject.subject_type,
                basket_name: subject.basket_name,
                grade: subject.grade || ''
            }))
        )
        setSaveMessage('')
    }

    // Update a subject grade
    const handleGradeChange = (subjectId, grade) => {
        setGrades(previous =>
            previous.map(subject =>
                Number(subject.subject_id) === Number(subjectId)
                    ? { ...subject, grade }
                    : subject
            )
        )
        setSaveMessage('')
    }

    // Save the current student's results
    const handleSave = async () => {
        const student = filteredStudents[selectedIndex]

        if (!student) return

        if (grades.length !== 9) {
            setSaveMessage('Exactly nine subjects are required.')
            return
        }

        try {
            setSaving(true)
            setSaveMessage('')

            const response = await fetch(
                `${API_BASE_URL}/api/ol-results/${student.id}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        exam_index_number: examIndexNumber,
                        grades: grades.map(subject => ({
                            subject_id: subject.subject_id,
                            grade: subject.grade
                        }))
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to save results.')
            }

            setStudents(previous =>
                previous.map(item =>
                    item.id === student.id ? result.student : item
                )
            )

            setSaveMessage('Results saved successfully!')

        } catch (error) {
            console.error('Save O/L results error:', error)
            setSaveMessage(error.message || 'Unable to save results.')
        } finally {
            setSaving(false)
        }
    }

    // Move to the next student
    const handleNext = async () => {
        if (selectedIndex === null) return

        const student = filteredStudents[selectedIndex]

        const hasChanges =
            examIndexNumber !== (student.exam_index_number || '') ||
            grades.some(grade => {
                const original = student.subject_results?.find(
                    subject =>
                        Number(subject.subject_id) === Number(grade.subject_id)
                )
                return (grade.grade || '') !== (original?.grade || '')
            })

        if (hasChanges) {
            setSaveMessage('Please save your changes before moving to the next student.')
            return
        }

        if (selectedIndex < filteredStudents.length - 1) {
            openStudent(selectedIndex + 1)
        }
    }

    // Filter students
    const filteredStudents = students.filter(student => {
        const search = searchTerm.toLowerCase()

        const matchesSearch =
            student.full_name?.toLowerCase().includes(search) ||
            student.school_index_number?.toLowerCase().includes(search) ||
            student.exam_index_number?.toLowerCase().includes(search)

        const matchesYear =
            !selectedYear || String(student.exam_year) === selectedYear

        const matchesClass =
            !selectedClass || student.class_name === selectedClass

        return matchesSearch && matchesYear && matchesClass
    })

    const years = [...new Set(students.map(student => student.exam_year))]
        .sort((a, b) => b - a)

    const classes = [...new Set(students.map(student => student.class_name))]
        .sort()

    const selectedStudent =
        selectedIndex !== null ? filteredStudents[selectedIndex] : null

    const completedSubjects = grades.filter(subject => subject.grade).length

    const isComplete = student =>
        student.subject_results?.length === 9 &&
        student.subject_results.every(subject => subject.grade)

    return (
        <div className="ol-results-page">

           
            <main className="ol-results-content">

                <section className="ol-results-summary">
                    <div>
                        <span>Total Students</span>
                        <strong>{students.length}</strong>
                    </div>

                    <div>
                        <span>Completed</span>
                        <strong>{students.filter(isComplete).length}</strong>
                    </div>

                    <div>
                        <span>Pending</span>
                        <strong>
                            {students.filter(student => !isComplete(student)).length}
                        </strong>
                    </div>
                </section>

                <section className="ol-student-section">

                    <div className="ol-section-heading">
                        <div>
                            <h2>O/L Student Records</h2>
                            <p>Select a student to enter or update examination results.</p>
                        </div>

                        <button
                            className="ol-refresh-button"
                            onClick={fetchStudents}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : '↻ Refresh'}
                        </button>
                    </div>

                    <div className="ol-filters">

                        <input
                            type="text"
                            placeholder="Search by student name or index number..."
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                        />

                        <div className="ol-filter-dropdown">
                            <CustomDropdown
                                value={selectedYear}
                                placeholder="All Examination Years"
                                options={years.map(year => ({
                                    value: String(year),
                                    label: String(year)
                                }))}
                                onChange={setSelectedYear}
                            />
                        </div>

                        <div className="ol-filter-dropdown">
                            <CustomDropdown
                                value={selectedClass}
                                placeholder="All Divisions"
                                options={classes.map(className => ({
                                    value: className,
                                    label: className
                                }))}
                                onChange={setSelectedClass}
                            />
                        </div>

                    </div>

                    {error && (
                        <p className="ol-error-message">{error}</p>
                    )}

                    {loading ? (

                        <div className="ol-empty-state">
                            Loading O/L student records...
                        </div>

                    ) : filteredStudents.length === 0 ? (

                        <div className="ol-empty-state">
                            <div>📋</div>
                            <h3>No O/L Records Found</h3>
                            <p>
                                No preserved O/L examination records match your search.
                            </p>
                        </div>

                    ) : (

                        <div className="ol-table-wrapper">
                            <table className="ol-student-table">
                                <thead>
                                    <tr>
                                        <th>School Index No.</th>
                                        <th>Student Name</th>
                                        <th>Original Class</th>
                                        <th>Exam Year</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredStudents.map((student, index) => (
                                        <tr key={student.id}>
                                            <td>{student.school_index_number}</td>
                                            <td>{student.full_name}</td>
                                            <td>{student.class_name}</td>
                                            <td>{student.exam_year}</td>
                                            <td>
                                                <span className={
                                                    isComplete(student)
                                                        ? 'ol-status completed'
                                                        : 'ol-status pending'
                                                }>
                                                    {isComplete(student)
                                                        ? 'Completed'
                                                        : 'Pending'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="ol-enter-button"
                                                    onClick={() => openStudent(index)}
                                                >
                                                    Enter Results
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    )}

                </section>
            </main>

            {/* Student Results Popup */}
            {selectedStudent && (

                <div className="ol-modal-overlay">

                    <div className="ol-results-modal">

                        <div className="ol-modal-header">
                            <div>
                                <span>O/L EXAMINATION RESULTS</span>
                                <h2>{selectedStudent.full_name}</h2>
                                <p>
                                    School Index: {selectedStudent.school_index_number}
                                    {' | '}
                                    {selectedStudent.class_name}
                                    {' | '}
                                    {selectedStudent.exam_year}
                                </p>
                            </div>

                            <button
                                className="ol-close-button"
                                onClick={() => {
                                    setSelectedIndex(null)
                                    setSaveMessage('')
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="ol-modal-body">

                            <label>Examination Index Number</label>

                            <input
                                type="text"
                                value={examIndexNumber}
                                onChange={event => {
                                    setExamIndexNumber(event.target.value)
                                    setSaveMessage('')
                                }}
                                placeholder="Enter examination index number"
                                maxLength={50}
                            />

                            <div className="ol-subject-heading">
                                <h3>Subject Grades</h3>
                                <span>{completedSubjects}/9 completed</span>
                            </div>

                            {grades.map((subject, index) => (
                                <div
                                    className="ol-subject-row"
                                    key={subject.subject_id}
                                >
                                    <div className="ol-subject-details">
                                        <span>{index + 1}.</span>
                                        <div>
                                            <strong>{subject.subject_name}</strong>
                                            <small>
                                                {subject.subject_type === 'Common'
                                                    ? 'Compulsory Subject'
                                                    : subject.basket_name || 'Basket Subject'}
                                            </small>
                                        </div>
                                    </div>

                                    <div className="ol-grade-dropdown">
                                        <CustomDropdown
                                            value={subject.grade}
                                            placeholder="Select Grade"
                                            options={['A', 'B', 'C', 'S', 'F'].map(grade => ({
                                                value: grade,
                                                label: grade
                                            }))}
                                            onChange={grade =>
                                                handleGradeChange(subject.subject_id, grade)
                                            }
                                        />
                                    </div>
                                </div>
                            ))}

                            {grades.length !== 9 && (
                                <p className="ol-error-message">
                                    This student's record does not contain exactly nine subjects.
                                </p>
                            )}

                            {saveMessage && (
                                <p className={
                                    saveMessage === 'Results saved successfully!'
                                        ? 'ol-save-success'
                                        : 'ol-error-message'
                                }>
                                    {saveMessage}
                                </p>
                            )}

                        </div>

                        <div className="ol-modal-footer">

                            <button
                                className="ol-save-button"
                                onClick={handleSave}
                                disabled={saving || grades.length !== 9}
                            >
                                {saving ? 'Saving...' : 'Save Results'}
                            </button>

                            <button
                                className="ol-next-button"
                                onClick={handleNext}
                                disabled={
                                    saving ||
                                    selectedIndex >= filteredStudents.length - 1
                                }
                            >
                                Next Student →
                            </button>

                            <button
                                className="ol-modal-close-button"
                                onClick={() => {
                                    setSelectedIndex(null)
                                    setSaveMessage('')
                                }}
                            >
                                Close
                            </button>

                        </div>

                    </div>
                </div>

            )}

        </div>
    )
}

export default OLResults
