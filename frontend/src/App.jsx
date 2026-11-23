

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import { lazy, Suspense } from 'react'
import { useAuth } from './AuthContext'



const Login = lazy(() => import('./pages/login'))
const AddEmployee = lazy(() => import('./pages/AddEmployee'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'))
const AddStudent = lazy(() => import('./pages/AddStudent'))
const SubjectManagement = lazy(() => import('./pages/SubjectManagement'))
const StudentList = lazy(() => import('./pages/StudentList'))
const StudentMarks = lazy(() => import('./pages/StudentMarks'))
const SubjectMarks = lazy(() => import('./pages/SubjectMarks'))
const TermTestsDashboard = lazy(() => import('./pages/TermTestsDashboard'))
const StudentProgressReport = lazy(() => import('./pages/StudentProgressReport'))
const PrintAllStudentReports = lazy(() => import('./pages/PrintAllStudentReports'))
const ClassAnalysis = lazy(() => import('./pages/ClassAnalysis'))
const SubjectAnalysis = lazy(() => import('./pages/SubjectAnalysis'))
const ScholarshipExam = lazy(() => import('./pages/ScholarshipExam'))
const ScholarshipAnalysis = lazy(() => import('./pages/ScholarshipAnalysis'))
const OLResults = lazy(() => import('./pages/OLResults'))
const OLAnalysis = lazy(() => import('./pages/OLAnalysis'))
const ALResults = lazy(() => import('./pages/ALResults'))
const ALAnalysis = lazy(() => import('./pages/ALAnalysis'))


// Check whether a user is authenticated

function ProtectedRoute({ allowedRole, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Checking your login...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/employee'}
        replace
      />
    )
  }

  return typeof children === 'function'
    ? children(user)
    : children
}





function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p>Loading page...</p>}>
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
                {user => <AdminDashboard user={user} />}
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



          {/* Grade 5 Scholarship Examination */}
          <Route
            path="/employee/public-exams/scholarship"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <ScholarshipExam user={user} />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/public-exams/ol"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <OLResults user={user} />}
              </ProtectedRoute>
            }
          />

          {/* Scholarship Marks Analysis */}
          <Route
            path="/employee/public-exams/scholarship/analysis"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <ScholarshipAnalysis user={user} />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/public-exams/ol/analysis"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <OLAnalysis user={user} />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/public-exams/al"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <ALResults user={user} />}
              </ProtectedRoute>
            }
          />

          {/* A/L Marks Analysis */}
          <Route
            path="/employee/public-exams/al/analysis"
            element={
              <ProtectedRoute allowedRole="employee">
                {user => <ALAnalysis user={user} />}
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
