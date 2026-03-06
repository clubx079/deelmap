'use client'
import { useState, useEffect, useRef, createContext, useContext } from 'react'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollIntervalRef = useRef(null)

  // Check if user is suspended; if so, force logout
  const checkSuspended = async (userId) => {
    try {
      const res = await fetch(`/api/auth/check-suspended?userId=${userId}`)
      const data = await res.json()
      if (data.suspended) {
        // Save email before clearing state so login page can pre-fill review form
        const saved = localStorage.getItem('ableman_user')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (parsed.email) localStorage.setItem('suspended_email', parsed.email)
          } catch {}
        }
        localStorage.removeItem('ableman_user')
        localStorage.setItem('suspended_logout', '1')
        sessionStorage.clear()
        setUser(null)
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    } catch {
      // Network error – don't force logout
    }
  }

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

  // Real-time suspension polling
  useEffect(() => {
    if (!user?.id) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    // Immediate check on login
    checkSuspended(user.id)

    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(() => checkSuspended(user.id), 30000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [user?.id])

  const sendOTP = async (email, name) => {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      const err = new Error(error.message || 'Invalid credentials')
      err.suspended = error.suspended || false
      throw err
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to sign in with Google')
      }

      const result = await response.json()
      if (result.url) {
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
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to sign in with Facebook')
      }

      const result = await response.json()
      if (result.url) {
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
      setUser(null)
      localStorage.removeItem('ableman_user')
      sessionStorage.clear()
      await fetch('/api/auth/logout', { method: 'POST' })

      // Redirect to landing page (root), not /home
      if (typeof window !== 'undefined') {
        const origin = window.location.origin || ''
        window.location.replace(origin + '/')
      }
    } catch (error) {
      console.error('Sign out error:', error)
      setUser(null)
      localStorage.removeItem('ableman_user')
      sessionStorage.clear()
      if (typeof window !== 'undefined') {
        const origin = window.location.origin || ''
        window.location.replace(origin + '/')
      }
    }
  }

  const submitReviewRequest = async (message, email) => {
    const response = await fetch('/api/auth/request-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, email }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit review request')
    }

    return data
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
    resetPassword,
    submitReviewRequest
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
