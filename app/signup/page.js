'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, ChevronDown, X, Check, Loader2 } from 'lucide-react'
import { US_STATES } from '@/utils/constants'

export default function SignupPage() {
  const { user, sendOTP, verifyOTP, signInWithGoogle, signInWithFacebook } = useAuth()
  const router = useRouter()
  const [authStep, setAuthStep] = useState('signup') // 'signup', 'otp-method', or 'otp'
  const [otpMethod, setOtpMethod] = useState('email')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    agreedToPrivacy: false,
    statesOfInterest: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showStatesDropdown, setShowStatesDropdown] = useState(false)
  const [statesSearch, setStatesSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0) // seconds until Resend is allowed again
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

  // 30s resend cooldown timer (single interval, decrements every second when cooldown > 0)
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
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

    // Passwords must match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
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

    // Validation passed — let user pick delivery method
    setLoading(false)
    setAuthStep('otp-method')
  }

  const handleChooseOTPMethod = async (method) => {
    setOtpMethod(method)
    setLoading(true)
    setError('')
    try {
      await sendOTP(formData.email, formData.firstName, formData.lastName, method, formData.phone)
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
      const { trackEvent } = await import('@/lib/analytics')
      trackEvent('user_signed_up', { method: 'email' })
      router.push('/marketplace')
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async (e) => {
    e.preventDefault()
    if (resendCooldown > 0) return
    setResendLoading(true)
    setError('')
    try {
      await sendOTP(formData.email, formData.firstName, formData.lastName, otpMethod, formData.phone)
      setResendCooldown(30) // 30s before next resend
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
            <h1 className="text-3xl font-bold text-[#1A1816] mb-2">
              {authStep === 'signup' ? 'Create Your Account' : authStep === 'otp-method' ? 'How would you like your code?' : otpMethod === 'sms' ? 'Verify Your Phone' : 'Verify Your Email'}
            </h1>
            <p className="text-[#737370]">
              {authStep === 'signup'
                ? 'Join DeelMap and start finding great deals'
                : authStep === 'otp-method'
                  ? 'Choose how we send your 6-digit verification code.'
                  : otpMethod === 'sms'
                    ? `We sent a code to ${formData.phone}. Check your messages.`
                    : 'We sent a verification code to your email'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#E8E8E4] rounded p-8 relative z-10">
            {authStep === 'otp-method' ? (
              <div className="space-y-3">
                {error && (
                  <div className="bg-[#FEF0EF] border border-[#F5C4C0] text-[#D03839] px-4 py-3 rounded text-sm mb-2">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleChooseOTPMethod('email')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border border-[#E8E8E4] hover:border-[#D03839] rounded text-left transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#1A1816]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1816] text-sm">Send via Email</p>
                    <p className="text-xs text-[#737370]">{formData.email}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChooseOTPMethod('sms')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border border-[#E8E8E4] hover:border-[#D03839] rounded text-left transition-all disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-[#1A1816]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1816] text-sm">Send via Text (SMS)</p>
                    <p className="text-xs text-[#737370]">{formData.phone}</p>
                  </div>
                </button>
                {loading && <p className="text-center text-sm text-[#737370] mt-2">Sending code...</p>}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setError(''); setAuthStep('signup') }}
                    disabled={loading}
                    className="text-[#737370] hover:text-[#1A1816] text-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : authStep === 'signup' ? (
              <form onSubmit={handleSignUp} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1816] mb-2">
                      First Name
                    </label>
                    <Input
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className="h-12 border-[#E8E8E4] focus:border-[#D03839]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1816] mb-2">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className="h-12 border-[#E8E8E4] focus:border-[#D03839]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-12 border-[#E8E8E4] focus:border-[#D03839]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                    className={`h-12 border-[#E8E8E4] focus:border-[#D03839] ${
                      phoneError ? 'border-[#D03839] focus:border-[#D03839] focus:ring-[#D03839]/20' : ''
                    }`}
                  />
                  {phoneError && (
                    <p className="text-[#D03839] text-xs mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-12 pr-10 border-[#E8E8E4] focus:border-[#D03839]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] hover:text-[#737370] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-12 border-[#E8E8E4] focus:border-[#D03839]"
                  />
                  {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                    <p className="text-[#D03839] text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* States of Interest — single input: search and select */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    States of Interest <span className="text-[#D03839]">*</span>
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
                      className={`min-h-[48px] w-full px-3 py-2 border rounded flex flex-wrap gap-2 items-center text-sm cursor-text ${
                        showStatesDropdown ? 'border-[#D03839]' : 'border-[#E8E8E4]'
                      }`}
                    >
                      {/* Selected state chips */}
                      {formData.statesOfInterest?.length > 0 && formData.statesOfInterest.map(stateCode => {
                        const state = US_STATES.find(s => s.value === stateCode)
                        return (
                          <span
                            key={stateCode}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#FAFAF8] text-[#1A1816] rounded text-xs font-medium"
                          >
                            {state?.label || stateCode}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeState(stateCode)
                              }}
                              className="hover:bg-[#E8E8E4] rounded-full p-0.5"
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
                        className="flex-1 min-w-[120px] py-1.5 text-sm bg-transparent border-0 focus:outline-none placeholder:text-[#A8A8A4]"
                      />
                      <ChevronDown
                        size={18}
                        className="text-[#A8A8A4] transition-transform pointer-events-none shrink-0"
                        style={{ transform: showStatesDropdown ? 'rotate(180deg)' : undefined }}
                      />
                    </div>

                    {/* Dropdown: options only (no extra search input) */}
                    {showStatesDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-[#E8E8E4] rounded shadow-sm overflow-hidden">
                        <div className="overflow-y-auto max-h-52">
                          {filteredStates.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-[#737370] text-center">
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
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-[#FAFAF8] ${
                                    isSelected ? 'bg-[#FAFAF8]' : ''
                                  }`}
                                >
                                  <span className={isSelected ? 'font-medium text-[#1A1816]' : 'text-[#1A1816]'}>
                                    {state.label}
                                  </span>
                                  {isSelected && <Check size={16} className="text-[#1A1816]" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.statesOfInterest?.length > 0 && (
                    <p className="text-xs text-[#737370] mt-1">
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
                    className="mt-0.5 h-4 w-4 text-[#1A1816] focus:ring-slate-900 border-slate-300 rounded"
                  />
                  <label htmlFor="terms" className="text-xs text-[#737370] leading-tight">
                    I agree to DeelMap's{' '}
                    <a href="/terms-of-use" target="_blank" className="text-[#1A1816] font-semibold text-[#D03839] hover:underline">
                      Terms of Use
                    </a>
                    {' '}and{' '}
                    <a href="/privacy-policy" target="_blank" className="text-[#1A1816] font-semibold text-[#D03839] hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-[#FEF0EF] border border-[#F5C4C0] text-[#D03839] px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || validatingPhone}
                  className="w-full bg-[#D03839] hover:bg-[#C02830] text-white h-12 text-sm font-semibold disabled:opacity-50 rounded transition-all"
                >
                  {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending Code...</span> : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Verification Code
                  </label>
                  <Input
                    type="text"
                    autoFocus
                    placeholder="Enter 6-digit code"
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                    required
                    maxLength={6}
                    className="h-12 text-center text-lg tracking-widest font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-[#A8A8A4] border-[#E8E8E4] focus:border-[#D03839]"
                  />
                  <p className="text-sm text-[#737370] mt-1.5">
                    {otpMethod === 'sms'
                      ? <>Code sent to <strong className="text-[#1A1816]">{formData.phone}</strong></>
                      : <>Code sent to <strong className="text-[#1A1816]">{formData.email}</strong></>
                    }
                  </p>
                  <p className="text-sm text-[#737370] mt-2">
                    Didn&apos;t receive it?{' '}
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendLoading || resendCooldown > 0}
                      className="font-medium text-[#D03839] hover:underline disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                    >
                      {resendLoading
                        ? 'Sending…'
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : 'Resend code'}
                    </button>
                  </p>
                </div>

                {error && (
                  <div className="bg-[#FEF0EF] border border-[#F5C4C0] text-[#D03839] px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => { setError(''); setAuthStep('otp-method') }}
                    variant="secondary"
                    className="flex-1 !bg-white border border-[#E8E8E4] !text-[#1A1816] hover:!bg-[#FAFAF8] hover:border-[#D03839] h-12 text-sm font-semibold rounded transition-all"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#D03839] hover:bg-[#C02830] text-white h-12 text-sm font-semibold disabled:opacity-50 rounded transition-all"
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
                      <div className="w-full border-t border-[#E8E8E4]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-white text-[#737370] font-medium text-[#737370]">Or continue with</span>
                    </div>
                  </div>

                  {/* Social Login */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FAFAF8] transition-all disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-sm font-medium text-[#1A1816]">Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFacebookSignIn}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FAFAF8] transition-all disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="text-sm font-medium text-[#1A1816]">Facebook</span>
                    </button>
                  </div>
                </div>

                {/* Sign In Link */}
                <div className="mt-6 text-center">
                  <p className="text-[#737370] text-sm">
                    Already have an account?{' '}
                    <a
                      href="/"
                      className="text-[#1A1816] font-semibold text-[#D03839] hover:underline"
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
