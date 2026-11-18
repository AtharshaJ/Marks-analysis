
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'
import CustomDropdown from '../components/CustomDropdown'
import SubjectManagement from './SubjectManagement'

function AdminDashboard() {
    const [activeSection, setActiveSection] = useState('teachers')
    const [employees, setEmployees] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionMessage, setActionMessage] = useState('')
    const [actionError, setActionError] = useState('')
    const [classes, setClasses] = useState([])
    const [classLoading, setClassLoading] = useState(false)
    const [classError, setClassError] = useState('')
    const [classSearchTerm, setClassSearchTerm] = useState('')
    const [showAddClass, setShowAddClass] = useState(false)
const [newClassGrade, setNewClassGrade] = useState('')
const [newClassDivision, setNewClassDivision] = useState('')
const [addClassLoading, setAddClassLoading] = useState(false)
const [addClassError, setAddClassError] = useState('')
const [addClassMessage, setAddClassMessage] = useState('')
const [eligibleTeachers, setEligibleTeachers] = useState([])
const [newClassTeacher, setNewClassTeacher] = useState('')
const [allActiveTeachers, setAllActiveTeachers] = useState([])
// Selected class for editing
const [selectedClass, setSelectedClass] = useState(null)

// Class editing form
const [editClassGrade, setEditClassGrade] = useState('')
const [editClassDivision, setEditClassDivision] = useState('')
const [editClassTeacher, setEditClassTeacher] = useState('')

// Class editing status
const [classActionLoading, setClassActionLoading] = useState(false)
const [classActionError, setClassActionError] = useState('')
const [classActionMessage, setClassActionMessage] = useState('')

// Delete confirmation
const [showDeleteClassConfirm, setShowDeleteClassConfirm] = useState(false)
    const navigate = useNavigate()

    const menuItems = [
        { id: 'teachers', label: 'Teacher Management', icon: '♙' },
    { id: 'classes', label: 'Class Divisions', icon: '⌂' },
    { id: 'subject-management', label: 'Subject Management', icon: '▦' },
    { id: 'settings', label: 'Account Settings', icon: '⚙' }
    ]

    const filteredEmployees = employees.filter(employee => {
        const search = searchTerm.toLowerCase().trim()

        return (
            employee.full_name.toLowerCase().includes(search) ||
            employee.teacher_id.toLowerCase().includes(search)
        )
    })

    const filteredClasses = classes.filter(classItem => {
    const search = classSearchTerm.toLowerCase().trim()

    return (
        classItem.class_name.toLowerCase().includes(search) ||
        String(classItem.grade).includes(search) ||
        (classItem.class_teacher?.full_name || '')
            .toLowerCase()
            .includes(search)
    )
})

    const activeItem = menuItems.find(item => item.id === activeSection)

    // Add a new class division
const handleAddClass = async (e) => {
    e.preventDefault()

    if (!newClassGrade) {
        setAddClassError('Please select a grade.')
        return
    }

    setAddClassLoading(true)
    setAddClassError('')
    setAddClassMessage('')

    try {
        const response = await fetch(
            'http://localhost:5000/api/classes',
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
    grade: Number(newClassGrade),
    division: newClassDivision.trim(),
    classTeacherId: newClassTeacher || null
})
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to add class.')
        }

        setAddClassMessage(result.message)

        setNewClassGrade('')
        setNewClassDivision('')
        setShowAddClass(false)
        setNewClassTeacher('')

        await fetchClasses()

    } catch (error) {
        setAddClassError(
            error.message || 'Unable to connect to the server.'
        )
    } finally {
        setAddClassLoading(false)
    }
}

    // Fetch employee list
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

    // Fetch class divisions from backend
