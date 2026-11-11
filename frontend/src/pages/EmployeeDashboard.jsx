
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './EmployeeDashboard.css'

function EmployeeDashboard({ user }) {
    const navigate = useNavigate()

    const [activeSection, setActiveSection] = useState('Grade 5 Scholarship')
    const [loggingOut, setLoggingOut] = useState(false)

    // Term Test classes
    const [classes, setClasses] = useState([])
    const [classesLoading, setClassesLoading] = useState(false)
    const [classesError, setClassesError] = useState('')
    

    const navigationItems = [
        { name: 'Grade 5 Scholarship', icon: '🎓' },
        { name: 'Grade 11 O/L', icon: '📘' },
        { name: 'Grade 13 A/L', icon: '📚' },
        { name: 'Term Tests', icon: '📝' }
    ]

    // Fetch class divisions for Term Tests
    const fetchClasses = async () => {
        try {
            setClassesLoading(true)
            setClassesError('')

            const API_BASE_URL =
                import.meta.env.VITE_API_URL || 'http://localhost:5000'

            const response = await fetch(
                `${API_BASE_URL}/api/classes/teacher-classes`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to load classes.')
            }

            setClasses(result.classes || [])

        } catch (error) {
            console.error('Fetch classes error:', error)
            setClassesError(error.message || 'Unable to load classes.')
        } finally {
            setClassesLoading(false)
        }
    }

    // Handle navigation between examination sections
    const handleSectionChange = (section) => {
        setActiveSection(section)

        if (section === 'Term Tests') {
            fetchClasses()
        }
    }



    // Handle logout
    const handleLogout = async () => {
        try {
            setLoggingOut(true)

            const API_BASE_URL =
                import.meta.env.VITE_API_URL || 'http://localhost:5000'

            const response = await fetch(
                `${API_BASE_URL}/api/auth/logout`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )

            if (!response.ok) {
                throw new Error('Logout failed.')
            }

            navigate('/login', { replace: true })

        } catch (error) {
            console.error('Logout error:', error)
            alert('Unable to log out. Please try again.')
            setLoggingOut(false)
        }
    }

    return (
        <div className="teacher-dashboard">

            {/* Sidebar */}
            <aside className="teacher-sidebar">

                {/* Brand */}
                <div className="teacher-brand">
                    <div className="teacher-brand-icon">MA</div>

                    <div>
                        <h2>Marks <span>Analysis</span></h2>
                        <p>Teacher Portal</p>
                    </div>
                </div>

                {/* Teacher Profile */}
                <div className="teacher-sidebar-profile">
                    <div className="teacher-avatar">
                        {user.full_name?.charAt(0).toUpperCase() || 'T'}
                    </div>

                    <div>
                        <h3>{user.full_name}</h3>
                        <p>{user.designation}</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="teacher-navigation">

                    <div className="teacher-nav-heading">
                        EXAMINATIONS
                    </div>

                    {navigationItems.map(item => (
                        <button
                            key={item.name}
                            className={`teacher-nav-item ${
                                activeSection === item.name ? 'active' : ''
                            }`}
                            onClick={() => handleSectionChange(item.name)}
                        >
                            <span className="teacher-nav-icon">
                                {item.icon}
                            </span>

                            <span>{item.name}</span>
                        </button>
                    ))}

                </nav>

                {/* Sidebar Footer */}
                <div className="teacher-sidebar-footer">
                    <button
                        className="teacher-logout-btn"
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        <span>↪</span>
                        {loggingOut ? 'Logging out...' : 'Log Out'}
                    </button>

                    <p>Marks Analysis System</p>
                </div>

            </aside>

            {/* Main Area */}
            <main className="teacher-main">

                {/* Topbar */}
                <header className="teacher-topbar">
                    <div>
                        <p>TEACHER PORTAL</p>
                        <h1>{activeSection}</h1>
                    </div>

                    <div className="teacher-topbar-profile">
                        <div className="teacher-topbar-avatar">
                            {user.full_name?.charAt(0).toUpperCase() || 'T'}
                        </div>

                        <div>
                            <strong>{user.full_name}</strong>
                            <span>{user.teacher_id}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="teacher-content">

                    {/* Welcome Section */}
                    <section className="teacher-welcome">
                        <div>
                            <p className="teacher-welcome-label">
                                TEACHER DASHBOARD
                            </p>

                            <h2>Welcome, {user.full_name}!</h2>

                            <p>
                                Manage student information and academic
                                records through your dashboard.
                            </p>
                        </div>

                        <div className="teacher-welcome-icon">
                            📖
                        </div>
                    </section>

                    {/* Teacher Information */}
                    <section className="teacher-profile-card">

                        <h3>Teacher Information</h3>

                        <div className="teacher-profile-grid">

                            <div className="teacher-profile-item">
                                <span>TR ID</span>
                                <strong>{user.teacher_id}</strong>
                            </div>

                            <div className="teacher-profile-item">
                                <span>Full Name</span>
                                <strong>{user.full_name}</strong>
                            </div>

                            <div className="teacher-profile-item">
                                <span>Designation</span>
                                <strong>{user.designation}</strong>
                            </div>

                            {user.class_assignment && (
                                <div className="teacher-profile-item">
                                    <span>Assigned Class</span>
                                    <strong>
                                        {user.class_assignment.class_name}
                                    </strong>
                                </div>
                            )}

                        </div>
                    </section>

{/* Class Teacher Student Management */}
{user.class_assignment && (
    <section className="teacher-profile-card student-management-card">

        <div className="student-management-heading">
            <div>
                <h3>Student Management</h3>
                <p>
                    Manage students in your assigned class:
                    {' '}
                    <strong>{user.class_assignment.class_name}</strong>
                </p>
            </div>

            <button
                className="teacher-refresh-btn"
                onClick={() => navigate('/employee/add-student')}
            >
                + Add Student
            </button>
        </div>

    </section>
)}

                    {/* Selected Examination */}
                    <section className="teacher-section-content">

                        <div className="teacher-section-heading">
                            <div>
                                <span>ACADEMIC MANAGEMENT</span>
                                <h2>{activeSection}</h2>
                            </div>

                            {activeSection === 'Term Tests' && (
                                <button
                                    className="teacher-refresh-btn"
                                    onClick={fetchClasses}
                                    disabled={classesLoading}
                                >
                                    {classesLoading ? 'Refreshing...' : '↻ Refresh'}
                                </button>
                            )}
                        </div>

                        {activeSection === 'Term Tests' ? (
                            <div className="term-test-content">

                                {classesLoading ? (
                                    <div className="teacher-empty-state">
                                        <div className="teacher-empty-icon">⏳</div>
                                        <h3>Loading Classes...</h3>
                                        <p>
                                            Please wait while we retrieve the class divisions.
                                        </p>
                                    </div>

                                ) : classesError ? (
                                    <div className="teacher-empty-state">
                                        <div className="teacher-empty-icon">⚠️</div>
                                        <h3>Unable to Load Classes</h3>
                                        <p>{classesError}</p>

                                        <button
                                            className="teacher-refresh-btn"
                                            onClick={fetchClasses}
                                        >
                                            Try Again
                                        </button>
                                    </div>

                                ) : classes.length === 0 ? (
                                    <div className="teacher-empty-state">
                                        <div className="teacher-empty-icon">🏫</div>
                                        <h3>No Classes Available</h3>
                                        <p>
                                            No class divisions have been created by the Administrator yet.
                                        </p>
                                    </div>

                                ) : (
                                    <>
                                        <div className="term-test-intro">
                                            <h3>Select a Class</h3>
                                            <p>
                                                Choose a class division to access its term test records.
                                            </p>
                                        </div>

                                        <div className="term-test-class-grid">
                                            {classes.map(classItem => (
                                                <button
                                                    key={classItem.id}
                                                    className="term-test-class-card"
                                                    onClick={() => {
                                                        console.log('Selected class:', classItem)
                                                    }}
                                                >
                                                    <span className="term-test-class-icon">
                                                        🏫
                                                    </span>

                                                    <span className="term-test-class-name">
                                                        {classItem.class_name}
                                                    </span>

                                                    <span className="term-test-class-arrow">
                                                        →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                            </div>

                        ) : (
                            <div className="teacher-empty-state">
                                <div className="teacher-empty-icon">📋</div>
                                <h3>{activeSection}</h3>
                                <p>
                                    The student records and marks management section will appear here.
                                </p>
                            </div>
                        )}

                    </section>

                </div>
            </main>
        </div>
    )
}

export default EmployeeDashboard
