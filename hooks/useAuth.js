'use client'
import { useState, useEffect, createContext, useContext } from 'react'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for OAuth callback cookie
    const cookieUser = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_user='))
      ?.split('=')[1]

    if (cookieUser) {
      try {
        const userData = JSON.parse(decodeURIComponent(cookieUser))
        setUser(userData)
        localStorage.setItem('ableman_user', JSON.stringify(userData))
        // Clear the cookie
        document.cookie = 'auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      } catch (error) {
        console.error('Error parsing OAuth user data:', error)
      }
    }

    // Check for existing session
    const savedUser = localStorage.getItem('ableman_user')
    if (savedUser && !cookieUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const sendOTP = async (email, name) => {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send OTP')
    }

    return response.json()
  }

  const verifyOTP = async (email, otp, userData) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, userData }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Invalid OTP')
    }

    const result = await response.json()
    const newUser = {
      id: result.user.id,
      email: result.user.email,
      first_name: result.user.first_name || null,
      last_name: result.user.last_name || null,
      user_metadata: {
        name: result.user.name,
        phone: result.user.phone
      }
    }
        
    setUser(newUser)
    localStorage.setItem('ableman_user', JSON.stringify(newUser))
        
    return result
  }

  const signIn = async (email, password) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Invalid credentials')
    }

    const result = await response.json()
    const loggedInUser = {
      id: result.user.id,
      email: result.user.email,
      first_name: result.user.first_name || null,
      last_name: result.user.last_name || null,
      user_metadata: {
        name: result.user.name,
        phone: result.user.phone
      }
    }
        
    setUser(loggedInUser)
    localStorage.setItem('ableman_user', JSON.stringify(loggedInUser))
        
    return result
  }

  const forgotPassword = async (email) => {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send reset code')
    }

    return response.json()
  }

  const resetPassword = async (email, otp, newPassword, confirmPassword) => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reset password')
    }

    return response.json()
  }

  const signInWithGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to sign in with Google')
      }

      const result = await response.json()

      if (result.url) {
        // Redirect to Google OAuth
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  const signInWithFacebook = async () => {
    try {
      const response = await fetch('/api/auth/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to sign in with Facebook')
      }

      const result = await response.json()

      if (result.url) {
        // Redirect to Facebook OAuth
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Facebook sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    console.log("signOut clicked");

    try {
      // Clear user state
      setUser(null)

      // Clear localStorage
      localStorage.removeItem('ableman_user')
      sessionStorage.clear()

      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' })

      // Redirect to landing page (root), not /home
      if (typeof window !== 'undefined') {
        const origin = window.location.origin || ''
        window.location.replace(origin + '/')
      }

    } catch (error) {
      console.error('Sign out error:', error)
      // Still clear local state even if API call fails
      setUser(null)
      localStorage.removeItem('ableman_user')
      sessionStorage.clear()
      
      // Redirect to landing page even on error
      if (typeof window !== 'undefined') {
        const origin = window.location.origin || ''
        window.location.replace(origin + '/')
      }
    }
  }

  const value = {
    user,
    loading,
    sendOTP,
    verifyOTP,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    forgotPassword,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}