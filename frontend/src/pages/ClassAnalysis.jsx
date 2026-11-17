
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CustomDropdown from '../components/CustomDropdown'
import './ClassAnalysis.css'

function ClassAnalysis({ user }) {
    const { classId } = useParams()
    const navigate = useNavigate()

    const API_BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:5000'

    const [years, setYears] = useState([])
    const [terms, setTerms] = useState([])
    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedTermId, setSelectedTermId] = useState('')

    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
    const fetchAcademicYears = async () => {
        try {
            setLoading(true)
            setError('')

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

            const academicYears = result.academicYears || []

            setYears(academicYears)

            const activeYear = academicYears.find(
                year => year.is_active
            )

            if (activeYear) {
                setSelectedYearId(String(activeYear.id))

                const sortedTerms = [
                    ...(activeYear.academic_terms || [])
                ].sort((a, b) => a.term_number - b.term_number)

                setTerms(sortedTerms)

                if (sortedTerms.length > 0) {
                    setSelectedTermId(String(sortedTerms[0].id))
                }
            }
        } catch (error) {
            console.error('Class analysis error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    fetchAcademicYears()
}, [API_BASE_URL])


useEffect(() => {
    if (!selectedTermId) {
        setAnalysis(null)
        return
    }

    const fetchClassAnalysis = async () => {
        try {
            setLoading(true)
            setError('')
            setAnalysis(null)

            const response = await fetch(
                `${API_BASE_URL}/api/class-analysis/${classId}/summary?termId=${selectedTermId}`,
                { credentials: 'include' }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to retrieve class analysis.'
                )
            }

            setAnalysis(result)
        } catch (error) {
            console.error('Class analysis retrieval error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    fetchClassAnalysis()
}, [classId, selectedTermId, API_BASE_URL])


    const handleYearChange = (yearId) => {
    setSelectedYearId(yearId)

    const selectedYear = years.find(
        year => String(year.id) === String(yearId)
    )

    const sortedTerms = [...(selectedYear?.academic_terms || [])]
        .sort((a, b) => a.term_number - b.term_number)

    setTerms(sortedTerms)

    setSelectedTermId(
        sortedTerms.length > 0
            ? String(sortedTerms[0].id)
            : ''
    )
}

    return (
        <div className="class-analysis-page">
           <div className="class-analysis-header">
    <div>
        <h1>Class Analysis</h1>
        <p>
            Analyse class performance, student rankings
            and subject statistics.
        </p>
    </div>

    <button
        className="class-analysis-back-btn"
        onClick={() => navigate(`/employee/term-tests/${classId}`)}
    >
        ← Back to Term Tests
    </button>
</div>

            <div className="class-analysis-filters">

    <div className="class-analysis-filter">
        <label>Academic Year</label>

        <CustomDropdown
            value={selectedYearId}
            onChange={handleYearChange}
            placeholder="Select Academic Year"
            options={years.map(year => ({
                value: String(year.id),
                label: String(year.year)
            }))}
        />
    </div>

    <div className="class-analysis-filter">
        <label>Academic Term</label>

        <CustomDropdown
            value={selectedTermId}
            onChange={setSelectedTermId}
            placeholder="Select Academic Term"
            disabled={!terms.length}
            options={terms.map(term => ({
                value: String(term.id),
                label: term.term_name
            }))}
        />
    </div>

</div>

            {loading && <p>Loading class analysis...</p>}

            {error && <p className="class-analysis-error">{error}</p>}

            {!loading && !error && !analysis && (
                <div className="class-analysis-empty">
                    Select an academic year and term to view class analysis.
                </div>
            )}

            
{!loading && !error && analysis && (
    <>
   
{/* Overview Cards */}
<div className="class-analysis-overview">
    <div className="class-analysis-stat-card">
        <span>Total Students</span>
        <h2>{analysis.overview.totalStudents}</h2>
    </div>

    <div className="class-analysis-stat-card">
        <span>Completed Results</span>
        <h2>{analysis.overview.completedStudents}</h2>
    </div>

    <div className="class-analysis-stat-card">
        <span>Pending Results</span>
        <h2>{analysis.overview.pendingStudents}</h2>
    </div>

    <div className="class-analysis-stat-card">
        <span>Class Average</span>
        <h2>{analysis.overview.classAverage ?? '-'}</h2>
    </div>

    <div className="class-analysis-stat-card">
        <span>Highest Average</span>
        <h2>{analysis.overview.highestAverage ?? '-'}</h2>
    </div>

    <div className="class-analysis-stat-card">
        <span>Lowest Average</span>
        <h2>{analysis.overview.lowestAverage ?? '-'}</h2>
    </div>
</div>

{/* Grade Distribution */}
<div className="class-analysis-section">
    <h2>Grade Distribution</h2>

    <div className="class-analysis-grade-distribution">
        {Object.entries(analysis.gradeDistribution).map(
            ([grade, count]) => (
                <div
                    className="class-analysis-grade-card"
                    key={grade}
                >
                    <span>Grade {grade}</span>
                    <h2>{count}</h2>
                    <p>
                        {analysis.overview.completedStudents > 0
                            ? (
                                count /
                                analysis.overview.completedStudents *
                                100
                            ).toFixed(1)
                            : '0.0'}%
                    </p>
                </div>
            )
        )}
    </div>
</div>

{/* Student Rankings */}
<div className="class-analysis-section">
    <h2>Student Rankings</h2>

    <div className="class-analysis-table-wrapper">
        <table className="class-analysis-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Index Number</th>
                    <th>Student Name</th>
                    <th>Total</th>
                    <th>Average</th>
                    <th>Grade</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                {analysis.students.map(student => (
                    <tr key={student.id}>
                        <td>{student.classRank ?? '-'}</td>
                        <td>{student.indexNumber}</td>
                        <td>{student.studentName}</td>
                        <td>{student.total ?? '-'}</td>
                        <td>{student.average ?? '-'}</td>
                        <td>{student.grade ?? '-'}</td>
                        <td>
                            {student.status === 'complete'
                                ? 'Complete'
                                : `Pending (${student.completedSubjectCount}/${student.requiredSubjectCount})`}
                        </td>
                    </tr>
                ))}

                {analysis.students.length === 0 && (
                    <tr>
                        <td colSpan="7">No students found.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
</div>

    </>
)}

        </div>
    )
}

export default ClassAnalysis
