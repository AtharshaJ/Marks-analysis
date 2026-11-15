
import { useEffect, useState } from 'react'
import CustomDropdown from '../components/CustomDropdown'
import './ALResults.css'

function ALResults() {

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedStream, setSelectedStream] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(null)

    const [examIndexNumber, setExamIndexNumber] = useState('')
    const [subjectGrades, setSubjectGrades] = useState([])
    const [cgtMarks, setCgtMarks] = useState('')
    const [generalEnglishGrade, setGeneralEnglishGrade] = useState('')
    const [zScore, setZScore] = useState('')
    const [districtRank, setDistrictRank] = useState('')
    const [islandRank, setIslandRank] = useState('')

    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

// Fetch preserved A/L student records
const fetchStudents = async () => {
    try {
        setLoading(true)
        setError('')

        const response = await fetch(
            `${API_BASE_URL}/api/al-results`,
            {
                method: 'GET',
                credentials: 'include'
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to load A/L records.')
        }

        setStudents(result.students || [])

    } catch (error) {
        console.error('Fetch A/L students error:', error)
        setError(error.message || 'Unable to load A/L records.')
    } finally {
        setLoading(false)
    }
}

useEffect(() => {
    fetchStudents()
}, [])

// Filter A/L students
const filteredStudents = students.filter(student => {
    const search = searchTerm.toLowerCase()

    const matchesSearch =
        student.full_name?.toLowerCase().includes(search) ||
        student.school_index_number?.toLowerCase().includes(search) ||
        student.exam_index_number?.toLowerCase().includes(search)

    const matchesYear =
        !selectedYear || String(student.exam_year) === selectedYear

    const matchesStream =
        !selectedStream || student.stream_name === selectedStream

    return matchesSearch && matchesYear && matchesStream
})

// Available examination years
const years = [...new Set(
    students.map(student => student.exam_year)
)].sort((a, b) => b - a)

// Available A/L streams
const streams = [...new Set(
    students.map(student => student.stream_name)
)].sort()

// Currently selected student
const selectedStudent =
    selectedIndex !== null ? filteredStudents[selectedIndex] : null

// Check whether all required results are completed
const isComplete = student =>
    Boolean(
        student.exam_index_number &&
        student.subject_1_grade &&
        student.subject_2_grade &&
        student.subject_3_grade &&
        student.cgt_marks !== null &&
        student.cgt_marks !== undefined &&
        student.general_english_grade &&
        student.z_score !== null &&
        student.z_score !== undefined &&
        student.district_rank !== null &&
        student.district_rank !== undefined &&
        student.island_rank !== null &&
        student.island_rank !== undefined
    )

    // Open a student's result popup
const openStudent = (index) => {
    const student = filteredStudents[index]

    if (!student) return

    setSelectedIndex(index)
    setExamIndexNumber(student.exam_index_number || '')

    setSubjectGrades([
        {
            subject_no: student.subject_1_no,
            subject_name: student.subject_1_name,
            grade: student.subject_1_grade || ''
        },
        {
            subject_no: student.subject_2_no,
            subject_name: student.subject_2_name,
            grade: student.subject_2_grade || ''
        },
        {
            subject_no: student.subject_3_no,
            subject_name: student.subject_3_name,
            grade: student.subject_3_grade || ''
        }
    ])

    setCgtMarks(
        student.cgt_marks == null ? '' : String(student.cgt_marks)
    )

    setGeneralEnglishGrade(student.general_english_grade || '')
    setZScore(student.z_score == null ? '' : String(student.z_score))
    setDistrictRank(student.district_rank == null ? '' : String(student.district_rank))
    setIslandRank(student.island_rank == null ? '' : String(student.island_rank))

    setSaveMessage('')
}

// Update a Choice subject grade
const handleGradeChange = (subjectNo, grade) => {
    setSubjectGrades(previous =>
        previous.map(subject =>
            subject.subject_no === subjectNo
                ? { ...subject, grade }
                : subject
        )
    )

    setSaveMessage('')
}

// Save the current student's A/L results
const handleSave = async () => {
    const student = filteredStudents[selectedIndex]

    if (!student) return

    if (subjectGrades.length !== 3) {
        setSaveMessage('Exactly three Choice subjects are required.')
        return
    }

    try {
        setSaving(true)
        setSaveMessage('')

        const response = await fetch(
            `${API_BASE_URL}/api/al-results/${student.id}`,
            {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    exam_index_number: examIndexNumber,
                    subject_1_grade: subjectGrades[0].grade,
                    subject_2_grade: subjectGrades[1].grade,
                    subject_3_grade: subjectGrades[2].grade,
                    cgt_marks: cgtMarks,
                    general_english_grade: generalEnglishGrade,
                    z_score: zScore,
                    district_rank: districtRank,
                    island_rank: islandRank
                })
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to save A/L results.')
        }

        setStudents(previous =>
            previous.map(item =>
                item.id === student.id ? result.student : item
            )
        )

        setSaveMessage('Results saved successfully!')

    } catch (error) {
        console.error('Save A/L results error:', error)
        setSaveMessage(error.message || 'Unable to save A/L results.')
    } finally {
        setSaving(false)
    }
}

