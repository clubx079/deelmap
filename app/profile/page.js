'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import BuyerPortalLayout from '@/components/buyer/BuyerPortalLayout'
import { User, Mail, Phone, Lock, Edit2, Save, X, CheckCircle, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const fetchUserData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        setError('Failed to load profile data')
        return
      }

      setFormData({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || ''
      })

    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Update local storage
      const updatedUser = {
        ...user,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone
      }

      localStorage.setItem('ableman_user', JSON.stringify(updatedUser))

      setSuccess('Profile updated successfully!')
      setIsEditing(false)

    } catch (error) {
      console.error('Profile update error:', error)
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    fetchUserData()
    setIsEditing(false)
    setError('')
    setSuccess('')
  }

  if (!user) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <BuyerPortalLayout>
    <div className="min-h-full bg-slate-50 pt-12 lg:pt-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage your account</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-6 py-4 max-w-4xl mx-auto">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-lg">
                {formData.firstName?.charAt(0)?.toUpperCase() || formData.lastName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim() : 'User'}
                </h2>
                <p className="text-sm text-slate-600">{formData.email}</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all ${
                      isEditing
                        ? 'border-slate-300 bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20'
                        : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    required
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all ${
                      isEditing
                        ? 'border-slate-300 bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20'
                        : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-lg cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your phone number"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all ${
                      isEditing
                        ? 'border-slate-300 bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20'
                        : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="mt-8 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-700" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
          </div>
          <div className="p-6">
            <div>
              <h3 className="text-base font-medium text-slate-900 mb-2">Reset Password</h3>
              <p className="text-sm text-slate-600 mb-4">
                Change your account password to keep your account secure. You'll receive a verification code via email.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign Out</h2>
              <p className="text-sm text-slate-600">
                Sign out of your account
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await signOut()
                  window.location.href = '/'
                } catch (error) {
                  console.error('Logout error:', error)
                  window.location.href = '/'
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
    </BuyerPortalLayout>
  )
}
