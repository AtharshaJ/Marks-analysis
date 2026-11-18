
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ScholarshipAnalysis.css'
import CustomDropdown from '../components/CustomDropdown'

function ScholarshipAnalysis({ user }) {
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [examYear, setExamYear] = useState(new Date().getFullYear())
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [cutoffMarks, setCutoffMarks] = useState('')

    const [marksRanges, setMarksRanges] = useState([])
const [rangeMinimum, setRangeMinimum] = useState('')
const [rangeMaximum, setRangeMaximum] = useState('')
const [rangeError, setRangeError] = useState('')
const [analysisView, setAnalysisView] = useState('all')




    // Sort students from highest marks to lowest marks
const rankedStudents = [...results]
    .sort((a, b) => Number(b.marks) - Number(a.marks))
    .map((student, index) => ({
        ...student,
        rank: index + 1
    }))

// Students who achieved the cut-off mark
const passedStudents = cutoffMarks === ''
    ? []
    : rankedStudents.filter(
        student => Number(student.marks) >= Number(cutoffMarks)
    )

// Total number of students
const totalStudents = results.length

// Number of passed students
const passedCount = passedStudents.length

// Number of students below cut-off
const failedCount = cutoffMarks === ''
    ? 0
    : totalStudents - passedCount

// Calculate student count for each marks range
const marksRangeAnalysis = marksRanges.map(range => {
    const studentsInRange = rankedStudents.filter(student => {
        const marks = Number(student.marks)

        return (
            marks >= range.minimum &&
            marks <= range.maximum
        )
    })

    return {
        ...range,
        studentCount: studentsInRange.length,
        students: studentsInRange
    }
})

    useEffect(() => {
    const fetchResults = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await fetch(
                `${API_BASE_URL}/api/scholarship-exams/${examYear}`,
                { credentials: 'include' }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to load scholarship results.'
                )
            }

            setResults(result.results || [])

        } catch (error) {
            console.error('Scholarship analysis error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (examYear) {
        fetchResults()
    }
}, [examYear])

useEffect(() => {
    if (analysisView === 'passed' && cutoffMarks === '') {
        setAnalysisView('all')
    }
}, [analysisView, cutoffMarks])

