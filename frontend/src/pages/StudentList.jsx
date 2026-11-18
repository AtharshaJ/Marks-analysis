
import { useEffect, useState } from 'react'
import {
    useNavigate,
    useParams,
    useSearchParams
} from 'react-router-dom'
import './StudentList.css'
import CustomDropdown from '../components/CustomDropdown'

function StudentList() {
    const { classId } = useParams()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [students, setStudents] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [subjectSettings, setSubjectSettings] = useState([])

const [showSubjectSettings, setShowSubjectSettings] = useState(false)    
const [classSubjects, setClassSubjects] = useState([])
const [isClassTeacher, setIsClassTeacher] = useState(false)
const [requiresManualSelection, setRequiresManualSelection] = useState(false)
const [settingsLoading, setSettingsLoading] = useState(true)
const [settingsError, setSettingsError] = useState('')
const [updatingSubjectId, setUpdatingSubjectId] = useState(null)
const [academicYears, setAcademicYears] = useState([])
const [selectedYearId, setSelectedYearId] = useState('')
const [terms, setTerms] = useState([])
const [selectedTermId, setSelectedTermId] = useState('')
const [reportLoading, setReportLoading] = useState(false)

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

                // Fetch academic years for progress reports
const yearsResponse = await fetch(
    `${API_BASE_URL}/api/term-tests/academic-years`,
    { credentials: 'include' }
)

const yearsResult = await yearsResponse.json()

if (!yearsResponse.ok) {
    throw new Error(
        yearsResult.message || 'Unable to load academic years.'
    )
}

const years = yearsResult.academicYears || []

setAcademicYears(years)

// Restore previously selected year, otherwise use active year
const urlYearId = searchParams.get('yearId')
const urlTermId = searchParams.get('termId')

const savedYear = years.find(
    year => String(year.id) === urlYearId
)

const activeYear = years.find(year => year.is_active)

const initialYear = savedYear || activeYear || years[0]

if (initialYear) {
    const yearId = String(initialYear.id)

    setSelectedYearId(yearId)

    const sortedTerms = [...(initialYear.academic_terms || [])]
        .sort((a, b) => a.term_number - b.term_number)

    setTerms(sortedTerms)

    const savedTerm = sortedTerms.find(
        term => String(term.id) === urlTermId
    )

    const initialTerm = savedTerm || sortedTerms[0]

    if (initialTerm) {
        setSelectedTermId(String(initialTerm.id))
    }

    setSearchParams({
        yearId,
        termId: initialTerm ? String(initialTerm.id) : ''
    }, { replace: true })
}

                // Fetch subject inclusion settings
const settingsResponse = await fetch(
    `${API_BASE_URL}/api/subject-settings/${classId}`,
    { credentials: 'include' }
)

const settingsResult = await settingsResponse.json()

if (!settingsResponse.ok) {
    throw new Error(
        settingsResult.message || 'Unable to retrieve subject settings.'
    )
}

setSubjectSettings(settingsResult.settings || [])
setIsClassTeacher(settingsResult.isClassTeacher || false)
setRequiresManualSelection(
    settingsResult.requiresManualSelection
)

// Fetch subjects registered in this class
const subjectsResponse = await fetch(
    `${API_BASE_URL}/api/term-tests/${classId}/subjects`,
    { credentials: 'include' }
)

const subjectsResult = await subjectsResponse.json()

if (!subjectsResponse.ok) {
    throw new Error(
        subjectsResult.message || 'Unable to retrieve class subjects.'
    )
}

setClassSubjects(subjectsResult.subjects || [])

            } catch (error) {
                console.error('Student list error:', error)
                setError(error.message)
            } finally {
    setLoading(false)
    setSettingsLoading(false)
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

    const handleYearChange = (yearId) => {
    setSelectedYearId(yearId)

    const selectedYear = academicYears.find(
        year => String(year.id) === String(yearId)
    )

    const sortedTerms = [...(selectedYear?.academic_terms || [])]
        .sort((a, b) => a.term_number - b.term_number)

    setTerms(sortedTerms)

    const firstTermId = sortedTerms.length > 0
        ? String(sortedTerms[0].id)
        : ''

    setSelectedTermId(firstTermId)

    setSearchParams({
        yearId,
        termId: firstTermId
    })
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
                className="subject-analysis-back-btn"
                onClick={() =>
                    navigate(`/employee/term-tests/${classId}`)
                }
            >
                ← Back to Term Tests
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
            navigate(
    `/employee/term-tests/${classId}/subjects?yearId=${selectedYearId}&termId=${selectedTermId}`
)
        }
    >
        View Subjects →
    </button>

</div>

{/* Progress Report Selection */}
<div className="progress-report-selection">

    <h3>Student Progress Reports</h3>

    <p>
        Select an academic year and term to view or print student reports.
    </p>

    
<div className="student-report-controls">

    <div className="student-report-controls-header">
        <h3>Student Progress Reports</h3>
        <p>
            Select an academic year and term to view or print student progress reports.
        </p>
    </div>

    <div className="student-report-selectors">

        <div>
            <label>Academic Year</label>

            <CustomDropdown
                value={selectedYearId}
                onChange={handleYearChange}
                placeholder="Select Academic Year"
                options={academicYears.map(year => ({
                    value: String(year.id),
                    label: String(year.year)
                }))}
            />
        </div>

        <div>
            <label>Academic Term</label>

            <CustomDropdown
                value={selectedTermId}
                onChange={(termId) => {
    setSelectedTermId(termId)

    setSearchParams({
        yearId: selectedYearId,
        termId
    })
}}
                placeholder="Select Academic Term"
                disabled={!terms.length}
                options={terms.map(term => ({
                    value: String(term.id),
                    label: term.term_name
                }))}
            />
        </div>

    </div>

    <div className="student-report-actions">
        <button
            type="button"
            className="student-report-print-all-btn"
            disabled={!selectedTermId || students.length === 0 || reportLoading}
            onClick={() =>
    navigate(
        `/employee/term-tests/${classId}/reports/print-all?yearId=${selectedYearId}&termId=${selectedTermId}`
    )
}
        >
            {reportLoading ? 'Preparing Reports...' : 'Print All Reports'}
        </button>
    </div>

</div>


</div>

{/* Subject Inclusion Settings Dropdown */}
{requiresManualSelection && !loading && !error && (
    <div className="student-inclusion-settings">

        <button
            type="button"
            className="student-inclusion-toggle"
            onClick={() =>
                setShowSubjectSettings(previous => !previous)
            }
        >
            <span>
                <strong>Subject Inclusion Settings</strong>
                <small>
                    Manage subjects included in totals and averages
                </small>
            </span>

            <span className="student-inclusion-arrow">
                {showSubjectSettings ? '▲' : '▼'}
            </span>
        </button>

        {showSubjectSettings && (
            <div className="student-inclusion-panel">

                {settingsLoading ? (
                    <p>Loading subject settings...</p>
                ) : settingsError ? (
                    <p className="student-inclusion-error">
                        {settingsError}
                    </p>
                ) : (
                    <>
                        <div className="student-inclusion-list">
                            {classSubjects.map(subject => {
                                const setting = subjectSettings.find(item =>
                                    Number(item.subject_id) === Number(subject.subject_id)
                                )

                                return (
                                    <label
                                        key={subject.subject_id}
                                        className="student-inclusion-item"
                                    >
                                        <span>{subject.subject_name}</span>

                                        <input
                                            type="checkbox"
                                            checked={setting?.include_in_total ?? true}
                                            disabled={
                                                !isClassTeacher ||
                                                updatingSubjectId === subject.subject_id
                                            }
                                            onChange={event =>
                                                handleToggleSubjectInclusion(
                                                    subject,
                                                    event.target.checked
                                                )
                                            }
                                        />
                                    </label>
                                )
                            })}
                        </div>

                        {!isClassTeacher && (
                            <p className="student-inclusion-note">
                                Only the assigned Class Teacher can change these settings.
                            </p>
                        )}
                    </>
                )}
            </div>
        )}
    </div>
)}
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
            onClick={() => {
                if (!selectedTermId || !selectedYearId) {
                    alert('Please select an academic year and term first.')
                    return
                }

                navigate(
                    `/employee/term-tests/${classId}/students/${student.id}?yearId=${selectedYearId}&termId=${selectedTermId}`
                )
            }}
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
