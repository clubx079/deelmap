'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Lock, ArrowLeft, CheckCircle, X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const { user, forgotPassword } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('request') // 'request', 'method-picker', 'verify', 'reset'
  const [resetMethod, setResetMethod] = useState('email')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 30s resend cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // If user is logged in, use their email automatically
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email)
    }
  }, [user?.email, email])

  const handleRequestReset = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setStep('method-picker')
  }

  const handleChooseResetMethod = async (method) => {
    setResetMethod(method)
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await forgotPassword(email, method)
      setShowSuccessModal(true)
      setStep('verify')
      setResendCooldown(30)
    } catch (err) {
      setError(err.message || 'Failed to send reset code')
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
      await forgotPassword(email, resetMethod)
      setResendCooldown(30)
    } catch (err) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setResendLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          otp 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code')
      }

      setStep('reset')
      setMessage('')
    } catch (err) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          otp,
          newPassword,
          confirmPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setMessage('Password reset successfully! Redirecting...')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FAFAF8] pt-20">
        <div className="max-w-md mx-auto px-6 sm:px-8 py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#737370] hover:text-[#1A1816] mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="bg-white border border-[#E8E8E4] rounded p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#FAFAF8] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#D03839]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1A1816] mb-2">Reset Password</h1>
              <p className="text-sm text-[#737370]">
                {step === 'request' && "We'll send a verification code to reset your password"}
                {step === 'method-picker' && 'Choose how we send your reset code'}
                {step === 'verify' && (resetMethod === 'sms' ? 'Enter the code sent to your phone' : 'Enter the verification code sent to your email')}
                {step === 'reset' && 'Enter your new password'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[#D03839] text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-[#E4F5EC] border border-[#A8DFBA] rounded text-[#0F6E56] text-sm">
                {message}
              </div>
            )}

            {step === 'request' && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!user?.email}
                    className="w-full px-4 py-2 border border-[#E8E8E4] rounded focus:outline-none focus:border-[#D03839] disabled:bg-[#FAFAF8] disabled:cursor-not-allowed"
                    required
                  />
                  {user?.email && (
                    <p className="text-xs text-[#737370] mt-1">
                      We'll send the code to your account email
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D03839] text-white py-2.5 rounded font-medium hover:bg-[#C02830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {step === 'method-picker' && (
              <div className="space-y-3">
                {error && (
                  <div className="mb-3 p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[#D03839] text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleChooseResetMethod('email')}
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
                    <p className="text-xs text-[#737370]">{email}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChooseResetMethod('sms')}
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
                    <p className="text-xs text-[#737370]">Phone number on file</p>
                  </div>
                </button>
                {loading && <p className="text-center text-sm text-[#737370] mt-2">Sending code...</p>}
                <button
                  type="button"
                  onClick={() => { setError(''); setStep('request') }}
                  disabled={loading}
                  className="w-full text-[#737370] hover:text-[#1A1816] text-sm disabled:opacity-50 mt-2"
                >
                  Back
                </button>
              </div>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-2.5 border border-[#E8E8E4] rounded focus:outline-none focus:border-[#D03839] text-center text-lg tracking-widest font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-[#A8A8A4]"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#D03839] text-white py-2.5 rounded font-medium hover:bg-[#C02830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || resendCooldown > 0}
                  className="w-full text-[#737370] hover:text-[#1A1816] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-[#E8E8E4] rounded focus:outline-none focus:border-[#D03839]"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#737370] hover:text-[#1A1816] focus:outline-none rounded"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1816] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-[#E8E8E4] rounded focus:outline-none focus:border-[#D03839]"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#737370] hover:text-[#1A1816] focus:outline-none rounded"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword}
                  className="w-full bg-[#D03839] text-white py-2.5 rounded font-medium hover:bg-[#C02830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
