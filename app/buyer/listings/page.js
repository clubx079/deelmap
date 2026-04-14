'use client'
import { useState, useEffect, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'
import { Plus, Pencil, Trash2, X, Home, MapPin, Eye, BarChart2, FileText, Sparkles, TrendingUp, Zap, Package, Check, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import PostDealForm from '@/components/buyer/PostDealForm'
import PropertyAnalyticsSidebar from '@/components/buyer/PropertyAnalyticsSidebar'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const ENHANCE_ADD_ONS = [
  { id: 'highlight', label: 'Highlight Listing',       desc: 'Red-bordered card in search results',        price: 999,  icon: Sparkles },
  { id: 'homepage',  label: 'Feature on Homepage',     desc: 'Rotates in featured section for 7 days',     price: 2900, icon: TrendingUp },
  { id: 'boost',     label: 'Boost Listing',           desc: 'Top of search results for 7 days',           price: 1499, icon: Zap },
  { id: 'bundle',    label: 'Highlight + Boost Bundle', desc: 'Both above at a discount (saves $2.98)',    price: 2200, icon: Package },
]

// ─── Enhance checkout form (Stripe) ──────────────────────────────────────────
function EnhanceCheckoutForm({ listingId, selectedAddOns, totalCents, userId, onSuccess, onBack }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) { setError(submitError.message); setProcessing(false); return }
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
      if (confirmError) { setError(confirmError.message); setProcessing(false); return }
      if (paymentIntent?.status === 'succeeded') {
        const res = await fetch('/api/buyer/listings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ id: listingId, action: 'enhance', add_ons: selectedAddOns }),
        })
        const d = await res.json()
        if (!d.success) { setError('Payment succeeded but update failed. Contact support.'); setProcessing(false); return }
        onSuccess()
      }
    } catch { setError('Something went wrong. Please try again.') }
    setProcessing(false)
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-[#1A1816] mb-1">Payment Details</p>
        <p className="text-[13px] text-[#737370] mb-4">Your card will be charged <span className="font-semibold text-[#1A1816]">${(totalCents / 100).toFixed(2)}</span>.</p>
        <PaymentElement />
      </div>
      {error && <div className="p-3 bg-[#FEF0EF] border border-[#F5C0BF] rounded text-[13px] text-[#D03839]">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full h-[46px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[14px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing
          ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Processing...</>
          : <>Confirm & Pay — ${(totalCents / 100).toFixed(2)}</>}
      </button>
      <button type="button" onClick={onBack} className="w-full text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors text-center">
        ← Back to add-ons
      </button>
    </form>
  )
}

// ─── Enhance full-page view ───────────────────────────────────────────────────
function EnhancePage({ listing, user, onBack, onSuccess }) {
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [clientSecret, setClientSecret] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [showPayment, setShowPayment] = useState(false)

  const totalCents = selectedAddOns.reduce((sum, id) => {
    const a = ENHANCE_ADD_ONS.find(x => x.id === id)
    return sum + (a?.price || 0)
  }, 0)

  const toggle = (id) => {
    setSelectedAddOns(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id)
      let next = [...prev, id]
      if (id === 'bundle') next = next.filter(a => a !== 'highlight' && a !== 'boost')
      if (id === 'highlight' || id === 'boost') next = next.filter(a => a !== 'bundle')
      return next
    })
    if (showPayment) { setShowPayment(false); setClientSecret(null) }
  }

  const proceedToPayment = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/buyer/listings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ listing_id: listing.id, add_ons: selectedAddOns, amount: totalCents }),
      })
      const d = await res.json()
      if (d.clientSecret) { setClientSecret(d.clientSecret); setShowPayment(true) }
      else setErr(d.error || 'Failed to initialize payment')
    } catch { setErr('Failed to initialize payment') }
    setLoading(false)
  }

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-[#737370] hover:bg-[#F3F3F0] hover:text-[#1A1816] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[20px] font-bold text-[#1A1816] tracking-[-0.4px]">Enhance Listing</h1>
          <p className="text-[13px] text-[#737370] truncate max-w-[400px]">{listing.address || listing.seo_title || 'Listing'}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* Left — add-ons or payment form */}
        <div className="bg-white border border-[#E8E8E4] rounded-xl p-6">
          {showPayment && clientSecret ? (
            stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <EnhanceCheckoutForm
                  listingId={listing.id}
                  selectedAddOns={selectedAddOns}
                  totalCents={totalCents}
                  userId={user.id}
                  onSuccess={onSuccess}
                  onBack={() => { setShowPayment(false); setClientSecret(null) }}
                />
              </Elements>
            ) : (
              <div className="p-4 bg-[#FEF3E2] border border-[#F5D9A0] rounded text-[13px] text-[#B5620A] text-center">
                Stripe is not configured.
              </div>
            )
          ) : (
            <>
              <p className="text-[15px] font-semibold text-[#1A1816] mb-0.5">Choose add-ons</p>
              <p className="text-[13px] text-[#737370] mb-5">Select one or more upgrades to boost your listing's visibility.</p>
              <div className="space-y-3">
                {ENHANCE_ADD_ONS.map(({ id, label, desc, price, icon: Icon }) => {
                  const selected = selectedAddOns.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      className={`w-full flex items-center gap-4 p-4 border rounded-lg text-left transition-all ${selected ? 'border-[#D03839] bg-[#FEF0EF]' : 'border-[#E8E8E4] hover:border-[#D4D4CF] bg-white'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#D03839]' : 'bg-[#F3F3F0]'}`}>
                        <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-[#737370]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A1816]">{label}</p>
                        <p className="text-[12px] text-[#737370]">{desc}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[14px] font-bold text-[#1A1816]">${(price / 100).toFixed(2)}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[#D03839] bg-[#D03839]' : 'border-[#D4D4CF]'}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Right — order summary */}
        <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
          <div className="p-4 bg-[#FAFAF8] border-b border-[#E8E8E4]">
            <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-widest mb-2">Your Listing</p>
            <p className="text-[13px] font-semibold text-[#1A1816] truncate">{listing.address || listing.seo_title || 'Listing'}</p>
            {listing.price && (
              <p className="text-[12px] text-[#737370] mt-0.5">${Number(listing.price).toLocaleString()}</p>
            )}
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-widest mb-3">Order Summary</p>
            {selectedAddOns.length === 0 ? (
              <p className="text-[13px] text-[#A8A8A4]">No add-ons selected</p>
            ) : (
              <div className="space-y-2">
                {selectedAddOns.map(id => {
                  const addon = ENHANCE_ADD_ONS.find(a => a.id === id)
                  if (!addon) return null
                  return (
                    <div key={id} className="flex justify-between items-center">
                      <span className="text-[12px] text-[#444441]">{addon.label}</span>
                      <span className="text-[12px] font-medium text-[#1A1816]">${(addon.price / 100).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-[#E8E8E4]">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-[13px] font-semibold text-[#1A1816]">Total</span>
              <span className="text-[20px] font-bold text-[#1A1816]">${(totalCents / 100).toFixed(2)}</span>
            </div>
            {!showPayment && (
              <>
                {err && <div className="mb-3 p-2.5 bg-[#FEF0EF] border border-[#F5C0BF] rounded text-[12px] text-[#D03839]">{err}</div>}
                <button
                  type="button"
                  onClick={proceedToPayment}
                  disabled={selectedAddOns.length === 0 || loading}
                  className="w-full h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Preparing...</>
                    : <>Proceed to Payment</>}
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <svg className="w-3 h-3 text-[#A8A8A4]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[11px] text-[#A8A8A4]">Secured by Stripe</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MyListingsPage() {
  const { user } = useAuth()
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(() => false)
  const [editListing, setEditListing] = useState(null)
  const [enhanceListing, setEnhanceListing] = useState(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      router.replace('/buyer/listings', { scroll: false })
    }
  }, [searchParams, router])

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [analyticTarget, setAnalyticTarget] = useState(null)

  useEffect(() => {
    setPageTitle(
      showForm ? 'Post a Deal'
      : editListing ? 'Edit Listing'
      : enhanceListing ? 'Enhance Listing'
      : 'My Listings'
    )
  }, [setPageTitle, showForm, editListing, enhanceListing])

  const fetchListings = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/buyer/listings', { headers: { 'x-user-id': user.id } })
      const data = await res.json()
      if (data.success) setListings(data.listings || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [user?.id])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/buyer/listings?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      })
      if (res.ok) {
        setListings(prev => prev.filter(l => l.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch {}
    setDeleting(false)
  }

  const getFeaturedImage = (listing) => {
    const images = listing.property_images || []
    return [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url || null
  }

  // Full-page views (replace the listings table)
  if (showForm || editListing) {
    return (
      <PostDealForm
        user={user}
        existing={editListing}
        onClose={() => { setShowForm(false); setEditListing(null); fetchListings() }}
        onSuccess={() => { setShowForm(false); setEditListing(null); fetchListings() }}
      />
    )
  }

  if (enhanceListing) {
    return (
      <EnhancePage
        listing={enhanceListing}
        user={user}
        onBack={() => setEnhanceListing(null)}
        onSuccess={() => { fetchListings(); setEnhanceListing(null) }}
      />
    )
  }

  // Enhancement tags helper
  const EnhanceTags = ({ listing }) => {
    const tags = []
    if (listing.is_highlighted)       tags.push({ label: '⭐ Highlighted', cls: 'bg-[#FEF0EF] text-[#D03839] border-[#F5C0BF]' })
    if (listing.is_boosted)           tags.push({ label: '⚡ Boosted',     cls: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]' })
    if (listing.is_homepage_featured) tags.push({ label: '🏠 Featured',    cls: 'bg-[#E4F5EC] text-[#0F6E56] border-[#B6E4CE]' })
    if (!tags.length) return null
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map(t => (
          <span key={t.label} className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium border ${t.cls}`}>
            {t.label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">My Listings</h1>
          <p className="text-[14px] text-[#737370] mt-1">
            {loading ? 'Loading...' : `${listings.length} propert${listings.length !== 1 ? 'ies' : 'y'} posted`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 h-[40px] px-4 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Post a Deal
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-[#E8E8E4] overflow-hidden">

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#FAFAF8] border-b border-[#E8E8E4]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Status & Enhancements</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#444441] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E4]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-4 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-[#E8E8E4] rounded-lg flex-shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-36 bg-[#E8E8E4] rounded" />
                          <div className="h-2.5 w-20 bg-[#E8E8E4] rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-3 w-24 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-20 bg-[#E8E8E4] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-14 bg-[#E8E8E4] rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-[#E8E8E4] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-12 h-12 bg-[#F3F3F0] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Home className="w-6 h-6 text-[#A8A8A4]" />
                    </div>
                    <p className="text-[14px] font-medium text-[#1A1816] mb-1">No listings yet</p>
                    <p className="text-[13px] text-[#737370] mb-4">Post your first deal to reach buyers on the marketplace.</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 h-[38px] px-5 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Post a Deal
                    </button>
                  </td>
                </tr>
              ) : (
                listings.map((listing, index) => {
                  const img = getFeaturedImage(listing)
                  const isDraft = listing.status === 'draft'
                  const statusBadge = {
                    active:       { label: 'Active',          cls: 'bg-[#E4F5EC] text-[#0F6E56] border-[#B6E4CE]' },
                    under_review: { label: 'Under Review',    cls: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]' },
                    draft:        { label: 'Draft',           cls: 'bg-[#FEF9E7] text-[#B7860B] border-[#F5D87A]' },
                    rejected:     { label: 'Update Required', cls: 'bg-[#FEF3E2] text-[#B5620A] border-[#F3C97D]' },
                    suspended:    { label: 'Suspended',       cls: 'bg-[#FEF0EF] text-[#D03839] border-[#F5C0BF]' },
                  }[listing.status] || { label: listing.status, cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' }
                  return (
                    <tr key={listing.id} className="hover:bg-[#FAFAF8] transition-colors">

                      {/* # */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-[#A8A8A4]">{index + 1}</span>
                      </td>

                      {/* Property */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F3F3F0] border border-[#E8E8E4] overflow-hidden flex-shrink-0">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-4 h-4 text-[#A8A8A4]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#1A1816] truncate max-w-[200px]">
                              {listing.seo_title || listing.address || 'No address'}
                            </p>
                            <p className="text-[11px] text-[#A8A8A4]">ID: {String(listing.id).split('-')[0]}</p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#A8A8A4] flex-shrink-0" />
                          <span className="text-[12px] text-[#444441] truncate max-w-[160px]">
                            {listing.address || listing.state || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] font-semibold text-[#1A1816]">
                          {listing.price ? `$${Number(listing.price).toLocaleString()}` : '—'}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] text-[#444441]">{listing.property_type || '—'}</span>
                      </td>

                      {/* Status + Enhancements */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                        <EnhanceTags listing={listing} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5">
                          {isDraft ? (
                            <button
                              onClick={() => setEditListing(listing)}
                              className="h-7 px-3 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
                            >
                              Complete
                            </button>
                          ) : (
                            <>
                              {listing.status === 'active' && (
                                <button
                                  onClick={() => setEnhanceListing(listing)}
                                  className="h-7 px-3 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors mr-1"
                                >
                                  Enhance
                                </button>
                              )}
                              <button
                                onClick={() => setAnalyticTarget(listing)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                                title="Analytics"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/${listing.slug || listing.id}`}
                                target="_blank"
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                                title="View listing"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              {(listing.inspection_report_url || listing.contract_url) && (
                                <a
                                  href={listing.inspection_report_url || listing.contract_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                                  title="View document"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => setEditListing(listing)}
                                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(listing)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[#E8E8E4]">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex gap-3">
                <div className="w-14 h-14 bg-[#E8E8E4] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-3/4 bg-[#E8E8E4] rounded" />
                  <div className="h-3 w-1/2 bg-[#E8E8E4] rounded" />
                  <div className="h-3 w-1/3 bg-[#E8E8E4] rounded" />
                </div>
              </div>
            ))
          ) : listings.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-[#F3F3F0] rounded-full flex items-center justify-center mx-auto mb-3">
                <Home className="w-6 h-6 text-[#A8A8A4]" />
              </div>
              <p className="text-[14px] font-medium text-[#1A1816] mb-1">No listings yet</p>
              <p className="text-[13px] text-[#737370] mb-4">Post your first deal to reach buyers.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 h-[38px] px-5 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post a Deal
              </button>
            </div>
          ) : (
            listings.map((listing) => {
              const img = getFeaturedImage(listing)
              const isDraftMobile = listing.status === 'draft'
              const statusBadgeMobile = {
                active:       { label: 'Active',          cls: 'bg-[#E4F5EC] text-[#0F6E56] border-[#B6E4CE]' },
                under_review: { label: 'Under Review',    cls: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]' },
                draft:        { label: 'Draft',           cls: 'bg-[#FEF9E7] text-[#B7860B] border-[#F5D87A]' },
                rejected:     { label: 'Update Required', cls: 'bg-[#FEF3E2] text-[#B5620A] border-[#F3C97D]' },
                suspended:    { label: 'Suspended',       cls: 'bg-[#FEF0EF] text-[#D03839] border-[#F5C0BF]' },
              }[listing.status] || { label: listing.status, cls: 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]' }
              return (
                <div key={listing.id} className="p-4 flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-[#F3F3F0] border border-[#E8E8E4] overflow-hidden flex-shrink-0">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-5 h-5 text-[#A8A8A4]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-[#1A1816] truncate">
                        {listing.seo_title || listing.address || 'No address'}
                      </p>
                      <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusBadgeMobile.cls}`}>
                        {statusBadgeMobile.label}
                      </span>
                    </div>
                    <EnhanceTags listing={listing} />
                    <p className="text-[12px] text-[#737370] mt-1 mb-2">
                      {listing.price ? `$${Number(listing.price).toLocaleString()}` : 'Price not set'}
                      {listing.property_type ? ` · ${listing.property_type}` : ''}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {!isDraftMobile && listing.status === 'active' && (
                        <button
                          onClick={() => setEnhanceListing(listing)}
                          className="h-6 px-2.5 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
                        >
                          Enhance
                        </button>
                      )}
                      {isDraftMobile ? (
                        <button
                          onClick={() => setEditListing(listing)}
                          className="h-6 px-2.5 text-[11px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
                        >
                          Complete
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setAnalyticTarget(listing)}
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/${listing.slug || listing.id}`}
                            target="_blank"
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {(listing.inspection_report_url || listing.contract_url) && (
                            <a
                              href={listing.inspection_report_url || listing.contract_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setEditListing(listing)}
                            className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#1A1816] hover:bg-[#F3F3F0] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteTarget(listing)}
                        className="flex items-center justify-center w-7 h-7 rounded text-[#A8A8A4] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Analytics sidebar */}
      {analyticTarget && (
        <PropertyAnalyticsSidebar
          propertyId={analyticTarget.id}
          propertyAddress={analyticTarget.seo_title || analyticTarget.address}
          userId={user?.id}
          onClose={() => setAnalyticTarget(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-[16px] font-bold text-[#1A1816] mb-2">Delete listing?</h3>
            <p className="text-[13px] text-[#737370] mb-5">
              This will permanently remove <span className="font-medium text-[#1A1816]">{deleteTarget.seo_title || deleteTarget.address || 'this listing'}</span> from the marketplace.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-[40px] border border-[#E8E8E4] rounded text-[13px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[40px] bg-[#D03839] hover:bg-[#C73022] rounded text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
