
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
<Route
    path="/employee"
    element={
        <ProtectedRoute allowedRole="employee">
            {user => <EmployeeDashboard user={user} />}
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
