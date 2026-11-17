
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './SubjectAnalysis.css'
import CustomDropdown from '../components/CustomDropdown'

function SubjectAnalysis({ user }) {
    const { classId } = useParams()
    const navigate = useNavigate()
    

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [academicYears, setAcademicYears] = useState([])
const [selectedYearId, setSelectedYearId] = useState('')
const [terms, setTerms] = useState([])
const [selectedTermId, setSelectedTermId] = useState('')
    const [students, setStudents] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [classSubjects, setClassSubjects] = useState([])
    const [selectedSubject, setSelectedSubject] = useState('')

    const [subjectMarks, setSubjectMarks] = useState({})

    const [allSubjectPerformance, setAllSubjectPerformance] = useState([])
const [comparisonLoading, setComparisonLoading] = useState(false)
const [comparisonError, setComparisonError] = useState('')

    const [loading, setLoading] = useState(true)
    const [marksLoading, setMarksLoading] = useState(false)
    const [error, setError] = useState('')
    const [marksError, setMarksError] = useState('')


useEffect(() => {
    const fetchAcademicYears = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/term-tests/academic-years`,
                { credentials: 'include' }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to load academic years.'
                )
            }

            const years = result.academicYears || []

            setAcademicYears(years)

            const activeYear = years.find(year => year.is_active) || years[0]

            if (activeYear) {
                setSelectedYearId(String(activeYear.id))

                const availableTerms = [...(activeYear.academic_terms || [])]
                    .sort((a, b) => a.term_number - b.term_number)

                setTerms(availableTerms)

                if (availableTerms.length > 0) {
                    setSelectedTermId(String(availableTerms[0].id))
                }
            }
        } catch (error) {
            console.error('Academic year loading error:', error)
            setError(error.message)
        }
    }

    fetchAcademicYears()
}, [])


useEffect(() => {
    if (!selectedYearId || academicYears.length === 0) {
        setTerms([])
        setSelectedTermId('')
        return
    }

    const selectedYear = academicYears.find(
        year => String(year.id) === String(selectedYearId)
    )

    const availableTerms = [...(selectedYear?.academic_terms || [])]
        .sort((a, b) => a.term_number - b.term_number)

    setTerms(availableTerms)

    setSelectedTermId(
        availableTerms.length > 0
            ? String(availableTerms[0].id)
            : ''
    )

    setSelectedSubject('')
}, [selectedYearId, academicYears])



    useEffect(() => {
    const fetchPageData = async () => {
        try {
            setLoading(true)
            setError('')

            const studentsResponse = await fetch(
                `${API_BASE_URL}/api/term-tests/${classId}/students`,
                { credentials: 'include' }
            )

            const studentsResult = await studentsResponse.json()

            if (!studentsResponse.ok) {
                throw new Error(
                    studentsResult.message || 'Unable to load students.'
                )
            }

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

            setStudents(studentsResult.students || [])
            setSelectedClass(studentsResult.class)
            setClassSubjects(subjectsResult.subjects || [])

        } catch (error) {
            console.error('Subject analysis loading error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    fetchPageData()
}, [classId])

// Get the selected subject
const selectedSubjectData = classSubjects.find(subject =>
    subject.subject_type === 'al'
        ? selectedSubject === `al-${subject.al_subject_no}`
        : selectedSubject === `regular-${subject.subject_id}`
)

// Get students registered for the selected subject
const filteredStudents = selectedSubjectData
    ? students.filter(student =>
        (selectedSubjectData.registered_student_ids || []).some(
            id => Number(id) === Number(student.id)
        )
    )
    : []


useEffect(() => {
    const fetchSubjectMarks = async () => {
        if (!selectedTermId || !selectedSubjectData) {
            setSubjectMarks({})
            return
        }

        try {
            setMarksLoading(true)
            setMarksError('')

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
                    existingMark ? Number(existingMark.marks) : ''
            })

            setSubjectMarks(marksByStudent)

        } catch (error) {
            console.error('Subject analysis marks error:', error)
            setMarksError(error.message)
        } finally {
            setMarksLoading(false)
        }
    }

    fetchSubjectMarks()
}, [selectedTermId, selectedSubject, classId, students])


useEffect(() => {
    const fetchAllSubjectPerformance = async () => {
        if (!selectedTermId || students.length === 0 || classSubjects.length === 0) {
            setAllSubjectPerformance([])
            return
        }

        try {
            setComparisonLoading(true)
            setComparisonError('')

            // Fetch each student's marks once
            const studentResults = await Promise.all(
                students.map(async student => {
                    const response = await fetch(
                        `${API_BASE_URL}/api/term-tests/${classId}/students/${student.id}/marks?termId=${selectedTermId}`,
                        { credentials: 'include' }
                    )

                    const result = await response.json()

                    if (!response.ok) {
                        throw new Error(
                            result.message || `Unable to load marks for ${student.student_name}.`
                        )
                    }

                    return {
                        studentId: student.id,
                        marks: result.marks || []
                    }
                })
            )

            const marksByStudent = {}

            studentResults.forEach(item => {
                marksByStudent[item.studentId] = item.marks
            })

            // Calculate performance for every class subject
            const performance = classSubjects.map(subject => {

                const registeredIds = subject.registered_student_ids || []

                const eligibleStudents = students.filter(student =>
                    registeredIds.some(
                        id => Number(id) === Number(student.id)
                    )
                )

                const completed = eligibleStudents
                    .map(student => {
                        const studentMarks = marksByStudent[student.id] || []

                        const existingMark = studentMarks.find(mark =>
                            subject.subject_type === 'al'
                                ? String(mark.al_subject_no).trim() ===
                                  String(subject.al_subject_no).trim()
                                : Number(mark.subject_id) ===
                                  Number(subject.subject_id)
                        )

                        return existingMark
                            ? Number(existingMark.marks)
                            : null
                    })
                    .filter(mark => mark !== null && Number.isFinite(mark))

                const total = completed.reduce(
                    (sum, mark) => sum + mark,
                    0
                )

                return {
                    subject_name: subject.subject_name,
                    subject_type: subject.subject_type,
                    totalStudents: eligibleStudents.length,
                    completedStudents: completed.length,
                    average: completed.length > 0
                        ? Number((total / completed.length).toFixed(2))
                        : null,
                    lowMarks: completed.filter(mark => mark < 35).length,
                    highMarks: completed.filter(mark => mark >= 75).length
                }
            })

            setAllSubjectPerformance(performance)

        } catch (error) {
            console.error('Subject comparison error:', error)
            setComparisonError(error.message)
        } finally {
            setComparisonLoading(false)
        }
    }

    fetchAllSubjectPerformance()
}, [selectedTermId, classId, students, classSubjects])


// Subjects ranked by class average
const subjectsByAverage = [...allSubjectPerformance]
    .filter(subject => subject.average !== null)
    .sort((a, b) => b.average - a.average)

// Highest-performing subjects
const highestPerformingSubjects = subjectsByAverage.slice(0, 3)

// Lowest-performing subjects
const lowestPerformingSubjects = [...subjectsByAverage]
    .reverse()
    .slice(0, 3)

// Subjects with the most students scoring below 35
const subjectsWithMostLowMarks = [...allSubjectPerformance]
    .filter(subject => subject.completedStudents > 0)
    .sort((a, b) => b.lowMarks - a.lowMarks)
    .slice(0, 3)

// Subjects with the most students scoring 75 or above
const subjectsWithMostHighMarks = [...allSubjectPerformance]
    .filter(subject => subject.completedStudents > 0)
    .sort((a, b) => b.highMarks - a.highMarks)
    .slice(0, 3)




// Get students who have completed marks for the selected subject
const completedStudents = filteredStudents
    .filter(student => {
        const mark = subjectMarks[student.id]
        return mark !== '' && mark !== undefined && mark !== null
    })
    .map(student => ({
        ...student,
        marks: Number(subjectMarks[student.id])
    }))

// Calculate subject statistics
const totalMarks = completedStudents.reduce(
    (total, student) => total + student.marks,
    0
)

const subjectAverage = completedStudents.length > 0
    ? Number((totalMarks / completedStudents.length).toFixed(2))
    : 0

const highestMark = completedStudents.length > 0
    ? Math.max(...completedStudents.map(student => student.marks))
    : 0

const lowestMark = completedStudents.length > 0
    ? Math.min(...completedStudents.map(student => student.marks))
    : 0

// Grade distribution
const gradeDistribution = {
    A: completedStudents.filter(student => student.marks >= 75).length,
    B: completedStudents.filter(student => student.marks >= 65 && student.marks < 75).length,
    C: completedStudents.filter(student => student.marks >= 50 && student.marks < 65).length,
    S: completedStudents.filter(student => student.marks >= 35 && student.marks < 50).length,
    F: completedStudents.filter(student => student.marks < 35).length
}

// Rank students by marks
const rankedStudents = [...completedStudents]
    .sort((a, b) => b.marks - a.marks)
    .map((student, index) => ({
        ...student,
        rank: index + 1,
        grade:
            student.marks >= 75 ? 'A' :
            student.marks >= 65 ? 'B' :
            student.marks >= 50 ? 'C' :
            student.marks >= 35 ? 'S' : 'F'
    }))



    
return (
    <div className="subject-analysis-page">

        <header className="subject-analysis-header">
            <div className="subject-analysis-brand">
                <div className="subject-analysis-brand-icon">MA</div>
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

        <main className="subject-analysis-main">

            <div className="subject-analysis-title">
                <span>TERM TEST MANAGEMENT</span>
                <h1>Subject Analysis</h1>
                <p>
                    Analyse student performance and results
                    for individual subjects.
                </p>
            </div>

            {loading ? (
                <p>Loading class information...</p>
            ) : error ? (
                <p className="subject-analysis-error">{error}</p>
            ) : (
                <>
                    <section className="subject-analysis-class-card">
                        <h2>Class Information</h2>

                        <div>
                            <span>Class</span>
                            <strong>{selectedClass?.class_name}</strong>
                        </div>

                        <div>
                            <span>Total Students</span>
                            <strong>{students.length}</strong>
                        </div>

                        <div>
                            <span>Teacher</span>
                            <strong>{user?.full_name || 'Teacher'}</strong>
                        </div>
                    </section>

                    <section className="subject-analysis-content">

    <h2>Select Academic Period</h2>

    <div className="subject-analysis-selectors">

        <div>
            <label>Academic Year</label>

            <CustomDropdown
                value={selectedYearId}
                placeholder="Select Academic Year"
                options={academicYears.map(year => ({
                    value: String(year.id),
                    label: String(year.year)
                }))}
                onChange={value => setSelectedYearId(value)}
            />
        </div>

        <div>
            <label>Term</label>

            <CustomDropdown
                value={selectedTermId}
                placeholder="Select Term"
                disabled={!selectedYearId || terms.length === 0}
                options={terms.map(term => ({
                    value: String(term.id),
                    label: term.term_name
                }))}
                onChange={value => setSelectedTermId(value)}
            />
        </div>

    </div>

    <h2>Select Subject</h2>

                        <div className="subject-analysis-selectors">
                            <div>
                                <label>Subject</label>

                                <CustomDropdown
                                    value={selectedSubject}
                                    placeholder="Select Subject"
                                    disabled={
                                        !selectedTermId ||
                                        !selectedYearId ||
                                        classSubjects.length === 0
                                    }
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

                        {!selectedYearId || !selectedTermId ? (
                            <p>
                                Please select an academic year and term
                                from the Term Tests dashboard.
                            </p>
                        ) : !selectedSubject ? (
                            <p>Select a subject to view its analysis.</p>
                        ) : marksLoading ? (
                            <p>Loading subject analysis...</p>
                        ) : marksError ? (
                            <p className="subject-analysis-error">
                                {marksError}
                            </p>
                        ) : (
                            <>
                                <h2>
                                    {selectedSubjectData?.subject_name}
                                    {' '}Performance Overview
                                </h2>

                                <div className="subject-analysis-overview">

                                    <div className="subject-analysis-stat-card">
                                        <span>Students with Marks</span>
                                        <h3>{completedStudents.length}</h3>
                                    </div>

                                    <div className="subject-analysis-stat-card">
                                        <span>Class Average</span>
                                        <h3>{subjectAverage}</h3>
                                    </div>

                                    <div className="subject-analysis-stat-card">
                                        <span>Highest Mark</span>
                                        <h3>{highestMark}</h3>
                                    </div>

                                    <div className="subject-analysis-stat-card">
                                        <span>Lowest Mark</span>
                                        <h3>{lowestMark}</h3>
                                    </div>

                                    <div className="subject-analysis-stat-card">
                                        <span>Pending Marks</span>
                                        <h3>
                                            {filteredStudents.length -
                                                completedStudents.length}
                                        </h3>
                                    </div>

                                </div>

                                <section className="subject-analysis-section">
                                    <h2>Grade Distribution</h2>

                                    <div className="subject-analysis-grade-grid">
                                        {Object.entries(gradeDistribution).map(
                                            ([grade, count]) => (
                                                <div
                                                    className="subject-analysis-grade-card"
                                                    key={grade}
                                                >
                                                    <span>Grade {grade}</span>
                                                    <strong>{count}</strong>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </section>

                                <section className="subject-analysis-section">
                                    <h2>Student Rankings</h2>

                                    {rankedStudents.length === 0 ? (
                                        <p>No marks have been entered yet.</p>
                                    ) : (
                                        <div className="subject-analysis-table-wrapper">
                                            <table className="subject-analysis-table">
                                                <thead>
                                                    <tr>
                                                        <th>Rank</th>
                                                        <th>Index Number</th>
                                                        <th>Student Name</th>
                                                        <th>Marks</th>
                                                        <th>Grade</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {rankedStudents.map(student => (
                                                        <tr key={student.id}>
                                                            <td>{student.rank}</td>
                                                            <td>{student.index_number}</td>
                                                            <td>{student.student_name}</td>
                                                            <td>{student.marks}</td>
                                                            <td>{student.grade}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                </section>


<section className="subject-analysis-section subject-comparison-section">

    <h2>Class Subject Performance Comparison</h2>

    <p>
        Compare student performance across all subjects in this class.
    </p>

    {comparisonLoading ? (
        <p>Loading subject comparison...</p>
    ) : comparisonError ? (
        <p className="subject-analysis-error">
            {comparisonError}
        </p>
    ) : allSubjectPerformance.length === 0 ? (
        <p>No subject performance data is available.</p>
    ) : (
        <div className="subject-comparison-grid">

            <div className="subject-comparison-card">
                <h3>Highest Performing Subjects</h3>
                <p>Top subjects by class average</p>

                {highestPerformingSubjects.length === 0 ? (
                    <p>No completed results.</p>
                ) : highestPerformingSubjects.map((subject, index) => (
                    <div className="subject-comparison-item" key={subject.subject_name}>
                        <span>{index + 1}. {subject.subject_name}</span>
                        <strong>{subject.average}</strong>
                    </div>
                ))}
            </div>

            <div className="subject-comparison-card">
                <h3>Lowest Performing Subjects</h3>
                <p>Subjects with the lowest class averages</p>

                {lowestPerformingSubjects.length === 0 ? (
                    <p>No completed results.</p>
                ) : lowestPerformingSubjects.map((subject, index) => (
                    <div className="subject-comparison-item" key={subject.subject_name}>
                        <span>{index + 1}. {subject.subject_name}</span>
                        <strong>{subject.average}</strong>
                    </div>
                ))}
            </div>

            <div className="subject-comparison-card">
                <h3>Most Students Scoring Low Marks</h3>
                <p>Number of students scoring below 35</p>

                {subjectsWithMostLowMarks.length === 0 ? (
                    <p>No completed results.</p>
                ) : subjectsWithMostLowMarks.map((subject, index) => (
                    <div className="subject-comparison-item" key={subject.subject_name}>
                        <span>{index + 1}. {subject.subject_name}</span>
                        <strong>{subject.lowMarks}</strong>
                    </div>
                ))}
            </div>

            <div className="subject-comparison-card">
                <h3>Most Students Scoring High Marks</h3>
                <p>Number of students scoring 75 or above</p>

                {subjectsWithMostHighMarks.length === 0 ? (
                    <p>No completed results.</p>
                ) : subjectsWithMostHighMarks.map((subject, index) => (
                    <div className="subject-comparison-item" key={subject.subject_name}>
                        <span>{index + 1}. {subject.subject_name}</span>
                        <strong>{subject.highMarks}</strong>
                    </div>
                ))}
            </div>

        </div>
    )}

</section>

                            </>
                        )}

                    </section>
                </>
            )}

        </main>
    </div>
)

}

export default SubjectAnalysis
