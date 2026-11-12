import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './SubjectMarks.css'
import CustomDropdown from '../components/CustomDropdown'

function SubjectMarks({ user }) {
    const { classId } = useParams()
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [students, setStudents] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [academicYears, setAcademicYears] = useState([])

    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedTermId, setSelectedTermId] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')

    const [classSubjects, setClassSubjects] = useState([])
    // Subject inclusion settings
const [subjectSettings, setSubjectSettings] = useState([])
const [isClassTeacher, setIsClassTeacher] = useState(false)
const [requiresManualSelection, setRequiresManualSelection] = useState(true)
const [settingsLoading, setSettingsLoading] = useState(false)
const [settingsError, setSettingsError] = useState('')
const [updatingSubjectId, setUpdatingSubjectId] = useState(null)

    const [subjectMarks, setSubjectMarks] = useState({})
const [marksLoading, setMarksLoading] = useState(false)
const [marksError, setMarksError] = useState('')
const [saving, setSaving] = useState(false)
const [saveMessage, setSaveMessage] = useState('')

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Load class students and academic years
    useEffect(() => {
        const fetchPageData = async () => {
            try {
                setLoading(true)
                setError('')

                const [studentsResponse, yearsResponse] =
                    await Promise.all([
                        fetch(
                            `${API_BASE_URL}/api/term-tests/${classId}/students`,
                            { credentials: 'include' }
                        ),
                        fetch(
                            `${API_BASE_URL}/api/term-tests/academic-years`,
                            { credentials: 'include' }
                        )
                    ])

                const [studentsResult, yearsResult] =
                    await Promise.all([
                        studentsResponse.json(),
                        yearsResponse.json()
                    ])

                if (!studentsResponse.ok) {
                    throw new Error(
                        studentsResult.message ||
                        'Unable to load students.'
                    )
                }

                if (!yearsResponse.ok) {
                    throw new Error(
                        yearsResult.message ||
                        'Unable to load academic years.'
                    )
                }

                setStudents(studentsResult.students || [])
                setSelectedClass(studentsResult.class)
                setAcademicYears(yearsResult.academicYears || [])

                // Load all subjects registered by students in this class
const subjectsResponse = await fetch(
    `${API_BASE_URL}/api/term-tests/${classId}/subjects`,
    { credentials: 'include' }
)

const subjectsResult = await subjectsResponse.json()

if (!subjectsResponse.ok) {
    throw new Error(
        subjectsResult.message || 'Unable to load class subjects.'
    )
}

setClassSubjects(subjectsResult.subjects || [])

// Load subject inclusion settings
setSettingsLoading(true)

const settingsResponse = await fetch(
    `${API_BASE_URL}/api/subject-settings/${classId}`,
    { credentials: 'include' }
)

const settingsResult = await settingsResponse.json()

if (!settingsResponse.ok) {
    throw new Error(
        settingsResult.message || 'Unable to load subject settings.'
    )
}

setSubjectSettings(settingsResult.settings || [])
setIsClassTeacher(settingsResult.isClassTeacher || false)
setRequiresManualSelection(
    settingsResult.requiresManualSelection
)

setSettingsLoading(false)

            } catch (error) {
                console.error('Subject marks page error:', error)
                setError(error.message)
                setSettingsError('Unable to load subject inclusion settings.')
setSettingsLoading(false)
            } finally {
                setLoading(false)
            }
        }

        fetchPageData()
    }, [classId])

    const selectedYear = academicYears.find(
        year => String(year.id) === selectedYearId
    )

    const availableTerms = selectedYear?.academic_terms || []

    // Get the selected subject
const selectedSubjectData = classSubjects.find(subject =>
    subject.subject_type === 'al'
        ? selectedSubject === `al-${subject.al_subject_no}`
        : selectedSubject === `regular-${subject.subject_id}`
)

// Display only students registered for the selected subject
const filteredStudents = selectedSubjectData
    ? students.filter(student =>
        selectedSubjectData.registered_student_ids.some(
            id => Number(id) === Number(student.id)
        )
    )
    : []

    // Load existing marks for the selected subject
