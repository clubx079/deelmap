'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext'
import Link from 'next/link'
import { CreditCard, Check, AlertCircle, Loader2, ExternalLink, Receipt } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
)

const labelCls = 'block text-[12px] font-semibold text-[#737370] uppercase tracking-[0.08em] mb-1'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function BuyerBillingPage() {
  const { user } = useAuth()
  const { setPageTitle } = useBuyerPageTitle()
  const [purchases, setPurchases] = useState([])
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pmLoading, setPmLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (setPageTitle) setPageTitle('Billing')
  }, [setPageTitle])

  useEffect(() => {
    if (!user) return
    loadBilling()
  }, [user])

  const loadBilling = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load listing purchases from payments table
      const { data: listings } = await supabase
        .from('payments')
        .select('id, amount, currency, status, description, created_at, stripe_payment_intent_id, properties(seo_title, address, city, state)')
        .eq('user_id', user.id)
        .eq('user_type', 'buyer')
        .order('created_at', { ascending: false })
        .limit(20)

      setPurchases(listings || [])

      // Load saved payment method via server-side lookup
      setPmLoading(true)
      const res = await fetch('/api/buyer/billing/payment-methods', {
        headers: { 'x-user-id': user.id },
      })
      if (res.ok) {
        const d = await res.json()
        setPaymentMethod(d.default_payment_method || null)
      }
      setPmLoading(false)
    } catch (err) {
      setError('Failed to load billing information.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div>
        <h1 className="text-[20px] font-bold text-[#1A1816] tracking-tight">Billing</h1>
        <p className="text-[13px] text-[#737370] mt-0.5">Your listing purchases and payment information.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[13px] text-[#D03839]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-white border border-[#E8E8E4] rounded p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#A8A8A4] mb-4">Saved Payment Method</p>
        {pmLoading ? (
          <div className="flex items-center gap-2 text-[#737370] text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-[#F3F3F0] border border-[#E8E8E4] rounded flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#737370]" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1816] capitalize">
                  {paymentMethod.brand} •••• {paymentMethod.last4}
                </p>
                <p className="text-[12px] text-[#737370]">
                  Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0F6E56] bg-[#E4F5EC] px-2 py-0.5 rounded border border-[#9FDBB8]">
              <Check className="w-3 h-3" /> Saved
            </span>
          </div>
        ) : (
          <p className="text-[13px] text-[#737370]">No saved payment method. Your card is saved automatically when you post a listing.</p>
        )}
      </div>

      {/* Purchase History */}
      <div className="bg-white border border-[#E8E8E4] rounded p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#A8A8A4] mb-4">Purchase History</p>
        {loading ? (
          <div className="flex items-center gap-2 text-[#737370] text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-6">
            <Receipt className="w-8 h-8 text-[#A8A8A4] mx-auto mb-2" />
            <p className="text-[13px] text-[#737370]">No purchases yet.</p>
            <Link href="/buyer/listings?new=1" className="mt-3 inline-flex items-center gap-1.5 px-4 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors">
              Post your first deal
            </Link>
          </div>
        ) : (
          <div className="-mx-5 -mb-5">
            {purchases.map((item, i) => {
              const prop = item.properties
              let breakdown = null
              try { breakdown = JSON.parse(item.description) } catch {}

              const title = prop?.seo_title || breakdown?.title || prop?.address || 'Listing'
              const cityState = [prop?.city || breakdown?.city, prop?.state || breakdown?.state].filter(Boolean).join(', ')
              const addons = breakdown?.addons?.filter(a => a.amount > 0) || []

              const originalTotal = breakdown
                ? (breakdown.base?.amount || 0) + addons.reduce((s, a) => s + (a.amount || 0), 0)
                : 0
              const hasDiscount = originalTotal > 0 && originalTotal !== item.amount

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 px-5 py-4 ${i !== purchases.length - 1 ? 'border-b border-[#F3F3F0]' : ''} hover:bg-[#FAFAF8] transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#F3F3F0] flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-4 h-4 text-[#737370]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1816] truncate">{title}</p>
                      <p className="text-[11px] text-[#A8A8A4] mt-0.5">
                        {formatDate(item.created_at)}
                        {cityState && <span className="ml-2 text-[#C4C4C0]">·</span>}
                        {cityState && <span className="ml-2">{cityState}</span>}
                        {addons.length > 0 && <span className="ml-2 text-[#C4C4C0]">·</span>}
                        {addons.length > 0 && <span className="ml-2">{addons.map(a => a.label).join(', ')}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 sm:ml-4">
                    <div className="text-right">
                      {hasDiscount && (
                        <p className="text-[11px] text-[#A8A8A4] line-through">{formatCents(originalTotal)}</p>
                      )}
                      <p className="text-[13px] font-bold text-[#1A1816]">{formatCents(item.amount)}</p>
                      {hasDiscount && (
                        <p className="text-[11px] text-[#0F6E56] font-medium">−{formatCents(originalTotal - item.amount)} discount</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      item.status === 'succeeded' ? 'bg-[#E4F5EC] text-[#0F6E56] border-[#9FDBB8]' : 'bg-[#F3F3F0] text-[#737370] border-[#E8E8E4]'
                    }`}>
                      {item.status === 'succeeded' ? 'Paid' : item.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
