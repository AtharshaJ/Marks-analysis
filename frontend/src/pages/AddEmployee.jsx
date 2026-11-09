
import { useState } from 'react'
import '../App.css'

function App() {
  const [fullName, setFullName] = useState('')
  const [trId, setTrId] = useState('')
  const [designation, setDesignation] = useState('Teacher')
  const [customDesignation, setCustomDesignation] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
const [feedback, setFeedback] = useState(null)
const [employeeCreated, setEmployeeCreated] = useState(false)

  

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
        'http://localhost:5000/api/employees/add',
        {
            method: 'POST',
            credentials: 'include', // Send the login session cookie
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
        throw new Error(result.message || 'Employee creation failed.')
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
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">M</div>
          <div>
            <h2>Marks<span>Analysis</span></h2>
            <small>Management System</small>
          </div>
        </div>

        <div className="sidebar-label">MAIN MENU</div>

        <nav>
          <a href="#" className="nav-item">
            <span>▦</span> Dashboard
          </a>
          <a href="#" className="nav-item active">
            <span>♙</span> Add Employee
          </a>
          <a href="#" className="nav-item">
            <span>♧</span> Employees
          </a>
          <a href="#" className="nav-item">
            <span>▤</span> Marks Analysis
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <small>System Admin</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Administration / Employees</p>
            <h3>Add Employee</h3>
          </div>
          <div className="topbar-status">
            <span className="status-dot"></span>
            Admin Panel
          </div>
        </header>

        <section className="page-content">
          <div className="welcome-section">
            <div>
              <h1>Add a New Employee</h1>
              <p>Create an employee account by entering their details below.</p>
            </div>
            <div className="welcome-icon">♙</div>
          </div>

          <div className="form-card">
            <div className="card-heading">
              <div className="heading-icon">01</div>
              <div>
                <h2>Employee Information</h2>
                <p>Enter the employee's basic details.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter employee's full name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      setGeneratedPassword('')
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="trId">TR ID</label>
                  <input
                    id="trId"
                    type="text"
                    placeholder="Enter teacher ID"
                    value={trId}
                    onChange={(e) => {
                      setTrId(e.target.value)
                      setGeneratedPassword('')
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="designation">Designation</label>
                  <select
                    id="designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Principal">Principal</option>
                    <option value="Vice Principal">Vice Principal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {designation === 'Other' && (
                  <div className="form-group full-width">
                    <label htmlFor="customDesignation">Custom Designation</label>
                    <input
                      id="customDesignation"
                      type="text"
                      placeholder="Enter designation"
                      value={customDesignation}
                      onChange={(e) => setCustomDesignation(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="password-section">
                <div className="password-heading">
                  <div>
                    <h2>Login Credentials</h2>
                    <p>A password will be generated automatically.</p>
                  </div>
                  <span className="secure-label">AUTO GENERATED</span>
                </div>

                <div className="password-preview">
                  <div className="password-value">
                    <span className="password-icon">♙</span>
                    <span>
                      {generatedPassword || 'Your password will appear here'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="copy-button"
                    onClick={copyPassword}
                    disabled={!generatedPassword}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                

                
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Clear Form
                </button>

                
<button
    type="submit"
    className="submit-button"
    disabled={isSubmitting || employeeCreated}
>
    {isSubmitting
        ? 'Creating Employee...'
        : employeeCreated
            ? 'Employee Created ✓'
            : 'Create Employee'}
</button>

              </div>
              {feedback && (
    <p className={`form-feedback ${feedback.type}`}>
        {feedback.message}
    </p>
)}

              <p className="next-step-note">
                Employee creation will be enabled after connecting the backend
                to Supabase.
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