useEffect(() => {
    const fetchSubjectMarks = async () => {
        if (!selectedTermId || !selectedSubjectData) {
            setSubjectMarks({})
            return
        }

        try {
            setMarksLoading(true)
            setMarksError('')
            setSaveMessage('')

            const results = await Promise.all(
                filteredStudents.map(async student => {
                    const response = await fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students/${student.id}/marks?termId=${selectedTermId}`,
                        { credentials: 'include' }
                    )

                    const result = await response.json()

                    if (!response.ok) {
                        throw new Error(
                            result.message || 'Unable to load student marks.'
                        )
                    }

                    return {
                        studentId: student.id,
                        marks: result.marks || []
                    }
                })
            )

            const marksByStudent = {}

            results.forEach(item => {
                const existingMark = item.marks.find(mark =>
                    selectedSubjectData.subject_type === 'al'
                        ? String(mark.al_subject_no).trim() ===
                          String(selectedSubjectData.al_subject_no).trim()
                        : Number(mark.subject_id) ===
                          Number(selectedSubjectData.subject_id)
                )

                marksByStudent[item.studentId] =
                    existingMark ? String(existingMark.marks) : ''
            })

            setSubjectMarks(marksByStudent)

        } catch (error) {
            console.error('Subject marks loading error:', error)
            setMarksError(error.message)
        } finally {
            setMarksLoading(false)
        }
    }

    fetchSubjectMarks()
}, [selectedTermId, selectedSubject, classId, students])

// Save marks for all students registered for the selected subject
const handleSaveSubjectMarks = async () => {
    if (!selectedTermId || !selectedSubjectData) {
        return
    }

    try {
        setSaving(true)
        setSaveMessage('')
        setMarksError('')

        const saveRequests = filteredStudents.map(student => {
            const markValue = subjectMarks[student.id] ?? ''

            const markEntry =
                selectedSubjectData.subject_type === 'al'
                    ? {
                        subject_id: null,
                        al_subject_no: selectedSubjectData.al_subject_no,
                        marks: markValue
                    }
                    : {
                        subject_id: selectedSubjectData.subject_id,
                        al_subject_no: null,
                        marks: markValue
                    }

            return fetch(
                `${API_BASE_URL}/api/term-tests/${classId}/students/${student.id}/marks`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        termId: Number(selectedTermId),
                        marks: [markEntry]
                    })
                }
            ).then(async response => {
                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        `${student.student_name}: ${
                            result.message || 'Unable to save marks.'
                        }`
                    )
                }

                return result
            })
        })

        await Promise.all(saveRequests)

        setSaveMessage('All student marks saved successfully!')

    } catch (error) {
        console.error('Subject marks saving error:', error)
        setMarksError(error.message)
    } finally {
        setSaving(false)
    }
}

const handleToggleSubjectInclusion = async (subject, includeInTotal) => {
    if (!isClassTeacher) return

    setUpdatingSubjectId(subject.subject_id)
    setSettingsError('')

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/subject-settings/${classId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    subjectId: subject.subject_id,
                    includeInTotal
                })
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(
                result.message || 'Unable to update subject setting.'
            )
        }

        setSubjectSettings(previousSettings =>
            previousSettings.map(setting =>
                Number(setting.subject_id) === Number(subject.subject_id)
                    ? {
                        ...setting,
                        include_in_total: result.setting.include_in_total
                    }
                    : setting
            )
        )
    } catch (error) {
        setSettingsError(error.message)
    } finally {
        setUpdatingSubjectId(null)
    }
}

    return (
        <div className="subject-marks-page">

            <header className="subject-marks-header">

                <div className="subject-marks-brand">
                    <div className="subject-marks-brand-icon">
                        MA
                    </div>

                    <div>
                        <h2>Marks <span>Analysis</span></h2>
                        <p>Teacher Portal</p>
                    </div>
                </div>

                <button
                    className="subject-marks-back-btn"
                    onClick={() =>
                        navigate(
                            `/employee/term-tests/${classId}/students`
                        )
                    }
                >
                    ← Back to Student List
                </button>

            </header>

            <main className="subject-marks-main">

                <div className="subject-marks-title">
                    <span>TERM TEST MANAGEMENT</span>
                    <h1>Subjects View</h1>
                    <p>
                        View and manage term test marks by subject
                        for all students in this class.
                    </p>
                </div>

                {loading ? (
                    <div className="subject-marks-message">
                        Loading class information...
                    </div>
                ) : error ? (
                    <div className="subject-marks-error">
                        {error}
                    </div>
                ) : (
                    <>
                        <section className="subject-marks-class-card">
                            <h2>Class Information</h2>

                            <div>
                                <span>Class</span>
                                <strong>
                                    {selectedClass?.class_name}
                                </strong>
                            </div>

                            <div>
                                <span>Total Students</span>
                                <strong>{students.length}</strong>
                            </div>

                            <div>
                                <span>Teacher</span>
                                <strong>
                                    {user?.full_name || 'Teacher'}
                                </strong>
                            </div>
                        </section>

                        <section className="subject-marks-content">

                            <h2>Subject Marks</h2>

                           
<div className="subject-marks-selectors">

    {/* Academic Year */}
    <div>
        <label>Academic Year</label>

        <CustomDropdown
            value={selectedYearId}
            placeholder="Select Academic Year"
            options={academicYears.map(year => ({
                value: String(year.id),
                label: String(year.year)
            }))}
            onChange={value => {
                setSelectedYearId(value)
                setSelectedTermId('')
                setSelectedSubject('')
            }}
        />
    </div>

    {/* Term */}
    <div>
        <label>Term</label>

        <CustomDropdown
            value={selectedTermId}
            placeholder="Select Term"
            disabled={!selectedYearId}
            options={availableTerms.map(term => ({
                value: String(term.id),
                label: term.term_name
            }))}
            onChange={value => {
                setSelectedTermId(value)
                setSelectedSubject('')
            }}
        />
    </div>

    {/* Subject */}
    <div>
        <label>Subject</label>

        <CustomDropdown
            value={selectedSubject}
            placeholder="Select Subject"
            disabled={!selectedTermId}
            options={classSubjects.map(subject => ({
                value: subject.subject_type === 'al'
                    ? `al-${subject.al_subject_no}`
                    : `regular-${subject.subject_id}`,
                label: subject.subject_name
            }))}
            onChange={value => setSelectedSubject(value)}
        />
    </div>

</div>


                         
<div className="subject-marks-table-section">

                            
    <h3>Student Marks</h3>

    {!selectedYearId || !selectedTermId || !selectedSubject ? (
        <p className="subject-marks-placeholder">
            Select an academic year, term and subject
            to view the students' marks.
        </p>
    ) : marksLoading ? (
        <p className="subject-marks-message">
            Loading student marks...
        </p>
    ) : marksError ? (
        <p className="subject-marks-error">
            {marksError}
        </p>
    ) : filteredStudents.length === 0 ? (
        <p className="subject-marks-placeholder">
            No students are registered for this subject.
        </p>
    ) : (
        <>
            <div className="subject-marks-table-wrapper">
                <table className="subject-marks-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Index Number</th>
                            <th>Student Name</th>
                            <th>Marks (100)</th>
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
                                        max="100"
                                        step="0.01"
                                        value={
                                            subjectMarks[student.id] ?? ''
                                        }
                                        onChange={e =>
                                            setSubjectMarks(previous => ({
                                                ...previous,
                                                [student.id]: e.target.value
                                            }))
                                        }
                                        placeholder="Enter marks"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="subject-marks-student-count">
                Showing {filteredStudents.length} registered students
            </p>

            <div className="subject-marks-save-section">

    {saveMessage && (
        <p className="subject-marks-success">
            {saveMessage}
        </p>
    )}

    <button
        className="subject-marks-save-btn"
        onClick={handleSaveSubjectMarks}
        disabled={saving || marksLoading || filteredStudents.length === 0}
    >
        {saving ? 'Saving...' : 'Save Marks'}
    </button>

</div>
        </>
    )}

</div>

                        </section>
                    </>
                )}

            </main>

        </div>
    )
}

export default SubjectMarks