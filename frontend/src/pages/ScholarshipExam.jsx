
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ScholarshipExam.css'
import API_URL from '../config'

function ScholarshipExam({ user }) {
    const navigate = useNavigate()



    const [examYear, setExamYear] = useState(new Date().getFullYear())
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [newIndexNumber, setNewIndexNumber] = useState('')
    const [newStudentName, setNewStudentName] = useState('')
    const [newMarks, setNewMarks] = useState('')
    const [saving, setSaving] = useState(false)
    const [showAddRow, setShowAddRow] = useState(false)

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_URL}/api/scholarship-exams/${examYear}`,
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
                console.error('Scholarship results error:', error)
                setError(error.message)
            } finally {
                setLoading(false)
            }
        }

        if (examYear) {
            fetchResults()
        }
    }, [examYear])

    const handleAddResult = async () => {
        try {
            setError('')

            if (!newIndexNumber.trim() || !newStudentName.trim() || newMarks === '') {
                setError('Please enter the index number, student name and marks.')
                return
            }

            const numericMarks = Number(newMarks)

            if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > 200) {
                setError('Marks must be between 0 and 200.')
                return
            }

            setSaving(true)

            const response = await fetch(
                `${API_URL}/api/scholarship-exams`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        exam_year: examYear,
                        index_number: newIndexNumber.trim(),
                        student_name: newStudentName.trim(),
                        marks: numericMarks
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to add scholarship result.')
            }

            setResults(previous => [...previous, result.result].sort((a, b) =>
                String(a.index_number).localeCompare(
                    String(b.index_number),
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                )
            ))

            setNewIndexNumber('')
            setNewStudentName('')
            setNewMarks('')

        } catch (error) {
            console.error('Add scholarship result error:', error)
            setError(error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="scholarship-exam-page">

            <header className="scholarship-exam-header">
                <h2>Grade 5 Scholarship Examination</h2>

                <button onClick={() => navigate('/employee', { state: { activeSection: 'Public Examinations' } })}>
                    Back to Public Examinations
                </button>
            </header>

            <main className="scholarship-exam-main">

                <div className="scholarship-exam-title">
                    <h2>Scholarship Results</h2>
                    <p>
                        Enter and manage Grade 5 Scholarship examination results.
                    </p>
                </div>

                <div className="scholarship-exam-year">
                    <label>Examination Year</label>

                    <input
                        type="number"
                        value={examYear}
                        onChange={e => setExamYear(Number(e.target.value))}
                    />
                </div>

                {loading && <p>Loading scholarship results...</p>}

                {error && (
                    <p className="scholarship-error">{error}</p>
                )}

                <div className="scholarship-exam-table-wrapper">
                    <table className="scholarship-exam-table">
                        <thead>
                            <tr>
                                <th>Index Number</th>
                                <th>Student Name</th>
                                <th>Marks</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {/* Existing results */}
                            {results.map(result => (
                                <tr key={result.id}>
                                    <td>{result.index_number}</td>
                                    <td>{result.student_name}</td>
                                    <td>{result.marks}</td>
                                    <td>—</td>
                                </tr>
                            ))}

                            {/* Empty results message */}
                            {results.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="4">
                                        No scholarship results found for {examYear}.
                                    </td>
                                </tr>
                            )}

                            {/* Add new result row */}
                            {!showAddRow ? (
                                <tr
                                    className="scholarship-add-trigger"
                                    onClick={() => setShowAddRow(true)}
                                >
                                    <td colSpan="4">
                                        <span>＋ Add New Result</span>
                                    </td>
                                </tr>
                            ) : (
                                <tr className="scholarship-add-row">
                                    <td>
                                        <input
                                            type="text"
                                            placeholder="Index Number"
                                            value={newIndexNumber}
                                            onChange={e => setNewIndexNumber(e.target.value)}
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="text"
                                            placeholder="Student Name"
                                            value={newStudentName}
                                            onChange={e => setNewStudentName(e.target.value)}
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            placeholder="Marks"
                                            min="0"
                                            max="200"
                                            step="0.01"
                                            value={newMarks}
                                            onChange={e => setNewMarks(e.target.value)}
                                        />
                                    </td>

                                    <td>
                                        <button
                                            className="scholarship-add-btn"
                                            onClick={handleAddResult}
                                            disabled={saving}
                                        >
                                            {saving ? 'Adding...' : 'Add'}
                                        </button>
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    )
}

export default ScholarshipExam
