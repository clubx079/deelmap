'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext'
import {
  User, Edit2, X, CheckCircle, ChevronDown, MapPin, Loader2, Bell, BellOff, Save,
} from 'lucide-react'

const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']

const pillBase = 'px-3 py-1.5 rounded border text-[13px] font-semibold transition-colors'
const pillOn = 'bg-[#1A1816] border-[#1A1816] text-white'
const pillOff = 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
const toggleArrayItem = (arr, item) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]

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

export default function BuyerProfilePage() {
  const { user } = useAuth()

  const { setPageTitle } = useBuyerPageTitle()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', nickname: '', isAnonymous: false })

  useEffect(() => {
    setPageTitle('Profile')
    return () => setPageTitle('')
  }, [setPageTitle])

  // Name
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState({ firstName: '', lastName: '' })
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  // Handle (community identity)
  const [isEditingHandle, setIsEditingHandle] = useState(false)
  const [handleDraft, setHandleDraft] = useState({ nickname: '', isAnonymous: false })
  const [savingHandle, setSavingHandle] = useState(false)
  const [handleMsg, setHandleMsg] = useState('')

  // Buy box
  const [buyBox, setBuyBox] = useState({ minPrice: '', maxPrice: '', propertyTypes: [], locations: [], minBeds: '', minBaths: '', dealTypes: [] })
  const [isEditingBuyBox, setIsEditingBuyBox] = useState(false)
  const [savingBuyBox, setSavingBuyBox] = useState(false)
  const [buyBoxError, setBuyBoxError] = useState('')
  const [buyBoxSuccess, setBuyBoxSuccess] = useState('')

  // Buy-box alerts
  const [alertsOn, setAlertsOn] = useState(false)

  // Locations dropdown
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationSearch, setLocationSearch] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const locationDropdownRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) setLocationDropdownOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (user?.id) { fetchUserData(); fetchBuyBox() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchUserData() {
    try {
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name, email, nickname, is_anonymous, notification_preferences')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          nickname: data.nickname || '',
          isAnonymous: data.is_anonymous || false,
        })
        setNameDraft({ firstName: data.first_name || '', lastName: data.last_name || '' })
        setHandleDraft({ nickname: data.nickname || '', isAnonymous: data.is_anonymous || false })
        setAlertsOn((data.notification_preferences || {}).buyBoxMatch || false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveName() {
    if (!nameDraft.firstName.trim() || !nameDraft.lastName.trim()) {
      setNameMsg('First and last name are required.')
      return
    }
    setSavingName(true)
    setNameMsg('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ first_name: nameDraft.firstName.trim(), last_name: nameDraft.lastName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) { setNameMsg('Could not save. Please try again.'); return }
      setProfile(prev => ({ ...prev, firstName: nameDraft.firstName.trim(), lastName: nameDraft.lastName.trim() }))
      setIsEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  async function fetchBuyBox() {
    try {
      const res = await fetch(`/api/buyer/buy-box?user_id=${user.id}`)
      const data = await res.json()
      if (data) {
        setBuyBox({
          minPrice: data.min_price ?? '',
          maxPrice: data.max_price ?? '',
          propertyTypes: data.property_types || [],
          locations: data.locations || [],
          minBeds: data.min_beds ?? '',
          minBaths: data.min_baths ?? '',
          dealTypes: data.deal_types || [],
        })
      }
    } catch {}
  }

  async function fetchLocationSuggestions() {
    if (locationSuggestions.length > 0) return
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

  async function handleSaveHandle() {
    setSavingHandle(true)
    setHandleMsg('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ nickname: handleDraft.nickname || null, is_anonymous: handleDraft.isAnonymous, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) { setHandleMsg('Could not save. Please try again.'); return }
      setProfile(prev => ({ ...prev, nickname: handleDraft.nickname, isAnonymous: handleDraft.isAnonymous }))
      setIsEditingHandle(false)
    } finally {
      setSavingHandle(false)
    }
  }

  async function handleSaveBuyBox() {
    setSavingBuyBox(true)
    setBuyBoxError('')
    setBuyBoxSuccess('')
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
      if (!res.ok) { setBuyBoxError('Failed to save buy box. Please try again.'); return }
      setBuyBoxSuccess('Buy box saved.')
      setIsEditingBuyBox(false)
      setTimeout(() => setBuyBoxSuccess(''), 3000)
    } catch {
      setBuyBoxError('Failed to save buy box. Please try again.')
    } finally {
      setSavingBuyBox(false)
    }
  }

  async function toggleAlerts() {
    const next = !alertsOn
    setAlertsOn(next)
    try {
      await supabase
        .from('users')
        .update({ notification_preferences: { buyBoxMatch: next }, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch {
      setAlertsOn(!next) // revert on failure
    }
  }

  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || 'Your profile'
  const handleLabel = profile.nickname ? `@${profile.nickname}` : (profile.isAnonymous ? 'Anonymous' : 'No handle set')
  const initials = (profile.firstName?.[0] || profile.email?.[0] || 'U').toUpperCase()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <Loader2 className="w-6 h-6 text-[#D03839] animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="p-4 lg:p-6 space-y-5">

          {/* Identity header */}
          <div className="bg-white border border-[#E8E8E4] rounded p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
              <span className="text-[20px] font-bold text-[#D03839]">{initials}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[#1A1816] truncate">{displayName}</h1>
              <p className="text-[13px] text-[#737370] truncate">{handleLabel}{profile.email ? ` · ${profile.email}` : ''}</p>
            </div>
          </div>

          {/* Your name */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F3F3F1] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#444441]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">Your name</p>
                  <p className="text-[12px] text-[#737370]">The name shown on your account</p>
                </div>
              </div>
              {!isEditingName && (
                <button onClick={() => { setNameDraft({ firstName: profile.firstName, lastName: profile.lastName }); setIsEditingName(true); setNameMsg('') }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="p-5">
              {nameMsg && <p className="text-[13px] text-[#D03839] mb-3">{nameMsg}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">First name</label>
                  <input type="text" value={isEditingName ? nameDraft.firstName : profile.firstName} disabled={!isEditingName}
                    onChange={(e) => setNameDraft(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingName ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Last name</label>
                  <input type="text" value={isEditingName ? nameDraft.lastName : profile.lastName} disabled={!isEditingName}
                    onChange={(e) => setNameDraft(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingName ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`} />
                </div>
              </div>
              {isEditingName && (
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => { setIsEditingName(false); setNameMsg('') }} disabled={savingName}
                    className="px-4 py-2 text-[13px] font-medium text-[#444441] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleSaveName} disabled={savingName}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors disabled:opacity-50">
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Community handle */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F3F3F1] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#444441]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">Community handle</p>
                  <p className="text-[12px] text-[#737370]">How you appear in the community and to sellers</p>
                </div>
              </div>
              {!isEditingHandle && (
                <button onClick={() => { setHandleDraft({ nickname: profile.nickname, isAnonymous: profile.isAnonymous }); setIsEditingHandle(true); setHandleMsg('') }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              {handleMsg && <p className="text-[13px] text-[#D03839]">{handleMsg}</p>}
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Handle</label>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-[#737370]">@</span>
                  <input type="text" value={isEditingHandle ? handleDraft.nickname : profile.nickname} disabled={!isEditingHandle}
                    onChange={(e) => setHandleDraft(prev => ({ ...prev, nickname: e.target.value.replace(/\s+/g, '') }))}
                    placeholder="yourhandle"
                    className={`flex-1 px-4 py-3 border rounded text-[13px] outline-none transition-all ${isEditingHandle ? 'border-[#E8E8E4] bg-white focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20' : 'border-[#E8E8E4] bg-[#FAFAF8] cursor-not-allowed text-[#737370]'}`} />
                </div>
              </div>
              <label className={`flex items-center gap-2.5 ${isEditingHandle ? 'cursor-pointer' : 'opacity-60'}`}>
                <input type="checkbox" checked={isEditingHandle ? handleDraft.isAnonymous : profile.isAnonymous} disabled={!isEditingHandle}
                  onChange={(e) => setHandleDraft(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                  className="w-4 h-4 accent-[#D03839]" />
                <span className="text-[13px] text-[#444441]">Stay anonymous (hide my name in the community)</span>
              </label>
              {isEditingHandle && (
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => { setIsEditingHandle(false); setHandleMsg('') }} disabled={savingHandle}
                    className="px-4 py-2 text-[13px] font-medium text-[#444441] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleSaveHandle} disabled={savingHandle}
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors disabled:opacity-50">
                    {savingHandle ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Buy Box — front and center */}
          <div className="bg-white border border-[#E8E8E4] rounded overflow-visible">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-[#D03839]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">Buy Box</p>
                  <p className="text-[12px] text-[#737370]">Your deal criteria — we'll alert you on matches</p>
                </div>
              </div>
              {!isEditingBuyBox && (
                <button onClick={() => { setIsEditingBuyBox(true); fetchLocationSuggestions() }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] rounded text-[12px] font-semibold transition-colors">
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
                      <div className="flex items-center gap-2 px-3 py-2.5 border border-[#E8E8E4] rounded bg-white cursor-pointer focus-within:border-[#D03839] focus-within:ring-1 focus-within:ring-[#D03839]/20"
                        onClick={() => setLocationDropdownOpen(prev => !prev)}>
                        <MapPin className="w-3.5 h-3.5 text-[#A8A8A4] flex-shrink-0" />
                        <input type="text" value={locationSearch}
                          onChange={(e) => { setLocationSearch(e.target.value); setLocationDropdownOpen(true) }}
                          onFocus={() => setLocationDropdownOpen(true)}
                          placeholder="Search city or state…"
                          className="flex-1 text-[13px] text-[#1A1816] bg-transparent outline-none placeholder-[#A8A8A4]" />
                        <ChevronDown className={`w-3.5 h-3.5 text-[#A8A8A4] flex-shrink-0 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      {locationDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E8E8E4] rounded shadow-lg max-h-48 overflow-y-auto">
                          {locationSuggestions
                            .filter(s => s.toLowerCase().includes(locationSearch.toLowerCase()))
                            .filter(s => !buyBox.locations.includes(s))
                            .slice(0, 80)
                            .map(s => (
                              <button key={s} type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  if (!buyBox.locations.includes(s)) setBuyBox(prev => ({ ...prev, locations: [...prev.locations, s] }))
                                  setLocationSearch('')
                                  setLocationDropdownOpen(false)
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-[#1A1816] hover:bg-[#FAFAF8] transition-colors">
                                {s}
                              </button>
                            ))}
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
                  <button type="button" onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, propertyTypes: [] }))}
                    className={`${pillBase} ${buyBox.propertyTypes.length === 0 ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>All</button>
                  {['Single Family', 'Multi-Family', 'Condo', 'Townhouse', 'Commercial', 'Land'].map(type => (
                    <button key={type} type="button"
                      onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, propertyTypes: toggleArrayItem(prev.propertyTypes, type) }))}
                      className={`${pillBase} ${buyBox.propertyTypes.includes(type) ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>{type}</button>
                  ))}
                </div>
              </div>

              {/* Beds & Baths */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Min Beds</label>
                  <BedBathSelect value={buyBox.minBeds} onChange={(v) => setBuyBox(prev => ({ ...prev, minBeds: v }))} disabled={!isEditingBuyBox}
                    options={[{ value: '', label: 'Any' }, ...[1,2,3,4,5].map(n => ({ value: n, label: `${n}+` }))]} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Min Baths</label>
                  <BedBathSelect value={buyBox.minBaths} onChange={(v) => setBuyBox(prev => ({ ...prev, minBaths: v }))} disabled={!isEditingBuyBox}
                    options={[{ value: '', label: 'Any' }, ...[1,2,3,4].map(n => ({ value: n, label: `${n}+` }))]} />
                </div>
              </div>

              {/* Deal type */}
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Deal Type</label>
                <div className="flex gap-2">
                  {['wholesale', 'auction'].map(type => (
                    <button key={type} type="button"
                      onClick={() => isEditingBuyBox && setBuyBox(prev => ({ ...prev, dealTypes: toggleArrayItem(prev.dealTypes, type) }))}
                      className={`${pillBase} capitalize ${buyBox.dealTypes.includes(type) ? pillOn : pillOff} ${!isEditingBuyBox ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>{type}</button>
                  ))}
                </div>
              </div>

              {isEditingBuyBox && (
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => { setIsEditingBuyBox(false); fetchBuyBox(); setBuyBoxError(''); setBuyBoxSuccess('') }} disabled={savingBuyBox}
                    className="px-4 py-2 text-[13px] font-medium text-[#444441] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors disabled:opacity-50">Cancel</button>
                  <button onClick={handleSaveBuyBox} disabled={savingBuyBox}
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors disabled:opacity-50">
                    {savingBuyBox ? 'Saving…' : 'Save buy box'}
                  </button>
                </div>
              )}

              {/* Alerts toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E4]">
                <div className="flex items-center gap-2.5">
                  {alertsOn ? <Bell className="w-4 h-4 text-[#0F6E56]" /> : <BellOff className="w-4 h-4 text-[#A8A8A4]" />}
                  <span className="text-[13px] text-[#444441]">Email me when a new deal matches my buy box</span>
                </div>
                <button onClick={toggleAlerts} role="switch" aria-checked={alertsOn}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${alertsOn ? 'bg-[#0F6E56]' : 'bg-[#E8E8E4]'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${alertsOn ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>

      </div>
    </div>
  )
}
