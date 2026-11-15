
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './EmployeeDashboard.css'
import CustomDropdown from '../components/CustomDropdown'
import OLResults from './OLResults'
import ScholarshipStudentList from './ScholarshipStudentList'

function EmployeeDashboard({ user }) {
    const navigate = useNavigate()

    const [activeSection, setActiveSection] = useState('Dashboard')
    const [loggingOut, setLoggingOut] = useState(false)

    // Class information
    const [classes, setClasses] = useState([])
    const [classesLoading, setClassesLoading] = useState(false)
    const [classesError, setClassesError] = useState('')
    const [selectedClassId, setSelectedClassId] = useState('')
    const [showScholarshipStudents, setShowScholarshipStudents] = useState(false)

    const navigationItems = [
    { name: 'Dashboard', icon: '⌂' },
     { name: 'Term Tests', icon: '▧' },
    { name: 'Grade 5 Scholarship', icon: '♙' },
    { name: 'Grade 11 O/L', icon: '▤' },
    { name: 'Grade 13 A/L', icon: '▦' }
   
]

    // Fetch class divisions
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

    // Automatically load classes when dashboard opens
    useEffect(() => {
        fetchClasses()
    }, [])

    // Handle navigation between examination sections
    const handleSectionChange = (section) => {
    setActiveSection(section)
    setSelectedClassId('')
    setShowScholarshipStudents(section === 'Grade 5 Scholarship')

    if (
        section === 'Term Tests' ||
        section === 'Grade 5 Scholarship'
    ) {
        fetchClasses()
    }
}
    // Search for students in Term Tests
    const handleClassSearch = () => {
        if (!selectedClassId) {
            alert('Please select a class first.')
            return
        }

        navigate(`/employee/term-tests/${selectedClassId}/students`)
    }

    // Search for Grade 5 Scholarship students
    const handleScholarshipClassSearch = () => {
    if (!selectedClassId) {
        alert('Please select a Grade 5 class first.')
        return
    }

    setShowScholarshipStudents(true)
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

    // Filter Grade 5 classes
    const scholarshipClasses = classes.filter(
        classItem => Number(classItem.grade) === 5
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

        {/* Student Management */}
        {user.class_assignment && (
            <section className="teacher-profile-card student-management-card">
                <div className="student-management-heading">
                    <div>
                        <h3>Student Management</h3>
                        <p>
                            Manage students in your assigned class:{' '}
                            <strong>
                                {user.class_assignment.class_name}
                            </strong>
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
                    {activeSection !== 'Dashboard' && (
    <section className="teacher-section-content">

                        <div className="teacher-section-heading">
                            <div>
                                <span>ACADEMIC MANAGEMENT</span>
                                <h2>{activeSection}</h2>
                            </div>

                            {(
                                activeSection === 'Term Tests' ||
                                activeSection === 'Grade 5 Scholarship'
                            ) && (
                                <button
                                    className="teacher-refresh-btn"
                                    onClick={fetchClasses}
                                    disabled={classesLoading}
                                >
                                    {classesLoading ? 'Refreshing...' : '↻ Refresh'}
                                </button>
                            )}
                        </div>

                        {/* Term Tests */}
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

                                    <div className="term-test-intro">

                                        <h3>Select a Class</h3>

                                        <p>
                                            Search for and select a class division
                                            to view its students and term test records.
                                        </p>

                                        <div className="teacher-class-selector">

                                            <div className="teacher-class-dropdown">
                                                <CustomDropdown
                                                    value={selectedClassId}
                                                    options={classes.map(classItem => ({
                                                        value: String(classItem.id),
                                                        label: classItem.class_name
                                                    }))}
                                                    onChange={setSelectedClassId}
                                                    placeholder="Select a class..."
                                                    searchable={true}
                                                    searchPlaceholder="Search classes..."
                                                />
                                            </div>

                                            <button
                                                className="teacher-refresh-btn"
                                                onClick={handleClassSearch}
                                                disabled={!selectedClassId}
                                            >
                                                Search
                                            </button>

                                        </div>

                                    </div>
                                )}

                            </div>

                        ) : activeSection === 'Grade 5 Scholarship' ? (
    showScholarshipStudents ? (
        <ScholarshipStudentList
            classId={selectedClassId}
        />
    ) : (

                            /* Grade 5 Scholarship */
                            <div className="term-test-content">

                                {classesLoading ? (

                                    <div className="teacher-empty-state">
                                        <div className="teacher-empty-icon">⏳</div>
                                        <h3>Loading Grade 5 Classes...</h3>
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

                                ) : scholarshipClasses.length === 0 ? (

                                    <div className="teacher-empty-state">
                                        <div className="teacher-empty-icon">🏫</div>
                                        <h3>No Grade 5 Classes Available</h3>
                                        <p>
                                            No Grade 5 class divisions have been created yet.
                                        </p>
                                    </div>

                                ) : (

                                    <div className="term-test-intro">

                                        <h3>Select a Grade 5 Class</h3>

                                        <p>
                                            Select a Grade 5 class division to view students
                                            and enter their Scholarship Examination marks.
                                        </p>

                                        <div className="teacher-class-selector">

                                            <div className="teacher-class-dropdown">
                                                <CustomDropdown
                                                    value={selectedClassId}
                                                    options={scholarshipClasses.map(classItem => ({
                                                        value: String(classItem.id),
                                                        label: classItem.class_name
                                                    }))}
                                                    onChange={setSelectedClassId}
                                                    placeholder="Select a Grade 5 class..."
                                                    searchable={true}
                                                    searchPlaceholder="Search Grade 5 classes..."
                                                />
                                            </div>

                                            <button
                                                className="teacher-refresh-btn"
                                                onClick={handleScholarshipClassSearch}
                                                disabled={!selectedClassId}
                                            >
                                                Search
                                            </button>

                                        </div>

                                    </div>
                                )}

                            </div>
    )

                        ) : activeSection === 'Grade 11 O/L' ? (
    <OLResults user={user} />
) : (
    <div className="teacher-empty-state">
        <h3>{activeSection}</h3>
        <p>
            The student records and marks management section will appear here.
        </p>
    </div>
)}

                    </section>
                    )}
                </div>
            </main>
        </div>
    )
}

export default EmployeeDashboard
