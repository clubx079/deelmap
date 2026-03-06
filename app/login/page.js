'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/layout/Navbar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, ShieldAlert, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm() {
  const { user, signIn, signInWithGoogle, signInWithFacebook, submitReviewRequest } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suspendedEmail, setSuspendedEmail] = useState('')

  // Review request inline form state
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect')
      router.push(redirect || '/marketplace')
    }
  }, [user, router, searchParams])

  // Check if we were auto-logged out due to suspension
  useEffect(() => {
    const wasSuspended = localStorage.getItem('suspended_logout')
    if (wasSuspended) {
      localStorage.removeItem('suspended_logout')
      const storedEmail = localStorage.getItem('suspended_email') || ''
      localStorage.removeItem('suspended_email')
      setSuspendedEmail(storedEmail)
      setError('__suspended__')
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error && error !== '__suspended__') setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(formData.email, formData.password)
      const redirect = searchParams.get('redirect')
      router.push(redirect || '/marketplace')
    } catch (err) {
      if (err.suspended) {
        setSuspendedEmail(formData.email)
        setError('__suspended__')
      } else {
        setError(err.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReview = async (e) => {
    e.preventDefault()
    setReviewLoading(true)
    setReviewError('')
    try {
      await submitReviewRequest(reviewMessage, suspendedEmail)
      setReviewSuccess(true)
    } catch (err) {
      setReviewError(err.message || 'Failed to submit request')
    } finally {
      setReviewLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
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
    } catch (err) {
      setError(err.message || 'Failed to sign in with Facebook')
    } finally {
      setLoading(false)
    }
  }

  if (user) return null

  const isSuspended = error === '__suspended__'

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10 pb-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p className="text-slate-600">Sign in to your account to continue</p>
          </div>

          {/* ── Suspended Banner + Inline Review Form ── */}
          {isSuspended && (
            <div className="mb-4 rounded-xl border border-amber-200 overflow-hidden">
              {/* Banner header */}
              <div className="bg-amber-50 px-4 py-3.5 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Account Suspended</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your account has been suspended. Submit a review request to appeal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowReviewForm(v => !v); setReviewSuccess(false); setReviewError(''); }}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Request Review
                  {showReviewForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Inline review form */}
              {showReviewForm && (
                <div className="bg-white border-t border-amber-200 px-4 py-4">
                  {reviewSuccess ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Request Submitted</p>
                        <p className="text-xs text-slate-500 mt-0.5">Our team will review it and contact you via email.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestReview} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Explain your situation</label>
                        <textarea
                          value={reviewMessage}
                          onChange={(e) => setReviewMessage(e.target.value)}
                          rows={3}
                          placeholder="Why should your account be unsuspended?"
                          required
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none"
                        />
                      </div>
                      {reviewError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {reviewError}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={reviewLoading || !reviewMessage.trim()}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {reviewLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Card */}
          {!(isSuspended && showReviewForm) && <div className="bg-white border-2 border-slate-200 rounded-xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 border-slate-300 focus:border-slate-900 focus:ring-slate-900/20"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
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

              {/* Error Message */}
              {error && !isSuspended && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-sm font-semibold disabled:opacity-50 rounded-lg transition-all"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
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

            {/* Sign Up Link */}
            <div className="mt-6 text-center space-y-3">
              <p className="text-slate-600 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-slate-900 font-semibold hover:underline">
                  Sign up for free
                </Link>
              </p>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors inline-block"
              >
                Forgot Password?
              </Link>
            </div>
          </div>}
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
