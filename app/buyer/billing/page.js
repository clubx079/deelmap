'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext'
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
            <a href="/buyer/listings?new=1" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors">
              Post your first deal
            </a>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E4]">
            {purchases.map((item) => {
              const prop = item.properties

              // Parse structured breakdown if available, fall back to plain string
              let breakdown = null
              try { breakdown = JSON.parse(item.description) } catch {}

              const title = prop?.seo_title || breakdown?.title || prop?.address || 'Listing'
              const address = prop?.address || breakdown?.address || ''
              const location = address ? '' : [prop?.city || breakdown?.city, prop?.state || breakdown?.state].filter(Boolean).join(', ')

              const lineItems = breakdown
                ? [breakdown.base, ...(breakdown.addons || [])].filter(Boolean)
                : null

              return (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1816]">{title}</p>
                      {address && <p className="text-[12px] text-[#737370] mt-0.5">{address}{location ? `, ${location}` : ''}</p>}
                      {!address && location && <p className="text-[12px] text-[#737370] mt-0.5">{location}</p>}
                      <p className="text-[11px] text-[#A8A8A4] mt-0.5">{formatDate(item.created_at)}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#1A1816] flex-shrink-0">{formatCents(item.amount)}</p>
                  </div>
                  {lineItems && (
                    <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded px-3 py-2">
                      <div className="space-y-1.5">
                        {lineItems.map((line, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-[#1A1816]">{line.label}</span>
                            <span className="text-[12px] font-semibold text-[#1A1816]">{formatCents(line.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#E8E8E4] mt-2 pt-2 flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[#1A1816]">Total</span>
                        <span className="text-[12px] font-bold text-[#1A1816]">{formatCents(lineItems.reduce((s, l) => s + (l.amount || 0), 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
