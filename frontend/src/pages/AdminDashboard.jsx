import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'

function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('teachers')
    const [employees, setEmployees] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState(null)

    const navigate = useNavigate()

    const menuItems = [
        { id: 'teachers', label: 'Teacher Management', icon: '👩‍🏫' },
        { id: 'classes', label: 'Class Divisions', icon: '🏫' },
        { id: 'assignments', label: 'Class Teacher Assignments', icon: '📋' },
        { id: 'settings', label: 'Account Settings', icon: '⚙️' }
    ]

    const filteredEmployees = employees.filter(employee => {
    const search = searchTerm.toLowerCase().trim()

    return (
        employee.full_name.toLowerCase().includes(search) ||
        employee.teacher_id.toLowerCase().includes(search)
    )
})

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

                                    {selectedEmployee && (
    <div
        className="employee-modal-overlay"
        onClick={() => setSelectedEmployee(null)}
    >
        <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
        >
            <div className="employee-modal-header">
                <div>
                    <h2 id="employee-modal-title">
                        Employee Account
                    </h2>
                    <p>Manage employee details and account settings.</p>
                </div>

                <button
                    className="modal-close-button"
                    onClick={() => setSelectedEmployee(null)}
                    aria-label="Close"
                >
                    ×
                </button>
            </div>

            <div className="employee-modal-profile">
                <h3>{selectedEmployee.full_name}</h3>

                <p>
                    {selectedEmployee.teacher_id} · {selectedEmployee.designation}
                </p>

                <span className={`status-badge ${
                    selectedEmployee.is_active
                        ? 'status-active'
                        : 'status-inactive'
                }`}>
                    <span className="status-dot"></span>
                    {selectedEmployee.is_active ? 'Active Account' : 'Inactive Account'}
                </span>
            </div>

            <div className="employee-modal-content">
                <h3>Account Management</h3>

                <div className="modal-action-placeholder">
                    Password reset and account activation controls will be added here.
                </div>

                <h3>Class Teacher Management</h3>

                <div className="modal-action-placeholder">
                    Class assignment details and management controls will be added here.
                </div>
            </div>
        </div>
    </div>
)}
                                </div>

                                <button
    className="add-teacher-button"
    onClick={() => navigate('/admin/add-employee')}
>
    <span className="add-button-icon">+</span>
    <span>Add Employee</span>
</button>
                            </div>

                            <div className="teacher-summary">
                                <div>
                                    <span>Total Teachers</span>
                                    <strong>{employees.filter(employee => employee.designation === 'Teacher').length}</strong>
                                </div>
                            </div>

                           
{!loading && !errorMessage && (
    <>
        <div className="teacher-search">
            <span className="search-icon">⌕</span>

            <input
                type="text"
                placeholder="Search by employee name or TR ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

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
                    {filteredEmployees.length > 0 ? (
                        filteredEmployees.map(employee => (
                            <tr key={employee.id}>
                               <td>
    <button
        className="employee-link"
        onClick={() => setSelectedEmployee(employee)}
    >
        {employee.teacher_id}
    </button>
</td>

<td>
    <button
        className="employee-link employee-name"
        onClick={() => setSelectedEmployee(employee)}
    >
        {employee.full_name}
    </button>
</td>
                                <td>{employee.designation}</td>

                                <td>
                                    <span className={`status-badge ${
                                        employee.is_active
                                            ? 'status-active'
                                            : 'status-inactive'
                                    }`}>
                                        <span className="status-dot"></span>
                                        {employee.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="empty-teacher-list">
                                {searchTerm
                                    ? 'No employees match your search.'
                                    : 'No employees have been registered yet.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </>
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