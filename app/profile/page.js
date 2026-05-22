'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import BuyerPortalLayout from '@/components/buyer/BuyerPortalLayout'
import {
  User, Mail, Phone, Lock, Edit2, Save, X, CheckCircle,
  LogOut, ChevronDown, ShieldBan, RefreshCw, Loader2, Bell, MapPin, Search
} from 'lucide-react'

function BedBathSelect({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const label = value === '' ? 'Any' : `${value}+`
  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full px-3 py-2.5 pr-8 border rounded text-[13px] text-left transition-all flex items-center justify-between ${disabled ? 'border-[#E8E8E4] bg-[#FAFAF8] text-[#737370] cursor-not-allowed' : 'border-[#E8E8E4] bg-white text-[#1A1816] cursor-pointer hover:border-[#1A1816]'}`}>
        <span>{label}</span>
        <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-transform ${open ? 'rotate-180' : ''} ${disabled ? 'text-[#A8A8A4]' : 'text-[#737370]'}`} />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full bg-white border border-[#E8E8E4] rounded shadow-lg overflow-hidden">
          {options.map(opt => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`px-3 py-2 text-[13px] cursor-pointer transition-colors ${value === opt.value ? 'bg-[#1A1816] text-white' : 'text-[#1A1816] hover:bg-[#FAFAF8]'}`}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  // Account
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Blocked users
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [unblockSuccessId, setUnblockSuccessId] = useState(null)
  const [unblockingId, setUnblockingId] = useState(null)

  // Tabs
  const [activeTab, setActiveTab] = useState('account')

  // Profile tab
  const [profileData, setProfileData] = useState({ nickname: '', isAnonymous: false })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  // Buy box
  const [buyBox, setBuyBox] = useState({ minPrice: '', maxPrice: '', propertyTypes: [], locations: [], minBeds: '', minBaths: '', dealTypes: [] })
  const [isEditingBuyBox, setIsEditingBuyBox] = useState(false)
  const [isSavingBuyBox, setIsSavingBuyBox] = useState(false)
  const [buyBoxError, setBuyBoxError] = useState('')
  const [buyBoxSuccess, setBuyBoxSuccess] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationSearch, setLocationSearch] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState({ buyBoxMatch: false })
  const [isSavingNotifs, setIsSavingNotifs] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')

  const locationDropdownRef = useRef(null)

  useEffect(() => {
    if (user?.id) { fetchUserData(); fetchBuyBox() }
    else setIsLoading(false)
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchUserData = async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, nickname, is_anonymous, notification_preferences')
        .eq('id', user.id)
        .single()
      if (error) { setError('Failed to load profile data'); return }
      setFormData({ firstName: data.first_name || '', lastName: data.last_name || '', email: data.email || '', phone: data.phone || '' })
      setProfileData({ nickname: data.nickname || '', isAnonymous: data.is_anonymous || false })
      const prefs = data.notification_preferences || {}
      setNotifPrefs({ buyBoxMatch: prefs.buyBoxMatch || false })
    } catch { setError('Failed to load profile data') }
    finally { setIsLoading(false) }
  }

  const fetchBuyBox = async () => {
    if (!user?.id) return
    const res = await fetch(`/api/buyer/buy-box?user_id=${user.id}`)
    const data = await res.json()
    if (data) {
      setBuyBox({
        minPrice: data.min_price ?? '', maxPrice: data.max_price ?? '',
        propertyTypes: data.property_types || [], locations: data.locations || [],
        minBeds: data.min_beds ?? '', minBaths: data.min_baths ?? '',
        dealTypes: data.deal_types || []
      })
    }
  }

  const fetchLocationSuggestions = async () => {
    if (locationSuggestions.length > 0) return
    const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']
    const [{ data: wDeals }, { data: props }] = await Promise.all([
      supabase.from('wholesale_deals').select('city, state').not('city', 'is', null).not('state', 'is', null),
      supabase.from('properties').select('city, state').not('city', 'is', null).not('state', 'is', null),
    ])
    const seen = new Set(US_STATES)
    const all = [...US_STATES]
    for (const row of [...(wDeals || []), ...(props || [])]) {
      const city = (row.city || '').trim()
      const state = (row.state || '').trim()
      if (!city && !state) continue
      const key = city ? `${city}, ${state}` : state
      if (!seen.has(key)) { seen.add(key); all.push(key) }
    }
    setLocationSuggestions(all.sort())
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true); setError(''); setSuccess('')
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (updateError) throw updateError
      localStorage.setItem('ableman_user', JSON.stringify({ ...user, first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone }))
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch { setError('Failed to update profile. Please try again.') }
    finally { setIsSubmitting(false) }
  }

  const handleCancel = () => { fetchUserData(); setIsEditing(false); setError(''); setSuccess('') }

  const handleProfileSave = async () => {
    setIsSavingProfile(true); setProfileError(''); setProfileSuccess('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ nickname: profileData.nickname || null, is_anonymous: profileData.isAnonymous, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      setProfileSuccess('Profile updated successfully!')
      setIsEditingProfile(false)
    } catch { setProfileError('Failed to update profile. Please try again.') }
    finally { setIsSavingProfile(false) }
  }

  const handleSaveBuyBox = async () => {
    setIsSavingBuyBox(true); setBuyBoxError(''); setBuyBoxSuccess('')
    try {
      const res = await fetch('/api/buyer/buy-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          min_price: buyBox.minPrice !== '' ? Number(buyBox.minPrice) : null,
          max_price: buyBox.maxPrice !== '' ? Number(buyBox.maxPrice) : null,
          property_types: buyBox.propertyTypes,
          locations: buyBox.locations,
          min_beds: buyBox.minBeds !== '' ? Number(buyBox.minBeds) : null,
          min_baths: buyBox.minBaths !== '' ? Number(buyBox.minBaths) : null,
          deal_types: buyBox.dealTypes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setBuyBoxSuccess('Buy box saved!')
      setIsEditingBuyBox(false)
    } catch { setBuyBoxError('Failed to save buy box. Please try again.') }
    finally { setIsSavingBuyBox(false) }
  }

  const handleSaveNotifs = async (prefs) => {
    setIsSavingNotifs(true); setNotifSuccess('')
    try {
      const { error } = await supabase.from('users').update({ notification_preferences: prefs, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error
      setNotifPrefs(prefs)
      setNotifSuccess('Saved!')
      setTimeout(() => setNotifSuccess(''), 3000)
    } catch { } finally { setIsSavingNotifs(false) }
  }

  const toggleArrayItem = (arr, item) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

  const addLocation = () => {
    const val = locationInput.trim()
    if (val && !buyBox.locations.includes(val)) setBuyBox(prev => ({ ...prev, locations: [...prev.locations, val] }))
    setLocationInput('')
  }

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
  const pillBase = 'px-3 py-1.5 rounded border text-[13px] font-semibold transition-colors'
  const pillOn = 'bg-[#1A1816] border-[#1A1816] text-white'
  const pillOff = 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'

  const TABS = [
    { key: 'account', label: 'Account' },
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
  ]

  return (
    <BuyerPortalLayout pageTitle="Settings">
      <div className="min-h-full bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>

        {/* Header */}
        <div className="p-4 lg:p-6 pb-0">
          <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">Settings</h1>
          <p className="text-[14px] text-[#737370] mt-0.5">Manage your account</p>
        </div>

        {/* Tab nav */}
        <div className="px-4 lg:px-6 mt-4 border-b border-[#E8E8E4]">
          <nav className="flex gap-0">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-[#D03839] text-[#D03839]'
                    : 'border-transparent text-[#737370] hover:text-[#1A1816]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 lg:p-6 space-y-4">

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (<>

            {error && (
              <div className="px-4 py-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded flex items-center gap-2.5">
                <X className="w-4 h-4 text-[#D03839] flex-shrink-0" />
                <p className="text-[13px] text-[#D03839]">{error}</p>
              </div>
            )}
            {success && (
              <div className="px-4 py-3 bg-[#E4F5EC] border border-[#A8DFBA] rounded flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#0F6E56] flex-shrink-0" />
                <p className="text-[13px] text-[#0F6E56]">{success}</p>
              </div>
            )}

            {/* Profile card */}
            <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#1A1816] flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0">{initials}</div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1816] truncate">{fullName}</p>
                    <p className="text-[12px] text-[#737370] truncate">{formData.email}</p>
                  </div>
                </div>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} disabled={!isEditing} required className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} disabled={!isEditing} required className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                      <input type="email" name="email" value={formData.email} disabled className={`${inputBase} ${inputDisabled}`} />
                    </div>
                    <p className="text-[11px] text-[#A8A8A4] mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} placeholder="Enter your phone number" className={`${inputBase} ${isEditing ? inputActive : inputDisabled}`} />
                    </div>
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-5 flex gap-2 justify-end">
                    <button type="button" onClick={handleCancel} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#F3F3F1] hover:bg-[#E8E8E4] text-[#444441] rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Security */}
            <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
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
                <Link href="/forgot-password" className="flex-shrink-0 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] text-[12px] font-semibold rounded transition-colors flex items-center">
                  Reset Password
                </Link>
              </div>
            </div>

            {/* Blocked users */}
            <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
              <button type="button" onClick={handleToggleBlockedUsers} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                    <ShieldBan className="w-3.5 h-3.5 text-[#D03839]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-semibold text-[#1A1816]">
                      Blocked users
                      {!blockedLoading && blockedUsers.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#F3F3F1] text-[#737370] text-[11px] font-semibold">{blockedUsers.length}</span>
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
                    <button type="button" onClick={fetchBlockedUsers} disabled={blockedLoading} className="flex items-center gap-1.5 px-2.5 min-h-[44px] text-[11px] font-medium text-[#737370] hover:text-[#1A1816] hover:bg-[#F0F0EE] rounded transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3 h-3 ${blockedLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                  {blockedLoading ? (
                    <div className="flex items-center gap-2 py-3"><Loader2 className="w-4 h-4 text-[#A8A8A4] animate-spin" /><p className="text-[13px] text-[#737370]">Loading…</p></div>
                  ) : blockedUsers.length === 0 ? (
                    <p className="text-[13px] text-[#737370] py-2">No blocked users.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {blockedUsers.map((row) => (
                        <div key={row.conversation_id} className="flex items-center justify-between gap-3 p-3 rounded border border-[#E8E8E4] bg-white">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#1A1816] truncate">{row.name || 'User'}</p>
                            <p className="text-[11px] text-[#A8A8A4]">{row.blocked_at ? `Blocked ${new Date(row.blocked_at).toLocaleDateString()}` : 'Blocked'}</p>
                          </div>
                          <button type="button" onClick={() => handleUnblock(row.conversation_id)} disabled={unblockingId === row.conversation_id}
                            className="flex-shrink-0 px-3 min-h-[44px] text-[12px] font-semibold rounded border border-[#E8E8E4] text-[#444441] hover:bg-[#FAFAF8] transition-colors disabled:opacity-50 flex items-center">
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
                <button onClick={async () => { try { await signOut() } catch {} window.location.href = '/' }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] bg-[#FEF0EF] hover:bg-[#FEE4E3] text-[#D03839] text-[13px] font-semibold rounded transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </>)}

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (<>

            {/* Public Profile */}
            <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-[#D03839]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1816]">Public Profile</p>
                    <p className="text-[12px] text-[#737370]">Control how you appear to sellers</p>
                  </div>
                </div>
                {!isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(true)} className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              <div className="p-5 space-y-4">
                {profileError && (
                  <div className="px-4 py-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded flex items-center gap-2.5">
                    <X className="w-4 h-4 text-[#D03839] flex-shrink-0" /><p className="text-[13px] text-[#D03839]">{profileError}</p>
                  </div>
                )}
                {profileSuccess && (
                  <div className="px-4 py-3 bg-[#E4F5EC] border border-[#A8DFBA] rounded flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#0F6E56] flex-shrink-0" /><p className="text-[13px] text-[#0F6E56]">{profileSuccess}</p>
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Nickname</label>
                  <input type="text" value={profileData.nickname}
                    onChange={(e) => setProfileData(prev => ({ ...prev, nickname: e.target.value }))}
                    disabled={!isEditingProfile} placeholder="e.g. DealHunter_TX"
                    className={`w-full px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingProfile ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`}
                  />
                  <p className="text-[11px] text-[#A8A8A4] mt-1">Shown to sellers instead of your real name when anonymous mode is on.</p>
                </div>
                <div className="flex items-center justify-between py-3 px-4 border border-[#E8E8E4] rounded">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816]">Anonymous mode</p>
                    <p className="text-[12px] text-[#737370] mt-0.5">Show nickname to sellers instead of your real name</p>
                  </div>
                  <button type="button"
                    onClick={() => isEditingProfile && setProfileData(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profileData.isAnonymous ? 'bg-[#1A1816]' : 'bg-[#E8E8E4]'} ${!isEditingProfile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profileData.isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {isEditingProfile && (
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={() => { setIsEditingProfile(false); fetchUserData(); setProfileError(''); setProfileSuccess('') }} disabled={isSavingProfile}
                      className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#F3F3F1] hover:bg-[#E8E8E4] text-[#444441] rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button type="button" onClick={handleProfileSave} disabled={isSavingProfile}
                      className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {isSavingProfile ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Buy Box */}
            <div className="bg-white border border-[#E8E8E4] rounded overflow-visible">
              <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-[#D03839]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1816]">Buy Box</p>
                    <p className="text-[12px] text-[#737370]">Your preferred deal criteria — we'll alert you on matches</p>
                  </div>
                </div>
                {!isEditingBuyBox && (
                  <button onClick={() => { setIsEditingBuyBox(true); fetchLocationSuggestions() }} className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              <div className="p-5 space-y-5">
                {buyBoxError && (
                  <div className="px-4 py-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded flex items-center gap-2.5">
                    <X className="w-4 h-4 text-[#D03839] flex-shrink-0" /><p className="text-[13px] text-[#D03839]">{buyBoxError}</p>
                  </div>
                )}
                {buyBoxSuccess && (
                  <div className="px-4 py-3 bg-[#E4F5EC] border border-[#A8DFBA] rounded flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#0F6E56] flex-shrink-0" /><p className="text-[13px] text-[#0F6E56]">{buyBoxSuccess}</p>
                  </div>
                )}

                {/* Price range */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Price Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Min price" value={buyBox.minPrice}
                      onChange={(e) => setBuyBox(prev => ({ ...prev, minPrice: e.target.value }))} disabled={!isEditingBuyBox}
                      className={`w-full px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingBuyBox ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`} />
                    <input type="number" placeholder="Max price" value={buyBox.maxPrice}
                      onChange={(e) => setBuyBox(prev => ({ ...prev, maxPrice: e.target.value }))} disabled={!isEditingBuyBox}
                      className={`w-full px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingBuyBox ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`} />
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Locations</label>
                  {isEditingBuyBox && (
                    <div className="mb-2">
                      <div className="relative" ref={locationDropdownRef}>
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 border border-[#E8E8E4] rounded bg-white cursor-pointer focus-within:border-[#D03839] focus-within:ring-1 focus-within:ring-[#D03839]/20"
                          onClick={() => setLocationDropdownOpen(prev => !prev)}
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#A8A8A4] flex-shrink-0" />
                          <input
                            type="text"
                            value={locationSearch}
                            onChange={(e) => { setLocationSearch(e.target.value); setLocationDropdownOpen(true) }}
                            onFocus={() => setLocationDropdownOpen(true)}
                            placeholder="Search city or state…"
                            className="flex-1 text-[13px] text-[#1A1816] bg-transparent outline-none placeholder-[#A8A8A4]"
                          />
                          <ChevronDown className={`w-3.5 h-3.5 text-[#A8A8A4] flex-shrink-0 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {locationDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-[#E8E8E4] rounded shadow-lg max-h-48 overflow-y-auto">
                            {locationSuggestions
                              .filter(s => s.toLowerCase().includes(locationSearch.toLowerCase()))
                              .filter(s => !buyBox.locations.includes(s))
                              .slice(0, 80)
                              .map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    if (!buyBox.locations.includes(s)) setBuyBox(prev => ({ ...prev, locations: [...prev.locations, s] }))
                                    setLocationSearch('')
                                    setLocationDropdownOpen(false)
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-[#1A1816] hover:bg-[#FAFAF8] transition-colors"
                                >
                                  {s}
                                </button>
                              ))
                            }
                            {locationSuggestions.filter(s => s.toLowerCase().includes(locationSearch.toLowerCase())).filter(s => !buyBox.locations.includes(s)).length === 0 && (
                              <p className="px-3 py-2 text-[12px] text-[#A8A8A4]">No matches</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {buyBox.locations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {buyBox.locations.map(loc => (
                        <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F3F3F1] text-[#444441] text-[12px] font-medium rounded-full">
                          {loc}
                          {isEditingBuyBox && (
                            <button type="button" onClick={() => setBuyBox(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }))} className="text-[#A8A8A4] hover:text-[#1A1816]">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#A8A8A4]">No locations added yet.</p>
                  )}
                </div>

                {/* Property types */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Property Types</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button"
                      onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, propertyTypes: [] }))}
                      className={`${pillBase} ${buyBox.propertyTypes.length === 0 ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                      All
                    </button>
                    {['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Commercial', 'Land'].map(type => (
                      <button key={type} type="button"
                        onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, propertyTypes: toggleArrayItem(prev.propertyTypes, type) }))}
                        className={`${pillBase} ${buyBox.propertyTypes.includes(type) ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Beds & Baths */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Min Beds</label>
                    <BedBathSelect
                      value={buyBox.minBeds}
                      onChange={(v) => setBuyBox(prev => ({ ...prev, minBeds: v }))}
                      disabled={!isEditingBuyBox}
                      options={[{ value: '', label: 'Any' }, ...[1,2,3,4,5].map(n => ({ value: n, label: `${n}+` }))]}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Min Baths</label>
                    <BedBathSelect
                      value={buyBox.minBaths}
                      onChange={(v) => setBuyBox(prev => ({ ...prev, minBaths: v }))}
                      disabled={!isEditingBuyBox}
                      options={[{ value: '', label: 'Any' }, ...[1,2,3,4].map(n => ({ value: n, label: `${n}+` }))]}
                    />
                  </div>
                </div>

                {/* Deal type */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Deal Type</label>
                  <div className="flex gap-2">
                    {['wholesale', 'auction'].map(type => (
                      <button key={type} type="button"
                        onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, dealTypes: toggleArrayItem(prev.dealTypes, type) }))}
                        className={`${pillBase} capitalize ${buyBox.dealTypes.includes(type) ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {isEditingBuyBox && (
                  <div className="flex gap-2 justify-end pt-1">
                    <button type="button" onClick={() => { setIsEditingBuyBox(false); fetchBuyBox(); setBuyBoxError(''); setBuyBoxSuccess('') }} disabled={isSavingBuyBox}
                      className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#F3F3F1] hover:bg-[#E8E8E4] text-[#444441] rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button type="button" onClick={handleSaveBuyBox} disabled={isSavingBuyBox}
                      className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white rounded text-[13px] font-semibold transition-colors disabled:opacity-50">
                      {isSavingBuyBox ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {isSavingBuyBox ? 'Saving…' : 'Save Buy Box'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>)}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                  <Bell className="w-3.5 h-3.5 text-[#D03839]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">Notifications</p>
                  <p className="text-[12px] text-[#737370]">Choose what emails you receive from DeelMap</p>
                </div>
              </div>
              <div className="divide-y divide-[#F3F3F1]">
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816]">Buy box match alerts</p>
                    <p className="text-[12px] text-[#737370] mt-0.5">Get an email when a new deal matches your buy box criteria</p>
                  </div>
                  <button type="button" disabled={isSavingNotifs}
                    onClick={() => handleSaveNotifs({ ...notifPrefs, buyBoxMatch: !notifPrefs.buyBoxMatch })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${notifPrefs.buyBoxMatch ? 'bg-[#1A1816]' : 'bg-[#E8E8E4]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifPrefs.buyBoxMatch ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              {notifSuccess && (
                <div className="px-5 py-3 border-t border-[#F3F3F1] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#0F6E56] flex-shrink-0" />
                  <p className="text-[13px] text-[#0F6E56]">{notifSuccess}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </BuyerPortalLayout>
  )
}
