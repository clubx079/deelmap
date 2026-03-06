'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseMarketplace } from '@/lib/supabase'

export default function FinancingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyType: '',
    propertyAddress: '',
    transactionType: '',
    loanAmount: '',
    creditScore: '',
    comments: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [propertyList, setPropertyList] = useState([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [selectedPropertyPrice, setSelectedPropertyPrice] = useState(null)

  // Redirect to login when not authenticated (after auth has loaded)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/financing')
    }
  }, [authLoading, user, router])

  // Format phone as (xxx) xxx-xxxx (same as signup)
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10)
    if (cleaned.length === 0) return ''
    if (cleaned.length <= 3) return `(${cleaned}`
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  // Prefill from user when authenticated (format phone if it's raw digits)
  useEffect(() => {
    if (user) {
      const rawPhone = (user.phone || '').replace(/\D/g, '')
      const phoneDisplay = rawPhone.length === 10 ? formatPhoneNumber(rawPhone) : (user.phone || '')
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || prev.firstName,
        lastName: user.last_name || prev.lastName,
        email: user.email || prev.email,
        phone: phoneDisplay || prev.phone
      }))
    }
  }, [user])

  // Fetch property addresses for the dropdown: wholesale_deals + manual seller properties
  useEffect(() => {
    let cancelled = false
    async function fetchProperties() {
      setLoadingProperties(true)
      try {
        const [wholesaleRes, manualRes] = await Promise.all([
          supabaseMarketplace
            .from('wholesale_deals')
            .select('id, full_address, address, city, state, zip_code, price')
            .neq('status', 'archived'),
          supabaseMarketplace
            .from('properties')
            .select('id, address, city, state, zip_code, postal_code, price')
            .in('status', ['active', 'published'])
        ])
        if (cancelled) return

        const wholesaleList = (wholesaleRes.data || []).map((p) => {
          const addressLabel = p.full_address?.trim() ||
            [p.address, p.city, p.state, p.zip_code].filter(Boolean).join(', ') ||
            'Unknown address'
          return { id: p.id, addressLabel, price: p.price != null ? Number(p.price) : null }
        })
        const manualList = (manualRes.data || []).map((p) => {
          const addressLabel = (p.address && p.address.trim()) ||
            [p.address, p.city, p.state, p.zip_code || p.postal_code].filter(Boolean).join(', ') ||
            'Unknown address'
          return { id: p.id, addressLabel, price: p.price != null ? Number(p.price) : null }
        })

        setPropertyList([...wholesaleList, ...manualList])
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching properties for financing:', err)
          setPropertyList([])
        }
      } finally {
        if (!cancelled) setLoadingProperties(false)
      }
    }
    fetchProperties()
    return () => { cancelled = true }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePropertySelect = (e) => {
    const value = e.target.value
    const item = propertyList.find((p) => p.addressLabel === value)
    setFormData(prev => ({ ...prev, propertyAddress: value }))
    setSelectedPropertyPrice(item?.price ?? null)
  }

  const usePriceAsLoanAmount = () => {
    if (selectedPropertyPrice != null) {
      setFormData(prev => ({ ...prev, loanAmount: String(selectedPropertyPrice) }))
    }
  }

  // Monday.com integration disabled – no API keys. Applications save to DB only.
  // const submitToMonday = async (data) => {
  //   const mutation = `...`
  //   const variables = { boardId: "8175758520", groupId: "topics", ... }
  //   const response = await fetch('https://api.monday.com/v2', { ... })
  //   const result = await response.json()
  //   if (result.errors) throw new Error(result.errors[0]?.message)
  //   return result
  // }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) return

    setIsSubmitting(true)
    setError('')

    try {
      // Save to database only (Monday.com integration commented out – no API keys)
      const response = await fetch('/api/financing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          propertyType: formData.propertyType,
          propertyAddress: formData.propertyAddress || undefined,
          transactionType: formData.transactionType,
          loanAmount: formData.loanAmount,
          creditScore: formData.creditScore,
          comments: formData.comments,
          mondayItemId: null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save financing request')
      }

      setSubmitted(true)
      setSelectedPropertyPrice(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        propertyType: '',
        propertyAddress: '',
        transactionType: '',
        loanAmount: '',
        creditScore: '',
        comments: ''
      })
    } catch (error) {
      console.error('Submission error:', error)
      setError('There was an error submitting your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="financing" />

      {/* Thank you popup – top right, responsive for mobile */}
      {submitted && (
        <div
          className="finance-thankyou-popup fixed z-[100] left-4 right-4 top-4 sm:left-auto sm:right-4 sm:max-w-sm rounded-lg border-2 border-slate-200 bg-white p-4 shadow-lg"
          role="alert"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900">Thank you</h3>
              <p className="mt-1 text-sm text-slate-600 break-words">
                Your financing request has been submitted. Lenders will review it and reach out through DeelMap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded p-2 sm:p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 -mr-1"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Intro – same section/title placement as Sell, Leadership, etc. */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-4 sm:pb-6 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 mb-3 sm:mb-4 tracking-tight">
              Request Financing
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Submit a financing request for your property. Lenders on our platform review every application and will reach out to you through DeelMap when there’s a match.
            </p>
          </div>
        </div>
      </section>

      {/* Application form section – same card style as Sell page */}
      <section className="pt-4 sm:pt-6 pb-12 sm:pb-16 lg:pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="bg-white border-2 border-slate-300 p-8 lg:p-10">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Financing Application</h2>
              <p className="text-slate-600">Complete the form below. Lenders will view your application and contact you here.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* First Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                />
              </div>

              {/* Type of Property */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type of Property <span className="text-red-500">*</span>
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                >
                  <option value="">Select property type</option>
                  <option value="Single family">Single family</option>
                  <option value="2-4 units">2-4 units</option>
                  <option value="5+ units">5+ units</option>
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Transaction Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="transactionType"
                  value={formData.transactionType}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                >
                  <option value="">Select transaction type</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Cash out Refinance">Cash out Refinance</option>
                  <option value="Rate & Term Refinance">Rate & Term Refinance</option>
                </select>
              </div>

              {/* Address for house - dropdown of marketplace properties */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address for house
                </label>
                <select
                  name="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={handlePropertySelect}
                  disabled={loadingProperties}
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none disabled:opacity-60"
                >
                  <option value="">
                    {loadingProperties ? 'Loading properties...' : 'Select a property'}
                  </option>
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.addressLabel}>
                      {p.addressLabel}
                      {p.price != null ? ` — $${Number(p.price).toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
                {selectedPropertyPrice != null && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Property price: ${Number(selectedPropertyPrice).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={usePriceAsLoanAmount}
                      className="text-sm font-semibold text-slate-900 underline hover:no-underline focus:outline-none"
                    >
                      Use as loan amount
                    </button>
                  </div>
                )}
              </div>

              {/* Loan Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Loan Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  <input
                    type="number"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1000"
                    placeholder="0"
                    className="w-full h-12 pl-8 pr-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Credit Score */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Your Credit Score <span className="text-red-500">*</span>
                </label>
                <select
                  name="creditScore"
                  value={formData.creditScore}
                  onChange={handleInputChange}
                  required
                  className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none"
                >
                  <option value="">Select credit score range</option>
                  <option value="Under 550">Under 550</option>
                  <option value="650-680">650-680</option>
                  <option value="680-700">680-700</option>
                  <option value="700-720">700-720</option>
                  <option value="720-740">720-740</option>
                  <option value="740-760">740-760</option>
                  <option value="760+">760+</option>
                </select>
              </div>

              {/* Comments or Questions */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comments or Questions
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Tell us more about your financing needs..."
                  className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all outline-none resize-none"
                />
              </div>

            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
