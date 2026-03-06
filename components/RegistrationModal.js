'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, Mail, Phone as PhoneIcon, Lock, User, ChevronDown, X, Check } from 'lucide-react'
import { US_STATES } from '@/utils/constants'
import Image from 'next/image'

export function RegistrationModal({ isOpen, onClose, initialStep = 'login', preventClose = false }) {
  const { signIn, sendOTP, verifyOTP, signInWithGoogle, signInWithFacebook } = useAuth()
  const [authStep, setAuthStep] = useState(initialStep)
  const [authData, setAuthData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    otp: '',
    agreedToPrivacy: false,
    statesOfInterest: []
  })
  const [otpMethod, setOtpMethod] = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [validatingPhone, setValidatingPhone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showStatesDropdown, setShowStatesDropdown] = useState(false)
  const [statesSearch, setStatesSearch] = useState('')
  const statesDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statesDropdownRef.current && !statesDropdownRef.current.contains(event.target)) {
        setShowStatesDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = () => {
    setAuthData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      otp: '',
      agreedToPrivacy: false,
      statesOfInterest: []
    })
    setAuthStep(initialStep)
    setError('')
    setPhoneError('')
    setLoading(false)
    setValidatingPhone(false)
    setShowPassword(false)
    setShowStatesDropdown(false)
    setStatesSearch('')
  }

  // Toggle state selection
  const toggleState = (stateValue) => {
    setAuthData(prev => {
      const currentStates = prev.statesOfInterest || []
      if (currentStates.includes(stateValue)) {
        return { ...prev, statesOfInterest: currentStates.filter(s => s !== stateValue) }
      } else {
        return { ...prev, statesOfInterest: [...currentStates, stateValue] }
      }
    })
  }

  // Remove a state from selection
  const removeState = (stateValue) => {
    setAuthData(prev => ({
      ...prev,
      statesOfInterest: (prev.statesOfInterest || []).filter(s => s !== stateValue)
    }))
  }

  // Filter states based on search
  const filteredStates = US_STATES.filter(state =>
    state.label.toLowerCase().includes(statesSearch.toLowerCase()) ||
    state.value.toLowerCase().includes(statesSearch.toLowerCase())
  )

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return `(${cleaned}`
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // Get raw digits from formatted phone
  const getPhoneDigits = (formattedPhone) => {
    return formattedPhone.replace(/\D/g, '')
  }

  // Validate phone format
  const validatePhoneFormat = (phone) => {
    const digits = getPhoneDigits(phone)
    if (digits.length === 0) return { valid: false, message: '' }
    if (digits.length < 10) return { valid: false, message: 'Phone number must be 10 digits' }
    if (digits.length > 10) return { valid: false, message: 'Phone number must be 10 digits' }
    return { valid: true, message: '' }
  }

  // Verify phone with API
  const verifyPhoneWithAPI = async (phone) => {
    const digits = getPhoneDigits(phone)
    if (digits.length !== 10) return { valid: false, message: 'Please enter a valid 10-digit phone number' }

    try {
      setValidatingPhone(true)
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits })
      })

      const data = await response.json()
      return { valid: data.valid, message: data.message }
    } catch (error) {
      console.error('Phone verification error:', error)
      return { valid: false, message: 'Unable to verify phone number. Please try again.' }
    } finally {
      setValidatingPhone(false)
    }
  }

  // Handle phone input change
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setAuthData({ ...authData, phone: formatted })
    if (phoneError) setPhoneError('')

    const validation = validatePhoneFormat(formatted)
    if (getPhoneDigits(formatted).length === 10 && !validation.valid) {
      setPhoneError(validation.message)
    }
  }

  // Reset to initial step when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthStep(initialStep)
    }
  }, [isOpen, initialStep])

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPhoneError('')

    // Validate states of interest
    if (!authData.statesOfInterest || authData.statesOfInterest.length === 0) {
      setError('Please select at least one state you are interested in')
      setLoading(false)
      return
    }

    // Validate phone format
    const formatValidation = validatePhoneFormat(authData.phone)
    if (!formatValidation.valid) {
      setPhoneError(formatValidation.message || 'Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    // Verify with API
    const apiValidation = await verifyPhoneWithAPI(authData.phone)
    if (!apiValidation.valid) {
      setPhoneError(apiValidation.message)
      setLoading(false)
      return
    }

    // Validation passed — let user pick delivery method
    setLoading(false)
    setAuthStep('otp-method')
  }

  const handleChooseOTPMethod = async (method) => {
    setOtpMethod(method)
    setLoading(true)
    setError('')
    try {
      await sendOTP(authData.email, authData.firstName, authData.lastName, method, authData.phone)
      setAuthStep('otp')
    } catch (err) {
      setError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await verifyOTP(authData.email, authData.otp, {
        password: authData.password,
        firstName: authData.firstName,
        lastName: authData.lastName,
        phone: authData.phone,
        statesOfInterest: authData.statesOfInterest
      })
      handleClose()
    } catch (error) {
      setError(error.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(authData.email, authData.password)
      handleClose()
    } catch (error) {
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
      handleClose()
    } catch (error) {
      setError(error.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    try {
      setLoading(true)
      await signInWithFacebook()
      handleClose()
    } catch (error) {
      setError(error.message || 'Failed to sign in with Facebook')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={preventClose ? undefined : handleClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-slate-200">
          <div className="flex flex-col max-h-[90vh]">

            {/* Left Side - Branding - Removed for cleaner design */}

            {/* Auth Forms */}
            <div className="flex-1 bg-white overflow-y-auto">
              {/* Close Button - Only show if closing is allowed */}
              {!preventClose && (
              <button
                onClick={handleClose}
                  className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                  <X className="w-5 h-5 text-slate-500" />
              </button>
              )}

              <div className="p-6 sm:p-8">

                {/* Login Form */}
                {authStep === 'login' && (
                  <div>
                    <div className="mb-8 text-center">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">Login Required</h2>
                      <p className="text-slate-600">Please log in to view the full details of this property</p>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={authData.email}
                            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                            required
                          className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={authData.password}
                            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                            required
                            className="h-12 pr-10 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-sm font-semibold disabled:opacity-50 rounded-lg transition-all"
                      >
                        {loading ? 'Signing In...' : 'Sign In'}
                      </Button>
                    </form>

                    <div className="mt-6">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-4 bg-white text-slate-500 font-medium">Or continue with</span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm font-medium text-slate-700">Google</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFacebookSignIn}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="text-sm font-medium text-slate-700">Facebook</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-slate-600 text-sm">
                        Don't have an account?{' '}
                        <button
                          onClick={() => setAuthStep('signup')}
                          className="text-slate-900 font-semibold hover:underline"
                        >
                          Sign up for free
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* Signup Form */}
                {authStep === 'signup' && (
                  <div>
                    <div className="mb-6 text-center">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
                      <p className="text-slate-600">Join Deelmap and start finding great deals</p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            First Name
                          </label>
                          <Input
                            type="text"
                            placeholder="John"
                            value={authData.firstName}
                            onChange={(e) => setAuthData({ ...authData, firstName: e.target.value })}
                            required
                            className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Last Name
                          </label>
                          <Input
                            type="text"
                            placeholder="Doe"
                            value={authData.lastName}
                            onChange={(e) => setAuthData({ ...authData, lastName: e.target.value })}
                            required
                            className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                          <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            value={authData.email}
                            onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                            required
                          className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                          <Input
                            type="tel"
                            placeholder="(555) 555-5555"
                            value={authData.phone}
                            onChange={handlePhoneChange}
                            required
                          className={`h-12 ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900/20'}`}
                          />
                        {phoneError && (
                          <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={authData.password}
                            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                            required
                            className="h-12 pr-10 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* States of Interest */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          States of Interest <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" ref={statesDropdownRef}>
                          <div
                            onClick={() => setShowStatesDropdown(!showStatesDropdown)}
                            className={`min-h-[48px] w-full px-3 py-2 border-2 rounded-lg cursor-pointer flex flex-wrap gap-1 items-center text-sm ${
                              showStatesDropdown ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-300'
                            }`}
                          >
                            {authData.statesOfInterest?.length === 0 ? (
                              <span className="text-sm text-slate-400">Select states...</span>
                            ) : (
                              authData.statesOfInterest.map(stateCode => {
                                const state = US_STATES.find(s => s.value === stateCode)
                                return (
                                  <span
                                    key={stateCode}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-900 rounded-md text-xs font-medium"
                                  >
                                    {state?.label || stateCode}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeState(stateCode)
                                      }}
                                      className="hover:bg-slate-200 rounded-full p-0.5"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                )
                              })
                            )}
                            <ChevronDown
                              size={18}
                              className={`ml-auto text-slate-400 transition-transform ${showStatesDropdown ? 'rotate-180' : ''}`}
                            />
                          </div>

                          {showStatesDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                              <div className="p-2 border-b border-slate-200">
                                <input
                                  type="text"
                                  placeholder="Search states..."
                                  value={statesSearch}
                                  onChange={(e) => setStatesSearch(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-md focus:outline-none focus:border-slate-900"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="overflow-y-auto max-h-44">
                                {filteredStates.map(state => {
                                  const isSelected = authData.statesOfInterest?.includes(state.value)
                                  return (
                                    <button
                                      key={state.value}
                                      type="button"
                                      onClick={() => toggleState(state.value)}
                                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-50 ${
                                        isSelected ? 'bg-slate-100' : ''
                                      }`}
                                    >
                                      <span className={isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}>
                                        {state.label}
                                      </span>
                                      {isSelected && <Check size={16} className="text-slate-900" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {authData.statesOfInterest?.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {authData.statesOfInterest.length} state{authData.statesOfInterest.length > 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={authData.agreedToPrivacy}
                          onChange={(e) => setAuthData({ ...authData, agreedToPrivacy: e.target.checked })}
                          required
                          className="mt-0.5 h-4 w-4 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                        />
                        <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
                          I agree to Deelmap's{' '}
                          <a href="/terms-of-use" target="_blank" className="text-slate-900 font-semibold hover:underline">
                            Terms of Use
                          </a>
                          {' '}and{' '}
                          <a href="/privacy-policy" target="_blank" className="text-slate-900 font-semibold hover:underline">
                            Privacy Policy
                          </a>
                        </label>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading || validatingPhone || !authData.agreedToPrivacy}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-sm font-semibold disabled:opacity-50 rounded-lg transition-all"
                      >
                        {validatingPhone ? 'Verifying Phone...' : loading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </form>

                    <div className="mt-6">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-4 bg-white text-slate-500 font-medium">Or continue with</span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm font-medium text-slate-700">Google</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFacebookSignIn}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="text-sm font-medium text-slate-700">Facebook</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-slate-600 text-sm">
                        Already have an account?{' '}
                        <button
                          onClick={() => setAuthStep('login')}
                          className="text-slate-900 font-semibold hover:underline"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* OTP Method Picker */}
                {authStep === 'otp-method' && (
                  <div>
                    <div className="mb-8 text-center">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">How would you like your code?</h2>
                      <p className="text-slate-600">Choose how we send your 6-digit verification code.</p>
                    </div>
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center mb-4">
                        {error}
                      </div>
                    )}
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleChooseOTPMethod('email')}
                        disabled={loading}
                        className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-slate-900 rounded-xl text-left transition-all disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Send via Email</p>
                          <p className="text-xs text-slate-500">{authData.email}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChooseOTPMethod('sms')}
                        disabled={loading}
                        className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-slate-900 rounded-xl text-left transition-all disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Send via Text (SMS)</p>
                          <p className="text-xs text-slate-500">{authData.phone}</p>
                        </div>
                      </button>
                    </div>
                    {loading && <p className="text-center text-sm text-slate-500 mt-4">Sending code...</p>}
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => { setError(''); setAuthStep('signup') }}
                        disabled={loading}
                        className="text-slate-500 hover:underline text-sm disabled:opacity-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP Verification */}
                {authStep === 'otp' && (
                  <div>
                    <div className="mb-8 text-center">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">{otpMethod === 'sms' ? 'Verify Your Phone' : 'Verify Your Email'}</h2>
                      <p className="text-slate-600">
                        {otpMethod === 'sms'
                          ? <>We sent a 6-digit code to <strong>{authData.phone}</strong></>
                          : <>We sent a 6-digit code to <strong>{authData.email}</strong></>
                        }
                      </p>
                    </div>

                    <form onSubmit={handleVerifyOTP} className="space-y-5">
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          placeholder="000000"
                          value={authData.otp}
                          onChange={(e) => setAuthData({ ...authData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          required
                          className="h-14 text-center text-2xl font-mono tracking-widest w-64 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                          maxLength={6}
                        />
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                          {error}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading || authData.otp.length !== 6}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-base font-semibold disabled:opacity-50 rounded-lg transition-all"
                      >
                        {loading ? 'Verifying...' : 'Verify & Complete'}
                      </Button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                      <button
                        onClick={() => handleChooseOTPMethod(otpMethod)}
                        disabled={loading}
                        className="text-slate-900 font-semibold hover:underline text-sm block w-full"
                      >
                        Didn&apos;t receive the code? Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => { setError(''); setAuthStep('otp-method') }}
                        disabled={loading}
                        className="text-slate-500 hover:underline text-xs disabled:opacity-50"
                      >
                        Use a different method
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
