import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'

function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('teachers')
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const navigate = useNavigate()

    const menuItems = [
        { id: 'teachers', label: 'Teacher Management', icon: '👩‍🏫' },
        { id: 'classes', label: 'Class Divisions', icon: '🏫' },
        { id: 'assignments', label: 'Class Teacher Assignments', icon: '📋' },
        { id: 'settings', label: 'Account Settings', icon: '⚙️' }
    ]

    const activeItem = menuItems.find(item => item.id === activeSection)

    // Fetch employee list from backend
    const fetchEmployees = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const response = await fetch(
                'http://localhost:5000/api/employees',
                {
                    credentials: 'include'
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to load employees.')
            }

            setEmployees(result.employees || [])

        } catch (error) {
            setErrorMessage(error.message || 'Unable to connect to the server.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmployees()
    }, [])

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
                                activeSection === item.id ? 'active' : ''
                            }`}
                            onClick={() => setActiveSection(item.id)}
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
                        <h1>{activeItem?.label}</h1>
                    </div>

                    <div className="admin-topbar-profile">
                        <div className="admin-avatar">A</div>
                        <span>Administrator</span>
                    </div>
                </header>

                <section className="admin-content">

                    {/* Teacher Management */}
                    {activeSection === 'teachers' && (
                        <div className="teacher-management">

                            <div className="teacher-section-heading">
                                <div>
                                    <h2>Teacher Management</h2>
                                    <p>View and manage registered employee accounts.</p>
                                </div>

                                <button
                                    className="add-teacher-button"
                                    onClick={() => navigate('/admin/add-employee')}
                                >
                                    + Add Teacher
                                </button>
                            </div>

                            <div className="teacher-summary">
                                <div>
                                    <span>Total Employees</span>
                                    <strong>{employees.length}</strong>
                                </div>
                            </div>

                           
{!loading && !errorMessage && (
    <div className="teacher-table-wrapper">
        <table className="teacher-table">
            <thead>
                <tr>
                    <th>TR ID</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Account Status</th>
                </tr>
            </thead>

            <tbody>
                {employees.length > 0 ? (
                    employees.map(employee => (
                        <tr key={employee.id}>
                            <td className="teacher-id">
                                {employee.teacher_id}
                            </td>

                            <td className="employee-name">
                                {employee.full_name}
                            </td>

                            <td>{employee.designation}</td>

                            <td>
                                <span
                                    className={`status-badge ${
                                        employee.is_active
                                            ? 'status-active'
                                            : 'status-inactive'
                                    }`}
                                >
                                    <span className="status-dot"></span>

                                    {employee.is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                </span>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="4" className="empty-teacher-list">
                            No employees have been registered yet.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
)}


                           

                        </div>
                    )}

                    {/* Class Divisions */}
                    {activeSection === 'classes' && (
                        <div>
                            <h2>Class Divisions</h2>
                            <p>Create and manage school class divisions.</p>
                        </div>
                    )}

                    {/* Class Teacher Assignments */}
                    {activeSection === 'assignments' && (
                        <div>
                            <h2>Class Teacher Assignments</h2>
                            <p>Assign teachers to their respective class divisions.</p>
                        </div>
                    )}

                    {/* Account Settings */}
                    {activeSection === 'settings' && (
                        <div>
                            <h2>Account Settings</h2>
                            <p>Manage your Administrator account.</p>
                        </div>
                    )}

                </section>

            </main>

        </div>
    )
}

export default AdminDashboard