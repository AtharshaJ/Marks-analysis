
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './OLAnalysis.css'
import CustomDropdown from '../components/CustomDropdown'

function ALAnalysis({ user }) {
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [examYear, setExamYear] = useState(new Date().getFullYear())
    const [streams, setStreams] = useState([])
    const [selectedStreamId, setSelectedStreamId] = useState('')
    const [students, setStudents] = useState([])
    const [results, setResults] = useState([])
    const [choiceSubjects, setChoiceSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [analysisView, setAnalysisView] = useState('ranking')

    useEffect(() => {
    const fetchStreams = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/al-results/streams`,
                {
                    credentials: 'include'
                }
            )

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || 'Failed to load A/L streams.'
                )
            }

            setStreams(data.streams || [])

        } catch (err) {
            console.error('Error fetching A/L streams:', err)
            setError(err.message || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    fetchStreams()
}, [])

useEffect(() => {
    const fetchResults = async () => {
        if (!selectedStreamId || !examYear) {
            setStudents([])
            setResults([])
            setChoiceSubjects([])
            return
        }

        try {
            setLoading(true)
            setError('')

            const [resultsResponse, subjectsResponse] = await Promise.all([
                fetch(
                    `${API_BASE_URL}/api/al-results/${examYear}/${selectedStreamId}`,
                    { credentials: 'include' }
                ),
                fetch(
                    `${API_BASE_URL}/api/al-results/subjects/${selectedStreamId}`,
                    { credentials: 'include' }
                )
            ])

            const resultsData = await resultsResponse.json()
            const subjectsData = await subjectsResponse.json()

            if (!resultsResponse.ok || !resultsData.success) {
                throw new Error(
                    resultsData.message || 'Failed to load A/L results.'
                )
            }

            if (!subjectsResponse.ok || !subjectsData.success) {
                throw new Error(
                    subjectsData.message || 'Failed to load A/L subjects.'
                )
            }

            setStudents(resultsData.students || [])
            setResults(resultsData.results || [])
            setChoiceSubjects(subjectsData.choiceSubjects || [])

        } catch (err) {
            console.error('Error fetching A/L analysis:', err)
            setError(err.message || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    fetchResults()
}, [examYear, selectedStreamId])

// Map each student's final result using student_id
const resultsMap = {}

results.forEach(result => {
    resultsMap[result.student_id] = result
})

// Prepare student analysis records
const analysedStudents = students.map(student => {
    const result = resultsMap[student.id] || {}

    const grades = [
        result.subject_1_grade,
        result.subject_2_grade,
        result.subject_3_grade
    ]

    const zScore =
        result.z_score !== null && result.z_score !== undefined
            ? Number(result.z_score)
            : null

    return {
        ...student,
        ...result,
        grades,
        zScore,
        hasAbsent: grades.includes('AB'),
        fCount: grades.filter(grade => grade === 'W').length,
        isComplete: grades.every(grade => grade !== null && grade !== undefined && grade !== '')
    }
})

// Rank students by Z-score (highest first)
const rankedStudents = [...analysedStudents].sort((a, b) => {
    if (a.zScore === null && b.zScore === null) {
        return String(a.exam_index_number).localeCompare(
            String(b.exam_index_number),
            undefined,
            { numeric: true }
        )
    }

    if (a.zScore === null) return 1
    if (b.zScore === null) return -1

    return b.zScore - a.zScore
})


// Grade order used for displaying combinations
const gradeOrder = ['A', 'B', 'C', 'S', 'W', 'AB']

// Calculate the number of students with each grade combination
const combinationCounts = {}

analysedStudents.forEach(student => {
    if (!student.isComplete) return

    const sortedGrades = [...student.grades].sort(
        (a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
    )

    const combination = gradeOrder
        .filter(grade => sortedGrades.includes(grade))
        .map(grade => {
            const count = sortedGrades.filter(
                item => item === grade
            ).length

            return count > 0 ? `${count}${grade}` : null
        })
        .filter(Boolean)
        .join(' ')

    combinationCounts[combination] =
        (combinationCounts[combination] || 0) + 1
})

// Convert combinations into a sorted array
const combinationAnalysis = Object.entries(combinationCounts)
    .map(([combination, count]) => ({
        combination,
        count
    }))
    .sort((a, b) => b.count - a.count)

// Calculate stream performance based on the three main subjects
const streamPerformance = {
    threeF: 0,
    twoF: 0,
    oneF: 0,
    zeroF: 0,
    absent: 0
}

analysedStudents.forEach(student => {
    const grades = student.grades

    // Count students with at least one AB separately
    if (grades.includes('AB')) {
        streamPerformance.absent++
        return
    }

    // Only analyse students with all three grades entered
    if (!student.isComplete) return

    if (student.fCount === 3) {
        streamPerformance.threeF++
    } else if (student.fCount === 2) {
        streamPerformance.twoF++
    } else if (student.fCount === 1) {
        streamPerformance.oneF++
    } else {
        streamPerformance.zeroF++
    }
})

// Calculate subject-wise grade analysis
const subjectAnalysis = choiceSubjects.map(subject => {
    const subjectGrades = []

    analysedStudents.forEach(student => {
        if (student.subject_1_no === subject.subject_no) {
            subjectGrades.push(student.subject_1_grade)
        }

        if (student.subject_2_no === subject.subject_no) {
            subjectGrades.push(student.subject_2_grade)
        }

        if (student.subject_3_no === subject.subject_no) {
            subjectGrades.push(student.subject_3_grade)
        }
    })

    const gradeCounts = {
        A: 0,
        B: 0,
        C: 0,
        S: 0,
        W: 0,
        AB: 0
    }

    subjectGrades.forEach(grade => {
        if (grade && gradeCounts[grade] !== undefined) {
            gradeCounts[grade]++
        }
    })

    const absent = gradeCounts.AB
    const appeared = subjectGrades.filter(
        grade => grade && grade !== 'AB'
    ).length

    const passed =
        gradeCounts.A +
        gradeCounts.B +
        gradeCounts.C +
        gradeCounts.S

    const passPercentage = appeared > 0
        ? ((passed / appeared) * 100).toFixed(2)
        : '0.00'

    return {
        ...subject,
        ...gradeCounts,
        total: subjectGrades.length,
        appeared,
        passed,
        absent,
        passPercentage
    }
})

   

return (
    <div className="ol-analysis-page">

        {/* PAGE HEADER */}
        <div className="ol-analysis-header">
    <button
        className="ol-back-button"
        onClick={() => navigate('/employee')}
    >
        ← Back to Public Tests
    </button>
</div>

        <main className="ol-analysis-main">

            {/* PAGE TITLE */}
            <div className="ol-analysis-title">
                <h2>A/L Results Analysis</h2>
                <p>
                    Analyse student performance and examination results
                    by stream and examination year.
                </p>
            </div>

            {/* FILTERS AND CONTROLS */}
            <div className="ol-analysis-controls">

                <div className="ol-analysis-filter">
                    <label>Examination Year</label>
                    <input
                        type="number"
                        value={examYear}
                        onChange={e => setExamYear(Number(e.target.value))}
                    />
                </div>

                <div className="ol-analysis-filter">
                    <label>Examination Stream</label>
                    <CustomDropdown
                        value={selectedStreamId}
                        options={streams.map(stream => ({
                            value: String(stream.id),
                            label: stream.stream_name
                        }))}
                        onChange={setSelectedStreamId}
                        placeholder="Select Stream"
                        searchable={true}
                        searchPlaceholder="Search streams..."
                    />
                </div>

                <div className="ol-analysis-filter">
                    <label>Analysis View</label>
                    <CustomDropdown
                        value={analysisView}
                        options={[
                            { value: 'ranking', label: 'Student Ranking' },
                            { value: 'combinations', label: 'Grade Combinations' },
                            { value: 'subjects', label: 'Subject Analysis' },
                            { value: 'performance', label: 'Stream Performance' }
                        ]}
                        onChange={setAnalysisView}
                        placeholder="Select Analysis"
                    />
                </div>

                <button
                    className="ol-analysis-print-btn"
                    onClick={() => window.print()}
                    disabled={!selectedStreamId}
                >
                    Print Analysis
                </button>

            </div>

            {/* PRINT REPORT HEADER */}
            <div className="ol-print-report-header">
                <h2>Thondaimanaru Veeragaththippillai Maha Vidyalayam</h2>
                <h3>G.C.E. A/L RESULTS</h3>
                <h3>Examination Year: {examYear}</h3>
                <h3>
                    {streams.find(
                        stream =>
                            String(stream.id) === String(selectedStreamId)
                    )?.stream_name || ''}
                </h3>
                <p>
                    {analysisView === 'ranking' && 'Student Ranking'}
                    {analysisView === 'combinations' && 'Grade Combinations'}
                    {analysisView === 'subjects' && 'Subject Wise Analysis'}
                    {analysisView === 'performance' && 'Stream Performance'}
                </p>
            </div>

            {/* LOADING AND ERROR */}
            {loading && (
                <p className="ol-loading">Loading analysis...</p>
            )}

            {error && (
                <p className="ol-error">{error}</p>
            )}

            {!loading && !error && selectedStreamId && (
                <>
                    {/* STUDENT RANKING */}
                    {analysisView === 'ranking' && (
                        <div className="ol-analysis-section">

                            <div className="ol-analysis-section-header">
                                <h2>Student Ranking</h2>
                            </div>

                            <div className="ol-analysis-table-wrapper">
                                <table className="ol-analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Exam Index No.</th>
                                            <th>Student Name</th>
                                            <th>Subject 1</th>
                                            <th>Subject 2</th>
                                            <th>Subject 3</th>
                                            <th>Z-Score</th>
                                            <th>Island Rank</th>
                                            <th>District Rank</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rankedStudents.length > 0 ? (
                                            rankedStudents.map((student, index) => (
                                                <tr key={student.id}>
                                                    <td>
                                                        {student.zScore !== null
                                                            ? index + 1
                                                            : '-'}
                                                    </td>
                                                    <td>{student.exam_index_number}</td>
                                                    <td>{student.full_name}</td>
                                                    <td>{student.subject_1_grade || '-'}</td>
                                                    <td>{student.subject_2_grade || '-'}</td>
                                                    <td>{student.subject_3_grade || '-'}</td>
                                                    <td>
                                                        {student.zScore !== null
                                                            ? student.zScore.toFixed(4)
                                                            : '-'}
                                                    </td>
                                                    <td>{student.island_rank ?? '-'}</td>
                                                    <td>{student.district_rank ?? '-'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9">
                                                    No students registered for this stream.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* GRADE COMBINATIONS */}
                    {analysisView === 'combinations' && (
                        <div className="ol-analysis-section">

                            <div className="ol-analysis-section-header">
                                <h2>Grade Combinations</h2>
                            </div>

                            <div className="ol-analysis-table-wrapper">
                                <table className="ol-analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Grade Combination</th>
                                            <th>Number of Students</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {combinationAnalysis.length > 0 ? (
                                            combinationAnalysis.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.combination}</td>
                                                    <td>{item.count}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2">
                                                    No complete student results available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SUBJECT ANALYSIS */}
                    {analysisView === 'subjects' && (
                        <div className="ol-analysis-section">

                            <div className="ol-analysis-section-header">
                                <h2>Choice Subject Analysis</h2>
                            </div>

                            <div className="ol-analysis-table-wrapper">
                                <table className="ol-analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>A</th>
                                            <th>B</th>
                                            <th>C</th>
                                            <th>S</th>
                                            <th>W</th>
                                            <th>AB</th>
                                            <th>Total</th>
                                            <th>Passed</th>
                                            <th>Pass %</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {subjectAnalysis.length > 0 ? (
                                            subjectAnalysis.map(subject => (
                                                <tr key={subject.subject_no}>
                                                    <td>{subject.subject_name}</td>
                                                    <td>{subject.A}</td>
                                                    <td>{subject.B}</td>
                                                    <td>{subject.C}</td>
                                                    <td>{subject.S}</td>
                                                    <td>{subject.W}</td>
                                                    <td>{subject.AB}</td>
                                                    <td>{subject.total}</td>
                                                    <td>{subject.passed}</td>
                                                    <td>{subject.passPercentage}%</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="10">
                                                    No Choice subjects available for this stream.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STREAM PERFORMANCE */}
                    {analysisView === 'performance' && (
                        <div className="ol-analysis-section">

                            <div className="ol-analysis-section-header">
                                <h2>Stream Performance</h2>
                            </div>

                            <div className="ol-analysis-table-wrapper">
                                <table className="ol-analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Performance Category</th>
                                            <th>Number of Students</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        <tr>
                                            <td>3F</td>
                                            <td>{streamPerformance.threeF}</td>
                                        </tr>
                                        <tr>
                                            <td>2F</td>
                                            <td>{streamPerformance.twoF}</td>
                                        </tr>
                                        <tr>
                                            <td>1F</td>
                                            <td>{streamPerformance.oneF}</td>
                                        </tr>
                                        <tr>
                                            <td>0F</td>
                                            <td>{streamPerformance.zeroF}</td>
                                        </tr>
                                        <tr>
                                            <td>Absent (AB)</td>
                                            <td>{streamPerformance.absent}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

        </main>
    </div>
)



}



export default ALAnalysis