const fetchClasses = async () => {
    setClassLoading(true)
    setClassError('')

    try {
        const response = await fetch(
            'http://localhost:5000/api/classes',
            {
                credentials: 'include'
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to load classes.')
        }

        setClasses(result.classes || [])
        setEligibleTeachers(result.eligibleTeachers || [])
        setAllActiveTeachers(result.allActiveTeachers || [])
        

    } catch (error) {
        setClassError(error.message || 'Unable to connect to the server.')
    } finally {
        setClassLoading(false)
    }
}


// Open the class editing popup
const openClassEditor = (classItem) => {
    setSelectedClass(classItem)

    setEditClassGrade(String(classItem.grade))
    setEditClassDivision(classItem.division || '')
    setEditClassTeacher(
        classItem.class_teacher_id
            ? String(classItem.class_teacher_id)
            : ''
    )

    setClassActionError('')
    setClassActionMessage('')
    setShowDeleteClassConfirm(false)
}

// Save edited class details
const handleUpdateClass = async (e) => {
    e.preventDefault()

    if (!selectedClass) return

    setClassActionLoading(true)
    setClassActionError('')
    setClassActionMessage('')

    if (!editClassGrade) {
    setClassActionError('Please select a grade.')
    return
}

    try {
        const response = await fetch(
            `http://localhost:5000/api/classes/${selectedClass.id}`,
            {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grade: Number(editClassGrade),
                    division: editClassDivision.trim(),
                    classTeacherId: editClassTeacher || null
                })
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to update class.')
        }

        setClassActionMessage(result.message)

        await fetchClasses()

        setSelectedClass(null)

    } catch (error) {
        setClassActionError(error.message)
    } finally {
        setClassActionLoading(false)
    }
}

// Delete the selected class
const handleDeleteClass = async () => {
    if (!selectedClass) return

    setClassActionLoading(true)
    setClassActionError('')
    setClassActionMessage('')

    try {
        const response = await fetch(
            `http://localhost:5000/api/classes/${selectedClass.id}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        )

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message || 'Unable to delete class.')
        }

        setClassActionMessage(result.message)
        setShowDeleteClassConfirm(false)
        setSelectedClass(null)

        await fetchClasses()

    } catch (error) {
        setClassActionError(error.message)
    } finally {
        setClassActionLoading(false)
    }
}

    useEffect(() => {
        fetchEmployees()
    }, [])

    useEffect(() => {
    if (activeSection === 'classes') {
        fetchClasses()
    }
}, [activeSection])

    // Update an employee in the table and modal
    const updateEmployeeInDashboard = (updatedEmployee) => {
        setEmployees(previousEmployees =>
            previousEmployees.map(employee =>
                employee.id === updatedEmployee.id
                    ? { ...employee, ...updatedEmployee }
                    : employee
            )
        )

        setSelectedEmployee(previousEmployee =>
            previousEmployee
                ? { ...previousEmployee, ...updatedEmployee }
                : null
        )
    }

    // Enable or disable password reset
    const handlePasswordReset = async () => {
        if (!selectedEmployee || actionLoading) return

        const enabled = !selectedEmployee.password_reset_enabled

        setActionLoading(true)
        setActionMessage('')
        setActionError('')

        try {
            const response = await fetch(
                `http://localhost:5000/api/employees/${selectedEmployee.id}/password-reset`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ enabled })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to update password reset settings.')
            }

            updateEmployeeInDashboard(result.employee)
            setActionMessage(result.message)

        } catch (error) {
            setActionError(error.message || 'Unable to connect to the server.')
        } finally {
            setActionLoading(false)
        }
    }

    // Activate or deactivate employee account
    const handleAccountStatus = async () => {
        if (!selectedEmployee || actionLoading) return

        const is_active = !selectedEmployee.is_active

        const confirmation = window.confirm(
            is_active
                ? `Are you sure you want to activate ${selectedEmployee.full_name}'s account?`
                : `Are you sure you want to deactivate ${selectedEmployee.full_name}'s account?`
        )

        if (!confirmation) return

        setActionLoading(true)
        setActionMessage('')
        setActionError('')

        try {
            const response = await fetch(
                `http://localhost:5000/api/employees/${selectedEmployee.id}/status`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active })
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Unable to update account status.')
            }

            updateEmployeeInDashboard(result.employee)
            setActionMessage(result.message)

        } catch (error) {
            setActionError(error.message || 'Unable to connect to the server.')
        } finally {
            setActionLoading(false)
        }
    }

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
                                    <span className="add-button-icon">+</span>
                                    <span>Add Employee</span>
                                </button>
                            </div>

                            <div className="teacher-summary">
                                <div>
                                    <span>Total Teachers</span>
                                    <strong>
                                        {employees.filter(
                                            employee => employee.designation === 'Teacher'
                                        ).length}
                                    </strong>
                                </div>
                            </div>

                            {loading && <p>Loading employees...</p>}

                            {errorMessage && (
                                <p className="error-message">{errorMessage}</p>
                            )}

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
                                                        <tr
    key={employee.id}
    className="clickable-employee-row"
    onClick={() => {
        setSelectedEmployee(employee)
        setActionMessage('')
        setActionError('')
    }}
    title="Click to manage this employee"
