
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './OLResults.css'
import CustomDropdown from '../components/CustomDropdown'
import API_URL from '../config'

function OLResults({ user }) {
    const navigate = useNavigate()

    const [examYear, setExamYear] = useState(new Date().getFullYear())

    const [commonSubjects, setCommonSubjects] = useState([])

    const [baskets, setBaskets] = useState({
        'Basket 1': [],
        'Basket 2': [],
        'Basket 3': []
    })

    const [loadingSubjects, setLoadingSubjects] = useState(true)
    const [error, setError] = useState('')

   

const [studentForm, setStudentForm] = useState({
    index_number: '',
    student_name: '',
    basket1_subject_id: '',
    basket2_subject_id: '',
    basket3_subject_id: ''
})

const [showStudentPopup, setShowStudentPopup] = useState(false)
const [studentPopupStep, setStudentPopupStep] = useState(1)

const [students, setStudents] = useState([])
const [results, setResults] = useState([])
const [savingStudent, setSavingStudent] = useState(false)
const [showGradePopup, setShowGradePopup] = useState(false)
const [selectedStudent, setSelectedStudent] = useState(null)
const [studentGrades, setStudentGrades] = useState({})
const [savingGrades, setSavingGrades] = useState(false)


    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setLoadingSubjects(true)
                setError('')

                const response = await fetch(
                    `${API_URL}/api/ol-results/subjects`,
                    {
                        credentials: 'include'
                    }
                )

                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || 'Unable to load O/L subjects.'
                    )
                }

                setCommonSubjects(data.commonSubjects || [])
                setBaskets(data.baskets || {
                    'Basket 1': [],
                    'Basket 2': [],
                    'Basket 3': []
                })

            } catch (error) {
                console.error('O/L subjects loading error:', error)
                setError(error.message || 'Unable to load O/L subjects.')
            } finally {
                setLoadingSubjects(false)
            }
        }

        fetchSubjects()
    }, [])


useEffect(() => {
    const fetchStudents = async () => {
        try {
            const response = await fetch(
               `${API_URL}/api/ol-results/year/${examYear}`,
                {
                    credentials: 'include'
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Unable to load O/L students.'
                )
            }

            setStudents(data.students || [])
setResults(data.results || [])

        } catch (error) {
            console.error('O/L students loading error:', error)
            setError(error.message || 'Unable to load O/L students.')
        }
    }

    fetchStudents()
}, [examYear])


    const handleStudentFormChange = (field, value) => {
    setStudentForm(prev => ({
        ...prev,
        [field]: value
    }))
}

const handleNextStudentStep = () => {
    if (
        !studentForm.index_number.trim() ||
        !studentForm.student_name.trim()
    ) {
        setError('Please enter the student index number and name.')
        return
    }

    setError('')
    setStudentPopupStep(2)
}

const handleOpenGradePopup = (student) => {
    setSelectedStudent(student)

    const initialGrades = {}

    commonSubjects.forEach(subject => {
        initialGrades[subject.id] = ''
    })

    ;[
        student.basket1_subject_id,
        student.basket2_subject_id,
        student.basket3_subject_id
    ].forEach(subjectId => {
        initialGrades[subjectId] = ''
    })

    results
        .filter(result => Number(result.student_id) === Number(student.id))
        .forEach(result => {
            initialGrades[result.subject_id] = result.grade
        })

    setStudentGrades(initialGrades)
    setShowGradePopup(true)
}

const handleGradeChange = (subjectId, grade) => {
    setStudentGrades(prev => ({
        ...prev,
        [subjectId]: grade
    }))
}

const handleSaveGrades = async (e) => {
    e.preventDefault()

    if (!selectedStudent) return

    const subjectIds = [
        ...commonSubjects.map(subject => subject.id),
        selectedStudent.basket1_subject_id,
        selectedStudent.basket2_subject_id,
        selectedStudent.basket3_subject_id
    ]

    const missingGrades = subjectIds.some(
        subjectId => !studentGrades[subjectId]
    )

    if (missingGrades) {
        setError('Please enter grades for all nine subjects.')
        return
    }

    try {
        setSavingGrades(true)
        setError('')

        const responses = await Promise.all(
            subjectIds.map(subjectId =>
                fetch(`${API_URL}/api/ol-results/grades`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        student_id: selectedStudent.id,
                        subject_id: subjectId,
                        grade: studentGrades[subjectId]
                    })
                })
            )
        )

        const data = await Promise.all(
            responses.map(response => response.json())
        )

        const failedIndex = responses.findIndex(
            (response, index) => !response.ok || !data[index].success
        )

        if (failedIndex !== -1) {
            throw new Error(
                data[failedIndex].message || 'Unable to save all grades.'
            )
        }

        const refreshResponse = await fetch(
            `${API_URL}/api/ol-results/year/${examYear}`,
            { credentials: 'include' }
        )

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok || !refreshData.success) {
            throw new Error('Grades saved, but refreshing the results failed.')
        }

        setResults(refreshData.results || [])
        setStudents(refreshData.students || [])
        setShowGradePopup(false)

    } catch (error) {
        console.error('O/L grade saving error:', error)
        setError(error.message || 'Unable to save grades.')
    } finally {
        setSavingGrades(false)
    }
}