// Move to the next student
const handleNext = () => {
    if (selectedIndex === null) return

    const student = filteredStudents[selectedIndex]

    const hasChanges =
        examIndexNumber !== (student.exam_index_number || '') ||
        subjectGrades.some((subject, index) => {
            const originalGrade = student[
                `subject_${index + 1}_grade`
            ] || ''

            return subject.grade !== originalGrade
        }) ||
        cgtMarks !== (student.cgt_marks == null ? '' : String(student.cgt_marks)) ||
        generalEnglishGrade !== (student.general_english_grade || '') ||
        zScore !== (student.z_score == null ? '' : String(student.z_score)) ||
        districtRank !== (student.district_rank == null ? '' : String(student.district_rank)) ||
        islandRank !== (student.island_rank == null ? '' : String(student.island_rank))

    if (hasChanges) {
        setSaveMessage('Please save your changes before moving to the next student.')
        return
    }

    if (selectedIndex < filteredStudents.length - 1) {
        openStudent(selectedIndex + 1)
    }
}

  
return (
    <div className="al-results-page">

        <main className="al-results-content">

            {/* Summary Cards */}
            <section className="al-results-summary">
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

            {/* Student Records */}
            <section className="al-student-section">

                <div className="al-section-heading">
                    <div>
                        <h2>A/L Student Records</h2>
                        <p>Select a student to enter or update examination results.</p>
                    </div>

                    <button
                        className="al-refresh-button"
                        onClick={fetchStudents}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : '↻ Refresh'}
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="al-filters">

                    <input
                        type="text"
                        placeholder="Search by student name or index number..."
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                    />

                    <div className="al-filter-dropdown">
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

                    <div className="al-filter-dropdown">
                        <CustomDropdown
                            value={selectedStream}
                            placeholder="All Streams"
                            options={streams.map(stream => ({
                                value: stream,
                                label: stream
                            }))}
                            onChange={setSelectedStream}
                        />
                    </div>

                </div>

                {error && (
                    <p className="al-error-message">{error}</p>
                )}

                {loading ? (

                    <div className="al-empty-state">
                        Loading A/L student records...
                    </div>

                ) : filteredStudents.length === 0 ? (

                    <div className="al-empty-state">
                        <h3>No A/L Records Found</h3>
                        <p>
                            No preserved A/L examination records match your search.
                        </p>
                    </div>

                ) : (

                    <div className="al-table-wrapper">
                        <table className="al-student-table">

                            <thead>
                                <tr>
                                    <th>School Index No.</th>
                                    <th>Student Name</th>
                                    <th>Stream</th>
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
                                        <td>{student.stream_name}</td>
                                        <td>{student.exam_year}</td>

                                        <td>
                                            <span className={
                                                isComplete(student)
                                                    ? 'al-status completed'
                                                    : 'al-status pending'
                                            }>
                                                {isComplete(student)
                                                    ? 'Completed'
                                                    : 'Pending'}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className="al-enter-button"
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

            {/* A/L Student Results Popup */}
            {selectedStudent && (

                <div className="al-modal-overlay">

                    <div className="al-results-modal">

                        <div className="al-modal-header">
                            <div>
                                <span>A/L EXAMINATION RESULTS</span>
                                <h2>{selectedStudent.full_name}</h2>
                                <p>
                                    School Index: {selectedStudent.school_index_number}
                                    {' | '}
                                    {selectedStudent.stream_name}
                                    {' | '}
                                    {selectedStudent.exam_year}
                                </p>
                            </div>

                            <button
                                className="al-close-button"
                                onClick={() => {
                                    setSelectedIndex(null)
                                    setSaveMessage('')
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div className="al-modal-body">

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

                            <div className="al-subject-heading">
                                <h3>Choice Subject Grades</h3>
                                <span>
                                    {subjectGrades.filter(subject => subject.grade).length}/3 completed
                                </span>
                            </div>

                            {subjectGrades.map((subject, index) => (
                                <div
                                    className="al-subject-row"
                                    key={subject.subject_no}
                                >
                                    <div className="al-subject-details">
                                        <span>{index + 1}.</span>
                                        <div>
                                            <strong>{subject.subject_name}</strong>
                                            <small>Choice Subject</small>
                                        </div>
                                    </div>

                                    <div className="al-grade-dropdown">
                                        <CustomDropdown
                                            value={subject.grade}
                                            placeholder="Select Grade"
                                            options={['A', 'B', 'C', 'S', 'F'].map(grade => ({
                                                value: grade,
                                                label: grade
                                            }))}
                                            onChange={grade =>
                                                handleGradeChange(subject.subject_no, grade)
                                            }
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="al-subject-heading">
                                <h3>Other Examination Results</h3>
                            </div>

                            <label>Common General Test Marks</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={cgtMarks}
                                onChange={event => {
                                    setCgtMarks(event.target.value)
                                    setSaveMessage('')
                                }}
                                placeholder="Enter CGT marks"
                            />

                            <label>General English Grade</label>
                            <div className="al-grade-dropdown">
                                <CustomDropdown
                                    value={generalEnglishGrade}
                                    placeholder="Select Grade"
                                    options={['A', 'B', 'C', 'S', 'F'].map(grade => ({
                                        value: grade,
                                        label: grade
                                    }))}
                                    onChange={grade => {
                                        setGeneralEnglishGrade(grade)
                                        setSaveMessage('')
                                    }}
                                />
                            </div>

                            <label>Z-Score</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={zScore}
                                onChange={event => {
                                    setZScore(event.target.value)
                                    setSaveMessage('')
                                }}
                                placeholder="Enter Z-score"
                            />

                            <label>District Rank</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={districtRank}
                                onChange={event => {
                                    setDistrictRank(event.target.value)
                                    setSaveMessage('')
                                }}
                                placeholder="Enter district rank"
                            />

                            <label>Island Rank</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={islandRank}
                                onChange={event => {
                                    setIslandRank(event.target.value)
                                    setSaveMessage('')
                                }}
                                placeholder="Enter island rank"
                            />

                            {saveMessage && (
                                <p className={
                                    saveMessage === 'Results saved successfully!'
                                        ? 'al-save-success'
                                        : 'al-error-message'
                                }>
                                    {saveMessage}
                                </p>
                            )}

                        </div>

                        <div className="al-modal-footer">

                            <button
                                className="al-save-button"
                                onClick={handleSave}
                                disabled={saving || subjectGrades.length !== 3}
                            >
                                {saving ? 'Saving...' : 'Save Results'}
                            </button>

                            <button
                                className="al-next-button"
                                onClick={handleNext}
                                disabled={
                                    saving ||
                                    selectedIndex >= filteredStudents.length - 1
                                }
                            >
                                Next Student →
                            </button>

                            <button
                                className="al-modal-close-button"
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

export default ALResults
