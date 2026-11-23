
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import API_URL from '../config';
import { useAuth } from '../AuthContext'

function Login() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Password reset states
  const [resetMode, setResetMode] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const { login } = useAuth()

  const navigate = useNavigate()

  // Normal login
  const handleSubmit = async (event) => {
    event.preventDefault()

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            loginId,
            password
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Login failed.')
      }

      login(result.user)

      if (result.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/employee')
      }

    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to connect to the server.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Employee password reset
  const handlePasswordReset = async (event) => {
    event.preventDefault()

    setResetLoading(true)
    setResetError('')
    setResetMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            teacher_id: teacherId,
            newPassword,
            confirmPassword
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Password reset failed.')
      }

      setResetMessage(result.message)

      // Return to login after successful reset
      setLoginId(teacherId)
      setPassword('')
      setTeacherId('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        setResetMode(false)
        setResetMessage('')
      }, 2500)

    } catch (error) {
      setResetError(
        error.message || 'Unable to connect to the server.'
      )
    } finally {
      setResetLoading(false)
    }
  }

  // Switch between login and reset forms
  const openResetForm = () => {
    setResetMode(true)
    setResetError('')
    setResetMessage('')
    setErrorMessage('')
  }

  const openLoginForm = () => {
    setResetMode(false)
    setResetError('')
    setResetMessage('')
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <div className="brand-icon">M</div>
          <h1>Marks<span>Analysis</span></h1>
          <p>School Management System</p>
        </div>

        {resetMode ? (
          <>
            <div className="login-heading">
              <h2>Reset Password</h2>
              <p>Enter your TR ID and create a new password.</p>
            </div>

            <form onSubmit={handlePasswordReset}>
              <div className="login-form-group">
                <label htmlFor="resetTeacherId">TR ID</label>
                <input
                  id="resetTeacherId"
                  type="text"
                  placeholder="Enter your TR ID"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              {resetError && (
                <p className="login-feedback">
                  {resetError}
                </p>
              )}

              {resetMessage && (
                <p className="login-success">
                  {resetMessage}
                </p>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={resetLoading}
              >
                {resetLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>

            <button
              type="button"
              className="forgot-password-link"
              onClick={openLoginForm}
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="login-heading">
              <h2>Welcome Back!</h2>
              <p>Please sign in to access your account.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label htmlFor="loginId">Login ID</label>
                <input
                  id="loginId"
                  type="text"
                  placeholder="Enter username or TR ID"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="loginPassword">Password</label>

                <div className="login-password-wrapper">
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="login-feedback">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              className="forgot-password-link"
              onClick={openResetForm}
            >
              Forgot Password?
            </button>
          </>
        )}

        <p className="login-footer">
          Marks Analysis System
        </p>

      </div>
    </div>
  )
}

export default Login
