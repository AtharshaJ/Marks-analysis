
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
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

      // Redirect according to account type
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

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <div className="brand-icon">M</div>
          <h1>Marks<span>Analysis</span></h1>
          <p>School Management System</p>
        </div>

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

        <p className="login-footer">
          Marks Analysis System
        </p>

      </div>
    </div>
  )
}

export default Login
