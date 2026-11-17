
import { useState, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Login from './pages/login'
import AddEmployee from './pages/AddEmployee'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AddStudent from './pages/AddStudent'
import SubjectManagement from './pages/SubjectManagement'
import StudentList from './pages/StudentList'
import StudentMarks from './pages/StudentMarks'
import SubjectMarks from './pages/SubjectMarks'
import TermTestsDashboard from './pages/TermTestsDashboard'
import StudentProgressReport from './pages/StudentProgressReport'
import PrintAllStudentReports from './pages/PrintAllStudentReports'
import ClassAnalysis from './pages/ClassAnalysis'
import SubjectAnalysis from './pages/SubjectAnalysis'

// Check whether a user is authenticated
function ProtectedRoute({ allowedRole, children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(
          'http://localhost:5000/api/auth/me',
          {
            credentials: 'include'
          }
        )

        if (!response.ok) {
          setUser(null)
          return
        }

        const result = await response.json()
        setUser(result.user)

      } catch (error) {
        console.error('Session check failed:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  if (loading) {
    return <p>Checking your login...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== allowedRole) {
    return <Navigate
      to={user.role === 'admin' ? '/admin' : '/employee'}
      replace
    />
  }

  return typeof children === 'function'
  ? children(user)
  : children
}





function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* Administrator Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Add Employee - Administrator only */}
        <Route
          path="/admin/add-employee"
          element={
            <ProtectedRoute allowedRole="admin">
              <AddEmployee />
            </ProtectedRoute>
          }
        />

{/* Subject Management - Administrator only */}
<Route
  path="/admin/subject-management"
  element={
    <ProtectedRoute allowedRole="admin">
      <SubjectManagement />
    </ProtectedRoute>
  }
/>

<Route
    path="/employee"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <EmployeeDashboard user={user} />}
        </ProtectedRoute>
    }
/>

{/* Term Tests Workspace */}
<Route
  path="/employee/term-tests/:classId"
  element={
    <ProtectedRoute allowedRole="employee">
      {user => <TermTestsDashboard user={user} />}
    </ProtectedRoute>
  }
/>

<Route
  path="/employee/term-tests/:classId/students"
  element={
    <ProtectedRoute allowedRole="employee">
      {user => <StudentList user={user} />}
    </ProtectedRoute>
  }
/>

<Route
  path="/employee/term-tests/:classId/students/:studentId"
  element={
    <ProtectedRoute allowedRole="employee">
      {user => <StudentMarks user={user} />}
    </ProtectedRoute>
  }
/>

<Route
    path="/employee/term-tests/:classId/subjects"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <SubjectMarks user={user} />}
        </ProtectedRoute>
    }
/>

<Route
    path="/employee/term-tests/:classId/subject-analysis"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <SubjectAnalysis user={user} />}
        </ProtectedRoute>
    }
/>

<Route
    path="/employee/term-tests/:classId/analysis"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <ClassAnalysis user={user} />}
        </ProtectedRoute>
    }
/>

<Route
    path="/employee/term-tests/:classId/reports/print-all"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <PrintAllStudentReports user={user} />}
        </ProtectedRoute>
    }
/>

<Route
  path="/employee/term-tests/:classId/students/:studentId/report"
  element={
    <ProtectedRoute allowedRole="employee">
      {user => <StudentProgressReport user={user} />}
    </ProtectedRoute>
  }
/>

{/* Add Student - Class Teacher only */}
<Route
  path="/employee/add-student"
  element={
    <ProtectedRoute allowedRole="employee">
      {user => (
        user.class_assignment
          ? <AddStudent user={user} />
          : <Navigate to="/employee" replace />
      )}
    </ProtectedRoute>
  }
/>

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
