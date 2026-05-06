'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import BuyerPortalLayout from '@/components/buyer/BuyerPortalLayout'
import {
  User, Mail, Phone, Lock, Edit2, Save, X, CheckCircle,
  LogOut, ChevronDown, ShieldBan, RefreshCw, Loader2
} from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [unblockSuccessId, setUnblockSuccessId] = useState(null)
  const [unblockingId, setUnblockingId] = useState(null)

  useEffect(() => {
    if (user?.id) fetchUserData()
    else setIsLoading(false)
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
      if (error) { setError('Failed to load profile data'); return }
      setFormData({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || ''
      })
    } catch {
      setError('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
        .update({ first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (updateError) throw updateError
      localStorage.setItem('ableman_user', JSON.stringify({ ...user, first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone }))
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch {
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => { fetchUserData(); setIsEditing(false); setError(''); setSuccess('') }

  const fetchBlockedUsers = async () => {
    if (!user?.id) return
    try {
      setBlockedLoading(true)
      const res = await fetch('/api/buyer/chat?action=get_blocked_users', { headers: { Authorization: `Bearer ${user.id}` } })
      const data = await res.json().catch(() => ({}))
      setBlockedUsers(data?.blocked || [])
    } catch { setBlockedUsers([]) }
    finally { setBlockedLoading(false) }
  }

  const handleToggleBlockedUsers = () => {
    const next = !showBlockedUsers
    setShowBlockedUsers(next)
    if (next) fetchBlockedUsers()
  }

  const handleUnblock = async (conversationId) => {
    if (!user?.id || conversationId == null || unblockingId === conversationId) return
    setUnblockingId(conversationId)
    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'update_conversation_pref', conversationId: Number(conversationId) || conversationId, is_blocked: false })
      })
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(b => String(b.conversation_id) !== String(conversationId)))
        setUnblockSuccessId(conversationId)
        setTimeout(() => setUnblockSuccessId(null), 2500)
      }
    } finally { setUnblockingId(null) }
  }

  if (!user) return null

  const initials = (formData.firstName?.charAt(0) || formData.lastName?.charAt(0) || 'U').toUpperCase()
  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || 'User'

  if (isLoading) {
    return (
      <BuyerPortalLayout pageTitle="Settings">
        <div className="flex items-center justify-center h-full bg-[#FAFAF8]">
          <Loader2 className="w-7 h-7 text-[#A8A8A4] animate-spin" />
        </div>
      </BuyerPortalLayout>
    )
  }

  const inputBase = 'w-full pl-10 pr-4 py-3 border rounded text-[13px] transition-all outline-none'
  const inputActive = 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20'
  const inputDisabled = 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'

  return (
    <BuyerPortalLayout pageTitle="Settings">
      <div className="min-h-full bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="p-4 lg:p-6">

          {/* Page title */}
          <div className="mb-5">
            <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">Settings</h1>
            <p className="text-[14px] text-[#737370] mt-1">Manage your account</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded flex items-center gap-2.5">
              <X className="w-4 h-4 text-[#D03839] flex-shrink-0" />
              <p className="text-[13px] text-[#D03839]">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-[#E4F5EC] border border-[#A8DFBA] rounded flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-[#0F6E56] flex-shrink-0" />
              <p className="text-[13px] text-[#0F6E56]">{success}</p>
            </div>
          )}

          {/* Profile card */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden mb-4">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#1A1816] flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#1A1816] truncate">{fullName}</p>
                  <p className="text-[12px] text-[#737370] truncate">{formData.email}</p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                    <input
                      type="text" name="firstName" value={formData.firstName}
                      onChange={handleInputChange} disabled={!isEditing} required
                      className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`}
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                    <input
                      type="text" name="lastName" value={formData.lastName}
                      onChange={handleInputChange} disabled={!isEditing} required
                      className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                    <input
                      type="email" name="email" value={formData.email} disabled
                      className={`${inputBase} ${inputDisabled}`}
                    />
                  </div>
                  <p className="text-[11px] text-[#A8A8A4] mt-1">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                    <input
                      type="tel" name="phone" value={formData.phone}
                      onChange={handleInputChange} disabled={!isEditing}
                      placeholder="Enter your phone number"
                      className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`}
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="mt-5 flex gap-2 justify-end">
                  <button
                    type="button" onClick={handleCancel} disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#F3F3F1] hover:bg-[#E8E8E4] text-[#444441] rounded text-[13px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-[13px] font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSubmitting ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5 text-[#D03839]" />
              </div>
              <p className="text-[14px] font-semibold text-[#1A1816]">Security</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-[#1A1816]">Reset Password</p>
                <p className="text-[12px] text-[#737370] mt-0.5">You'll receive a verification code via email.</p>
              </div>
              <Link
                href="/forgot-password"
                className="flex-shrink-0 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] text-[12px] font-semibold rounded transition-colors flex items-center"
              >
                Reset Password
              </Link>
            </div>
          </div>

          {/* Blocked users */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden mb-4">
            <button
              type="button" onClick={handleToggleBlockedUsers}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                  <ShieldBan className="w-3.5 h-3.5 text-[#D03839]" />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-[#1A1816]">
                    Blocked users
                    {!blockedLoading && blockedUsers.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#F3F3F1] text-[#737370] text-[11px] font-semibold">
                        {blockedUsers.length}
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-[#737370]">View and unblock chat contacts</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#A8A8A4] transition-transform ${showBlockedUsers ? 'rotate-180' : ''}`} />
            </button>

            {showBlockedUsers && (
              <div className="border-t border-[#E8E8E4] px-5 py-4 bg-[#FAFAF8]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[0.8px]">Blocked contacts</p>
                  <button
                    type="button" onClick={fetchBlockedUsers} disabled={blockedLoading}
                    className="flex items-center gap-1.5 px-2.5 min-h-[44px] text-[11px] font-medium text-[#737370] hover:text-[#1A1816] hover:bg-[#F0F0EE] rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${blockedLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {blockedLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="w-4 h-4 text-[#A8A8A4] animate-spin" />
                    <p className="text-[13px] text-[#737370]">Loading…</p>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-[13px] text-[#737370] py-2">No blocked users. Block someone in Messages and they'll appear here.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {blockedUsers.map((row) => (
                      <div key={row.conversation_id} className="flex items-center justify-between gap-3 p-3 rounded border border-[#E8E8E4] bg-white">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#1A1816] truncate">{row.name || 'User'}</p>
                          <p className="text-[11px] text-[#A8A8A4]">
                            {row.blocked_at ? `Blocked ${new Date(row.blocked_at).toLocaleDateString()}` : 'Blocked'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblock(row.conversation_id)}
                          disabled={unblockingId === row.conversation_id}
                          className="flex-shrink-0 px-3 min-h-[44px] text-[12px] font-semibold rounded border border-[#E8E8E4] text-[#444441] hover:bg-[#FAFAF8] transition-colors disabled:opacity-50 flex items-center"
                        >
                          {unblockSuccessId === row.conversation_id ? 'Unblocked ✓' : unblockingId === row.conversation_id ? 'Unblocking…' : 'Unblock'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sign out */}
          <div className="bg-white border border-[#E8E8E4] rounded">
            <div className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-[#1A1816]">Sign Out</p>
                <p className="text-[12px] text-[#737370] mt-0.5">Sign out of your DeelMap account</p>
              </div>
              <button
                onClick={async () => {
                  try { await signOut() } catch {}
                  window.location.href = '/'
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] bg-[#FEF0EF] hover:bg-[#FEE4E3] text-[#D03839] text-[13px] font-semibold rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>
    </BuyerPortalLayout>
  )
}