const handleAddRange = () => {
    setRangeError('')

    if (rangeMinimum === '' || rangeMaximum === '') {
        setRangeError('Please enter both minimum and maximum marks.')
        return
    }

    const min = Number(rangeMinimum)
    const max = Number(rangeMaximum)

    if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min < 0 ||
        max > 200 ||
        min > max
    ) {
        setRangeError('Please enter a valid marks range between 0 and 200.')
        return
    }

    // Check whether the new range overlaps an existing range
    const hasOverlap = marksRanges.some(range =>
        min <= range.maximum && max >= range.minimum
    )

    if (hasOverlap) {
        setRangeError('This marks range overlaps with an existing range.')
        return
    }

    setMarksRanges(previous => [
        ...previous,
        {
            id: Date.now(),
            minimum: min,
            maximum: max
        }
    ].sort((a, b) => b.maximum - a.maximum))

    setRangeMinimum('')
    setRangeMaximum('')
}

    return (
        <div className="scholarship-analysis-page">

            <header className="scholarship-analysis-header">
                <h2>Grade 5 Scholarship Examination</h2>

                <button
                    onClick={() =>
                        navigate('/employee', {
                            state: { activeSection: 'Public Tests' }
                        })
                    }
                >
                    Back to Public Tests
                </button>
            </header>

            <main className="scholarship-analysis-main">

           <div className="scholarship-print-report-header">
    <h1>Thondaimanaru Veeragaththippillai Maha Vidyalayam</h1>
    <h2>Grade 5 Scholarship Examination {examYear}</h2>
    <h3>RESULTS SUMMARY</h3>

    <p>
        {analysisView === 'all'
            ? 'STUDENT RESULTS RANKING'
            : analysisView === 'passed'
                ? 'PASSED STUDENTS'
                : 'MARKS RANGE ANALYSIS'}
    </p>
</div>

<div className="scholarship-analysis-title">
    <div>
        <h2>Scholarship Results Analysis</h2>
        <p>
            Analyse student performance, cut-off marks
            and marks distribution.
        </p>
    </div>
</div>

                {/* ================================
    ANALYSIS CONTROLS
================================ */}

<div className="scholarship-analysis-controls">

    <div className="scholarship-analysis-filter">
        <label>Examination Year</label>

        <input
            type="number"
            value={examYear}
            onChange={e => setExamYear(Number(e.target.value))}
        />
    </div>

    <div className="scholarship-analysis-filter">
        <label>Cut-off Marks</label>

        <input
            type="number"
            min="0"
            max="200"
            step="0.01"
            placeholder="Enter cut-off marks"
            value={cutoffMarks}
            onChange={e => setCutoffMarks(e.target.value)}
        />
    </div>

   

    <div className="scholarship-analysis-filter">
        <label>Analysis Category</label>

        <CustomDropdown
            value={analysisView}
            onChange={setAnalysisView}
            options={[
                { value: 'all', label: 'All Students Ranking' },
                { value: 'passed', label: 'Passed Students' },
                { value: 'ranges', label: 'Marks Range Analysis' }
            ]}
            placeholder="Select Analysis"
        />
    </div>

     <button
        className="scholarship-analysis-print-btn"
        onClick={() => window.print()}
        disabled={loading || results.length === 0}
    >
        Print Analysis
    </button>

</div>


{/* ================================
    SUMMARY CARDS
================================ */}

{loading ? (
    <p>Loading scholarship results...</p>
) : error ? (
    <p className="scholarship-analysis-error">{error}</p>
) : (
    <>
        <div className="scholarship-analysis-summary">

        <div className="scholarship-analysis-card">
            <span>Total Students</span>
            <h3>{totalStudents}</h3>
        </div>

        <div className="scholarship-analysis-card">
            <span>Passed Students</span>
            <h3>{passedCount}</h3>
        </div>

        <div className="scholarship-analysis-card">
            <span>Below Cut-off</span>
            <h3>{failedCount}</h3>
        </div>

           </div>

{/* ================================
    COMPLETE STUDENT RANKING
================================ */}

{!loading && !error && analysisView === 'all' && (
    <section className="scholarship-analysis-section">

        <div className="scholarship-analysis-section-header">
            <h3>Student Results Ranking</h3>
            <span>{totalStudents} Students</span>
        </div>

        <div className="scholarship-analysis-table-wrapper">
            <table className="scholarship-analysis-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Index Number</th>
                        <th>Student Name</th>
                        <th>Marks</th>
                    </tr>
                </thead>

                <tbody>
                    {rankedStudents.map(student => (
                        <tr key={student.id}>
                            <td>{student.rank}</td>
                            <td>{student.index_number}</td>
                            <td>{student.student_name}</td>
                            <td>{student.marks}</td>
                        </tr>
                    ))}

                    {rankedStudents.length === 0 && (
                        <tr>
                            <td colSpan="4">
                                No student results available.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

    </section>
)}
{/* ================================
    PASSED STUDENTS
================================ */}

{!loading && !error && analysisView === 'passed' && cutoffMarks !== '' && (
    <section
    className="scholarship-analysis-section"
    data-print-section="ranges"
>

        <div className="scholarship-analysis-section-header">
            <div>
                <h3>Passed Students</h3>
                <p>
                    Students who scored {cutoffMarks} marks or above
                </p>
            </div>

            <span>{passedCount} Students</span>
        </div>

        <div className="scholarship-analysis-table-wrapper">
            <table className="scholarship-analysis-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Index Number</th>
                        <th>Student Name</th>
                        <th>Marks</th>
                    </tr>
                </thead>

                <tbody>
                    {passedStudents.map(student => (
                        <tr key={student.id}>
                            <td>{student.rank}</td>
                            <td>{student.index_number}</td>
                            <td>{student.student_name}</td>
                            <td>{student.marks}</td>
                        </tr>
                    ))}

                    {passedStudents.length === 0 && (
                        <tr>
                            <td colSpan="4">
                                No students achieved this cut-off mark.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

    </section>
)}

{/* ================================
    MARKS RANGE ANALYSIS
================================ */}

{!loading && !error && analysisView === 'ranges' && (
    <section className="scholarship-analysis-section">

        <div className="scholarship-analysis-section-header">
            <div>
                <h3>Marks Range Analysis</h3>
                <p>
                    Create custom marks ranges to analyse student distribution.
                </p>
            </div>
        </div>

        {/* Add Marks Range */}
        <div className="scholarship-range-form">

            <div className="scholarship-range-input">
                <label>Minimum Marks</label>

                <input
                    type="number"
                    min="0"
                    max="200"
                    placeholder="e.g. 120"
                    value={rangeMinimum}
                    onChange={e => setRangeMinimum(e.target.value)}
                />
            </div>

            <div className="scholarship-range-input">
                <label>Maximum Marks</label>

                <input
                    type="number"
                    min="0"
                    max="200"
                    placeholder="e.g. 149"
                    value={rangeMaximum}
                    onChange={e => setRangeMaximum(e.target.value)}
                />
            </div>

            <button
                className="scholarship-range-add-btn"
                onClick={handleAddRange}
            >
                + Add Range
            </button>

        </div>

        {rangeError && (
            <p className="scholarship-analysis-error">
                {rangeError}
            </p>
        )}

        {/* Marks Range Summary */}
        <div className="scholarship-range-table-wrapper">

            <table className="scholarship-analysis-table">
                <thead>
                    <tr>
                        <th>Marks Range</th>
                        <th>Number of Students</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {marksRangeAnalysis.map(range => (
                        <tr key={range.id}>
                            <td>
                                {range.minimum} – {range.maximum}
                            </td>

                            <td>{range.studentCount}</td>

                            <td>
                                <button
                                    className="scholarship-range-delete-btn"
                                    onClick={() =>
                                        setMarksRanges(previous =>
                                            previous.filter(
                                                item => item.id !== range.id
                                            )
                                        )
                                    }
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}

                    {marksRangeAnalysis.length === 0 && (
                        <tr>
                            <td colSpan="3">
                                No marks ranges added yet.
                            </td>
                        </tr>
                    )}
                </tbody>

                {marksRangeAnalysis.length > 0 && (
                    <tfoot>
                        <tr>
                            <th>Total Students in Ranges</th>
                            <th>
                                {marksRangeAnalysis.reduce(
                                    (total, range) =>
                                        total + range.studentCount,
                                    0
                                )}
                            </th>
                            <th></th>
                        </tr>
                    </tfoot>
                )}

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

export default ScholarshipAnalysis
