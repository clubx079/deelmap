'use client'
import { useState } from 'react'
import { X, AlertCircle, Check, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${
                active || done ? 'bg-[#D03839] text-white' : 'bg-white border border-[#E8E8E4] text-[#737370]'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-[14px] font-medium ${active || done ? 'text-[#1A1816]' : 'text-[#737370]'}`}>
                {labels[i]}
              </span>
            </div>
            {i < 2 && (
              <div className={`h-[1px] flex-1 mx-3 ${step > s ? 'bg-[#D03839]' : 'bg-[#E8E8E4]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MakeOfferModal({ isOpen, onClose, property, conversationId, user }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdConversationId, setCreatedConversationId] = useState(conversationId || null)

  // Step 1
  const [amount, setAmount] = useState('')
  const [closingTimeline, setClosingTimeline] = useState('30 days')
  const [financingType, setFinancingType] = useState('Cash')

  // Step 2
  const [earnestMoney, setEarnestMoney] = useState('')
  const [inspectionPeriod, setInspectionPeriod] = useState('10 days')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const propertyTitle = property?.full_address || property?.display_address ||
    `${property?.address || ''}, ${property?.city || ''}, ${property?.state || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
  const listedPrice = property?.price || property?.purchase_price || null
  const thumbnailUrl = property?.property_photos?.[0]
    ? (property.property_photos[0].photo_url || property.property_photos[0].url || null)
    : null

  const getAuthHeader = () => {
    if (user?.id) return { Authorization: `Bearer ${user.id}` }
    try {
      const raw = localStorage.getItem('deelmap_user') || localStorage.getItem('user')
      const u = raw ? JSON.parse(raw) : null
      if (u?.id) return { Authorization: `Bearer ${u.id}` }
    } catch {}
    return {}
  }

  const handleStep1Continue = () => {
    const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''))
    if (!numericAmount || numericAmount <= 0) { setError('Please enter a valid offer price'); return }
    setError('')
    setStep(2)
  }

  const handleStep2Continue = () => {
    const numericEarnest = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))
    if (!numericEarnest || numericEarnest <= 0) { setError('Please enter an earnest money amount'); return }
    setError('')
    setStep(3)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' }
      let convId = createdConversationId

      // If no conversation yet, create one first
      if (!convId && property?.seller_id) {
        const sellerId = property.temp_seller_id || property.seller_id
        const convRes = await fetch('/api/buyer/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'create_conversation',
            sellerId,
            propertyId: property.id,
            propertyAddress: propertyTitle,
          }),
        })
        const convData = await convRes.json()
        if (!convData.conversationId) throw new Error('Failed to start conversation with seller')
        convId = convData.conversationId
        setCreatedConversationId(convId)
      }

      const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''))
      const numericEarnest = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))

      const offerRes = await fetch('/api/buyer/offers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation_id: convId,
          property_id: property?.id,
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

  const handleClose = () => {
    setStep(1); setAmount(''); setClosingTimeline('30 days'); setFinancingType('Cash')
    setEarnestMoney(''); setInspectionPeriod('10 days'); setNotes('')
    setError(''); setSuccess(false); setSubmitting(false)
    onClose()
  }

  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''))
  const numericEarnest = Number(String(earnestMoney).replace(/[^0-9.]/g, ''))

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
      <div
        className="bg-white rounded w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {!success && (
          <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FAFAF8] transition-colors z-10">
            <X className="w-5 h-5 text-[#737370]" />
          </button>
        )}

        <div className="p-6 sm:p-8">
          {/* Success Screen */}
          {success ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#E6F4F0] flex items-center justify-center mb-5">
                <Check className="w-6 h-6 text-[#16A34A]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[22px] font-bold text-[#1A1816] mb-3">Offer submitted successfully</h2>
              <p className="text-[14px] text-[#737370] mb-8 max-w-[340px]">
                The seller will review your offer and respond soon. You'll be notified when there's an update.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/marketplace')}
                  className="flex items-center gap-2 px-5 py-2.5 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#444441] hover:bg-[#FAFAF8] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Browse deals
                </button>
                <button
                  onClick={() => { router.push(`/buyer/inbox?conversation=${createdConversationId || ''}`); handleClose() }}
                  className="px-5 py-2.5 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white rounded text-[14px] font-semibold transition-colors"
                >
                  View Messages
                </button>
              </div>
            </div>
          ) : (
            <>
              <StepBar step={step} />

              {/* Step 1 — Offer */}
              {step === 1 && (
                <>
                  <h2 className="text-[22px] font-bold text-[#1A1816] mb-1">Make an offer</h2>
                  <p className="text-[14px] text-[#737370] mb-6">Submit your offer for your property</p>

                  {/* Property card */}
                  <div className="flex items-center gap-3 border border-[#E8E8E4] rounded p-3 mb-6">
                    <div className="w-16 h-16 rounded bg-[#FAFAF8] flex-shrink-0 overflow-hidden">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt="Property" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#E8E8E4]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1816] truncate">{propertyTitle || 'Property'}</p>
                      {listedPrice && (
                        <p className="text-[13px] text-[#D03839] font-medium">
                          Listed at {formatCurrency(listedPrice) || `$${Number(listedPrice).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Offer Price */}
                  <div className="mb-5">
                    <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">
                      Offer Price <span className="text-[#D03839]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[14px]">$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          setAmount(raw ? Number(raw).toLocaleString() : '')
                        }}
                        placeholder="135,000"
                        className="w-full pl-7 pr-4 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                      />
                    </div>
                  </div>

                  {/* Closing Timeline */}
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

                  {/* Financial Type */}
                  <div className="mb-6">
                    <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">Financial Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Cash', 'Loan'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFinancingType(type)}
                          className={`flex items-center gap-2 px-4 py-3 border rounded text-[14px] font-medium transition-colors ${
                            financingType === type
                              ? 'border-[#D03839] text-[#D03839] bg-white'
                              : 'border-[#E8E8E4] text-[#444441] bg-white hover:border-[#D03839]/30'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            financingType === type ? 'border-[#D03839]' : 'border-[#A8A8A4]'
                          }`}>
                            {financingType === type && <div className="w-2 h-2 rounded-full bg-[#D03839]" />}
                          </div>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}
                  <button
                    onClick={handleStep1Continue}
                    className="w-full py-3.5 bg-[#1A1816] text-white text-[14px] font-semibold rounded hover:bg-[#2A2824] transition-colors"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Step 2 — Details */}
              {step === 2 && (
                <>
                  <h2 className="text-[22px] font-bold text-[#1A1816] mb-1">Add deal details</h2>
                  <p className="text-[14px] text-[#737370] mb-6">Provide additional terms to strengthen your offer</p>

                  {/* Earnest Money */}
                  <div className="mb-5">
                    <label className="block text-[14px] font-medium text-[#1A1816] mb-1.5">
                      Earnest money <span className="text-[#D03839]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-[14px]">$</span>
                      <input
                        type="text"
                        value={earnestMoney}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          setEarnestMoney(raw ? Number(raw).toLocaleString() : '')
                        }}
                        placeholder="2,500"
                        className="w-full pl-7 pr-4 py-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)]"
                      />
                    </div>
                  </div>

                  {/* Inspection Period */}
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

                  {/* Additional Notes */}
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
                    <button
                      onClick={() => { setError(''); setStep(1) }}
                      className="flex items-center gap-2 px-5 py-3 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#737370] hover:bg-[#FAFAF8] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={handleStep2Continue}
                      className="flex-1 py-3 bg-[#1A1816] text-white text-[14px] font-semibold rounded hover:bg-[#2A2824] transition-colors"
                    >
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
                      { label: 'Property', value: propertyTitle || 'Property' },
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

                  {/* Warning */}
                  <div className="flex items-start gap-2.5 bg-[#FEF9EC] border border-[#F5D78E] rounded px-4 py-3 mb-6">
                    <AlertCircle className="w-4 h-4 text-[#B5620A] flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#B5620A] font-medium">Once submitted, your offer will be visible to the seller immediately.</p>
                  </div>

                  {error && <p className="text-[13px] text-[#D03839] mb-4">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setError(''); setStep(2) }}
                      className="flex items-center gap-2 px-5 py-3 border border-[#E8E8E4] rounded text-[14px] font-medium text-[#737370] hover:bg-[#FAFAF8] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 py-3 bg-[#1A1816] text-white text-[14px] font-semibold rounded hover:bg-[#2A2824] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Offer'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
