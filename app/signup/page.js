'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, ChevronDown, X, Check } from 'lucide-react'
import { US_STATES } from '@/utils/constants'

export default function SignupPage() {
  const { user, sendOTP, verifyOTP, signInWithGoogle, signInWithFacebook } = useAuth()
  const router = useRouter()
  const [authStep, setAuthStep] = useState('signup') // 'signup' or 'otp'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    otp: '',
    agreedToPrivacy: false,
    statesOfInterest: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showStatesDropdown, setShowStatesDropdown] = useState(false)
  const [statesSearch, setStatesSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [validatingPhone, setValidatingPhone] = useState(false)
  const statesDropdownRef = useRef(null)
  const statesInputRef = useRef(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/marketplace')
    }
  }, [user, router])

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
    setFormData({ ...formData, phone: formatted })
    if (phoneError) setPhoneError('')

    const validation = validatePhoneFormat(formatted)
    if (getPhoneDigits(formatted).length === 10 && !validation.valid) {
      setPhoneError(validation.message)
    }
  }

  // Toggle state selection
  const toggleState = (stateValue) => {
    setFormData(prev => {
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
    setFormData(prev => ({
      ...prev,
      statesOfInterest: (prev.statesOfInterest || []).filter(s => s !== stateValue)
    }))
  }

  // Filter states based on search
  const filteredStates = US_STATES.filter(state =>
    state.label.toLowerCase().includes(statesSearch.toLowerCase()) ||
    state.value.toLowerCase().includes(statesSearch.toLowerCase())
  )

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPhoneError('')

    // Validate states of interest
    if (!formData.statesOfInterest || formData.statesOfInterest.length === 0) {
      setError('Please select at least one state you are interested in')
      setLoading(false)
      return
    }

    // Validate phone format
    const formatValidation = validatePhoneFormat(formData.phone)
    if (!formatValidation.valid) {
      setPhoneError(formatValidation.message || 'Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    // Verify with API
    const apiValidation = await verifyPhoneWithAPI(formData.phone)
    if (!apiValidation.valid) {
      setPhoneError(apiValidation.message)
      setLoading(false)
      return
    }

    try {
      await sendOTP(formData.email, `${formData.firstName} ${formData.lastName}`)
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
      await verifyOTP(formData.email, formData.otp, {
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        statesOfInterest: formData.statesOfInterest
      })
      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async (e) => {
    e.preventDefault()
    setResendLoading(true)
    setError('')
    try {
      await sendOTP(formData.email, `${formData.firstName} ${formData.lastName}`)
    } catch (err) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithFacebook()
      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Failed to sign in with Facebook')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {authStep === 'signup' ? 'Create Your Account' : 'Verify Your Email'}
            </h1>
            <p className="text-slate-600">
              {authStep === 'signup' 
                ? 'Join Deelmap and start finding great deals' 
                : 'We sent a verification code to your email'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-8 shadow-lg relative z-10">
            {authStep === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      First Name
                    </label>
                    <Input
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    className={`h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20 ${
                      phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                    }`}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                {/* States of Interest — single input: search and select */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    States of Interest <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={statesDropdownRef}>
                    <div
                      role="combobox"
                      aria-expanded={showStatesDropdown}
                      aria-haspopup="listbox"
                      onClick={() => {
                        setShowStatesDropdown(true)
                        statesInputRef.current?.focus()
                      }}
                      className={`min-h-[48px] w-full px-3 py-2 border-2 rounded-lg flex flex-wrap gap-2 items-center text-sm cursor-text ${
                        showStatesDropdown ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-300'
                      }`}
                    >
                      {/* Selected state chips */}
                      {formData.statesOfInterest?.length > 0 && formData.statesOfInterest.map(stateCode => {
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
                      })}
                      {/* Single input: search filters list; selecting an option adds it */}
                      <input
                        ref={statesInputRef}
                        type="text"
                        placeholder={formData.statesOfInterest?.length === 0 ? 'Select states...' : 'Add more...'}
                        value={statesSearch}
                        onChange={(e) => setStatesSearch(e.target.value)}
                        onFocus={() => setShowStatesDropdown(true)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-[120px] py-1.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                      />
                      <ChevronDown
                        size={18}
                        className="text-slate-400 transition-transform pointer-events-none flex-shrink-0"
                        style={{ transform: showStatesDropdown ? 'rotate(180deg)' : undefined }}
                      />
                    </div>

                    {/* Dropdown: options only (no extra search input) */}
                    {showStatesDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-y-auto max-h-52">
                          {filteredStates.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500 text-center">
                              No states match &quot;{statesSearch}&quot;
                            </div>
                          ) : (
                            filteredStates.map(state => {
                              const isSelected = formData.statesOfInterest?.includes(state.value)
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
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.statesOfInterest?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {formData.statesOfInterest.length} state{formData.statesOfInterest.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.agreedToPrivacy}
                    onChange={(e) => setFormData({ ...formData, agreedToPrivacy: e.target.checked })}
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

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || validatingPhone}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-sm font-semibold disabled:opacity-50 rounded-lg transition-all"
                >
                  {loading ? 'Sending Code...' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                    required
                    maxLength={6}
                    className="h-12 text-center text-lg tracking-widest border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                  />
                  <p className="text-sm text-slate-500 mt-1.5">
                    Code sent to <strong className="text-slate-700">{formData.email}</strong>
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Didn&apos;t receive it?{' '}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendLoading}
                      className="font-medium text-slate-900 hover:underline disabled:opacity-50 focus:outline-none"
                    >
                      {resendLoading ? 'Sending…' : 'Resend code'}
                    </button>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setAuthStep('signup')}
                    variant="secondary"
                    className="flex-1 !bg-white border-2 border-slate-300 !text-slate-900 hover:!bg-slate-100 hover:border-slate-900 h-12 text-sm font-semibold rounded-lg transition-all"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-12 text-sm font-semibold disabled:opacity-50 rounded-lg transition-all hover:shadow-lg"
                  >
                    {loading ? 'Verifying...' : 'Verify & Create Account'}
                  </Button>
                </div>
              </form>
            )}

            {/* Divider - Only show on signup step */}
            {authStep === 'signup' && (
              <>
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-white text-slate-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  {/* Social Login */}
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

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                  <p className="text-slate-600 text-sm">
                    Already have an account?{' '}
                    <a
                      href="/login"
                      className="text-slate-900 font-semibold hover:underline"
                    >
                      Sign in
                    </a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
