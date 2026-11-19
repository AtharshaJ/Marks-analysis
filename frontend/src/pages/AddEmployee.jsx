
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AddEmployee.css'
import CustomDropdown from '../components/CustomDropdown'
import API_URL from '../config';

function AddEmployee() {
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [trId, setTrId] = useState('')
    const [designation, setDesignation] = useState('Teacher')
    const [customDesignation, setCustomDesignation] = useState('')
    const [generatedPassword, setGeneratedPassword] = useState('')
    const [copied, setCopied] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [feedback, setFeedback] = useState(null)
    const [employeeCreated, setEmployeeCreated] = useState(false)
const API_BASE_URL = API_URL;

    const copyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword)
            setCopied(true)
        } catch {
            setCopied(false)
        }
    }

    const resetForm = () => {
        setFullName('')
        setTrId('')
        setDesignation('Teacher')
        setCustomDesignation('')
        setGeneratedPassword('')
        setCopied(false)
        setFeedback(null)
        setEmployeeCreated(false)
        setIsSubmitting(false)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (isSubmitting || employeeCreated) return

        setIsSubmitting(true)
        setFeedback(null)

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/employees/add`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        teacher_id: trId,
                        full_name: fullName,
                        designation,
                        custom_designation: customDesignation
                    })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(
                    result.message || 'Employee creation failed.'
                )
            }

            setGeneratedPassword(result.initialPassword)
            setCopied(false)
            setEmployeeCreated(true)

            setFeedback({
                type: 'success',
                message: `${result.employee.full_name} was added successfully!`
            })

        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.message || 'Unable to connect to the server.'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="add-employee-page">

            {/* HEADER */}
            <header className="add-employee-header">

                <div className="add-employee-brand">
                    <div className="add-employee-brand-icon">MA</div>

                    <div>
                        <h2>
                            Marks <span>Analysis</span>
                        </h2>
                        <p>Management System</p>
                    </div>
                </div>

                <button
                    className="add-employee-back-btn"
                    onClick={() => navigate('/admin')}
                >
                    ← Back 
                </button>

            </header>

            <main className="add-employee-main">

                {/* PAGE TITLE */}
                <section className="add-employee-title">
                    <span>EMPLOYEE MANAGEMENT</span>

                    <h1>Add New Employee</h1>

                    <p>
                        Create an employee account by entering their
                        details below.
                    </p>
                </section>

                {/* FORM CARD */}
                <form
                    className="add-employee-card"
                    onSubmit={handleSubmit}
                >

                    {/* EMPLOYEE INFORMATION */}
                    <div className="add-employee-section">

                        <h2>Employee Information</h2>

                        <p>
                            Enter the employee's basic details.
                        </p>

                        <div className="add-employee-fields">

                            <div className="add-employee-field full-width">
                                <label>Full Name</label>

                                <input
                                    type="text"
                                    placeholder="Enter employee's full name"
                                    value={fullName}
                                    onChange={e => {
                                        setFullName(e.target.value)
                                        setGeneratedPassword('')
                                        setEmployeeCreated(false)
                                        setFeedback(null)
                                        setCopied(false)
                                    }}
                                    required
                                />
                            </div>

                            <div className="add-employee-field">
                                <label>TR ID</label>

                                <input
                                    type="text"
                                    placeholder="Enter teacher ID"
                                    value={trId}
                                    onChange={e => {
                                        setTrId(e.target.value)
                                        setGeneratedPassword('')
                                        setEmployeeCreated(false)
                                        setFeedback(null)
                                        setCopied(false)
                                    }}
                                    required
                                />
                            </div>

                            <div className="add-employee-field">
                                <label>Designation</label>
<CustomDropdown
    value={designation}
    onChange={value => {
        setDesignation(value)
        setCustomDesignation('')
    }}
    options={[
        { value: 'Teacher', label: 'Teacher' },
        { value: 'Principal', label: 'Principal' },
        { value: 'Vice Principal', label: 'Vice Principal' },
        { value: 'Other', label: 'Other' }
    ]}
/>
                            </div>

                            {designation === 'Other' && (
                                <div className="add-employee-field full-width">
                                    <label>Custom Designation</label>

                                    <input
                                        type="text"
                                        placeholder="Enter designation"
                                        value={customDesignation}
                                        onChange={e =>
                                            setCustomDesignation(e.target.value)
                                        }
                                        required
                                    />
                                </div>
                            )}

                        </div>

                    </div>

                    {/* LOGIN CREDENTIALS */}
                    <div className="add-employee-section">

                        <div className="add-employee-password-heading">
                            <div>
                                <h2>Login Credentials</h2>
                                <p>
                                    A password will be generated automatically.
                                </p>
                            </div>

                            <span className="add-employee-secure-label">
                                AUTO GENERATED
                            </span>
                        </div>

                        <div className="add-employee-password-preview">

                            <div className="add-employee-password-value">
                                <span>♙</span>

                                <span>
                                    {generatedPassword ||
                                        'Your password will appear here'}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="add-employee-copy-btn"
                                onClick={copyPassword}
                                disabled={!generatedPassword}
                            >
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>

                        </div>

                    </div>

                    {/* FEEDBACK */}
                    {feedback && (
                        <div className={`add-employee-feedback ${feedback.type}`}>
                            {feedback.message}
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="add-employee-actions">

                        <button
                            type="button"
                            className="add-employee-cancel-btn"
                            onClick={resetForm}
                        >
                            Clear Form
                        </button>

                        <button
                            type="submit"
                            className="add-employee-save-btn"
                            disabled={isSubmitting || employeeCreated}
                        >
                            {isSubmitting
                                ? 'Creating Employee...'
                                : employeeCreated
                                    ? 'Employee Created ✓'
                                    : 'Create Employee'}
                        </button>

                    </div>

                </form>

            </main>

        </div>
    )
}

export default AddEmployee