const handleRegisterStudent = async (e) => {
    e.preventDefault()

    if (
        !studentForm.index_number.trim() ||
        !studentForm.student_name.trim() ||
        !studentForm.basket1_subject_id ||
        !studentForm.basket2_subject_id ||
        !studentForm.basket3_subject_id
    ) {
        setError('Please complete all student details and select all three basket subjects.')
        return
    }

    try {
        setSavingStudent(true)
        setError('')

        const response = await fetch(
            `${API_URL}/api/ol-results/students`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    exam_year: examYear,
                    ...studentForm
                })
            }
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Unable to register student.'
            )
        }

       setStudents(prev => [...prev, data.student].sort((a, b) =>
    String(a.index_number).localeCompare(
        String(b.index_number),
        undefined,
        { numeric: true, sensitivity: 'base' }
    )
))

        setStudentForm({
            index_number: '',
            student_name: '',
            basket1_subject_id: '',
            basket2_subject_id: '',
            basket3_subject_id: ''
        })

        setShowStudentPopup(false)

    } catch (error) {
        console.error('O/L student registration error:', error)
        setError(error.message || 'Unable to register student.')
    } finally {
        setSavingStudent(false)
    }
}


    return (
        <div className="ol-results-page">

            <header className="ol-results-header">
                <h2>G.C.E. Ordinary Level Examination</h2>

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
    <h2>O/L Student Results Management</h2>

    <div className="ol-results-actions">
    <button
    type="button"
    onClick={() => {
        setStudentPopupStep(1)
        setError('')
        setShowStudentPopup(true)
    }}
>
    + Add Student
</button>
</div>


{showStudentPopup && (
    <div className="ol-popup-overlay">
        <div className="ol-popup-content">

            <div className="ol-popup-header">
                <h3>Add O/L Student</h3>

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
                    onChange={e => setExamYear(Number(e.target.value))}
                    min="2000"
                    required
                />
            </div>

            <div className="ol-form-group">
                <label>Index Number</label>
                <input
                    type="text"
                    value={studentForm.index_number}
                    onChange={e =>
                        handleStudentFormChange('index_number', e.target.value)
                    }
                    placeholder="Enter index number"
                    required
                />
            </div>

            <div className="ol-form-group">
                <label>Student Name</label>
                <input
                    type="text"
                    value={studentForm.student_name}
                    onChange={e =>
                        handleStudentFormChange('student_name', e.target.value)
                    }
                    placeholder="Enter student name"
                    required
                />
            </div>
        </>
    ) : (
        <>
          {['Basket 1', 'Basket 2', 'Basket 3'].map(basketName => {
    const field = basketName.toLowerCase().replace(' ', '') + '_subject_id'

    return (
        <div key={basketName}>
            <label>{basketName}</label>

            <CustomDropdown
                value={studentForm[field]}
                options={(baskets[basketName] || []).map(subject => ({
                    value: subject.id,
                    label: subject.subject_name
                }))}
                onChange={value =>
                    handleStudentFormChange(field, value)
                }
                placeholder={`Select ${basketName} Subject`}
                searchable={true}
                searchPlaceholder="Search subjects..."
            />
        </div>
    )
})}
        </>
    )}

</div>

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

{showGradePopup && selectedStudent && (
    <div className="ol-popup-overlay">
        <div className="ol-popup-content">

            <div className="ol-popup-header">
                <h3>Enter Examination Grades</h3>

                <button
                    type="button"
                    onClick={() => setShowGradePopup(false)}
                >
                    ×
                </button>
            </div>

            <div className="ol-grade-student-details">
                <p>
                    <strong>Index Number:</strong> {selectedStudent.index_number}
                </p>
                <p>
                    <strong>Student Name:</strong> {selectedStudent.student_name}
                </p>
            </div>

            <form onSubmit={handleSaveGrades}>

                <h4>Common Subjects</h4>

                <div className="ol-form-grid">
                    {commonSubjects.map(subject => (
                        <div className="ol-form-group" key={subject.id}>
                            <label>{subject.subject_name}</label>

                           <input
    type="text"
    value={studentGrades[subject.id] || ''}
    onChange={e =>
        handleGradeChange(
            subject.id,
            e.target.value.toUpperCase().slice(0, 1)
        )
    }
    placeholder="Enter grade"
    maxLength={1}
/>
                        </div>
                    ))}
                </div>

                <h4>Selected Basket Subjects</h4>

                <div className="ol-form-grid">
                    {[
                        {
                            id: selectedStudent.basket1_subject_id,
                            name: selectedStudent.basket1_subject?.subject_name,
                            label: 'Basket 1'
                        },
                        {
                            id: selectedStudent.basket2_subject_id,
                            name: selectedStudent.basket2_subject?.subject_name,
                            label: 'Basket 2'
                        },
                        {
                            id: selectedStudent.basket3_subject_id,
                            name: selectedStudent.basket3_subject?.subject_name,
                            label: 'Basket 3'
                        }
                    ].map(subject => (
                        <div className="ol-form-group" key={subject.id}>
                            <label>
                                {subject.name || subject.label}
                            </label>

                           <input
    type="text"
    value={studentGrades[subject.id] || ''}
    onChange={e =>
        handleGradeChange(
            subject.id,
            e.target.value.toUpperCase().slice(0, 2)
        )
    }
    maxLength={2}
    placeholder="Grade"
    required
/>
                        </div>
                    ))}
                </div>

                <div className="ol-popup-footer">
                    <button
                        type="button"
                        className="ol-popup-cancel"
                        onClick={() => setShowGradePopup(false)}
                    >
                        Cancel
                    </button>

                    <button type="submit" disabled={savingGrades}>
                        {savingGrades ? 'Saving...' : 'Save Grades'}
                    </button>
                </div>

            </form>
        </div>
    </div>
)}




   {loadingSubjects && (
    <p>Loading subjects...</p>
)}

{error && (
    <p style={{ color: 'red' }}>{error}</p>
)}

   <div className="ol-student-table-section">
    <h3>Registered Students – {examYear}</h3>

    {students.length === 0 ? (
        <p className="ol-empty-message">
            No students registered for this examination year.
        </p>
    ) : (
        <div className="ol-table-wrapper">
            <table className="ol-student-table">

               
<thead>
    <tr>
        <th>No.</th>
        <th>Index Number</th>
        <th>Student Name</th>

        {commonSubjects.map(subject => (
            <th key={subject.id}>
                {subject.subject_name}
            </th>
        ))}

        <th>Basket 1</th>
        <th>Basket 2</th>
        <th>Basket 3</th>
        <th>Action</th>
    </tr>
</thead>

<tbody>
    {students.map((student, index) => {
        const getGrade = (subjectId) => {
            const result = results.find(result =>
                Number(result.student_id) === Number(student.id) &&
                Number(result.subject_id) === Number(subjectId)
            )

            return result?.grade || '-'
        }

        const getBasketSubject = (subjectId, basketName) => {
            const subject = baskets[basketName]?.find(
                item => Number(item.id) === Number(subjectId)
            )

            return subject?.subject_name || 'Unknown Subject'
        }

        return (
            <tr key={student.id}>
                <td>{index + 1}</td>
                <td>{student.index_number}</td>
                <td>{student.student_name}</td>

                {commonSubjects.map(subject => (
                    <td key={subject.id}>
                        {getGrade(subject.id)}
                    </td>
                ))}

                <td>
                    <strong>
                        {getBasketSubject(
                            student.basket1_subject_id,
                            'Basket 1'
                        )}
                    </strong>
                    <br />
                    {getGrade(student.basket1_subject_id)}
                </td>

                <td>
                    <strong>
                        {getBasketSubject(
                            student.basket2_subject_id,
                            'Basket 2'
                        )}
                    </strong>
                    <br />
                    {getGrade(student.basket2_subject_id)}
                </td>

                <td>
                    <strong>
                        {getBasketSubject(
                            student.basket3_subject_id,
                            'Basket 3'
                        )}
                    </strong>
                    <br />
                    {getGrade(student.basket3_subject_id)}
                </td>

                <td>
                    <button
                        type="button"
                        className="ol-enter-grades-btn"
                        onClick={() => handleOpenGradePopup(student)}
                    >
                        Edit Grades
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
</main>

        </div>
    )
}

export default OLResults
