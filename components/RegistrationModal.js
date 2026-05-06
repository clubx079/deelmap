'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, X, ArrowLeft } from 'lucide-react'

export function RegistrationModal({ isOpen, onClose, initialStep = 'login', defaultRole = 'buyer', preventClose = false, backUrl = null }) {
  const { signIn, sendOTP, verifyOTP, signInWithGoogle, signInWithFacebook } = useAuth()
  const [authStep, setAuthStep] = useState(initialStep)
  const [authData, setAuthData] = useState({
    contact: '',
    role: defaultRole,
    fullName: '',
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    otp: '',
    agreedToPrivacy: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyMethod, setVerifyMethod] = useState('email')
  const [appealMessage, setAppealMessage] = useState('')
  const [appealSubmitted, setAppealSubmitted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAuthStep(initialStep)
      setAuthData(prev => ({ ...prev, role: defaultRole }))
      setError('')
      setMounted(true)
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen, initialStep, defaultRole])

  const handleClose = () => {
    onClose()
    setAuthData({ contact: '', role: defaultRole, fullName: '', email: '', phone: '', password: '', firstName: '', lastName: '', otp: '', agreedToPrivacy: false })
    setError('')
    setLoading(false)
    setShowPassword(false)
  }

  // Login: detect email vs phone and route accordingly
  const handleLoginContinue = async (e) => {
    e.preventDefault()
    setError('')
    const contact = authData.contact.trim()
    if (!contact) { setError('Please enter your phone or email'); return }
    if (!contact.includes('@')) {
      setError('Phone login coming soon. Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contact, role: authData.role }),
      })
      const data = await res.json()
      if (!data.exists) {
        setError('No account found with this email. Please create an account.')
        setLoading(false)
        return
      }
      setAuthData(prev => ({ ...prev, email: contact }))
      setAuthStep('login-password')
    } catch {
      setError('Unable to verify email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Login: sign in with email + password
  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (authData.role === 'seller') {
        const { data: application, error: appError } = await supabase
          .from('seller_applications')
          .select('id, email, business_name, contact_person_name, phone, business_type, status')
          .eq('email', authData.email)
          .eq('password', authData.password)
          .single()

        if (appError || !application) {
          setError('Invalid email or password')
          setLoading(false)
          return
        }

        const statusMessages = {
          pending: 'Your application is pending review. Please wait for approval.',
          under_review: 'Your application is under review. We will notify you once approved.',
          on_hold: 'Your application is on hold. Please contact support.',
          requires_info: 'Your application requires additional information. Please check your email.',
          rejected: 'Your application has been rejected. Please contact support.',
        }
        if (application.status !== 'approved') {
          setError(statusMessages[application.status] || 'Your account is not active. Please contact support.')
          setLoading(false)
          return
        }

        const sellerData = btoa(JSON.stringify({
          id: application.id,
          email: application.email,
          businessName: application.business_name,
          contactPersonName: application.contact_person_name,
          phone: application.phone,
          businessType: application.business_type,
        }))
        window.location.href = `${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL}/auth/sso?d=${encodeURIComponent(sellerData)}`
        return
      }

      await signIn(authData.email, authData.password)
      handleClose()
    } catch (err) {
      if (err.suspended === true || (err.message || '').toLowerCase().includes('suspended')) {
        setAuthStep('suspended')
      } else {
        setError(err.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAppeal = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authData.email, message: appealMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit appeal')
      setAppealSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Signup: create account
  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!authData.agreedToPrivacy) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      setLoading(false)
      return
    }

    const rawPhone = authData.phone.replace(/\D/g, '')
    if (!rawPhone || rawPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }

    const nameParts = (authData.fullName || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    setAuthData(prev => ({ ...prev, firstName, lastName }))
    setLoading(false)
    setAuthStep('verify-method')
  }

  const handleChooseMethod = async (method) => {
    setVerifyMethod(method)
    setLoading(true)
    setError('')
    try {
      const rawPhone = authData.phone.replace(/\D/g, '')
      const e164Phone = rawPhone.length === 10 ? `+1${rawPhone}` : `+${rawPhone}`
      await sendOTP(authData.email, authData.firstName, authData.lastName, method, e164Phone)
      setAuthStep('otp')
    } catch (err) {
      setError(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  // OTP: verify
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
        statesOfInterest: [],
      })
      handleClose()
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    try {
      setLoading(true)
      await signInWithFacebook()
      handleClose()
    } catch (err) {
      setError(err.message || 'Failed to sign in with Facebook')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={preventClose ? undefined : handleClose}
      />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div
        className={`relative bg-white rounded-t sm:rounded shadow-2xl w-full sm:max-w-[512px] border border-[#E8E8E4] overflow-y-auto max-h-[92dvh] sm:max-h-none transition-all duration-300 ease-out ${visible ? 'translate-y-0 sm:opacity-100 sm:scale-100' : 'translate-y-full sm:opacity-0 sm:scale-95'}`}
      >
        {!preventClose && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 text-[#737370] hover:text-[#1A1816] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="px-4 py-6 sm:px-6 sm:py-9">

          {/* ── Login: Welcome to DeelMap ── */}
          {authStep === 'login' && (
            <div>
              {preventClose && backUrl && (
                <a
                  href={backUrl}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to listings
                </a>
              )}
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1px] mb-2">Log In</p>
              <h2 className="text-[24px] font-semibold text-[#1A1816] mb-1">Welcome to DeelMap</h2>
              <p className="text-[13px] text-[#737370] mb-5">Always free for buyers — we never share your information</p>

              <form onSubmit={handleLoginContinue} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Phone / Email <span className="text-[#D03839]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter phone or email"
                    value={authData.contact}
                    onChange={(e) => setAuthData(prev => ({ ...prev, contact: e.target.value }))}
                    required
                    className="w-full h-12 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                  />
                  <p className="text-[13px] mt-2 text-[#737370]">
                    New to DeelMap?{' '}
                    <span onClick={() => { setError(''); setAuthStep('signup') }} className="cursor-pointer font-semibold underline" style={{ color: '#D03839' }}>
                      Create an account
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-[14px] font-medium text-[#1A1816] mb-3">Select role</p>
                  <div className="flex items-center gap-8">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="buyer"
                        checked={authData.role === 'buyer'}
                        onChange={() => setAuthData(prev => ({ ...prev, role: 'buyer' }))}
                        className="w-5 h-5 accent-[#D03839]"
                      />
                      <span className="text-[15px] text-[#1A1816]">Buyer</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="seller"
                        checked={authData.role === 'seller'}
                        onChange={() => setAuthData(prev => ({ ...prev, role: 'seller' }))}
                        className="w-5 h-5 accent-[#D03839]"
                      />
                      <span className="text-[15px] text-[#1A1816]">Seller</span>
                    </label>
                  </div>
                </div>

                {error && <p className="text-[13px] text-[#D03839]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                </button>
              </form>

              {authData.role === 'buyer' && (
                <>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-[#E8E8E4]" />
                    <span className="text-[13px]" style={{ color: '#1A1816' }}>or</span>
                    <div className="flex-1 h-px bg-[#E8E8E4]" />
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center gap-3 border border-[#1A1816] rounded text-[14px] font-medium text-[#1A1816] hover:bg-[#FAFAF8] transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Log in with Google
                    </button>

                    <button
                      onClick={handleFacebookSignIn}
                      disabled={loading}
                      className="w-full h-12 flex items-center justify-center gap-3 border border-[#1A1816] rounded text-[14px] font-medium text-[#1A1816] hover:bg-[#FAFAF8] transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Log in with Facebook
                    </button>
                  </div>
                </>
              )}

              <p className="text-[11px] text-[#737370] text-center mt-5 leading-relaxed">
                By creating an account, you agree to DeelMap&apos;s&nbsp;<a href="/terms-of-use" target="_blank" className="text-[#D03839] hover:underline">Terms of Service</a> and <a href="/privacy-policy" target="_blank" className="text-[#D03839] hover:underline">Privacy Policy</a>.
              </p>
            </div>
          )}

          {/* ── Login: Password step ── */}
          {authStep === 'login-password' && (
            <div>
              <button
                onClick={() => { setError(''); setAuthStep('login') }}
                className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] mb-5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h2 className="text-[24px] font-bold text-[#1A1816] mb-1.5">Welcome back</h2>
              <p className="text-[13px] text-[#737370] mb-6">{authData.email}</p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Password <span className="text-[#D03839]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={authData.password}
                      onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="w-full h-12 px-3 pr-10 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] hover:text-[#737370] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-[13px] text-[#D03839]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Log in'}
                </button>

                <div className="text-center">
                  <a
                    href="/forgot-password"
                    className="text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
              </form>

            </div>
          )}

          {/* ── Signup: Create an account ── */}
          {authStep === 'signup' && (
            <div>
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1px] mb-2">Create Account</p>
              <h2 className="text-[24px] font-bold text-[#1A1816] mb-1">Join DeelMap</h2>
              <p className="text-[13px] text-[#737370] mb-5">Always free for buyers — we never share your information</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Full name <span className="text-[#D03839]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={authData.fullName}
                    onChange={(e) => setAuthData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                    className="w-full h-12 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Email Address <span className="text-[#D03839]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={authData.email}
                    onChange={(e) => setAuthData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full h-12 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Phone Number <span className="text-[#D03839]">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={authData.phone}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '')
                      let formatted = d
                      if (d.length <= 3) formatted = d
                      else if (d.length <= 6) formatted = `(${d.slice(0,3)}) ${d.slice(3)}`
                      else formatted = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`
                      setAuthData(prev => ({ ...prev, phone: formatted }))
                    }}
                    required
                    maxLength={14}
                    className="w-full h-12 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Password <span className="text-[#D03839]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Set a new password"
                      value={authData.password}
                      onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="w-full h-12 px-3 pr-10 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] hover:text-[#737370] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authData.agreedToPrivacy}
                    onChange={(e) => setAuthData(prev => ({ ...prev, agreedToPrivacy: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#D03839] flex-shrink-0"
                  />
                  <span className="text-[12px] text-[#444441] leading-relaxed">
                    I agree to the{' '}
                    <a href="/terms-of-use" target="_blank" className="text-[#D03839] hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy-policy" target="_blank" className="text-[#D03839] hover:underline">Privacy Policy</a>.
                  </span>
                </label>

                {error && <p className="text-[13px] text-[#D03839]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !authData.agreedToPrivacy}
                  className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Continue'}
                </button>
              </form>

              <p className="text-[13px] text-center mt-5 text-[#737370]">
                Already a member?{' '}
                <span onClick={() => { setError(''); setAuthStep('login') }} className="cursor-pointer font-semibold underline" style={{ color: '#D03839' }}>
                  Log in
                </span>
              </p>
            </div>
          )}

          {/* ── Verify Method Choice ── */}
          {authStep === 'verify-method' && (
            <div>
              <button
                onClick={() => { setError(''); setAuthStep('signup') }}
                className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] mb-5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1px] mb-2">Verification</p>
              <h2 className="text-[24px] font-bold text-[#1A1816] mb-1">Verify your account</h2>
              <p className="text-[13px] text-[#737370] mb-6">Choose how you&apos;d like to receive your verification code</p>

              {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}

              <div className="space-y-3">
                <button
                  onClick={() => handleChooseMethod('email')}
                  disabled={loading}
                  className="w-full h-16 flex items-center gap-4 px-4 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FFF8F8] transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#D03839]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1816]">Verify via Email</p>
                    <p className="text-[12px] text-[#737370]">{authData.email}</p>
                  </div>
                </button>

                <button
                  onClick={() => handleChooseMethod('sms')}
                  disabled={loading}
                  className="w-full h-16 flex items-center gap-4 px-4 border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FFF8F8] transition-colors disabled:opacity-50 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#D03839]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1816]">Verify via Phone</p>
                    <p className="text-[12px] text-[#737370]">{authData.phone}</p>
                  </div>
                </button>
              </div>

              {loading && <p className="text-[13px] text-[#737370] text-center mt-4">Sending code...</p>}
            </div>
          )}

          {/* ── OTP Verification ── */}
          {authStep === 'otp' && (
            <div>
              <h2 className="text-[24px] font-bold text-[#1A1816] mb-2">
                {verifyMethod === 'sms' ? 'Verify your phone' : 'Verify your email'}
              </h2>
              <p className="text-[13px] text-[#737370] mb-6">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-[#1A1816]">
                  {verifyMethod === 'sms' ? authData.phone : authData.email}
                </span>
              </p>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                    Verification code <span className="text-[#D03839]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={authData.otp}
                    onChange={(e) => setAuthData(prev => ({ ...prev, otp: e.target.value }))}
                    required
                    maxLength={6}
                    className="w-full h-12 px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] tracking-widest text-center transition-colors"
                  />
                </div>

                {error && <p className="text-[13px] text-[#D03839]">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>

              <p className="text-[13px] text-center mt-5 text-[#737370]">
                <button onClick={() => { setError(''); setAuthStep('verify-method') }} className="font-semibold hover:underline" style={{ color: '#D03839' }}>
                  Back
                </button>
              </p>
            </div>
          )}

          {/* ── Suspended: Appeal step ── */}
          {authStep === 'suspended' && (
            <div>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#FEF0EF] flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-[#D03839]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1px] mb-1">Account Suspended</p>
                <h2 className="text-[22px] font-bold text-[#1A1816] mb-2">Your account has been suspended</h2>
                <p className="text-[13px] text-[#737370]">
                  Submit an appeal and our team will review your case and respond via email.
                </p>
              </div>

              {!appealSubmitted ? (
                <form onSubmit={handleSubmitAppeal} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1816] mb-1.5">
                      Reason for appeal <span className="text-[#737370] font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={appealMessage}
                      onChange={(e) => setAppealMessage(e.target.value)}
                      placeholder="Explain why you believe this suspension is incorrect..."
                      rows={4}
                      className="w-full px-3 py-2.5 text-[13px] border border-[#E8E8E4] rounded focus:outline-none focus:border-[#D03839] resize-none text-[#1A1816] placeholder-[#A8A8A4]"
                    />
                  </div>
                  {error && <p className="text-[13px] text-[#D03839]">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold text-[15px] rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthStep('login'); setError('') }}
                    className="w-full text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors"
                  >
                    Back to Log In
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#E4F5EC] flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-[#0F6E56]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[#1A1816] mb-1">Appeal Submitted</p>
                    <p className="text-[13px] text-[#737370]">Our team will review your request and get back to you via email.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-[13px] font-semibold text-[#D03839] hover:underline"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