>
                                                            <td>
                                                               
                                                                    
                                                                    <strong>{employee.teacher_id}</strong>
                                                              
                                                            </td>

                                                            <td>
                                                               
                                                                    {employee.full_name}
                                                               
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

                            {/* Employee Details Modal */}
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
                                                {selectedEmployee.is_active
                                                    ? 'Active Account'
                                                    : 'Inactive Account'}
                                            </span>
                                        </div>

                                        <div className="employee-modal-content">

                                            {/* Account Management */}
                                            <h3>Account Management</h3>

                                            <div className="account-control-row">
                                                <div>
                                                    <h4>Password Reset</h4>
                                                    <p>
                                                        {selectedEmployee.password_reset_enabled
                                                            ? 'The employee is currently allowed to reset their password.'
                                                            : 'Password reset is currently disabled for this employee.'}
                                                    </p>
                                                </div>

                                                <button
                                                    className="modal-action-button"
                                                    onClick={handlePasswordReset}
                                                    disabled={
                                                        actionLoading ||
                                                        !selectedEmployee.is_active
                                                    }
                                                >
                                                    {selectedEmployee.password_reset_enabled
                                                        ? 'Disable Reset'
                                                        : 'Enable Reset'}
                                                </button>
                                            </div>

                                            {!selectedEmployee.is_active && (
                                                <p className="account-note">
                                                    Activate this account before enabling password reset.
                                                </p>
                                            )}

                                            <div className="account-control-row">
                                                <div>
                                                    <h4>Account Status</h4>
                                                    <p>
                                                        {selectedEmployee.is_active
                                                            ? 'This employee can log in to the system.'
                                                            : 'This employee cannot log in to the system.'}
                                                    </p>
                                                </div>

                                                <button
                                                    className={`modal-action-button ${
                                                        selectedEmployee.is_active
                                                            ? 'danger-action'
                                                            : 'activate-action'
                                                    }`}
                                                    onClick={handleAccountStatus}
                                                    disabled={actionLoading}
                                                >
                                                    {selectedEmployee.is_active
                                                        ? 'Deactivate'
                                                        : 'Activate'}
                                                </button>
                                            </div>

                                            {actionLoading && (
                                                <p className="account-note">
                                                    Updating account...
                                                </p>
                                            )}

                                            {actionMessage && (
                                                <p className="account-success">
                                                    {actionMessage}
                                                </p>
                                            )}

                                            {actionError && (
                                                <p className="account-error">
                                                    {actionError}
                                                </p>
                                            )}

                                            {/* Class Teacher Information */}
<h3>Class Teacher Information</h3>

<div className="class-teacher-info">
    <div className="class-teacher-info-label">
        <span>Assigned Class</span>
        <span className="class-teacher-icon">🏫</span>
    </div>

    {selectedEmployee.designation === 'Teacher' ? (
        selectedEmployee.class_assignment ? (
            <div className="class-assignment-details">
                <strong>
                    {selectedEmployee.class_assignment.class_name}
                </strong>
                <span>Currently assigned as Class Teacher</span>
            </div>
        ) : (
            <div className="class-not-assigned">
                Not Assigned
            </div>
        )
    ) : (
        <div className="class-not-assigned">
            Not Applicable
        </div>
    )}
