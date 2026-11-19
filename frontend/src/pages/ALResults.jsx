
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './OLResults.css'
import CustomDropdown from '../components/CustomDropdown'
import API_URL from '../config';

function ALResults({ user }) {
    const navigate = useNavigate()

   const API_BASE_URL = API_URL;

    const [examYear, setExamYear] = useState(new Date().getFullYear())

    const [streams, setStreams] = useState([])
    const [selectedStreamId, setSelectedStreamId] = useState('')

    const [commonSubjects, setCommonSubjects] = useState([])
    const [choiceSubjects, setChoiceSubjects] = useState([])

    const [students, setStudents] = useState([])
    const [results, setResults] = useState([])

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [studentForm, setStudentForm] = useState({
    exam_index_number: '',
    full_name: '',
    subject_1_no: '',
    subject_2_no: '',
    subject_3_no: ''
})

    const [showStudentPopup, setShowStudentPopup] = useState(false)
    const [studentPopupStep, setStudentPopupStep] = useState(1)
    const [savingStudent, setSavingStudent] = useState(false)

    const [showGradePopup, setShowGradePopup] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)

    const [studentGrades, setStudentGrades] = useState({
        subject_1_grade: '',
        subject_2_grade: '',
        subject_3_grade: '',
        cgt_marks: '',
        general_english_grade: '',
        z_score: '',
        island_rank: '',
        district_rank: ''
    })

    const [savingGrades, setSavingGrades] = useState(false)


    // LOAD AVAILABLE A/L STREAMS
    useEffect(() => {
        const fetchStreams = async () => {
            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/al-results/streams`,
                    { credentials: 'include' }
                )

                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || 'Unable to load A/L streams.'
                    )
                }

                setStreams(data.streams || [])

            } catch (error) {
                console.error('A/L streams loading error:', error)
                setError(error.message || 'Unable to load A/L streams.')
            } finally {
                setLoading(false)
            }
        }

        fetchStreams()
    }, [])


    // LOAD SUBJECTS FOR THE SELECTED STREAM
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!selectedStreamId) {
                setCommonSubjects([])
                setChoiceSubjects([])
                return
            }

            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/al-results/subjects/${selectedStreamId}`,
                    { credentials: 'include' }
                )

                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || 'Unable to load A/L subjects.'
                    )
                }

                setCommonSubjects(data.commonSubjects || [])
                setChoiceSubjects(data.choiceSubjects || [])

            } catch (error) {
                console.error('A/L subjects loading error:', error)
                setError(error.message || 'Unable to load A/L subjects.')
            } finally {
                setLoading(false)
            }
        }

        fetchSubjects()
    }, [selectedStreamId])


    // LOAD STUDENTS AND RESULTS FOR THE SELECTED YEAR + STREAM
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedStreamId) {
                setStudents([])
                setResults([])
                return
            }

            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/al-results/${examYear}/${selectedStreamId}`,
                    { credentials: 'include' }
                )

                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || 'Unable to load A/L students.'
                    )
                }

                setStudents(data.students || [])
                setResults(data.results || [])

            } catch (error) {
                console.error('A/L students loading error:', error)
                setError(error.message || 'Unable to load A/L students.')
            } finally {
                setLoading(false)
            }
        }

        fetchStudents()
    }, [examYear, selectedStreamId])


    // HANDLE STUDENT FORM CHANGES
    const handleStudentFormChange = (field, value) => {
        setStudentForm(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // MOVE TO SUBJECT SELECTION
   const handleNextStudentStep = () => {
    if (
        !studentForm.exam_index_number.trim() ||
        !studentForm.full_name.trim()
    ) {
        setError('Please enter the examination index number and student name.')
        return
    }

    setError('')
    setStudentPopupStep(2)
}

    // OPEN GRADE ENTRY POPUP
    const handleOpenGradePopup = (student) => {
        setSelectedStudent(student)

        const existingResult = results.find(
            result => Number(result.student_id) === Number(student.id)
        )

        setStudentGrades({
            subject_1_grade: existingResult?.subject_1_grade || '',
            subject_2_grade: existingResult?.subject_2_grade || '',
            subject_3_grade: existingResult?.subject_3_grade || '',
            cgt_marks: existingResult?.cgt_marks ?? '',
            general_english_grade: existingResult?.general_english_grade || '',
            z_score: existingResult?.z_score ?? '',
            island_rank: existingResult?.island_rank ?? '',
            district_rank: existingResult?.district_rank ?? ''
        })

        setError('')
        setShowGradePopup(true)
    }

    // HANDLE GRADE CHANGES
    const handleGradeChange = (field, value) => {
        setStudentGrades(prev => ({
            ...prev,
            [field]: value
        }))
    }


    // REGISTER A/L STUDENT
    const handleRegisterStudent = async (e) => {
        e.preventDefault()

        if (!selectedStreamId) {
            setError('Please select an examination stream.')
            return
        }

        if (
    !studentForm.exam_index_number.trim() ||
    !studentForm.full_name.trim() ||
    !studentForm.subject_1_no ||
    !studentForm.subject_2_no ||
    !studentForm.subject_3_no
) {
    setError('Please enter the examination index number, student name, and select all three subjects.')
    return
}

        const selectedSubjects = [
            studentForm.subject_1_no,
            studentForm.subject_2_no,
            studentForm.subject_3_no
        ]

        if (new Set(selectedSubjects).size !== 3) {
            setError('Please select three different subjects.')
            return
        }

        try {
            setSavingStudent(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/al-results/students`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        exam_year: examYear,
                        stream_id: selectedStreamId,
                        ...studentForm
                    })
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Unable to register A/L student.'
                )
            }

            // Refresh the student list
            const refreshResponse = await fetch(
                `${API_BASE_URL}/api/al-results/${examYear}/${selectedStreamId}`,
                { credentials: 'include' }
            )

            const refreshData = await refreshResponse.json()

            if (!refreshResponse.ok || !refreshData.success) {
                throw new Error('Student registered, but refreshing the list failed.')
            }

            setStudents(refreshData.students || [])
            setResults(refreshData.results || [])

            setStudentForm({
    exam_index_number: '',
    full_name: '',
    subject_1_no: '',
    subject_2_no: '',
    subject_3_no: ''
})

            setStudentPopupStep(1)
            setShowStudentPopup(false)

        } catch (error) {
            console.error('A/L student registration error:', error)
            setError(error.message || 'Unable to register A/L student.')
        } finally {
            setSavingStudent(false)
        }
    }


    // SAVE OR UPDATE A/L RESULTS
    const handleSaveGrades = async (e) => {
        e.preventDefault()

        if (!selectedStudent) return

        const requiredGrades = [
            studentGrades.subject_1_grade,
            studentGrades.subject_2_grade,
            studentGrades.subject_3_grade,
            studentGrades.general_english_grade
        ]

        if (requiredGrades.some(grade => !grade)) {
            setError('Please enter all three subject grades and the General English grade.')
            return
        }

        if (
            studentGrades.cgt_marks === '' ||
            Number(studentGrades.cgt_marks) < 0 ||
            Number(studentGrades.cgt_marks) > 100
        ) {
            setError('Common General Test marks must be between 0 and 100.')
            return
        }

        try {
            setSavingGrades(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/al-results/results`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        student_id: selectedStudent.id,
                        ...studentGrades
                    })
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Unable to save A/L results.'
                )
            }

            // Refresh students and results
            const refreshResponse = await fetch(
                `${API_BASE_URL}/api/al-results/${examYear}/${selectedStreamId}`,
                { credentials: 'include' }
            )

            const refreshData = await refreshResponse.json()

            if (!refreshResponse.ok || !refreshData.success) {
                throw new Error('Results saved, but refreshing the list failed.')
            }

            setStudents(refreshData.students || [])
            setResults(refreshData.results || [])
            setShowGradePopup(false)

        } catch (error) {
            console.error('A/L result saving error:', error)
            setError(error.message || 'Unable to save A/L results.')
        } finally {
            setSavingGrades(false)
        }
    }

    
return (
    <div className="ol-results-page">

            <header className="ol-results-header">
                <h2>G.C.E. Advanced Level Examination</h2>

                <button
                    onClick={() =>
                        navigate('/employee', {
                            state: { activeSection: 'Public Examinations' }
                        })
                    }
                >
                    Back to Public Examinations
                </button>
            </header>

            <main className="ol-results-main">

                <h2>A/L Student Results Management</h2>


                {/* STUDENT REGISTRATION POPUP */}
                {showStudentPopup && (
                    <div className="ol-popup-overlay">
                        <div className="ol-popup-content">

                            <div className="ol-popup-header">
                                <h3>Add A/L Student</h3>

                                <button
                                    type="button"
                                    onClick={() => setShowStudentPopup(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleRegisterStudent}>

                                <div className="ol-form-grid">

                                    {studentPopupStep === 1 ? (
                                      
<>
    <div className="ol-form-group">
        <label>Examination Year</label>
        <input
            type="number"
            value={examYear}
            min="2000"
            onChange={e =>
                setExamYear(Number(e.target.value))
            }
            required
        />
    </div>

    <div className="ol-form-group">
        <label>Examination Index Number</label>
        <input
            type="text"
            value={studentForm.exam_index_number}
            onChange={e =>
                handleStudentFormChange(
                    'exam_index_number',
                    e.target.value
                )
            }
            placeholder="Enter examination index number"
            required
        />
    </div>

    <div className="ol-form-group">
        <label>Student Name</label>
        <input
            type="text"
            value={studentForm.full_name}
            onChange={e =>
                handleStudentFormChange(
                    'full_name',
                    e.target.value
                )
            }
            placeholder="Enter student name"
            required
        />
    </div>
</>

                                    ) : (
                                        <>
                                            {[
                                                {
                                                    field: 'subject_1_no',
                                                    label: 'Subject 1'
                                                },
                                                {
                                                    field: 'subject_2_no',
                                                    label: 'Subject 2'
                                                },
                                                {
                                                    field: 'subject_3_no',
                                                    label: 'Subject 3'
                                                }
                                            ].map(subject => (
                                                <div
                                                    className="ol-form-group"
                                                    key={subject.field}
                                                >
                                                    <label>{subject.label}</label>

                                                    <CustomDropdown
                                                        value={studentForm[subject.field]}
                                                        options={choiceSubjects.map(item => ({
                                                            value: item.subject_no,
                                                            label: item.subject_name
                                                        }))}
                                                        onChange={value =>
                                                            handleStudentFormChange(
                                                                subject.field,
                                                                value
                                                            )
                                                        }
                                                        placeholder={`Select ${subject.label}`}
                                                        searchable={true}
                                                        searchPlaceholder="Search subjects..."
                                                    />
                                                </div>
                                            ))}
                                        </>
                                    )}

                                </div>

                                {error && (
                                    <p style={{ color: 'red' }}>{error}</p>
                                )}

                                <div className="ol-popup-footer">

                                    <button
                                        type="button"
                                        className="ol-popup-cancel"
                                        onClick={() => {
                                            if (studentPopupStep === 2) {
                                                setStudentPopupStep(1)
                                            } else {
                                                setShowStudentPopup(false)
                                            }
                                        }}
                                    >
                                        {studentPopupStep === 2 ? 'Back' : 'Cancel'}
                                    </button>

                                    {studentPopupStep === 1 ? (
                                        <button
                                            type="button"
                                            onClick={handleNextStudentStep}
                                        >
                                            Next
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={savingStudent}
                                        >
                                            {savingStudent ? 'Saving...' : 'Save Student'}
                                        </button>
                                    )}

                                </div>

                            </form>

                        </div>
                    </div>
                )}


                {/* A/L RESULTS ENTRY POPUP */}
                {showGradePopup && selectedStudent && (
                    <div className="ol-popup-overlay">
                        <div className="ol-popup-content">

                            <div className="ol-popup-header">
                                <h3>Enter A/L Examination Results</h3>

                                <button
                                    type="button"
                                    onClick={() => setShowGradePopup(false)}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="ol-grade-student-details">
                               

                                <p>
                                    <strong>Examination Index Number:</strong>{' '}
                                    {selectedStudent.exam_index_number || '-'}
                                </p>

                                <p>
                                    <strong>Student Name:</strong>{' '}
                                    {selectedStudent.full_name}
                                </p>
                            </div>

                            <form onSubmit={handleSaveGrades}>

                                <h4>Selected Subject Grades</h4>

                                <div className="ol-form-grid">

                                    {[
                                        {
                                            field: 'subject_1_grade',
                                            subjectNo: selectedStudent.subject_1_no
                                        },
                                        {
                                            field: 'subject_2_grade',
                                            subjectNo: selectedStudent.subject_2_no
                                        },
                                        {
                                            field: 'subject_3_grade',
                                            subjectNo: selectedStudent.subject_3_no
                                        }
                                    ].map((subject, index) => {
                                        const subjectInfo = choiceSubjects.find(
                                            item => item.subject_no === subject.subjectNo
                                        )

                                        return (
                                            <div
                                                className="ol-form-group"
                                                key={subject.field}
                                            >
                                                <label>
                                                    {subjectInfo?.subject_name || `Subject ${index + 1}`}
                                                </label>

                                                <input
                                                    type="text"
                                                    value={studentGrades[subject.field]}
                                                    onChange={e =>
                                                        handleGradeChange(
                                                            subject.field,
                                                            e.target.value.toUpperCase().slice(0, 2)
                                                        )
                                                    }
                                                    placeholder="Enter grade"
                                                    maxLength={2}
                                                    required
                                                />
                                            </div>
                                        )
                                    })}

                                </div>

                                <h4>Other Examination Results</h4>

                                <div className="ol-form-grid">

                                    <div className="ol-form-group">
                                        <label>Common General Test (Out of 100)</label>

                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={studentGrades.cgt_marks}
                                            onChange={e =>
                                                handleGradeChange('cgt_marks', e.target.value)
                                            }
                                            placeholder="Enter CGT marks"
                                            required
                                        />
                                    </div>

                                    <div className="ol-form-group">
                                        <label>General English Grade</label>

                                        <input
                                            type="text"
                                            value={studentGrades.general_english_grade}
                                            onChange={e =>
                                                handleGradeChange(
                                                    'general_english_grade',
                                                    e.target.value.toUpperCase().slice(0, 2)
                                                )
                                            }
                                            placeholder="Enter grade"
                                            maxLength={2}
                                            required
                                        />
                                    </div>

                                    <div className="ol-form-group">
                                        <label>Z-Score (Optional)</label>

                                        <input
                                            type="number"
                                            step="0.0001"
                                            value={studentGrades.z_score}
                                            onChange={e =>
                                                handleGradeChange('z_score', e.target.value)
                                            }
                                            placeholder="Enter Z-score"
                                        />
                                    </div>

                                    <div className="ol-form-group">
                                        <label>Island Rank (Optional)</label>

                                        <input
                                            type="number"
                                            min="1"
                                            value={studentGrades.island_rank}
                                            onChange={e =>
                                                handleGradeChange('island_rank', e.target.value)
                                            }
                                            placeholder="Enter island rank"
                                        />
                                    </div>

                                    <div className="ol-form-group">
                                        <label>District Rank (Optional)</label>

                                        <input
                                            type="number"
                                            min="1"
                                            value={studentGrades.district_rank}
                                            onChange={e =>
                                                handleGradeChange('district_rank', e.target.value)
                                            }
                                            placeholder="Enter district rank"
                                        />
                                    </div>

                                </div>

                                {error && (
                                    <p style={{ color: 'red' }}>{error}</p>
                                )}

                                <div className="ol-popup-footer">

                                    <button
                                        type="button"
                                        className="ol-popup-cancel"
                                        onClick={() => setShowGradePopup(false)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={savingGrades}
                                    >
                                        {savingGrades ? 'Saving...' : 'Save Results'}
                                    </button>

                                </div>

                            </form>

                        </div>
                    </div>
                )}


                {/* LOADING AND ERROR MESSAGES */}
                {loading && (
                    <p>Loading A/L examination records...</p>
                )}

                {error && (
                    <p style={{ color: 'red' }}>{error}</p>
                )}

                {/* A/L RESULTS FILTERS AND ACTIONS */}
<div className="ol-results-actions">

    <div className="ol-form-group">
        <label>Examination Year</label>

        <input
            type="number"
            value={examYear}
            onChange={e => setExamYear(Number(e.target.value))}
        />
    </div>

  <div className="ol-form-group">
    <label>Examination Stream</label>

    <div className="al-stream-dropdown">
        <CustomDropdown
            value={selectedStreamId}
            options={streams.map(stream => ({
                value: String(stream.id),
                label: stream.stream_name
            }))}
            onChange={value => {
                setSelectedStreamId(value)

                setStudentForm({
                    exam_index_number: '',
                    full_name: '',
                    subject_1_no: '',
                    subject_2_no: '',
                    subject_3_no: ''
                })

                setError('')
            }}
            placeholder="Select A/L Stream"
            searchable={true}
            searchPlaceholder="Search streams..."
        />
    </div>
</div>

    <button
        type="button"
        disabled={!selectedStreamId}
        onClick={() => {
            setStudentPopupStep(1)
            setError('')
            setShowStudentPopup(true)
        }}
    >
        + Add Student
    </button>

</div>

                {/* REGISTERED STUDENTS TABLE */}
                {selectedStreamId && (
                    <div className="ol-student-table-section">

                        <h3>
                            Registered Students – {examYear}
                            {' – '}
                            {streams.find(
                                stream => String(stream.id) === String(selectedStreamId)
                            )?.stream_name}
                        </h3>

                        {students.length === 0 ? (
                            <p className="ol-empty-message">
                                No students registered for this examination year and stream.
                            </p>
                        ) : (
                            <div className="ol-table-wrapper">

                                <table className="ol-student-table">

                                    <thead>
                                        <tr>
                                            <th>No.</th>
                                            <th>Examination Index Number</th>
                                            <th>Student Name</th>
                                            <th>Subject 1</th>
                                            <th>Subject 2</th>
                                            <th>Subject 3</th>
                                            <th>CGT</th>
                                            <th>General English</th>
                                            <th>Z-Score</th>
                                            <th>Island Rank</th>
                                            <th>District Rank</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {students.map((student, index) => {

                                            const studentResult = results.find(
                                                result =>
                                                    Number(result.student_id) === Number(student.id)
                                            )

                                            const getSubjectName = subjectNo =>
                                                choiceSubjects.find(
                                                    subject => subject.subject_no === subjectNo
                                                )?.subject_name || subjectNo

                                            return (
                                                <tr key={student.id}>
                                                    <td>{index + 1}</td>


                                                    <td>
                                                        {student.exam_index_number || '-'}
                                                    </td>

                                                    <td>{student.full_name}</td>

                                                    <td>
                                                        <strong>
                                                            {getSubjectName(student.subject_1_no)}
                                                        </strong>
                                                        <br />
                                                        {studentResult?.subject_1_grade || '-'}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {getSubjectName(student.subject_2_no)}
                                                        </strong>
                                                        <br />
                                                        {studentResult?.subject_2_grade || '-'}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {getSubjectName(student.subject_3_no)}
                                                        </strong>
                                                        <br />
                                                        {studentResult?.subject_3_grade || '-'}
                                                    </td>

                                                    <td>
                                                        {studentResult?.cgt_marks ?? '-'}
                                                    </td>

                                                    <td>
                                                        {studentResult?.general_english_grade || '-'}
                                                    </td>

                                                    <td>
                                                        {studentResult?.z_score ?? '-'}
                                                    </td>

                                                    <td>
                                                        {studentResult?.island_rank ?? '-'}
                                                    </td>

                                                    <td>
                                                        {studentResult?.district_rank ?? '-'}
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="ol-enter-grades-btn"
                                                            onClick={() =>
                                                                handleOpenGradePopup(student)
                                                            }
                                                        >
                                                            Edit Results
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>

                                </table>

                            </div>
                        )}

                    </div>
                )}




            </main>

        </div>
    )

       
}

export default ALResults
