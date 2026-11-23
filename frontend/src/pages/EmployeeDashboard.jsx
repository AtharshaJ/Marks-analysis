
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './EmployeeDashboard.css'
import CustomDropdown from '../components/CustomDropdown'
import API_URL from '../config';
import { useAuth } from '../AuthContext'

function EmployeeDashboard({ user }) {
    const navigate = useNavigate()
    const { logout } = useAuth()

    const location = useLocation()

    const [activeSection, setActiveSection] = useState(
        location.state?.activeSection || 'Dashboard'
    )
    const [loggingOut, setLoggingOut] = useState(false)

    // Term Test classes
    const [classes, setClasses] = useState([])
    const [classesLoading, setClassesLoading] = useState(false)
    const [classesError, setClassesError] = useState('')
    const [selectedClassId, setSelectedClassId] = useState('')
    const [classSearch, setClassSearch] = useState('')
    const [expandedPublicExam, setExpandedPublicExam] = useState('')

    const navigationItems = [
        { name: 'Dashboard', icon: '⌂' },
        { name: 'Term Tests', icon: '▤' },
        { name: 'Public Examinations', icon: '▦' }
    ]

    // Fetch class divisions for Term Tests
    const fetchClasses = async () => {
        try {
            setClassesLoading(true)
            setClassesError('')

            const response = await fetch(
                `${API_URL}/api/classes/teacher-classes`,
                {
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
            setSelectedClassId('')
            setClassSearch('')
            fetchClasses()
        }
    }

    // Search for students in the selected class
    const handleClassSearch = () => {
        if (!selectedClassId) {
            alert('Please select a class first.')
            return
        }

        navigate(`/employee/term-tests/${selectedClassId}`)
    }

    // Handle logout
    const handleLogout = async () => {
        try {
            setLoggingOut(true)



            const response = await fetch(
                `${API_URL}/api/auth/logout`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            )

            if (!response.ok) {
                throw new Error('Logout failed.')
            }

            logout()
            navigate('/login', { replace: true })

        } catch (error) {
            console.error('Logout error:', error)
            alert('Unable to log out. Please try again.')
            setLoggingOut(false)
        }
    }

    // Filter classes according to the search text
    const filteredClasses = classes.filter(classItem =>
        classItem.class_name
            ?.toLowerCase()
            .includes(classSearch.toLowerCase())
    )

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
                            className={`teacher-nav-item ${activeSection === item.name ? 'active' : ''
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
                    {activeSection === 'Dashboard' && (
                        <>

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
                        </>
                    )}

                    {/* Selected Examination */}
                    {/* Selected Examination */}
                    {activeSection !== 'Dashboard' && (
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
                                            <h3>Loading Classes...</h3>
                                            <p>Please wait while we retrieve the class divisions.</p>
                                        </div>
                                    ) : classesError ? (
                                        <div className="teacher-empty-state">
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
                                            <h3>No Classes Available</h3>
                                            <p>
                                                No class divisions have been created by the Administrator yet.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="term-test-intro">
                                            <h3>Select a Class</h3>

                                            <p>
                                                Search for and select a class division
                                                to view its students and term test records.
                                            </p>

                                            <div style={{
                                                display: 'flex',
                                                gap: '12px',
                                                flexWrap: 'wrap',
                                                marginTop: '20px',
                                                alignItems: 'center'
                                            }}>
                                                <CustomDropdown
                                                    value={selectedClassId}
                                                    placeholder="Search or select a class..."
                                                    options={classes.map(classItem => ({
                                                        value: String(classItem.id),
                                                        label: classItem.class_name
                                                    }))}
                                                    onChange={(value) => {
                                                        setSelectedClassId(value)
                                                    }}
                                                />

                                                <button
                                                    className="teacher-refresh-btn"
                                                    onClick={handleClassSearch}
                                                    disabled={!selectedClassId}
                                                >
                                                    Search
                                                </button>
                                            </div>

                                            {filteredClasses.length === 0 && classSearch && (
                                                <p style={{ marginTop: '12px' }}>
                                                    No matching classes found.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                </div>


                            ) : activeSection === 'Public Examinations' ? (
                                <div className="public-tests-page">

                                    <div className="public-tests-header">
                                        <h2>Public Examinations</h2>
                                        <p>
                                            Manage public examination results and analyse
                                            student performance.
                                        </p>
                                    </div>


                                    <div className="public-exams-grid">

                                        {/* Grade 5 Scholarship */}
                                        <div className="public-exam-card">
                                            <div className="public-exam-icon">▦</div>
                                            <h3>Grade 5 Scholarship</h3>
                                            <p>Scholarship examination results and analysis.</p>

                                            <button
                                                onClick={() =>
                                                    setExpandedPublicExam(
                                                        expandedPublicExam === 'scholarship' ? '' : 'scholarship'
                                                    )
                                                }
                                            >
                                                {expandedPublicExam === 'scholarship' ? 'Close' : 'Open'}
                                            </button>

                                            {expandedPublicExam === 'scholarship' && (
                                                <div className="public-exam-actions">
                                                    <button
                                                        className="public-exam-edit-btn"
                                                        onClick={() => navigate('/employee/public-exams/scholarship')}
                                                    >
                                                        Manage Results
                                                    </button>

                                                    <button
                                                        className="public-exam-analysis-btn"
                                                        onClick={() => navigate('/employee/public-exams/scholarship/analysis')}
                                                    >
                                                        View Analysis
                                                    </button>
                                                </div>
                                            )}
                                        </div>


                                        {/* G.C.E. O/L */}
                                        <div className="public-exam-card">
                                            <div className="public-exam-icon">▤</div>
                                            <h3>G.C.E. O/L</h3>
                                            <p>Ordinary Level examination results and analysis.</p>

                                            <button
                                                onClick={() =>
                                                    setExpandedPublicExam(
                                                        expandedPublicExam === 'ol' ? '' : 'ol'
                                                    )
                                                }
                                            >
                                                {expandedPublicExam === 'ol' ? 'Close' : 'Open'}
                                            </button>

                                            {expandedPublicExam === 'ol' && (
                                                <div className="public-exam-actions">
                                                    <button
                                                        className="public-exam-edit-btn"
                                                        onClick={() => navigate('/employee/public-exams/ol')}
                                                    >
                                                        Manage Results
                                                    </button>

                                                    <button
                                                        className="public-exam-analysis-btn"
                                                        onClick={() =>
                                                            navigate('/employee/public-exams/ol/analysis')
                                                        }
                                                    >
                                                        View Analysis
                                                    </button>
                                                </div>
                                            )}
                                        </div>


                                        {/* G.C.E. A/L */}
                                        <div className="public-exam-card">
                                            <div className="public-exam-icon">▥</div>
                                            <h3>G.C.E. A/L</h3>
                                            <p>Advanced Level examination results and analysis.</p>

                                            <button
                                                onClick={() =>
                                                    setExpandedPublicExam(
                                                        expandedPublicExam === 'al' ? '' : 'al'
                                                    )
                                                }
                                            >
                                                {expandedPublicExam === 'al' ? 'Close' : 'Open'}
                                            </button>

                                            {expandedPublicExam === 'al' && (
                                                <div className="public-exam-actions">
                                                    <button
                                                        className="public-exam-edit-btn"
                                                        onClick={() => navigate('/employee/public-exams/al')}
                                                    >
                                                        Manage Results

                                                    </button>

                                                    <button
                                                        className="public-exam-analysis-btn"
                                                        onClick={() => navigate('/employee/public-exams/al/analysis')}
                                                    >
                                                        View Analysis
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                    </div>


                                </div>
                            ) : null}


                        </section>
                    )}

                </div>
            </main>
        </div>
    )
}

export default EmployeeDashboard
