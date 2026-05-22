'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { RegistrationModal } from '@/components/RegistrationModal'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect, useRef } from 'react'
import { supabaseMarketplace } from '@/lib/supabase'
import { Lock, ChevronDown } from 'lucide-react'

function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full h-11 px-4 bg-white border rounded flex items-center justify-between text-[14px] transition-all outline-none disabled:opacity-50 ${
          open ? 'border-[#D03839] ring-2 ring-[#D03839]/[.12]' : 'border-[#E8E8E4]'
        } ${selected ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 text-[#737370] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-white border border-[#E8E8E4] rounded shadow-sm overflow-y-auto max-h-[220px]">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-[14px] text-[#1A1816] hover:bg-[#FAFAF8] transition-colors ${value === o.value ? 'bg-[#FAFAF8] font-medium' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FinancingPage() {
  const { user, loading: authLoading } = useAuth()
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
  const showLoginModal = !authLoading && !user

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
        if (!cancelled) setPropertyList([])
      } finally {
        if (!cancelled) setLoadingProperties(false)
      }
    }
    fetchProperties()
    return () => { cancelled = true }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/financing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) throw new Error('Failed to save financing request')

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
      setError('There was an error submitting your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E8E8E4] border-t-[#D03839]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <RegistrationModal isOpen={showLoginModal} onClose={() => {}} preventClose={true} backUrl="/" backLabel="Back to Homepage" />
      <div>
      <Navbar currentPage="financing" />

      {/* Success toast */}
      {submitted && (
        <div className="fixed z-[100] left-4 right-4 top-4 sm:left-auto sm:right-4 sm:max-w-sm rounded border border-[#E8E8E4] bg-white p-4 shadow-lg" role="alert">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[#1A1816]">Thank you</h3>
              <p className="mt-1 text-sm text-[#737370] break-words">
                Your financing request has been submitted. Lenders will review it and reach out through DeelMap.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="shrink-0 flex items-center justify-center rounded p-1.5 text-[#A8A8A4] hover:bg-[#FAFAF8] hover:text-[#444441] transition-colors"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-10 bg-white">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#1A1816] mb-5 leading-tight">
            Reliable financing<br />for{' '}
            <span className="text-[#D03839]">every deal</span>
          </h1>
          <p className="text-[16px] leading-relaxed" style={{ color: '#737370' }}>
            Access flexible financing options tailored for real estate investors, with fast approvals, transparent terms, and support at every step.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="pt-4 sm:pt-6 pb-12 sm:pb-16 lg:pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="bg-white border border-[#E8E8E4] rounded p-10 lg:p-14">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-[#1A1816]">Financing Application</h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#FEF0EF] border border-[#F5C4C0] rounded">
                <p className="text-[#D03839] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">

              {/* Personal Information */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[2px] whitespace-nowrap">PERSONAL INFORMATION</p>
                  <div className="flex-1 h-px bg-[#E8E8E4]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      First name <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full h-11 px-4 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Last name <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full h-11 px-4 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Email address <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full h-11 px-4 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Phone number <span className="text-[#D03839]">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      required
                      placeholder="(555) 123-4567"
                      className="w-full h-11 px-4 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4]"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[2px] whitespace-nowrap">PROPERTY DETAILS</p>
                  <div className="flex-1 h-px bg-[#E8E8E4]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Type of Property <span className="text-[#D03839]">*</span>
                    </label>
                    <CustomSelect
                      value={formData.propertyType}
                      onChange={v => setFormData(prev => ({ ...prev, propertyType: v }))}
                      placeholder="Select property type"
                      options={[
                        { value: 'Single family', label: 'Single family' },
                        { value: '2-4 units', label: '2-4 units' },
                        { value: '5+ units', label: '5+ units' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Transaction Type <span className="text-[#D03839]">*</span>
                    </label>
                    <CustomSelect
                      value={formData.transactionType}
                      onChange={v => setFormData(prev => ({ ...prev, transactionType: v }))}
                      placeholder="Select transaction type"
                      options={[
                        { value: 'Purchase', label: 'Purchase' },
                        { value: 'Cash out Refinance', label: 'Cash out Refinance' },
                        { value: 'Rate & Term Refinance', label: 'Rate & Term Refinance' },
                      ]}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Address for house
                    </label>
                    <CustomSelect
                      value={formData.propertyAddress}
                      onChange={v => {
                        const item = propertyList.find(p => p.addressLabel === v)
                        setFormData(prev => ({ ...prev, propertyAddress: v }))
                        setSelectedPropertyPrice(item?.price ?? null)
                      }}
                      placeholder={loadingProperties ? 'Loading properties...' : 'Select a property'}
                      disabled={loadingProperties}
                      options={propertyList.map(p => ({
                        value: p.addressLabel,
                        label: p.addressLabel + (p.price != null ? ` — $${Number(p.price).toLocaleString()}` : ''),
                      }))}
                    />
                    {selectedPropertyPrice != null && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#444441]">
                          Property price: ${Number(selectedPropertyPrice).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={usePriceAsLoanAmount}
                          className="text-sm font-semibold text-[#D03839] underline hover:no-underline focus:outline-none"
                        >
                          Use as loan amount
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Loan Information */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[2px] whitespace-nowrap">LOAN INFORMATION</p>
                  <div className="flex-1 h-px bg-[#E8E8E4]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Loan amount required <span className="text-[#D03839]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737370] font-medium">$</span>
                      <input
                        type="number"
                        name="loanAmount"
                        value={formData.loanAmount}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="1000"
                        placeholder="0"
                        className="w-full h-11 pl-8 pr-4 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Your credit score <span className="text-[#D03839]">*</span>
                    </label>
                    <CustomSelect
                      value={formData.creditScore}
                      onChange={v => setFormData(prev => ({ ...prev, creditScore: v }))}
                      placeholder="Select credit score range"
                      options={[
                        { value: 'Under 550', label: 'Under 550' },
                        { value: '650-680', label: '650-680' },
                        { value: '680-700', label: '680-700' },
                        { value: '700-720', label: '700-720' },
                        { value: '720-740', label: '720-740' },
                        { value: '740-760', label: '740-760' },
                        { value: '760+', label: '760+' },
                      ]}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[14px] text-[#1A1816] mb-2">
                      Comments or Questions
                    </label>
                    <textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      rows={5}
                      placeholder="Tell us more about your financing needs..."
                      className="w-full px-4 py-3 bg-white border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] transition-all outline-none resize-none text-[#1A1816]"
                    />
                    <p className="mt-1.5 text-[12px] text-[#A8A8A4]">Optional — helps lenders understand your deal and respond faster.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] disabled:bg-[#F5C4C0] disabled:pointer-events-none text-white text-base font-semibold transition-all rounded"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request →'}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#A8A8A4]">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  Your information is encrypted and never shared without your consent.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}
