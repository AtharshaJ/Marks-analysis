import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'
import './SystemManagement.css'
import CustomDropdown from '../components/CustomDropdown'


function SystemManagement() {
    const navigate = useNavigate()

    const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000'

const [preview, setPreview] = useState(null)
const [selectedGroup, setSelectedGroup] = useState(null)
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

const [executing, setExecuting] = useState(false)
const [executionResult, setExecutionResult] = useState(null)

const [olExamYear, setOlExamYear] = useState(new Date().getFullYear())
const [alExamYear, setAlExamYear] = useState(new Date().getFullYear())
const [selectedExamYear, setSelectedExamYear] = useState(null)

const handlePreview = async (group) => {
    setLoading(true)
    setError('')
    setPreview(null)
    setSelectedGroup(group)

    const examYear = group === '1-11' ? olExamYear : alExamYear
setSelectedExamYear(examYear)

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/promotion/preview/${group}`,
            {
                credentials: 'include'
            }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to load promotion preview.')
        }

        setPreview(result)
    } catch (err) {
        setError(err.message)
    } finally {
        setLoading(false)
    }
}

const handleExecute = async () => {
    if (!selectedGroup) return
    if (!selectedExamYear) {
    setError('Please select an examination year.')
    return
}

        const confirmed = window.confirm(
    `WARNING: You are about to permanently execute the promotion for Grades ${selectedGroup}.\n\n` +
    `Examination Year: ${selectedExamYear}\n\n` +
    `Eligible graduating students' examination records will be preserved before their student records are deleted.\n\n` +
    `This will also delete student marks, inactive students, and deactivated teacher accounts.\n\n` +
    `This action cannot be undone. Do you want to continue?`
)

    if (!confirmed) return

    setExecuting(true)
    setError('')
    setExecutionResult(null)

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/promotion/execute`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
    group: selectedGroup,
    examYear: selectedExamYear
})
            }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Promotion failed.')
        }

        setExecutionResult(result)
        setPreview(null)

    } catch (err) {
        setError(err.message)
    } finally {
        setExecuting(false)
    }
}

    const menuItems = [
        { id: 'teachers', label: 'Teacher Management', icon: '👩‍🏫', path: '/admin' },
        { id: 'classes', label: 'Class Divisions', icon: '🏫', path: '/admin' },
        { id: 'subject-management', label: 'Subject Management', icon: '📚', path: '/admin/subject-management' },
        { id: 'settings', label: 'Account Settings', icon: '⚙️', path: '/admin' },
        { id: 'system-management', label: 'Academic Year Management', icon: '📅', path: '/admin/system-management' }
    ]

    return (
        <div className="admin-dashboard">

            {/* Sidebar */}
            <aside className="admin-sidebar">

                <div className="admin-brand">
                    <div className="admin-brand-icon">M</div>
                    <div>
                        <h2>Marks<span>Analysis</span></h2>
                        <p>School Management System</p>
                    </div>
                </div>

                <div className="admin-profile">
                    <div className="admin-avatar">A</div>
                    <div>
                        <h3>Administrator</h3>
                        <p>System Admin</p>
                    </div>
                </div>

                <nav className="admin-navigation">
                    <p className="admin-nav-heading">MAIN MENU</p>

                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`admin-nav-item ${
                                item.id === 'system-management' ? 'active' : ''
                            }`}
                            onClick={() => navigate(item.path)}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <p>Marks Analysis System</p>
                    <span>Administrator Panel</span>
                </div>

            </aside>

            {/* Main Content */}
            <main className="admin-main">

                <header className="admin-topbar">
                    <div>
                        <p>Administrator Panel</p>
                        <h1>Academic Year Management</h1>
                    </div>

                    <div className="admin-topbar-profile">
                        <div className="admin-avatar">A</div>
                        <span>Administrator</span>
                    </div>
                </header>

                <section className="admin-content">

                    <div className="academic-year-management">
    <div className="page-intro">
        <h2>Academic Year Management</h2>
        <p>Manage annual academic transitions and school records.</p>
    </div>

    <div className="promotion-cards">
        <div className="promotion-card">
            <h3>Promote Grades 1–11</h3>
            <p>
                Promote eligible students from Grades 1 to 11,
                remove graduating students and clear their marks.
            </p>

          <div className="promotion-action-row">

    <div className="promotion-year-field">
        <label>O/L Examination Year</label>

        <CustomDropdown
            value={String(olExamYear)}
            placeholder="Select O/L Examination Year"
            options={Array.from(
                { length: 3 },
                (_, i) => {
                    const year = new Date().getFullYear() - i
                    return {
                        value: String(year),
                        label: String(year)
                    }
                }
            )}
            onChange={value => setOlExamYear(Number(value))}
        />
    </div>

    <button
        className="promotion-preview-button"
        onClick={() => handlePreview('1-11')}
        disabled={loading || executing}
    >
        {loading && selectedGroup === '1-11'
            ? 'Loading Preview...'
            : 'Preview Promotion'}
    </button>

</div>
        </div>

        <div className="promotion-card">
            <h3>Promote Grades 12–13</h3>
            <p>
                Promote eligible students from Grade 12 to Grade 13,
                remove graduating students and clear their marks.
            </p>
<div className="promotion-action-row">

    <div className="promotion-year-field">
        <label>A/L Examination Year</label>

        <CustomDropdown
            value={String(alExamYear)}
            placeholder="Select A/L Examination Year"
            options={Array.from(
                { length: 3 },
                (_, i) => {
                    const year = new Date().getFullYear() - i
                    return {
                        value: String(year),
                        label: String(year)
                    }
                }
            )}
            onChange={value => setAlExamYear(Number(value))}
        />
    </div>

    <button
        className="promotion-preview-button"
        onClick={() => handlePreview('12-13')}
        disabled={loading || executing}
    >
        {loading && selectedGroup === '12-13'
            ? 'Loading Preview...'
            : 'Preview Promotion'}
    </button>

</div>
        </div>
    </div>

    {error && (
        <p className="error-message">{error}</p>
    )}

    {preview && (
    <div className="promotion-preview">
        <h3>
            Promotion Preview: Grades {selectedGroup}
        </h3>
        <p>Please review the following changes before proceeding.</p>

        <div className="exam-preview-info">
            <div>
                <span>Selected Examination Year</span>
                <strong>{selectedExamYear}</strong>
            </div>

            {selectedGroup === '1-11' && (
                <div>
                    <span>O/L Records to Preserve</span>
                    <strong>{preview.ol_results_to_preserve}</strong>
                </div>
            )}

            {selectedGroup === '12-13' && (
                <div>
                    <span>A/L Records to Preserve</span>
                    <strong>{preview.al_results_to_preserve}</strong>
                </div>
            )}
        </div>

        <p className={
            preview.exam_subjects_valid
                ? 'exam-validation-success'
                : 'exam-validation-error'
        }>
            {preview.exam_validation_message}
        </p>

        <div className="preview-details">

            <div>
                <span>Students to promote</span>
                <strong>{preview.students_to_promote}</strong>
            </div>

            <div>
                <span>Students to delete</span>
                <strong>{preview.students_to_delete}</strong>
            </div>

            <div>
                <span>Marks to delete</span>
                <strong>{preview.marks_to_delete}</strong>
            </div>

            <div>
                <span>New classes to create</span>
                <strong>{preview.classes_to_create}</strong>
            </div>

            <div>
                <span>Deactivated teachers to delete</span>
                <strong>{preview.teachers_to_delete}</strong>
            </div>

            <div>
                <span>Teacher sessions to delete</span>
                <strong>{preview.sessions_to_delete}</strong>
            </div>
        </div>

        <p 
        className="promotion-warning">
            Warning: This operation permanently deletes records and cannot be undone.
            No changes have been made yet.
        </p>

       <button
    className="execute-promotion-button"
    onClick={handleExecute}
    disabled={
        executing ||
        !preview.exam_subjects_valid ||
        !selectedExamYear
    }
>
    {executing ? 'Processing Promotion...' : 'Execute Promotion'}
</button>
    </div>
)}

{executionResult && (
    <div className="promotion-result">
    <h3>Promotion Completed Successfully!</h3>

    <p>Examination Year: <strong>{executionResult.exam_year}</strong></p>

    <div className="exam-preview-info">
        {executionResult.promotion_group === '1-11' && (
            <div>
                <span>O/L Records Preserved</span>
                <strong>{executionResult.ol_results_preserved}</strong>
            </div>
        )}

        {executionResult.promotion_group === '12-13' && (
            <div>
                <span>A/L Records Preserved</span>
                <strong>{executionResult.al_results_preserved}</strong>
            </div>
        )}
    </div>

    <div className="preview-details">
            <div>
                <span>Students promoted</span>
                <strong>{executionResult.students_promoted}</strong>
            </div>

            <div>
                <span>Students deleted</span>
                <strong>{executionResult.students_deleted}</strong>
            </div>

            <div>
                <span>Marks deleted</span>
                <strong>{executionResult.marks_deleted}</strong>
            </div>

            <div>
                <span>Classes created</span>
                <strong>{executionResult.classes_created}</strong>
            </div>

            <div>
                <span>Teachers deleted</span>
                <strong>{executionResult.teachers_deleted}</strong>
            </div>

            <div>
                <span>Sessions deleted</span>
                <strong>{executionResult.sessions_deleted}</strong>
            </div>
        </div>
    </div>
)}

</div>

                </section>

            </main>

        </div>
    )
}

export default SystemManagement