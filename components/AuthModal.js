'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Eye, EyeOff, ChevronDown, X, Check } from 'lucide-react'
import { US_STATES } from '@/utils/constants'

export function AuthModal({ isOpen, onClose, initialStep = 'login' }) {
  const { signIn, sendOTP, verifyOTP, forgotPassword } = useAuth()
  const [authStep, setAuthStep] = useState(initialStep)
  const [authData, setAuthData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    agreedToPrivacy: false,
    statesOfInterest: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [validatingPhone, setValidatingPhone] = useState(false)

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
      newPassword: '',
      confirmPassword: '',
      agreedToPrivacy: false,
      statesOfInterest: []
    })
    setAuthStep(initialStep)
    setError('')
    setPhoneError('')
    setLoading(false)
    setValidatingPhone(false)
    setShowPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
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

  // Format phone number as user types (XXX) XXX-XXXX
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

  // Validate phone format (10 digits for US)
  const validatePhoneFormat = (phone) => {
    const digits = getPhoneDigits(phone)
    if (digits.length === 0) return { valid: false, message: '' }
    if (digits.length < 10) return { valid: false, message: 'Phone number must be 10 digits' }
    if (digits.length > 10) return { valid: false, message: 'Phone number must be 10 digits' }
    return { valid: true, message: '' }
  }

  // Verify phone with Telnyx API
  const verifyPhoneWithTelnyx = async (phone) => {
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

    // Clear phone error when user starts typing
    if (phoneError) setPhoneError('')

    // Validate format as user types
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

  // Handle forgot password request
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await forgotPassword(authData.email)
      setAuthStep('reset-otp')
    } catch (error) {
      setError(error.message || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP verification for password reset (separate from password setting)
  const handleVerifyResetOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authData.email,
          otp: authData.otp
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code')
      }

      // OTP verified successfully, proceed to password reset step
      setAuthStep('reset-password')
      setError('')
    } catch (error) {
      setError(error.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  // Handle password reset with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authData.email,
          otp: authData.otp,
          newPassword: authData.newPassword,
          confirmPassword: authData.confirmPassword
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      // Success - redirect to login
      setAuthStep('login')
      setError('')
      // Show success message by temporarily setting a success message
      setTimeout(() => {
        setError('Password reset successfully! Please sign in with your new password.')
      }, 100)
      
      // Clear form
      setAuthData({
        ...authData,
        otp: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (error) {
      setError(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPhoneError('')

    // Validate states of interest (required)
    if (!authData.statesOfInterest || authData.statesOfInterest.length === 0) {
      setError('Please select at least one state you are interested in')
      setLoading(false)
      return
    }

    // First validate phone format
    const formatValidation = validatePhoneFormat(authData.phone)
    if (!formatValidation.valid) {
      setPhoneError(formatValidation.message || 'Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    // Then verify with Telnyx API
    const telnyxValidation = await verifyPhoneWithTelnyx(authData.phone)
    if (!telnyxValidation.valid) {
      setPhoneError(telnyxValidation.message)
      setLoading(false)
      return
    }

    try {
      await sendOTP(authData.email, `${authData.firstName} ${authData.lastName}`)
      setAuthStep('otp')
    } catch (error) {
      setError(error.message || 'Failed to send verification code')
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 sm:p-8">
        {authStep === 'login' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">Welcome Back</h2>
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                type="email"
                placeholder="Email Address"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                required
                className="h-11 sm:h-12"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  required
                  className="h-11 sm:h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && (
                <p className={`text-sm ${error.includes('successfully') ? 'text-green-600' : 'text-red-500'}`}>
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => setAuthStep('forgot-password')}
                className="text-[#b29578] hover:underline text-sm font-medium"
              >
                Forgot your password?
              </button>
              <div>
                <button
                  onClick={() => setAuthStep('signup')}
                  className="text-[#b29578] hover:underline text-base sm:text-lg font-bold"
                >
                  <strong>Don&apos;t have an account? Join for Free</strong>
                </button>
              </div>
            </div>
          </>
        )}

        {authStep === 'forgot-password' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Reset Your Password</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Enter your email address and we'll send you a verification code to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="Email Address"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                required
                className="h-11 sm:h-12"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthStep('login')}
                className="text-[#b29578] hover:underline font-medium text-sm sm:text-base"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {authStep === 'reset-otp' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Enter Reset Code</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Please check your email for the password reset code sent to <strong>{authData.email}</strong>
            </p>
            <form onSubmit={handleVerifyResetOTP} className="space-y-4">
              <div className="flex justify-center">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={authData.otp}
                  onChange={(e) => setAuthData({ ...authData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  required
                  className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono tracking-widest w-48 sm:w-64"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || authData.otp.length !== 6}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Verifying Code...' : 'Verify Code'}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => handleForgotPassword({ preventDefault: () => {} })}
                className="text-[#b29578] hover:underline text-xs sm:text-sm"
                disabled={loading}
              >
                Didn&apos;t receive the code? Resend
              </button>
              <div>
                <button
                  onClick={() => setAuthStep('login')}
                  className="text-gray-600 hover:underline text-xs sm:text-sm"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </>
        )}

        {authStep === 'reset-password' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Set New Password</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Create a new password for your account
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={authData.newPassword}
                  onChange={(e) => setAuthData({ ...authData, newPassword: e.target.value })}
                  required
                  className="h-11 sm:h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={authData.confirmPassword}
                  onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                  required
                  className="h-11 sm:h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !authData.newPassword || !authData.confirmPassword}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthStep('reset-otp')}
                className="text-gray-600 hover:underline text-xs sm:text-sm"
              >
                Back to Enter Code
              </button>
            </div>
          </>
        )}

        {authStep === 'signup' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900">Join Ableman</h2>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={authData.firstName}
                  onChange={(e) => setAuthData({ ...authData, firstName: e.target.value })}
                  required
                  className="h-11 sm:h-12"
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={authData.lastName}
                  onChange={(e) => setAuthData({ ...authData, lastName: e.target.value })}
                  required
                  className="h-11 sm:h-12"
                />
              </div>
              <Input
                type="email"
                placeholder="Email Address"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                required
                className="h-11 sm:h-12"
              />
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-xs sm:text-sm font-medium">🇺🇸 +1</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={authData.phone}
                    onChange={handlePhoneChange}
                    required
                    className={`pl-16 sm:pl-20 h-11 sm:h-12 ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  required
                  className="h-11 sm:h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* States of Interest Multi-Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tell us about your buy box <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 -mt-1">
                  Select the states you're interested in (only get updates about properties you want)
                </p>
                <div className="relative" ref={statesDropdownRef}>
                  {/* Selected states display */}
                  <div
                    onClick={() => setShowStatesDropdown(!showStatesDropdown)}
                    className={`min-h-[44px] sm:min-h-[48px] w-full px-3 py-2 border rounded-lg cursor-pointer flex flex-wrap gap-1.5 items-center ${
                      showStatesDropdown ? 'border-[#b29578] ring-2 ring-[#b29578]/20' : 'border-gray-300'
                    } ${authData.statesOfInterest?.length === 0 ? 'text-gray-400' : ''}`}
                  >
                    {authData.statesOfInterest?.length === 0 ? (
                      <span className="text-sm">Select states...</span>
                    ) : (
                      authData.statesOfInterest.map(stateCode => {
                        const state = US_STATES.find(s => s.value === stateCode)
                        return (
                          <span
                            key={stateCode}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#b29578]/10 text-[#b29578] rounded-md text-xs font-medium"
                          >
                            {state?.label || stateCode}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeState(stateCode)
                              }}
                              className="hover:bg-[#b29578]/20 rounded-full p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        )
                      })
                    )}
                    <ChevronDown
                      size={18}
                      className={`ml-auto text-gray-400 transition-transform flex-shrink-0 ${showStatesDropdown ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {/* Dropdown */}
                  {showStatesDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                      {/* Search input */}
                      <div className="p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search states..."
                          value={statesSearch}
                          onChange={(e) => setStatesSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#b29578]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {/* States list */}
                      <div className="overflow-y-auto max-h-44">
                        {filteredStates.map(state => {
                          const isSelected = authData.statesOfInterest?.includes(state.value)
                          return (
                            <button
                              key={state.value}
                              type="button"
                              onClick={() => toggleState(state.value)}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                                isSelected ? 'bg-[#b29578]/5' : ''
                              }`}
                            >
                              <span className={isSelected ? 'font-medium text-[#b29578]' : 'text-gray-700'}>
                                {state.label} ({state.value})
                              </span>
                              {isSelected && <Check size={16} className="text-[#b29578]" />}
                            </button>
                          )
                        })}
                        {filteredStates.length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-500 text-center">No states found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {authData.statesOfInterest?.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {authData.statesOfInterest.length} state{authData.statesOfInterest.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="terms-privacy"
                  checked={authData.agreedToPrivacy || false}
                  onChange={(e) => setAuthData({ ...authData, agreedToPrivacy: e.target.checked })}
                  required
                  className="mt-1 h-4 w-4 text-[#b29578] focus:ring-[#b29578] border-gray-300 rounded flex-shrink-0"
                />
                <label htmlFor="terms-privacy" className="text-xs sm:text-sm text-gray-600 leading-5">
                  I agree to Ableman's{' '}
                  <a
                    href="/terms-of-use"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#b29578] hover:underline"
                  >
                    Terms of Use
                  </a>
                  {' '}and{' '}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#b29578] hover:underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>

              <div className="pt-2 pb-2">
                <p className="text-xs sm:text-sm text-gray-600 leading-5">
                  By sharing your phone number, you're giving Ableman permission to reach out with helpful updates (via call or text). No spam, no blasting, no nonsense — ever. Just real people sending real information. And don't worry: saying yes here never obligates you to use any of our services.
                </p>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={loading || validatingPhone || !authData.agreedToPrivacy}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {validatingPhone ? 'Verifying Phone...' : loading ? 'Sending Code...' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthStep('login')}
                className="text-[#b29578] hover:underline font-medium text-sm sm:text-base"
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        )}

        {authStep === 'otp' && (
          <>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Verify Your Email</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Please check your email inbox or spam folder for the verification code sent to <strong>{authData.email}</strong>
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="flex justify-center">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={authData.otp}
                  onChange={(e) => setAuthData({ ...authData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  required
                  className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono tracking-widest w-48 sm:w-64"
                  maxLength={6}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || authData.otp.length !== 6}
                className="w-full bg-[#b29578] hover:bg-[#9a7e61] h-11 sm:h-12 text-base sm:text-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => handleSignUp({ preventDefault: () => {} })}
                className="text-[#b29578] hover:underline text-xs sm:text-sm"
                disabled={loading}
              >
                Didn&apos;t receive the code? Resend
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}