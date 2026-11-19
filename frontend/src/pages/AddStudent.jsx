
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AddStudent.css'
import CustomDropdown from '../components/CustomDropdown'
import API_URL from '../config';

// Searchable A/L subject selector
function SearchableSubjectSelect({
    subjects,
    selectedSubject,
    unavailableSubjects,
    onChange,
    label
}) {
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const selected = subjects.find(
        subject => subject.subject_no === selectedSubject
    )

    const filteredSubjects = subjects.filter(subject => {
    // Exclude Common subjects
    if (subject.subject_type !== 'Choice') {
        return false
    }

    const alreadySelected =
        unavailableSubjects.includes(subject.subject_no) &&
        subject.subject_no !== selectedSubject

    const matchesSearch =
        subject.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        subject.subject_no.toLowerCase().includes(search.toLowerCase())

    return !alreadySelected && matchesSearch
})

    const handleSelect = subject => {
        onChange(subject.subject_no)
        setSearch(subject.subject_name)
        setIsOpen(false)
    }

    const handleSearch = value => {
        setSearch(value)
        setIsOpen(true)

        // Typing a new search clears the previous selection
        if (selectedSubject) {
            onChange('')
        }
    }

    return (
        <div className="add-student-basket">
            <label>{label}</label>

            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={search}
                    placeholder="Search for a subject..."
                    onChange={e => handleSearch(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    autoComplete="off"
                    required={!selectedSubject}
                />

                {isOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            zIndex: 20,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                    >
                        {filteredSubjects.length > 0 ? (
                            filteredSubjects.map(subject => (
                                <button
                                    type="button"
                                    key={subject.subject_no}
                                    onClick={() => handleSelect(subject)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: 'none',
                                        borderBottom: '1px solid #eee',
                                        background: '#fff',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: '#222'
                                    }}
                                >
                                    {subject.subject_name}
                                    <small style={{ marginLeft: '8px', color: '#777' }}>
                                        ({subject.subject_no})
                                    </small>
                                </button>
                            ))
                        ) : (
                            <p style={{ padding: '10px', margin: 0 }}>
                                No matching subjects found.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {selected && (
                <small style={{ color: '#16804a', display: 'block', marginTop: '5px' }}>
                    Selected: {selected.subject_name}
                </small>
            )}
        </div>
    )
}

function AddStudent({ user }) {
    const navigate = useNavigate()

    const [indexNumber, setIndexNumber] = useState('')
    const [studentName, setStudentName] = useState('')

    // Existing basket subject options
    const [baskets, setBaskets] = useState([])
    const [selectedSubjects, setSelectedSubjects] = useState({})

    // A/L registration options
    const [streams, setStreams] = useState([])
    const [alSubjects, setAlSubjects] = useState([])
    const [selectedStreamId, setSelectedStreamId] = useState('')
    const [selectedALSubjects, setSelectedALSubjects] = useState(['', '', ''])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

   const API_BASE_URL = API_URL;

    const grade = Number(user.class_assignment.grade)
    const isAL = grade === 12 || grade === 13

    // Fetch subject options for the assigned class
    useEffect(() => {
        const fetchSubjectOptions = async () => {
            try {
                setLoading(true)
                setError('')

                const response = await fetch(
                    `${API_BASE_URL}/api/classes/student-subject-options`,
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                )

                const result = await response.json()

                if (!response.ok) {
                    throw new Error(
                        result.message || 'Unable to load subject options.'
                    )
                }

                setBaskets(result.baskets || [])
                setStreams(result.streams || [])
                setAlSubjects(result.alSubjects || [])

            } catch (error) {
                console.error('Subject options error:', error)
                setError(error.message || 'Unable to load subject options.')
            } finally {
                setLoading(false)
            }
        }

        fetchSubjectOptions()
    }, [])

    // Handle existing basket subject selection
    const handleSubjectChange = (basketName, subjectId) => {
        setSelectedSubjects(previous => ({
            ...previous,
            [basketName]: subjectId
        }))
    }

    // Handle A/L subject selection
    const handleALSubjectChange = (index, subjectNo) => {
        setSelectedALSubjects(previous => {
            const updated = [...previous]
            updated[index] = subjectNo
            return updated
        })
    }

    // Submit student registration
    const handleSubmit = async (event) => {
        event.preventDefault()

        try {
            setSaving(true)
            setError('')
            setSuccess('')

            // Validate A/L selections before submitting
            if (isAL) {
                if (!selectedStreamId) {
                    throw new Error('Please select an A/L stream.')
                }

                if (selectedALSubjects.some(subject => !subject)) {
                    throw new Error('Please select all three A/L subjects.')
                }

                if (new Set(selectedALSubjects).size !== 3) {
                    throw new Error('You cannot select the same subject more than once.')
                }
            }

            const requestBody = {
                indexNumber,
                studentName,
                selectedSubjects: isAL ? {} : selectedSubjects,
                alStreamId: isAL ? Number(selectedStreamId) : null,
                alSubjectNumbers: isAL ? selectedALSubjects : []
            }

            const response = await fetch(
                `${API_BASE_URL}/api/classes/students`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(requestBody)
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to register student.'
                )
            }

            setSuccess(result.message || 'Student registered successfully!')

            setIndexNumber('')
            setStudentName('')
            setSelectedSubjects({})
            setSelectedStreamId('')
            setSelectedALSubjects(['', '', ''])

        } catch (error) {
            console.error('Student registration error:', error)
            setError(error.message || 'Unable to register student.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="add-student-page">

            <header className="add-student-header">
                <div>
                    <div className="add-student-brand">
                        <div className="add-student-brand-icon">MA</div>
                        <div>
                            <h2>Marks <span>Analysis</span></h2>
                            <p>Teacher Portal</p>
                        </div>
                    </div>
                </div>

                <button
                    className="add-student-back-btn"
                    onClick={() => navigate('/employee')}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <main className="add-student-main">

                <section className="add-student-title">
                    <span>STUDENT MANAGEMENT</span>
                    <h1>Add New Student</h1>
                    <p>
                        Register a student in your assigned class and
                        provide the required subject selections.
                    </p>
                </section>

                <form
                    className="add-student-card"
                    onSubmit={handleSubmit}
                >

                    <div className="add-student-class-info">
                        <div>
                            <span>ASSIGNED CLASS</span>
                            <h3>{user.class_assignment.class_name}</h3>
                        </div>

                        <div>
                            <span>GRADE</span>
                            <h3>{grade}</h3>
                        </div>
                    </div>

                    <div className="add-student-section">
                        <h2>Student Information</h2>
                        <p>Enter the student's basic details.</p>

                        <div className="add-student-fields">

                            <div className="add-student-field">
                                <label>Student Index Number</label>
                                <input
                                    type="text"
                                    value={indexNumber}
                                    onChange={e => setIndexNumber(e.target.value)}
                                    placeholder="Enter index number"
                                    maxLength={30}
                                    required
                                />
                            </div>

                            <div className="add-student-field">
                                <label>Student Full Name</label>
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={e => setStudentName(e.target.value)}
                                    placeholder="Enter full name"
                                    maxLength={150}
                                    required
                                />
                            </div>

                        </div>
                    </div>

                    {/* A/L registration: Grades 12 and 13 */}
                    {isAL && !loading && (
                        <div className="add-student-section">
                            <h2>A/L Subject Selection</h2>
                            <p>
                                Select the student's A/L stream and exactly
                                three subjects.
                            </p>

                            <div className="add-student-baskets">

                                <div className="add-student-basket">
                                    <label>A/L Stream</label>

                                    <select
                                        value={selectedStreamId}
                                        onChange={e => setSelectedStreamId(e.target.value)}
                                        required
                                    >
                                        <option value="">
                                            Select an A/L stream
                                        </option>

                                        {streams.map(stream => (
                                            <option
                                                key={stream.id}
                                                value={stream.id}
                                            >
                                                {stream.stream_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {[0, 1, 2].map(index => (
                                    <SearchableSubjectSelect
                                        key={index}
                                        label={`A/L Subject ${index + 1}`}
                                        subjects={alSubjects}
                                        selectedSubject={selectedALSubjects[index]}
                                        unavailableSubjects={selectedALSubjects.filter(
                                            (subject, i) => i !== index && subject
                                        )}
                                        onChange={subjectNo =>
                                            handleALSubjectChange(index, subjectNo)
                                        }
                                    />
                                ))}

                            </div>
                        </div>
                    )}

                    {/* Existing basket registration: Grades 6–11 */}
                    {!isAL && !loading && baskets.length > 0 && (
                        <div className="add-student-section">
                            <h2>Basket Subject Selection</h2>
                            <p>
                                Select one subject from each required basket.
                            </p>

                            <div className="add-student-baskets">

                                {baskets.map(basket => (
                                    <div
                                        className="add-student-basket"
                                        key={basket.basket_name}
                                    >
                                        <label>
                                            {basket.basket_name}
                                        </label>

                                        
<CustomDropdown
    value={selectedSubjects[basket.basket_name] || ''}
    options={basket.subjects.map(subject => ({
        value: String(subject.id),
        label: subject.subject_name
    }))}
    onChange={value =>
        handleSubjectChange(
            basket.basket_name,
            value
        )
    }
    placeholder="Select a subject"
    searchable={true}
    searchPlaceholder="Search subjects..."
/>

                                    </div>
                                ))}

                            </div>
                        </div>
                    )}

                    {loading && (
                        <p className="add-student-loading">
                            Loading subject options...
                        </p>
                    )}

                    {isAL && !loading && streams.length === 0 && (
                        <div className="add-student-error">
                            No A/L streams are available. Please contact the administrator.
                        </div>
                    )}

                    {isAL && !loading && alSubjects.length < 3 && (
                        <div className="add-student-error">
                            At least three A/L subjects must be available before registering an A/L student.
                        </div>
                    )}

                    {error && (
                        <div className="add-student-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="add-student-success">
                            {success}
                        </div>
                    )}

                    <div className="add-student-actions">
                        <button
                            type="button"
                            className="add-student-cancel-btn"
                            onClick={() => navigate('/employee')}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="add-student-save-btn"
                            disabled={
                                saving ||
                                loading ||
                                (isAL && (streams.length === 0 || alSubjects.length < 3))
                            }
                        >
                            {saving ? 'Saving...' : 'Save Student'}
                        </button>
                    </div>

                </form>

            </main>
        </div>
    )
}

export default AddStudent
