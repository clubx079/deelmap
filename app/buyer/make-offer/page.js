'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const CLOSING_OPTIONS = ['30 days', '45 days', '60 days', 'As-is']
const INSPECTION_OPTIONS = ['5 days', '10 days', '15 days', 'Waived']

function formatCurrency(amount) {
  if (!amount) return ''
  const n = Number(String(amount).replace(/[^0-9.]/g, ''))
  if (isNaN(n) || n === 0) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function StepBar({ step }) {
  const labels = ['Offer', 'Details', 'Review']
  return (
    <div className="flex items-center mb-8">
      {[1, 2, 3].map((s, i) => {
        const done = step > s
        const active = step === s
        return (
          <div key={s} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${active || done ? 'bg-[#D03839] text-white' : 'bg-white border border-[#E8E8E4] text-[#737370]'}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-[14px] font-medium ${active || done ? 'text-[#1A1816]' : 'text-[#737370]'}`}>
                {labels[i]}
              </span>
            </div>
            {i < 2 && <div className={`h-[1px] flex-1 mx-3 ${step > s ? 'bg-[#D03839]' : 'bg-[#E8E8E4]'}`} />}
          </div>
        )
      })}
    </div>
  )
}

function MakeOfferContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const propertyId = searchParams.get('property_id')
  const propertySlug = searchParams.get('slug')
  const sellerId = searchParams.get('seller_id')

  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdConversationId, setCreatedConversationId] = useState(null)

  // Step 1
  const [amount, setAmount] = useState('')
  const [closingTimeline, setClosingTimeline] = useState('30 days')
  const [financingType, setFinancingType] = useState('Cash')

  // Step 2
  const [earnestMoney, setEarnestMoney] = useState('')
  const [inspectionPeriod, setInspectionPeriod] = useState('10 days')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    Promise.all([
      supabase
        .from('wholesale_deals')
        .select('id, slug, price, full_address, address, city, state, temp_seller_id')
        .eq('id', propertyId)
        .maybeSingle(),
      supabase
        .from('property_photos')
        .select('photo_url, optimized_url, is_featured')
        .eq('deal_id', propertyId)
        .order('is_featured', { ascending: false })
        .limit(5)
    ]).then(async ([{ data: deal }, { data: photos }]) => {
      if (deal) {
        setProperty({ ...deal, property_photos: photos || [] })
        if (deal.price) setAmount(Math.round(Number(deal.price)).toLocaleString())
        setLoading(false)
        return
      }
      // Fallback: try properties table (manual listings)
      const [{ data: manualDeal }, { data: manualImgs }] = await Promise.all([
        supabase
          .from('properties')
          .select('id, slug, price, address, state, seller_id')
          .eq('id', propertyId)
          .maybeSingle(),
        supabase
          .from('property_images')
          .select('image_url, sort_order')
          .eq('property_id', propertyId)
          .order('sort_order', { ascending: true })
          .limit(5)
      ])
      if (manualDeal) {
        const mappedPhotos = (manualImgs || []).map(img => ({
          photo_url: img.image_url,
          optimized_url: null,
          is_featured: false,
        }))
        setProperty({
          ...manualDeal,
          full_address: [manualDeal.address, manualDeal.state].filter(Boolean).join(', '),
          city: null,
          property_photos: mappedPhotos,
        })
        if (manualDeal.price) setAmount(Math.round(Number(manualDeal.price)).toLocaleString())
      }
      setLoading(false)
    })
  }, [propertyId])

  const propertyTitle = property
    ? (property.full_address || `${property.address || ''}, ${property.city || ''}, ${property.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''))
    : 'Property'
  const listedPrice = property?.price || null
  const featuredPhoto = property?.property_photos?.find(p => p?.is_featured) || property?.property_photos?.[0]
  const thumbnailUrl = featuredPhoto ? (featuredPhoto.optimized_url || featuredPhoto.photo_url) : null
  // Use seller_id from URL params first, then fall back to what's on the property record
  const effectiveSellerId = sellerId || property?.temp_seller_id || property?.seller_id || null

  const handleStep1Continue = () => {
    const n = Number(String(amount).replace(/[^0-9.]/g, ''))
    if (!n || n <= 0) { setError('Please enter a valid offer price'); return }
    setError(''); setStep(2)
  }

  const handleStep2Continue = () => {
    const n = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))
    if (!n || n <= 0) { setError('Please enter an earnest money amount'); return }
    setError(''); setStep(3)
  }

  const handleSubmit = async () => {
    setSubmitting(true); setError('')
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.id}` }
      let convId = null

      if (!effectiveSellerId) throw new Error('No seller linked to this property. Please contact support.')

      const convRes = await fetch('/api/buyer/chat', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'create_conversation', sellerId: effectiveSellerId, propertyId, propertyAddress: propertyTitle }),
      })
      const convData = await convRes.json()
      if (!convData.conversationId) throw new Error('Failed to start conversation with seller')
      convId = convData.conversationId
      setCreatedConversationId(convId)

      const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''))
      const numericEarnest = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))

      const offerRes = await fetch('/api/buyer/offers', {
        method: 'POST', headers,
        body: JSON.stringify({
          conversation_id: convId,
          property_id: propertyId,
          amount: numericAmount,
          closing_timeline: closingTimeline,
          financing_type: financingType,
          earnest_money: numericEarnest || null,
          inspection_period: inspectionPeriod,
          notes: notes || null,
        }),
      })
      const offerData = await offerRes.json()
      if (!offerRes.ok || offerData.error) throw new Error(offerData.error || 'Failed to submit offer')
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''))
  const numericEarnest = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))
  const backHref = propertySlug ? `/${propertySlug}` : propertyId ? `/${propertyId}` : '/marketplace'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E8E4] border-t-[#D03839] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#FAFAF8] flex items-center justify-center py-8">
      <div className="w-full max-w-2xl px-4 sm:px-6">
        {success ? (
          /* Success screen */
          <div className="bg-white border border-[#E8E8E4] rounded p-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E4F5EC] flex items-center justify-center mb-5">
              <Check className="w-6 h-6 text-[#0F6E56]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[22px] font-bold text-[#1A1816] mb-3">Offer submitted successfully</h2>
            <p className="text-[14px] text-[#737370] mb-8 max-w-[340px]">
              The seller will review your offer and respond soon. You&apos;ll be notified when there&apos;s an update.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/marketplace"
                className="flex items-center gap-2 px-5 py-2.5 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#444441] hover:bg-[#FAFAF8] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Browse deals
              </Link>
              <Link
                href={`/buyer/inbox${createdConversationId ? `?conversation=${createdConversationId}` : ''}`}
                className="px-5 py-2.5 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white rounded text-[14px] font-semibold transition-colors"
              >
                View Messages
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E8E4] rounded p-6 sm:p-8">
            <StepBar step={step} />

            {/* Step 1 — Offer */}
            {step === 1 && (
              <>
                <h2 className="text-[22px] font-bold text-[#1A1816] mb-1">Make an offer</h2>
                <p className="text-[14px] text-[#737370] mb-6">Submit your offer for your property</p>

                {/* Property card */}
                <div className="flex items-center gap-3 border border-[#E8E8E4] rounded p-3 mb-6">
                  <div className="w-16 h-16 rounded bg-[#FAFAF8] flex-shrink-0 overflow-hidden">
                    {thumbnailUrl
                      ? <img src={thumbnailUrl} alt="Property" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-[#E8E8E4]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1816] truncate">{propertyTitle}</p>
                    {listedPrice && (
                      <p className="text-[13px] text-[#D03839] font-medium">
                        Listed at {formatCurrency(listedPrice) || `$${Number(listedPrice).toLocaleString()}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">
                    Offer Price <span className="text-[#D03839]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[14px]">$</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setAmount(r ? Number(r).toLocaleString() : '') }}
                      placeholder="135,000"
                      className="w-full pl-7 pr-4 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">Closing Timeline</label>
                  <select
                    value={closingTimeline}
                    onChange={e => setClosingTimeline(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] bg-white focus:outline-none focus:border-[#D03839] appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737370' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    {CLOSING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">Financial Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Cash', 'Loan'].map(type => (
                      <button key={type} type="button" onClick={() => setFinancingType(type)}
                        className={`flex items-center gap-2 px-4 py-3 border rounded text-[14px] font-medium transition-colors ${financingType === type ? 'border-[#D03839] text-[#D03839]' : 'border-[#E8E8E4] text-[#444441] hover:border-[#D03839]/30'}`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${financingType === type ? 'border-[#D03839]' : 'border-[#A8A8A4]'}`}>
                          {financingType === type && <div className="w-2 h-2 rounded-full bg-[#D03839]" />}
                        </div>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}
                <button onClick={handleStep1Continue} className="w-full py-3.5 bg-[#1A1816] hover:bg-[#2A2824] text-white text-[14px] font-semibold rounded transition-colors">
                  Continue
                </button>
              </>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
              <>
                <h2 className="text-[22px] font-bold text-[#1A1816] mb-1">Add deal details</h2>
                <p className="text-[14px] text-[#737370] mb-6">Provide additional terms to strengthen your offer</p>

                <div className="mb-5">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">
                    Earnest money <span className="text-[#D03839]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[14px]">$</span>
                    <input
                      type="text"
                      value={earnestMoney}
                      onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setEarnestMoney(r ? Number(r).toLocaleString() : '') }}
                      placeholder="2,500"
                      className="w-full pl-7 pr-4 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">Inspection period</label>
                  <select
                    value={inspectionPeriod}
                    onChange={e => setInspectionPeriod(e.target.value)}
                    className="w-full px-3 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] bg-white focus:outline-none focus:border-[#D03839] appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737370' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">Additional notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Waiving inspection contingency. Ready to close in 3 weeks if needed."
                    rows={4}
                    className="w-full px-3 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] resize-none focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)] placeholder-[#A8A8A4]"
                  />
                </div>

                {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setError(''); setStep(1) }} className="flex items-center gap-2 px-5 py-3 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#737370] hover:bg-[#FAFAF8] transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleStep2Continue} className="flex-1 py-3 bg-[#1A1816] hover:bg-[#2A2824] text-white text-[14px] font-semibold rounded transition-colors">
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <>
                <h2 className="text-[22px] font-bold text-[#1A1816] mb-1">Review your offer</h2>
                <p className="text-[14px] text-[#737370] mb-6">Confirm the details before submitting</p>

                <div className="border border-[#E8E8E4] rounded overflow-hidden mb-4">
                  {[
                    { label: 'Property', value: propertyTitle },
                    { label: 'Offer price', value: formatCurrency(numericAmount) || `$${numericAmount.toLocaleString()}`, red: true },
                    { label: 'Closing timeline', value: closingTimeline },
                    { label: 'Financing', value: financingType },
                    { label: 'Earnest money', value: formatCurrency(numericEarnest) || `$${numericEarnest.toLocaleString()}` },
                    { label: 'Inspection', value: inspectionPeriod },
                    ...(notes ? [{ label: 'Notes', value: notes }] : []),
                  ].map(({ label, value, red }, i, arr) => (
                    <div key={label} className={`flex justify-between gap-4 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#E8E8E4]' : ''}`}>
                      <span className="text-[14px] text-[#737370] flex-shrink-0">{label}</span>
                      <span className={`text-[14px] font-medium text-right ${red ? 'text-[#D03839]' : 'text-[#1A1816]'}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2.5 bg-[#FEF9EC] border border-[#F5D78E] rounded px-4 py-3 mb-6">
                  <AlertCircle className="w-4 h-4 text-[#B5620A] flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[#B5620A] font-medium">Once submitted, your offer will be visible to the seller immediately.</p>
                </div>

                {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => { setError(''); setStep(2) }} className="flex items-center gap-2 px-5 py-3 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#737370] hover:bg-[#FAFAF8] transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 py-3 bg-[#1A1816] hover:bg-[#2A2824] text-white text-[14px] font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Offer'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MakeOfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E8E4] border-t-[#D03839] rounded-full animate-spin" />
      </div>
    }>
      <MakeOfferContent />
    </Suspense>
  )
}
