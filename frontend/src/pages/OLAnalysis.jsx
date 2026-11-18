import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './OLAnalysis.css'
import CustomDropdown from '../components/CustomDropdown'

function OLAnalysis({ user }) {
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [examYear, setExamYear] = useState(new Date().getFullYear())
    const [students, setStudents] = useState([])
    const [results, setResults] = useState([])
    const [commonSubjects, setCommonSubjects] = useState([])
const [baskets, setBaskets] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [analysisView, setAnalysisView] = useState('ranking')

    useEffect(() => {
    const fetchResults = async () => {
        try {
            setLoading(true)
            setError('')
            const subjectsResponse = await fetch(
    `${API_BASE_URL}/api/ol-results/subjects`,
    {
        credentials: 'include'
    }
)

const subjectsData = await subjectsResponse.json()

if (!subjectsResponse.ok || !subjectsData.success) {
    throw new Error(
        subjectsData.message || 'Failed to load O/L subjects.'
    )
}

setCommonSubjects(subjectsData.commonSubjects || [])
setBaskets(subjectsData.baskets || [])

            const response = await fetch(
                `${API_BASE_URL}/api/ol-results/year/${examYear}`,
                {
                    credentials: 'include'
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Failed to load O/L results.'
                )
            }

            setStudents(data.students || [])
            setResults(data.results || [])

        } catch (err) {
            console.error('Error fetching O/L results:', err)
            setError(err.message || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    fetchResults()
}, [examYear])

    // Grade order used for ranking
const gradeOrder = ['A', 'B', 'C', 'S', 'W','AB']

// Calculate the grade combination for each student
const analysedStudents = students.map(student => {

    const studentResults = results.filter(
        result => Number(result.student_id) === Number(student.id)
    )

    const studentGrades = studentResults.map(result => result.grade)

    const isComplete = studentGrades.length === 9

    const gradeCounts = {
        A: 0,
        B: 0,
        C: 0,
        S: 0,
        W: 0,
        AB:0
    }

    studentGrades.forEach(grade => {
        if (gradeCounts[grade] !== undefined) {
            gradeCounts[grade]++
        }
    })

    const gradeCombination = gradeOrder
        .filter(grade => gradeCounts[grade] > 0)
        .map(grade =>
    `${gradeCounts[grade] === 1 ? '' : gradeCounts[grade]}${grade}`
)
        .join(' ')

    return {
        ...student,
        gradeCounts,
        gradeCombination: isComplete ? gradeCombination : 'Incomplete',
        isComplete,
        totalGrades: studentGrades.length
    }
})

// Calculate grade distribution for each subject

const subjectAnalysis = [
    ...commonSubjects.map(subject => ({
        ...subject,
        category: 'Main Subjects'
    })),

    ...(baskets['Basket 1'] || []).map(subject => ({
        ...subject,
        category: 'Basket 1'
    })),

    ...(baskets['Basket 2'] || []).map(subject => ({
        ...subject,
        category: 'Basket 2'
    })),

    ...(baskets['Basket 3'] || []).map(subject => ({
        ...subject,
        category: 'Basket 3'
    }))
].map(subject => {
    const subjectResults = results.filter(
        result => Number(result.subject_id) === Number(subject.id)
    )

    const gradeCounts = {
        A: 0,
        B: 0,
        C: 0,
        S: 0,
        W: 0,
        AB: 0
    }

    subjectResults.forEach(result => {
        if (gradeCounts[result.grade] !== undefined) {
            gradeCounts[result.grade]++
        }
    })

    const totalStudents = subjectResults.length

    const passedStudents =
        gradeCounts.A +
        gradeCounts.B +
        gradeCounts.C +
        gradeCounts.S

    const absentStudents = gradeCounts.AB
    const appearedStudents = totalStudents - absentStudents

    const passPercentage = appearedStudents > 0
        ? (passedStudents / appearedStudents) * 100
        : 0

    return {
        ...subject,
        gradeCounts,
        totalStudents,
        passedStudents,
        absentStudents,
        passPercentage
    }
})



// Rank students by grade combination
const rankedStudents = [...analysedStudents].sort((a, b) => {

    for (const grade of gradeOrder) {
        if (a.gradeCounts[grade] !== b.gradeCounts[grade]) {
            return b.gradeCounts[grade] - a.gradeCounts[grade]
        }
    }

    return String(a.index_number).localeCompare(
        String(b.index_number),
        undefined,
        { numeric: true }
    )
})

// Get all completed grade combinations and their student counts
const combinationAnalysis = Object.values(
    analysedStudents
        .filter(student => student.isComplete)
        .reduce((groups, student) => {

            const combination = student.gradeCombination

            if (!groups[combination]) {
                groups[combination] = {
                    gradeCombination: combination,
                    studentCount: 0,
                    students: []
                }
            }

            groups[combination].studentCount++
            groups[combination].students.push(student)

            return groups
        }, {})
)

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/ol-results/year/${examYear}`,
                    { credentials: 'include' }
                )

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(
                        data.message || 'Unable to load O/L results.'
                    )
                }

                setStudents(data.students || [])
                setResults(data.results || [])

            } catch (error) {
                console.error('O/L analysis error:', error)
                setError(error.message)
            } finally {
                setLoading(false)
            }
        }

        if (examYear) {
            fetchResults()
        }
    }, [examYear])

    return (
        <div className="ol-analysis-page">

            <header className="ol-analysis-header">
                <h2>G.C.E. Ordinary Level Examination</h2>

                <button
                    onClick={() =>
                        navigate('/employee', {
                            state: { activeSection: 'Public Examinations' }
                        })
                    }
                >
                    ← Back to Public Examinations
                </button>
            </header>

            <main className="ol-analysis-main">



<div className="ol-print-report-header">
    <h1>Thondaimanaru Veeragaththippillai Maha Vidyalayam</h1>

    <h2>G.C.E. O/L {examYear}</h2>

    <h3>RESULTS SUMMARY</h3>

    <p>
        {analysisView === 'ranking'
            ? 'STUDENT RESULTS RANKING'
            : analysisView === 'combinations'
                ? 'GRADE COMBINATION SUMMARY'
                : 'SUBJECT WISE ANALYSIS'}
    </p>
</div>


                <div className="ol-analysis-title">
                    <div>
                        <h2>O/L Results Analysis</h2>
                        <p>
                            Analyse student performance, grade combinations
                            and subject results.
                        </p>
                    </div>
                </div>

                <div className="ol-analysis-controls">

                    <div className="ol-analysis-filter">
                        <label>Examination Year</label>

                        <input
                            type="number"
                            value={examYear}
                            onChange={e =>
                                setExamYear(Number(e.target.value))
                            }
                        />
                    </div>

                    <button
    className="ol-analysis-print-btn"
    onClick={() => window.print()}
>
    Print Analysis
</button>

                    <div className="ol-analysis-filter">
                        <label>Analysis Category</label>

                        <CustomDropdown
                            value={analysisView}
                            onChange={setAnalysisView}
                            options={[
                                {
                                    value: 'ranking',
                                    label: 'Student Results Ranking'
                                },
                                {
                                    value: 'combinations',
                                    label: 'Grade Combination Summary'
                                },
                                {
                                    value: 'subjects',
                                    label: 'Subject Analysis'
                                }
                            ]}
                            placeholder="Select Analysis"
                        />
                    </div>

                </div>
{loading ? (
    <p>Loading O/L results...</p>
) : error ? (
    <p className="ol-analysis-error">{error}</p>
) : (
    <>
        {/* SUMMARY CARDS */}

        <div className="ol-analysis-summary">

            <div className="ol-analysis-card">
                <span>Total Students</span>
                <h3>{students.length}</h3>
            </div>

            <div className="ol-analysis-card">
                <span>Complete Results</span>
                <h3>
                    {analysedStudents.filter(
                        student => student.isComplete
                    ).length}
                </h3>
            </div>

            <div className="ol-analysis-card">
                <span>Incomplete Results</span>
                <h3>
                    {analysedStudents.filter(
                        student => !student.isComplete
                    ).length}
                </h3>
            </div>

        </div>

        {/* STUDENT RESULTS RANKING */}

        {analysisView === 'ranking' && (
            <section className="ol-analysis-section">

                

                <div className="ol-analysis-section-header">
                    <h3>Student Results Ranking</h3>
                    <span>{students.length} Students</span>
                </div>

                <div className="ol-analysis-table-wrapper">

                    <table className="ol-analysis-table">

                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Index Number</th>
                                <th>Student Name</th>
                                <th>A</th>
                                <th>B</th>
                                <th>C</th>
                                <th>S</th>
                                <th>W</th>
                                <th>AB</th>
                                <th>Grade Combination</th>
                                <th className="no-print">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rankedStudents.map((student, index) => (
                                <tr key={student.id}>
                                    <td>
                                        {student.isComplete ? index + 1 : '-'}
                                    </td>

                                    <td>{student.index_number}</td>

                                    <td>{student.student_name}</td>

                                    <td>{student.gradeCounts.A}</td>
                                    <td>{student.gradeCounts.B}</td>
                                    <td>{student.gradeCounts.C}</td>
                                    <td>{student.gradeCounts.S}</td>
                                    <td>{student.gradeCounts.W}</td>
                                    <td>{student.gradeCounts.AB}</td>

                                    <td>{student.gradeCombination}</td>

                                  <td className="no-print">
    {student.isComplete
        ? 'Complete'
        : `Incomplete (${student.totalGrades}/9)`}
</td>
                                </tr>
                            ))}

                            {rankedStudents.length === 0 && (
                                <tr>
                                    <td colSpan="11">
                                        No O/L students registered for this year.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>

                </div>

            </section>
        )}

{/* GRADE COMBINATION SUMMARY */}

{analysisView === 'combinations' && (
    <section className="ol-analysis-section">

        <div className="ol-analysis-section-header">
            <div>
                <h3>Grade Combination Summary</h3>
                <p>
                    Number of students who achieved each grade combination.
                </p>
            </div>

            <span>{combinationAnalysis.length} Combinations</span>
        </div>

        <div className="ol-analysis-table-wrapper">

            <table className="ol-analysis-table">

                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Grade Combination</th>
                        <th>Number of Students</th>
                    </tr>
                </thead>

                <tbody>
                    {[...combinationAnalysis]
                        .sort((a, b) => {
                            const getCounts = combination =>
                                Object.fromEntries(
                                    gradeOrder.map(grade => [
                                        grade,
                                        Number(
                                            combination.match(
                                                new RegExp(`(\\d+)${grade}`)
                                            )?.[1] || 0
                                        )
                                    ])
                                )

                            const aCounts = getCounts(a.gradeCombination)
                            const bCounts = getCounts(b.gradeCombination)

                            for (const grade of gradeOrder) {
                                if (aCounts[grade] !== bCounts[grade]) {
                                    return bCounts[grade] - aCounts[grade]
                                }
                            }

                            return 0
                        })
                        .map((combination, index) => (
                            <tr key={combination.gradeCombination}>
                                <td>{index + 1}</td>

                                <td>{combination.gradeCombination}</td>

                                <td>{combination.studentCount}</td>
                            </tr>
                        ))}

                    {combinationAnalysis.length === 0 && (
                        <tr>
                            <td colSpan="3">
                                No complete student results available.
                            </td>
                        </tr>
                    )}
                </tbody>

                {combinationAnalysis.length > 0 && (
                    <tfoot>
                        <tr>
                            <th>Total</th>
                            <th></th>
                            <th>
                                {combinationAnalysis.reduce(
                                    (total, item) =>
                                        total + item.studentCount,
                                    0
                                )}
                            </th>
                        </tr>
                    </tfoot>
                )}

            </table>

        </div>

    </section>
)}

{/* SUBJECT ANALYSIS */}


{analysisView === 'subjects' && (
    <section className="ol-analysis-section">

        <div className="ol-analysis-section-header">
            <div>
                <h3>Subject Analysis</h3>
                <p>Grade distribution for each O/L subject.</p>
            </div>

            <span>{subjectAnalysis.length} Subjects</span>
        </div>

        <div className="ol-analysis-table-wrapper">
            <table className="ol-analysis-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Subject</th>
                        <th>A</th>
                        <th>B</th>
                        <th>C</th>
                        <th>S</th>
                        <th>W</th>
                        <th>AB</th>
                        <th>Total Passed</th>
                        <th>Pass Percentage</th>
                    </tr>
                </thead>

                <tbody>
                    {subjectAnalysis.map(subject => {
                        const totalPassed =
                            subject.gradeCounts.A +
                            subject.gradeCounts.B +
                            subject.gradeCounts.C +
                            subject.gradeCounts.S

                        return (
                            <tr key={subject.id}>
                                <td>{subject.category}</td>
                                <td>{subject.subject_name}</td>
                                <td>{subject.gradeCounts.A}</td>
                                <td>{subject.gradeCounts.B}</td>
                                <td>{subject.gradeCounts.C}</td>
                                <td>{subject.gradeCounts.S}</td>
                                <td>{subject.gradeCounts.W}</td>
                                <td>{subject.gradeCounts.AB}</td>
                                <td>{totalPassed}</td>
                                <td>{subject.passPercentage.toFixed(2)}%</td>
                            </tr>
                        )
                    })}

                    {subjectAnalysis.length === 0 && (
                        <tr>
                            <td colSpan="10">
                                No O/L subjects found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

    </section>
)}


    </>
)}

            </main>
        </div>
    )
}

export default OLAnalysis