</div>

                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                   
{/* Class Divisions */}
{activeSection === 'classes' && (
    <div className="teacher-management">

        <div className="teacher-section-heading">
            <div>
                <h2>Class Divisions</h2>
                <p>View and manage the school's class divisions.</p>
            </div>

            <button
    className="add-teacher-button"
    onClick={() => {
        setShowAddClass(true)
        setAddClassError('')
        setAddClassMessage('')
    }}
>
    <span className="add-button-icon">+</span>
    <span>Add Class</span>
</button>
        </div>

        {/* Add Class Form */}
{showAddClass && (
    <div className="employee-modal-overlay">
        <div className="employee-modal add-class-modal">
            <div className="employee-modal-header">
                <div>
                    <h2>Add Class Division</h2>
                    <p>Create a new school class division.</p>
                </div>

                <button
                    className="modal-close-button"
                    onClick={() => setShowAddClass(false)}
                    aria-label="Close"
                >
                    ×
                </button>
            </div>

            <form onSubmit={handleAddClass} className="add-class-form">

                <label htmlFor="class-grade">Grade</label>

                <CustomDropdown
    value={newClassGrade}
    onChange={setNewClassGrade}
    placeholder="Select Grade"
    options={Array.from({ length: 13 }, (_, index) => {
        const grade = index + 1

        return {
            value: String(grade),
            label: `Grade ${grade}`
        }
    })}
/>

                <label htmlFor="class-division">
                    Division <span>(Optional)</span>
                </label>

                <input
                    id="class-division"
                    type="text"
                    placeholder="e.g. A, B or C"
                    value={newClassDivision}
                    onChange={(e) => setNewClassDivision(e.target.value.toUpperCase())}
                    maxLength={10}
                />

                <label htmlFor="class-teacher">
    Class Teacher <span>(Optional)</span>
</label>

<CustomDropdown
    value={newClassTeacher}
    onChange={setNewClassTeacher}
    placeholder="No class teacher assigned"
    options={[
        {
            value: '',
            label: 'No class teacher assigned'
        },
        ...eligibleTeachers.map(teacher => ({
            value: String(teacher.id),
            label: `${teacher.full_name} (${teacher.teacher_id})`
        }))
    ]}
/>

                <div className="class-name-preview">
                    <span>Class Name Preview</span>

                    <strong>
                        {newClassGrade
                            ? `Grade ${newClassGrade}${
                                newClassDivision.trim()
                                    ? `-${newClassDivision.trim().toUpperCase()}`
                                    : ''
                            }`
                            : 'Select a grade'}
                    </strong>
                </div>

                {addClassError && (
                    <p className="account-error">{addClassError}</p>
                )}

                <div className="add-class-actions">
                    <button
                        type="button"
                        className="modal-action-button"
                        onClick={() => setShowAddClass(false)}
                        disabled={addClassLoading}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="add-teacher-button"
                        disabled={addClassLoading}
                    >
                        {addClassLoading ? 'Saving...' : 'Save Class'}
                    </button>
                </div>

            </form>
        </div>
    </div>
)}

        <div className="teacher-summary">
            <div>
                <span>Total Class Divisions</span>
                <strong>{classes.length}</strong>
            </div>
        </div>

        {classLoading && <p>Loading classes...</p>}

        {classError && (
            <p className="error-message">{classError}</p>
        )}

        {!classLoading && !classError && (
            <>
                <div className="teacher-search">
                    <span className="search-icon">⌕</span>

                    <input
                        type="text"
                        placeholder="Search by class, grade or class teacher..."
                        value={classSearchTerm}
                        onChange={(e) => setClassSearchTerm(e.target.value)}
                    />
                </div>

                <div className="teacher-table-wrapper">
                    <table className="teacher-table">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Grade</th>
                                <th>Division</th>
                                <th>Class Teacher</th>
                                <th>Assignment Status</th>
                            </tr>
                        </thead>

                        <tbody>
{filteredClasses.length > 0 ? (
    filteredClasses.map(classItem => (
        <tr
            key={classItem.id}
            onClick={() => openClassEditor(classItem)}
            className="clickable-class-row"
            title="Click to manage this class"
        >
            <td>
                <strong>{classItem.class_name}</strong>
            </td>

            <td>{classItem.grade}</td>

            <td>
                {classItem.division || '—'}
            </td>

            <td>
                {classItem.class_teacher
                    ? classItem.class_teacher.full_name
                    : '—'}
            </td>

            <td>
                <span className={`status-badge ${
                    classItem.class_teacher
                        ? 'status-active'
                        : 'status-inactive'
                }`}>
                    <span className="status-dot"></span>
                    {classItem.class_teacher
                        ? 'Assigned'
                        : 'Not Assigned'}
                </span>
            </td>
        </tr>
    ))
) : (
    <tr>
        <td colSpan="5" className="empty-teacher-list">
            {classSearchTerm
                ? 'No classes match your search.'
                : 'No class divisions have been created yet.'}
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

{/* Subject Management */}
{activeSection === 'subject-management' && (
    <SubjectManagement embedded />
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

            {/* Edit Class Modal */}
            {selectedClass && (
                <div className="class-edit-overlay">
                    <div className="class-edit-modal">

                        <div className="class-edit-header">
                            <div>
                                <h2>Edit Class</h2>
                                <p>Manage class details and class teacher.</p>
                            </div>

                            <button
                                type="button"
                                className="class-edit-close"
                                onClick={() => setSelectedClass(null)}
                                disabled={classActionLoading}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleUpdateClass}>

                            {classActionError && (
                                <div className="class-action-error">
                                    {classActionError}
                                </div>
                            )}

                            <label htmlFor="edit-class-grade">
                                Grade
                            </label>

                          <CustomDropdown
    value={editClassGrade}
    onChange={setEditClassGrade}
    placeholder="Select Grade"
    options={Array.from({ length: 13 }, (_, index) => {
        const grade = index + 1

        return {
            value: String(grade),
            label: `Grade ${grade}`
        }
    })}
/>

                            <label htmlFor="edit-class-division">
                                Division
                            </label>

                            <input
                                id="edit-class-division"
                                type="text"
                                value={editClassDivision}
                                onChange={(e) => setEditClassDivision(e.target.value.toUpperCase())}
                                placeholder="e.g. A, B or C"
                            />

                            <label htmlFor="edit-class-teacher">
                                Class Teacher
                            </label>

                           <CustomDropdown
    value={editClassTeacher}
    onChange={setEditClassTeacher}
    placeholder="No class teacher assigned"
    options={[
        {
            value: '',
            label: 'No class teacher assigned'
        },
        ...allActiveTeachers.map(teacher => ({
            value: String(teacher.id),
            label: `${teacher.full_name} (${teacher.teacher_id})`
        }))
    ]}
/>

                            {editClassTeacher && (() => {
    const assignedClass = classes.find(
        classItem =>
            String(classItem.class_teacher_id) === editClassTeacher &&
            classItem.id !== selectedClass.id
    );

    if (!assignedClass) return null;

    return (
        <div className="teacher-assignment-warning">
            <strong>
                <span>⚠</span> Teacher Already Assigned
            </strong>

            <p>
                This teacher is already assigned as the class teacher
                of <strong>{assignedClass.class_name}</strong>.
            </p>

            <p>
                Please review the existing assignment before proceeding.
            </p>
        </div>
    );
})()}

                            <div className="class-edit-preview">
                                <span>Updated Class Name</span>
                                <strong>
                                    Grade {editClassGrade || '?'}
                                    {editClassDivision.trim()
                                        ? `-${editClassDivision.trim().toUpperCase()}`
                                        : ''}
                                </strong>
                            </div>

                            

                            <div className="class-edit-actions">
    <button
        type="submit"
        className="class-save-button"
        disabled={classActionLoading}
    >
        {classActionLoading ? 'Saving...' : 'Save Changes'}
    </button>
</div>
                        </form>

                        <div className="class-delete-section">
                            <div>
                                <strong>Delete this class?</strong>
                                <p>This action cannot be undone.</p>
                            </div>

                            <button
                                type="button"
                                className="class-delete-button"
                                onClick={() => {
                                    setClassActionError('')
                                    setShowDeleteClassConfirm(true)
                                }}
                                disabled={classActionLoading}
                            >
                                Delete Class
                            </button>
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteClassConfirm && (
                            <div className="class-delete-confirm">
                                <h3>Confirm Deletion</h3>

                                <p>
                                    Are you sure you want to permanently
                                    delete <strong>{selectedClass.class_name}</strong>?
                                </p>

                                <div className="class-edit-actions">
                                    <button
                                        type="button"
                                        className="class-cancel-button"
                                        onClick={() => setShowDeleteClassConfirm(false)}
                                        disabled={classActionLoading}
                                    >
                                        Keep Class
                                    </button>

                                    <button
                                        type="button"
                                        className="class-delete-button"
                                        onClick={handleDeleteClass}
                                        disabled={classActionLoading}
                                    >
                                        {classActionLoading
                                            ? 'Deleting...'
                                            : 'Yes, Delete'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            </main>

        </div>
    )
}

export default AdminDashboard
