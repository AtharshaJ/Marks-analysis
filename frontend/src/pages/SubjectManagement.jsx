
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SubjectManagement.css'
import CustomDropdown from '../components/CustomDropdown'

const API_URL = 'http://localhost:5000/api/subjects'

function SubjectManagement({ embedded = false }) {
    const navigate = useNavigate()

    const [groups, setGroups] = useState([])
    const [streams, setStreams] = useState([])
    const [baskets, setBaskets] = useState([])
    const [subjects, setSubjects] = useState([])
    const [alSubjects, setAlSubjects] = useState([])

    const [selectedGroup, setSelectedGroup] = useState('Primary')
    const [selectedBasketId, setSelectedBasketId] = useState('')

    const [subjectName, setSubjectName] = useState('')
    const [newStreamName, setNewStreamName] = useState('')

    const [alSubjectNo, setAlSubjectNo] = useState('')
    const [alSubjectName, setAlSubjectName] = useState('')
    const [alSubjectType, setAlSubjectType] = useState('Common')

    const [editingSubjectId, setEditingSubjectId] = useState(null)
    const [editSubjectName, setEditSubjectName] = useState('')

    const [editingAlSubjectNo, setEditingAlSubjectNo] = useState(null)
    const [editAlSubjectNo, setEditAlSubjectNo] = useState('')
    const [editAlSubjectName, setEditAlSubjectName] = useState('')
    const [editAlSubjectType, setEditAlSubjectType] = useState('Common')

    const [editingStreamId, setEditingStreamId] = useState(null)
    const [editStreamName, setEditStreamName] = useState('')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    // Load all subject management data
    const fetchSubjectData = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const response = await fetch(API_URL, {
                credentials: 'include'
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to load subject information.'
                )
            }

            setGroups(result.groups || [])
            setStreams(result.streams || [])
            setBaskets(result.baskets || [])
            setSubjects(result.subjects || [])
            setAlSubjects(result.alSubjects || [])

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSubjectData()
    }, [])

    // Find the selected group's database ID
    const selectedGroupId = useMemo(() => {
        return groups.find(
            group => group.group_name === selectedGroup
        )?.id
    }, [groups, selectedGroup])

    // Show baskets belonging to the selected non-A/L group
    const availableBaskets = useMemo(() => {
        return baskets.filter(basket =>
            basket.group_id === selectedGroupId &&
            basket.stream_id === null
        )
    }, [baskets, selectedGroupId])

    // Show compulsory subjects and relevant basket subjects
    const visibleSubjects = useMemo(() => {
        const relevantBasketIds = availableBaskets.map(
            basket => basket.id
        )

        return subjects.filter(subject => {
            if (subject.subject_group !== selectedGroup) {
                return false
            }

            if (subject.basket_id === null) {
                return true
            }

            return relevantBasketIds.includes(subject.basket_id)
        })
    }, [subjects, selectedGroup, availableBaskets])

    const compulsorySubjects = visibleSubjects.filter(
        subject => subject.basket_id === null
    )

    const getBasketSubjects = (basketId) => {
        return visibleSubjects.filter(
            subject => subject.basket_id === basketId
        )
    }

    // Add a Primary, Junior Secondary or O/L subject
    const handleAddSubject = async (e) => {
        e.preventDefault()

        setErrorMessage('')
        setSuccessMessage('')

        if (!subjectName.trim()) {
            setErrorMessage('Please enter a subject name.')
            return
        }

        setSaving(true)

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject_name: subjectName.trim(),
                    subject_group: selectedGroup,
                    basket_id: selectedBasketId || null,
                    stream_id: null
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to add subject.'
                )
            }

            setSubjectName('')
            setSelectedBasketId('')
            setSuccessMessage('Subject added successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Add a new A/L subject
    const handleAddALSubject = async (e) => {
        e.preventDefault()

        setErrorMessage('')
        setSuccessMessage('')

        if (!alSubjectNo.trim() || !alSubjectName.trim()) {
            setErrorMessage('Please enter the subject number and name.')
            return
        }

        setSaving(true)

        try {
            const response = await fetch(`${API_URL}/al`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject_no: alSubjectNo.trim(),
                    subject_name: alSubjectName.trim(),
                    subject_type: alSubjectType
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to add A/L subject.'
                )
            }

            setAlSubjectNo('')
            setAlSubjectName('')
            setAlSubjectType('Common')

            setSuccessMessage('A/L subject added successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Add a new A/L stream
    const handleCreateStream = async (e) => {
        e.preventDefault()

        setErrorMessage('')
        setSuccessMessage('')

        if (!newStreamName.trim()) {
            setErrorMessage('Please enter a stream name.')
            return
        }

        setSaving(true)

        try {
            const response = await fetch(`${API_URL}/streams`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stream_name: newStreamName.trim()
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to create stream.'
                )
            }

            setNewStreamName('')
            setSuccessMessage('A/L stream added successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Start editing a stream
    const startEditingStream = (stream) => {
        setEditingStreamId(stream.id)
        setEditStreamName(stream.stream_name)
        setErrorMessage('')
        setSuccessMessage('')
    }

    // Save stream name
    const handleRenameStream = async (streamId) => {
        if (!editStreamName.trim()) {
            setErrorMessage('Stream name cannot be empty.')
            return
        }

        setSaving(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await fetch(
                `${API_URL}/streams/${streamId}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        stream_name: editStreamName.trim()
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to rename stream.'
                )
            }

            setEditingStreamId(null)
            setEditStreamName('')
            setSuccessMessage('Stream renamed successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Start editing a non-A/L subject
    const startEditingSubject = (subject) => {
        setEditingSubjectId(subject.id)
        setEditSubjectName(subject.subject_name)
        setErrorMessage('')
        setSuccessMessage('')
    }

    // Save a non-A/L subject name
    const handleRenameSubject = async (subjectId) => {
        if (!editSubjectName.trim()) {
            setErrorMessage('Subject name cannot be empty.')
            return
        }

        setSaving(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await fetch(`${API_URL}/${subjectId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject_name: editSubjectName.trim()
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to rename subject.'
                )
            }

            setEditingSubjectId(null)
            setEditSubjectName('')
            setSuccessMessage('Subject renamed successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Start editing an A/L subject
    const startEditingALSubject = (subject) => {
        setEditingAlSubjectNo(subject.subject_no)
        setEditAlSubjectNo(subject.subject_no)
        setEditAlSubjectName(subject.subject_name)
        setEditAlSubjectType(subject.subject_type)
        setErrorMessage('')
        setSuccessMessage('')
    }

    // Save A/L subject changes
    const handleEditALSubject = async () => {
        if (!editAlSubjectNo.trim() || !editAlSubjectName.trim()) {
            setErrorMessage('Subject number and name cannot be empty.')
            return
        }

        setSaving(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            const response = await fetch(
                `${API_URL}/al/${encodeURIComponent(editingAlSubjectNo)}`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subject_no: editAlSubjectNo.trim(),
                        subject_name: editAlSubjectName.trim(),
                        subject_type: editAlSubjectType
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Unable to update A/L subject.'
                )
            }

            setEditingAlSubjectNo(null)
            setEditAlSubjectNo('')
            setEditAlSubjectName('')
            setSuccessMessage('A/L subject updated successfully.')

            await fetchSubjectData()

        } catch (error) {
            setErrorMessage(
                error.message || 'Unable to connect to the server.'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={`subject-management-page ${embedded ? 'embedded' : ''}`}>
{!embedded && (
            <header className="subject-page-header">
                <div>
                    <button
                        className="subject-back-button"
                        onClick={() => navigate('/admin')}
                    >
                        ← Back to Dashboard
                    </button>

                    <h1>Subject Management</h1>
                    <p>
                        Manage subjects for Primary, Junior Secondary,
                        O/L and A/L.
                    </p>
                </div>
            </header>

)}        

            {errorMessage && (
                <div className="subject-message subject-error">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="subject-message subject-success">
                    {successMessage}
                </div>
            )}

            {loading ? (
                <p className="subject-loading">
                    Loading subject information...
                </p>
            ) : (
                <>
                    {/* Subject Group Selection */}
                    <section className="subject-panel">
                        <div className="subject-panel-heading">
                            <div>
                                <h2>Subject Group</h2>
                                <p>Select the education level to manage.</p>
                            </div>
                        </div>

                        <div className="subject-group-options">
                            {['Primary', 'Junior Secondary', 'OL', 'AL'].map(
                                group => (
                                    <button
                                        key={group}
                                        type="button"
                                        className={`subject-group-button ${
                                            selectedGroup === group
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setSelectedGroup(group)
                                            setSelectedBasketId('')
                                            setErrorMessage('')
                                            setSuccessMessage('')
                                        }}
                                    >
                                        {group === 'OL'
                                            ? 'O/L'
                                            : group === 'AL'
                                                ? 'A/L'
                                                : group}
                                    </button>
                                )
                            )}
                        </div>
                    </section>

                    {/* A/L Management */}
                    {selectedGroup === 'AL' ? (
                        <>
                            {/* A/L Streams */}
                            <section className="subject-panel">
                                <div className="subject-panel-heading">
                                    <div>
                                        <h2>A/L Streams</h2>
                                        <p>
                                            Add, view and rename streams.
                                            Streams are managed independently
                                            of subjects.
                                        </p>
                                    </div>
                                </div>

                                <form
                                    className="create-stream-form"
                                    onSubmit={handleCreateStream}
                                >
                                    <input
                                        type="text"
                                        placeholder="Enter new stream name"
                                        value={newStreamName}
                                        onChange={(e) =>
                                            setNewStreamName(e.target.value)
                                        }
                                        required
                                    />

                                    <button type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : '+ Add Stream'}
                                    </button>
                                </form>

                                <div className="subject-list-section">
                                    <h3>Existing Streams</h3>

                                    {streams.length > 0 ? (
                                        <div className="subject-list">
                                            {streams.map(stream => (
                                                <div
                                                    className="subject-item"
                                                    key={stream.id}
                                                >
                                                    {editingStreamId === stream.id ? (
                                                        <div className="subject-edit-row">
                                                            <input
                                                                value={editStreamName}
                                                                onChange={(e) =>
                                                                    setEditStreamName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                autoFocus
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRenameStream(
                                                                        stream.id
                                                                    )
                                                                }
                                                                disabled={saving}
                                                            >
                                                                Save
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="subject-cancel-button"
                                                                onClick={() => {
                                                                    setEditingStreamId(null)
                                                                    setEditStreamName('')
                                                                }}
                                                                disabled={saving}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                {stream.stream_name}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditingStream(stream)
                                                                }
                                                            >
                                                                Edit
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="subject-empty">
                                            No A/L streams added yet.
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* Add A/L Subject */}
                            <section className="subject-panel">
                                <div className="subject-panel-heading">
                                    <div>
                                        <h2>Add A/L Subject</h2>
                                        <p>
                                            Add a subject number, subject name
                                            and select whether it is Common
                                            or Choice.
                                        </p>
                                    </div>
                                </div>

                                <form
                                    className="add-subject-form"
                                    onSubmit={handleAddALSubject}
                                >
                                    <div className="subject-form-field">
                                        <label htmlFor="al-subject-no">
                                            Subject Number
                                        </label>

                                        <input
                                            id="al-subject-no"
                                            type="text"
                                            placeholder="Enter subject number"
                                            value={alSubjectNo}
                                            onChange={(e) =>
                                                setAlSubjectNo(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="subject-form-field">
                                        <label htmlFor="al-subject-name">
                                            Subject Name
                                        </label>

                                        <input
                                            id="al-subject-name"
                                            type="text"
                                            placeholder="Enter subject name"
                                            value={alSubjectName}
                                            onChange={(e) =>
                                                setAlSubjectName(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="subject-form-field">
                                        <label htmlFor="al-subject-type">
                                            Subject Type
                                        </label>

                                       <CustomDropdown
    value={alSubjectType}
    onChange={setAlSubjectType}
    placeholder="Select subject type"
    options={[
        { value: 'Common', label: 'Common' },
        { value: 'Choice', label: 'Choice' }
    ]}
/>
                                    </div>

                                    <button
                                        type="submit"
                                        className="add-subject-button"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : '+ Add A/L Subject'}
                                    </button>
                                </form>
                            </section>

                            {/* A/L Subject List */}
                            <section className="subject-panel">
                                <div className="subject-panel-heading">
                                    <div>
                                        <h2>Existing A/L Subjects</h2>
                                        <p>
                                            All Common and Choice subjects
                                            are displayed together.
                                        </p>
                                    </div>
                                </div>

                                {alSubjects.length > 0 ? (
                                    <div className="subject-list-section">
                                        <div className="subject-list">
                                            {alSubjects.map(subject => (
                                                <div
                                                    className="subject-item"
                                                    key={subject.subject_no}
                                                >
                                                    {editingAlSubjectNo === subject.subject_no ? (
                                                        <div className="subject-edit-row">
                                                            <input
                                                                aria-label="Subject number"
                                                                placeholder="Subject number"
                                                                value={editAlSubjectNo}
                                                                onChange={(e) =>
                                                                    setEditAlSubjectNo(
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />

                                                            <input
                                                                aria-label="Subject name"
                                                                placeholder="Subject name"
                                                                value={editAlSubjectName}
                                                                onChange={(e) =>
                                                                    setEditAlSubjectName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />

                                                           <CustomDropdown
    value={editAlSubjectType}
    onChange={setEditAlSubjectType}
    placeholder="Select subject type"
    options={[
        { value: 'Common', label: 'Common' },
        { value: 'Choice', label: 'Choice' }
    ]}
/>
                                                            <button
                                                                type="button"
                                                                onClick={handleEditALSubject}
                                                                disabled={saving}
                                                            >
                                                                Save
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="subject-cancel-button"
                                                                onClick={() => {
                                                                    setEditingAlSubjectNo(null)
                                                                    setEditAlSubjectNo('')
                                                                    setEditAlSubjectName('')
                                                                }}
                                                                disabled={saving}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                <strong>
                                                                    {subject.subject_no}
                                                                </strong>
                                                                {' — '}
                                                                {subject.subject_name}
                                                                {' '}
                                                                <span className="al-subject-type">
                                                                    ({subject.subject_type})
                                                                </span>
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditingALSubject(subject)
                                                                }
                                                            >
                                                                Edit
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="subject-empty">
                                        No A/L subjects added yet.
                                    </p>
                                )}
                            </section>
                        </>
                    ) : (
                        <>
                            {/* Add Non-A/L Subject */}
                            <section className="subject-panel">
                                <div className="subject-panel-heading">
                                    <div>
                                        <h2>Add Subject</h2>
                                        <p>
                                            Add a compulsory subject or assign
                                            a subject to a basket.
                                        </p>
                                    </div>
                                </div>

                                <form
                                    className="add-subject-form"
                                    onSubmit={handleAddSubject}
                                >
                                    <div className="subject-form-field">
                                        <label htmlFor="subject-name">
                                            Subject Name
                                        </label>

                                        <input
                                            id="subject-name"
                                            type="text"
                                            placeholder="Enter subject name"
                                            value={subjectName}
                                            onChange={(e) =>
                                                setSubjectName(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                   <div className="subject-form-field">
    <label>Subject Category</label>

    <CustomDropdown
        value={selectedBasketId}
        onChange={setSelectedBasketId}
        placeholder="Compulsory Subject"
        options={[
            {
                value: '',
                label: 'Compulsory Subject'
            },
            ...availableBaskets.map(basket => ({
                value: String(basket.id),
                label: basket.basket_name
            }))
        ]}
    />
</div>

                                    <button
                                        type="submit"
                                        className="add-subject-button"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : '+ Add Subject'}
                                    </button>
                                </form>
                            </section>

                            {/* Existing Non-A/L Subjects */}
                            <section className="subject-panel">
                                <div className="subject-panel-heading">
                                    <div>
                                        <h2>Existing Subjects</h2>
                                        <p>
                                            Rename subjects whenever necessary.
                                            Existing subject records retain
                                            their IDs.
                                        </p>
                                    </div>
                                </div>

                                <div className="subject-list-section">
                                    <h3>Compulsory Subjects</h3>

                                    {compulsorySubjects.length > 0 ? (
                                        <div className="subject-list">
                                            {compulsorySubjects.map(subject => (
                                                <div
                                                    className="subject-item"
                                                    key={subject.id}
                                                >
                                                    {editingSubjectId === subject.id ? (
                                                        <div className="subject-edit-row">
                                                            <input
                                                                value={editSubjectName}
                                                                onChange={(e) =>
                                                                    setEditSubjectName(e.target.value)
                                                                }
                                                                autoFocus
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRenameSubject(subject.id)
                                                                }
                                                                disabled={saving}
                                                            >
                                                                Save
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="subject-cancel-button"
                                                                onClick={() => setEditingSubjectId(null)}
                                                                disabled={saving}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span>{subject.subject_name}</span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditingSubject(subject)
                                                                }
                                                            >
                                                                Rename
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="subject-empty">
                                            No compulsory subjects added yet.
                                        </p>
                                    )}
                                </div>

                                {availableBaskets.map(basket => {
                                    const basketSubjects = getBasketSubjects(
                                        basket.id
                                    )

                                    return (
                                        <div
                                            className="subject-list-section"
                                            key={basket.id}
                                        >
                                            <h3>{basket.basket_name}</h3>

                                            {basketSubjects.length > 0 ? (
                                                <div className="subject-list">
                                                    {basketSubjects.map(subject => (
                                                        <div
                                                            className="subject-item"
                                                            key={subject.id}
                                                        >
                                                            {editingSubjectId === subject.id ? (
                                                                <div className="subject-edit-row">
                                                                    <input
                                                                        value={editSubjectName}
                                                                        onChange={(e) =>
                                                                            setEditSubjectName(e.target.value)
                                                                        }
                                                                        autoFocus
                                                                    />

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleRenameSubject(subject.id)
                                                                        }
                                                                        disabled={saving}
                                                                    >
                                                                        Save
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="subject-cancel-button"
                                                                        onClick={() => setEditingSubjectId(null)}
                                                                        disabled={saving}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span>{subject.subject_name}</span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            startEditingSubject(subject)
                                                                        }
                                                                    >
                                                                        Rename
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="subject-empty">
                                                    No subjects in this basket yet.
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default SubjectManagement
