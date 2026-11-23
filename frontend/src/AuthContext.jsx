
import { createContext, useContext, useState, useEffect } from 'react'
import API_URL from './config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Check the existing login session once
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/auth/me`,
                    {
                        credentials: 'include'
                    }
                )

                if (!response.ok) {
                    setUser(null)
                    return
                }

                const result = await response.json()
                setUser(result.user || null)

            } catch (error) {
                console.error('Session check failed:', error)
                setUser(null)
            } finally {
                setLoading(false)
            }
        }

        checkSession()
    }, [])

    const login = (userData) => {
        setUser(userData)
    }

    const logout = () => {
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
