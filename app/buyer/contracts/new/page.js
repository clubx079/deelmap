'use client'

import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, FileText, Home, PenLine, Loader2, User, Users, Check, Send } from 'lucide-react'
import { DocusealForm } from '@docuseal/react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'
import { supabase } from '@/lib/supabase'
import { decorateTemplates } from '@/lib/contract-templates'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function fmtFee(cents) { return `$${((cents || 0) / 100).toFixed(2)}` }

// Stripe card form shown when the contract fee needs paying.
function ContractPayForm({ amount, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [err, setErr] = useState(null)
  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true); setErr(null)
    const { error: submitErr } = await elements.submit()
    if (submitErr) { setErr(submitErr.message); setProcessing(false); return }
    const { error: confirmErr } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (confirmErr) { setErr(confirmErr.message || 'Payment failed. Please try another card.'); setProcessing(false); return }
    onSuccess()
  }
  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {err && <div className="p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[13px] text-[#D03839]">{err}</div>}
      <button type="submit" disabled={!stripe || processing}
        className="w-full h-[48px] bg-[#D03839] hover:bg-[#B8102A] active:scale-[0.98] text-white text-[14px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {processing ? 'Processing…' : `Pay ${fmtFee(amount)} & send contract`}
      </button>
    </form>
  )
}

function fmtPrice(v) {
  if (v === '' || v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
function fmtDate(v) {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return v }
}
function acceptanceDefault() {
  const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10)
}
const todayISOf = () => new Date().toISOString().slice(0, 10)

const INPUT_CLS = 'w-full h-10 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20'
const LABEL_CLS = 'block text-[12px] font-semibold text-[#444441] mb-1.5'

// Party-role labels adapt to the contract type.
function roleLabels(isAssignment) {
  return isAssignment
    ? { buyer: 'Assignee', seller: 'Assignor' }
    : { buyer: 'Buyer', seller: 'Seller' }
}

export default function BuyerNewContractWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeDraftId = searchParams.get('draft_id')
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const { user } = useAuth()

  // Draft persistence — auto-save while editing, resume on reload
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [autoSaveError, setAutoSaveError] = useState(null)
  const [readyForAutoSave, setReadyForAutoSave] = useState(false)
  const inFlightSaveRef = useRef(false)

  const [step, setStep] = useState(1)

  // Step 1 — contract type + which side of the deal the creator is on
  const [templateId, setTemplateId] = useState('')
  const [contractRole, setContractRole] = useState('') // 'seller' | 'buyer'

  const [templates, setTemplates]               = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(true)

  const [properties, setProperties]             = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [propertyId, setPropertyId]             = useState('')
  const [manualAddress, setManualAddress]       = useState('')

  // Both parties collected explicitly. The creator's side is prefilled from their account.
  const [buyerName, setBuyerName]     = useState('')
  const [buyerEmail, setBuyerEmail]   = useState('')
  const [sellerName, setSellerName]   = useState('')
  const [sellerEmail, setSellerEmail] = useState('')

  const [fieldValues, setFieldValues] = useState({
    purchase_price:      '',
    emd:                 '',
    closing_date:        '',
    financing_type:      '',
    seller_address:      '',
    buyer_address:       '',
    property_tax_id:     '',
    other_description:   '',
    co_seller_name:      '',
    co_buyer_name:       '',
    emd_escrow:          '',
    due_diligence_days:  '14',
    acceptance_deadline: acceptanceDefault(),
    closing_location:    '',
    original_seller_name: '',
    original_psa_date:   '',
    special_terms:       '',
  })
  const setField = (k, v) => setFieldValues(prev => ({ ...prev, [k]: v }))

  const [sending, setSending]                 = useState(false)
  const [sendError, setSendError]             = useState(null)
  const [signingEmbedSrc, setSigningEmbedSrc] = useState(null)
  const [sentInfo, setSentInfo]               = useState(null) // { firstSignerName } when the counterparty signs first
  const [payClientSecret, setPayClientSecret] = useState(null)
  const [payAmount, setPayAmount]             = useState(299)
  const [signingTitle, setSigningTitle]       = useState('')

  const template = useMemo(() => templates.find(t => String(t.id) === String(templateId)), [templates, templateId])
  const isAssignment = template?.slug === 'assignment'
  const L = roleLabels(isAssignment)

  useEffect(() => { setPageTitle('New Contract') }, [])

  // Prefill the creator's own side once they pick a role.
  useEffect(() => {
    if (!user || !contractRole) return
    const myName = user.name || user.full_name || user.first_name || user.email || ''
    const myEmail = user.email || ''
    if (contractRole === 'seller') {
      setSellerName(prev => prev || myName); setSellerEmail(prev => prev || myEmail)
    } else if (contractRole === 'buyer') {
      setBuyerName(prev => prev || myName); setBuyerEmail(prev => prev || myEmail)
    }
  }, [user, contractRole])

  useEffect(() => {
    setTemplatesLoading(true)
    fetch('/api/contracts?type=templates')
      .then(r => r.json())
      .then(raw => setTemplates(Array.isArray(raw) ? decorateTemplates(raw) : []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [])

  useEffect(() => {
    if (templatesLoading || !templateId || templates.length === 0) return
    if (!templates.some(t => String(t.id) === String(templateId))) { setTemplateId(''); setStep(1) }
  }, [templates, templatesLoading, templateId])

  // Resume an in-flight draft (?draft_id=...)
  useEffect(() => {
    if (!resumeDraftId) return
    fetch(`/api/contracts/drafts/${resumeDraftId}`)
      .then(r => r.json())
      .then(d => {
        if (!d || d.error) return
        setCurrentDraftId(d.id)
        if (d.template_id) setTemplateId(String(d.template_id))
        if (d.property_id) setPropertyId(d.property_id)
        if (d.buyer_name) setBuyerName(d.buyer_name)
        if (d.buyer_email) setBuyerEmail(d.buyer_email)
        if (d.field_values && typeof d.field_values === 'object') {
          const fv = d.field_values
          if (fv.__contract_role) setContractRole(fv.__contract_role)
          if (fv.__seller_name) setSellerName(fv.__seller_name)
          if (fv.__seller_email) setSellerEmail(fv.__seller_email)
          setFieldValues(prev => ({ ...prev, ...fv }))
        }
        setStep(1)
      })
      .catch(() => {})
  }, [resumeDraftId])

  // Mark dirty whenever the user changes anything we care about
  useEffect(() => { if (readyForAutoSave) setDirty(true) }, [templateId, contractRole, propertyId, manualAddress, buyerName, buyerEmail, sellerName, sellerEmail, fieldValues, readyForAutoSave])

  // Enable auto-save once user has picked a role + a template
  useEffect(() => {
    if (user?.id && templateId && contractRole && !readyForAutoSave) setReadyForAutoSave(true)
  }, [user?.id, templateId, contractRole, readyForAutoSave])

  // Debounced auto-save: 2s after last edit
  useEffect(() => {
    if (!readyForAutoSave || !dirty) return
    if (autoSaving || inFlightSaveRef.current) return
    if (!user?.id || !templateId) return

    const buildPayload = () => ({
      seller_id: user.id,                                  // shared schema; buyer's user.id stored here
      template_id: templateId || '',
      property_id: propertyId === 'manual' ? null : (propertyId || null),
      buyer_name: buyerName || null,
      buyer_email: buyerEmail || null,
      field_values: {
        ...fieldValues,
        property_address: fieldValues.property_address || manualAddress || '',
        __contract_role: contractRole || '',
        __seller_name: sellerName || '',
        __seller_email: sellerEmail || '',
      },
    })

    const timer = setTimeout(async () => {
      inFlightSaveRef.current = true
      setAutoSaving(true); setAutoSaveError(null)
      try {
        const payload = buildPayload()
        if (currentDraftId) {
          const res = await fetch(`/api/contracts/drafts/${currentDraftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (!res.ok || json.error) throw new Error(json.error || 'Save failed')
        } else {
          const hasMeaning = !!payload.property_id || !!(payload.field_values && payload.field_values.property_address) || !!payload.buyer_name || !!payload.buyer_email
          if (!hasMeaning) { setDirty(false); return }
          const res = await fetch('/api/contracts/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (!res.ok || json.error || !json.id) throw new Error(json.error || 'Save failed')
          setCurrentDraftId(json.id)
        }
        setLastSavedAt(new Date()); setDirty(false)
      } catch (e) {
        setAutoSaveError(e?.message || "Couldn't save")
      } finally {
        setAutoSaving(false)
        inFlightSaveRef.current = false
      }
    }, 2000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, readyForAutoSave, templateId, contractRole, propertyId, manualAddress, buyerName, buyerEmail, sellerName, sellerEmail, fieldValues, currentDraftId, autoSaving])

  useEffect(() => {
    if (!user?.id) return
    setPropertiesLoading(true)
    supabase
      .from('properties')
      .select('id, address, price, bedrooms, bathrooms, status')
      .eq('posted_by', user.id)
      .in('status', ['active', 'inactive'])
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => { if (!error && data) setProperties(data) })
      .finally(() => setPropertiesLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!propertyId || propertyId === 'manual') return
    const p = properties.find(p => p.id === propertyId)
    if (p?.address) setFieldValues(prev => ({ ...prev, property_address: p.address }))
  }, [propertyId, properties])

  useEffect(() => {
    if (propertyId === 'manual' && manualAddress) setFieldValues(prev => ({ ...prev, property_address: manualAddress }))
  }, [propertyId, manualAddress])

  function canProceed(s) {
    if (s === 1) return !!templateId && !!contractRole
    if (s === 2) return propertyId === 'manual' ? manualAddress.trim().length > 4 : !!propertyId
    if (s === 3) return /\S+@\S+\.\S+/.test(buyerEmail) && buyerName.trim().length > 0
    if (s === 4) return /\S+@\S+\.\S+/.test(sellerEmail) && sellerName.trim().length > 0
    if (s === 5) {
      const required = ['purchase_price', 'emd', 'closing_date']
      if (isAssignment) required.push('original_seller_name', 'original_psa_date')
      if (!required.every(k => fieldValues[k] && String(fieldValues[k]).trim() !== '')) return false
      const t = todayISOf()
      if (fieldValues.closing_date && fieldValues.closing_date < t) return false
      if (fieldValues.acceptance_deadline && fieldValues.acceptance_deadline < t) return false
      return true
    }
    return true
  }

  // Guard against a buyer and seller sharing an email (self-deal / collision).
  const selfDeal = !!buyerEmail && !!sellerEmail && buyerEmail.trim().toLowerCase() === sellerEmail.trim().toLowerCase()

  // Buyers always pay the per-contract fee — collect it before creating/sending.
  async function handleSend() {
    if (!user?.id) { setSendError('Please sign in again.'); return }
    if (selfDeal) { setSendError('The buyer and seller cannot use the same email.'); return }
    setSending(true); setSendError(null)
    try {
      const payRes = await fetch('/api/contracts/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, draft_id: currentDraftId || null }),
      })
      const payData = await payRes.json().catch(() => ({}))
      if (!payRes.ok) { setSendError(payData.error || 'Payment could not be started.'); setSending(false); return }
      if (payData.paid) { await doSend(); return }
      if (payData.clientSecret) {
        setPayAmount(payData.amount || 299)
        setPayClientSecret(payData.clientSecret)
        setSending(false)
        return
      }
      setSendError('Payment could not be started. Please try again.'); setSending(false)
    } catch {
      setSendError('Payment could not be started. Please try again.'); setSending(false)
    }
  }

  // Create the DocuSeal submission. Runs once paid.
  async function doSend() {
    setSending(true); setSendError(null)
    try {
      const property = fieldValues.property_address || manualAddress || ''
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractRole,
          sellerName, sellerEmail,
          buyerName, buyerEmail,
          property, templateId,
          field_values: fieldValues,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to send')

      // Mark the draft as sent so it disappears from the buyer's drafts list
      if (currentDraftId && json.submission_id) {
        try {
          await fetch(`/api/contracts/drafts/${currentDraftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'sent',
              docuseal_submission_id: String(json.submission_id),
            }),
          })
        } catch {}
      }

      setSigningTitle(property || 'New Contract')
      if (json.embed_src) {
        // Creator signs first (they're the Seller) — inline signing.
        setSigningEmbedSrc(json.embed_src)
      } else {
        // The counterparty (Seller) signs first; the creator signs after they do.
        setSentInfo({ firstSignerName: json.firstSignerName || sellerName || 'the seller' })
      }
    } catch (e) {
      setSendError(e?.message || 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (payClientSecret && stripePromise) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setPayClientSecret(null); setSending(false) }} className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to contract
          </button>
        </div>
        <div className="max-w-[460px] mx-auto">
          <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-3">
              <div className="w-9 h-9 bg-[#D03839]/10 rounded flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-[#D03839]" /></div>
              <div>
                <h1 className="text-[16px] font-bold text-[#1A1816] leading-tight">Send contract</h1>
                <p className="text-[12px] text-[#737370]">Pay the one-time fee to send it for signature</p>
              </div>
            </div>
            <div className="px-5 py-4 border-b border-[#E8E8E4]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1816]">Contract</p>
                  {fieldValues.property_address ? <p className="text-[12px] text-[#737370] mt-0.5">{fieldValues.property_address}</p> : null}
                </div>
                <p className="text-[14px] font-bold text-[#1A1816] whitespace-nowrap">{fmtFee(payAmount)}</p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E8E4]">
                <span className="text-[13px] font-semibold text-[#1A1816]">Total due</span>
                <span className="text-[16px] font-bold text-[#1A1816]">{fmtFee(payAmount)}</span>
              </div>
            </div>
            <div className="p-5">
              <Elements stripe={stripePromise} options={{ clientSecret: payClientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#D03839' } } }}>
                <ContractPayForm amount={payAmount} onSuccess={() => { setPayClientSecret(null); doSend() }} />
              </Elements>
            </div>
            <div className="px-5 py-3.5 bg-[#FAFAF8] border-t border-[#E8E8E4] text-center">
              <span className="text-[12px] text-[#737370]">Secured by Stripe · One-time charge, no subscription</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (signingEmbedSrc) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#D03839]/10 rounded flex items-center justify-center shrink-0"><PenLine className="w-4 h-4 text-[#D03839]" /></div>
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1816] leading-tight">{signingTitle}</h1>
            <p className="text-[13px] text-[#737370]">Review and sign below — the {L.buyer.toLowerCase()} gets a signing link once the {L.seller.toLowerCase()} signs.</p>
          </div>
        </div>
        <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
          <DocusealForm
            src={signingEmbedSrc}
            email={sellerEmail}
            withTitle={false}
            withDownloadButton={false}
            customCss={`body { font-family: 'DM Sans', -apple-system, sans-serif !important; } .base-button { background: #D03839 !important; border-color: #D03839 !important; border-radius: 4px !important; } .base-button:hover { background: #E0493B !important; }`}
            onComplete={() => router.push('/buyer/contracts')}
          />
        </div>
      </div>
    )
  }

  if (sentInfo) {
    return (
      <div className="p-4 lg:p-6 max-w-[480px] mx-auto">
        <div className="bg-white border border-[#E8E8E4] rounded p-8 text-center">
          <div className="w-12 h-12 bg-[#E4F5EC] rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-6 h-6 text-[#0F6E56]" /></div>
          <h1 className="text-[18px] font-bold text-[#1A1816] mb-1.5">Contract sent</h1>
          <p className="text-[13px] text-[#737370] leading-relaxed">
            It's been sent to <span className="font-semibold text-[#1A1816]">{sentInfo.firstSignerName}</span> (the {L.seller.toLowerCase()}) to sign first.
            You'll get a signing link by email as soon as they do.
          </p>
          <button onClick={() => router.push('/buyer/contracts')} className="mt-6 h-10 px-5 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#1A1816] text-white rounded hover:bg-black">
            Go to Contracts
          </button>
        </div>
      </div>
    )
  }

  const STEP_LABELS = ['Start', 'Property', `${L.buyer} info`, `${L.seller} info`, 'Terms', 'Review']
  const NUM_STEPS = STEP_LABELS.length

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#1A1816] mb-1">
          New Contract — <span className="text-[#737370] font-medium">Step {step} of {NUM_STEPS} · {STEP_LABELS[step - 1]}</span>
        </h1>
        {readyForAutoSave && (
          <p className="text-[12px] text-[#A8A8A4] mt-1">
            {autoSaving ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span> : autoSaveError ? <span className="text-[#D03839]">{autoSaveError}</span> : lastSavedAt ? <><span className="text-[#0F6E56]">✓ Saved</span> {new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</> : null}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
        <div className="min-w-0">

      <div className={`grid gap-2 mb-6`} style={{ gridTemplateColumns: `repeat(${NUM_STEPS}, minmax(0, 1fr))` }}>
        {STEP_LABELS.map((_, i) => <div key={i} className={`h-1 rounded ${i + 1 <= step ? 'bg-[#D03839]' : 'bg-[#E8E8E4]'}`} />)}
      </div>

      <div className="bg-white border border-[#E8E8E4] rounded p-5">
        {step === 1 && <Step1Setup templates={templates} templatesLoading={templatesLoading} templateId={templateId} onSelectTemplate={setTemplateId} contractRole={contractRole} onSelectRole={setContractRole} />}
        {step === 2 && <Step2Property properties={properties} propertiesLoading={propertiesLoading} propertyId={propertyId} onChange={setPropertyId} manualAddress={manualAddress} onManualAddressChange={setManualAddress} />}
        {step === 3 && <StepPartyInfo party="buyer" L={L} isAssignment={isAssignment} isYou={contractRole === 'buyer'} name={buyerName} email={buyerEmail} address={fieldValues.buyer_address} coName={fieldValues.co_buyer_name} onName={setBuyerName} onEmail={setBuyerEmail} onAddress={v => setField('buyer_address', v)} onCoName={v => setField('co_buyer_name', v)} />}
        {step === 4 && <StepPartyInfo party="seller" L={L} isAssignment={isAssignment} isYou={contractRole === 'seller'} name={sellerName} email={sellerEmail} address={fieldValues.seller_address} coName={fieldValues.co_seller_name} onName={setSellerName} onEmail={setSellerEmail} onAddress={v => setField('seller_address', v)} onCoName={v => setField('co_seller_name', v)} />}
        {step === 5 && <Step5Terms values={fieldValues} onChange={setField} template={template} L={L} />}
        {step === 6 && <Step6Review template={template} L={L} fieldValues={fieldValues} buyerName={buyerName} buyerEmail={buyerEmail} sellerName={sellerName} sellerEmail={sellerEmail} contractRole={contractRole} onJump={setStep} selfDeal={selfDeal} />}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="h-10 px-4 flex items-center gap-1.5 text-[13px] font-medium border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < NUM_STEPS ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canProceed(step)} className="h-10 px-5 flex items-center gap-1.5 text-[13px] font-semibold bg-[#1A1816] text-white rounded hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSend} disabled={sending || selfDeal || !buyerEmail || !sellerEmail || !templateId} className="h-10 px-5 flex items-center gap-1.5 text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Contract</>}
          </button>
        )}
      </div>
      {sendError && <p className="text-[12px] text-[#D03839] mt-2 text-right">{sendError}</p>}
        </div>

        <div className="hidden lg:block lg:sticky lg:top-6">
          <LiveContractPreview isAssignment={isAssignment} L={L} contractRole={contractRole} buyerName={buyerName} sellerName={sellerName} fieldValues={fieldValues} />
        </div>
      </div>
    </div>
  )
}

function Step1Setup({ templates, templatesLoading, templateId, onSelectTemplate, contractRole, onSelectRole }) {
  const selectedTemplate = templates.find(t => String(t.id) === String(templateId))
  const isAssignment = selectedTemplate?.slug === 'assignment'
  const L = roleLabels(isAssignment)
  if (templatesLoading) return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-[#FAFAF8] border border-[#E8E8E4] rounded animate-pulse" />)}</div>
  if (!templates.length) return <div className="text-center py-10 text-[13px] text-[#737370]"><p className="text-[14px] font-semibold text-[#1A1816] mb-1">No contract templates available</p><p>Contracts aren't available right now. Please try again later or contact support.</p></div>
  return (
    <div>
      <h2 className="text-[16px] font-bold text-[#1A1816] mb-1">What are you creating?</h2>
      <p className="text-[13px] text-[#737370] mb-4">Pick the contract that matches your deal.</p>
      <div className="space-y-2">
        {templates.map(t => {
          const selected = String(t.id) === String(templateId)
          return (
            <button key={t.id} type="button" onClick={() => onSelectTemplate(String(t.id))} className={`w-full text-left p-4 border rounded transition-colors ${selected ? 'border-[#D03839] bg-[#FEF0EF]/40' : 'border-[#E8E8E4] hover:border-[#1A1816]'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-[#D03839] text-white' : 'bg-[#FAFAF8] text-[#737370] border border-[#E8E8E4]'}`}><FileText className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1A1816]">{t.label || t.name}</p>
                  <p className="text-[12px] text-[#737370] mt-0.5">{t.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {templateId && (
        <div className="mt-6 pt-6 border-t border-[#E8E8E4]">
          <h2 className="text-[16px] font-bold text-[#1A1816] mb-1">Which side of this contract are you on?</h2>
          <p className="text-[13px] text-[#737370] mb-4">We'll pre-fill your details and send the contract to the other party. The {L.seller.toLowerCase()} always signs first.</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ k: 'seller', label: `I'm the ${L.seller}` }, { k: 'buyer', label: `I'm the ${L.buyer}` }].map(opt => {
              const selected = contractRole === opt.k
              return (
                <button key={opt.k} type="button" onClick={() => onSelectRole(opt.k)} className={`p-4 border rounded text-left transition-colors ${selected ? 'border-[#D03839] bg-[#FEF0EF]/40' : 'border-[#E8E8E4] hover:border-[#1A1816]'}`}>
                  <div className={`w-9 h-9 rounded flex items-center justify-center mb-2 ${selected ? 'bg-[#D03839] text-white' : 'bg-[#FAFAF8] text-[#737370] border border-[#E8E8E4]'}`}>{opt.k === 'seller' ? <Home className="w-4 h-4" /> : <User className="w-4 h-4" />}</div>
                  <p className="text-[14px] font-bold text-[#1A1816]">{opt.label}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Step2Property({ properties, propertiesLoading, propertyId, onChange, manualAddress, onManualAddressChange }) {
  const isManual = propertyId === 'manual'
  return (
    <div>
      <h2 className="text-[16px] font-bold text-[#1A1816] mb-1">Pick the property</h2>
      <p className="text-[13px] text-[#737370] mb-4">We'll pre-fill the address on the contract. Don't see it? Enter the address manually.</p>
      <label className={LABEL_CLS}>Your listings</label>
      {propertiesLoading ? (
        <div className="h-10 bg-[#E8E8E4] rounded animate-pulse" />
      ) : (
        <select value={propertyId} onChange={e => onChange(e.target.value)} className={INPUT_CLS + ' bg-white'}>
          <option value="">— Select a property —</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address || `Untitled (${p.id.slice(0, 8)})`}{p.price ? ` · ${fmtPrice(p.price)}` : ''}</option>)}
          <option value="manual">I'll enter the address manually</option>
        </select>
      )}
      {isManual && (
        <div className="mt-4">
          <label className={LABEL_CLS}>Property Address <span className="text-[#D03839]">*</span></label>
          <input type="text" value={manualAddress || ''} onChange={e => onManualAddressChange(e.target.value)} placeholder="123 Main St, Dallas, TX 75201" className={INPUT_CLS} />
        </div>
      )}
      {propertyId && propertyId !== 'manual' && (() => {
        const p = properties.find(pp => pp.id === propertyId)
        if (!p) return null
        return (
          <div className="mt-4 bg-[#FAFAF8] border border-[#E8E8E4] rounded p-3 flex items-start gap-3">
            <Home className="w-4 h-4 text-[#737370] mt-0.5 shrink-0" />
            <div className="text-[13px] text-[#1A1816] flex-1 min-w-0">
              <p className="font-semibold truncate">{p.address}</p>
              <p className="text-[12px] text-[#737370] mt-0.5">{p.price ? fmtPrice(p.price) : '—'}{p.bedrooms ? ` · ${p.bedrooms} bd` : ''}{p.bathrooms ? ` · ${p.bathrooms} ba` : ''}</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Unified Buyer / Seller info step. `isYou` marks the creator's own side (prefilled).
function StepPartyInfo({ party, L, isAssignment, isYou, name, email, address, coName, onName, onEmail, onAddress, onCoName }) {
  const roleLabel = party === 'buyer' ? L.buyer : L.seller
  const coLabel = party === 'buyer' ? 'co-buyer' : 'co-seller'
  const [coOpen, setCoOpen] = useState(!!coName)
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold text-[#1A1816]">{roleLabel} information</h2>
        {isYou && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#FEF3E2] text-[#B5620A]">You</span>}
      </div>
      <p className="text-[13px] text-[#737370] mb-4">{isYou ? `Your details — pre-filled from your account. Edit anything that's not right.` : `The ${roleLabel.toLowerCase()}'s details. They'll appear on the contract.`}</p>
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>{roleLabel} Full Name / LLC <span className="text-[#D03839]">*</span></label>
          <input type="text" value={name} onChange={e => onName(e.target.value)} placeholder="John Smith or Acme Holdings LLC" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>{roleLabel} Email <span className="text-[#D03839]">*</span></label>
          <input type="email" value={email} onChange={e => onEmail(e.target.value)} placeholder={`${roleLabel.toLowerCase()}@example.com`} className={INPUT_CLS} required />
        </div>
        <div>
          <label className={LABEL_CLS}>{roleLabel} Mailing Address</label>
          <input type="text" value={address || ''} onChange={e => onAddress(e.target.value)} placeholder="123 Main St, City, ST 00000" className={INPUT_CLS} />
        </div>
      </div>
      <div className="mt-5 pt-5 border-t border-[#E8E8E4]">
        {!coOpen ? (
          <button type="button" onClick={() => setCoOpen(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#D03839] hover:text-[#B82F30]">+ Add {coLabel} (optional)</button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-[#1A1816] capitalize">{coLabel}</p>
                <p className="text-[12px] text-[#737370]">For jointly-held deals. Their name prints on the contract.</p>
              </div>
              <button type="button" onClick={() => { onCoName(''); setCoOpen(false) }} className="text-[12px] text-[#737370] hover:text-[#1A1816]">Remove</button>
            </div>
            <label className={LABEL_CLS}>{roleLabel === L.buyer ? L.buyer : L.seller} Co-Signer Full Name / LLC</label>
            <input type="text" value={coName || ''} onChange={e => onCoName(e.target.value)} placeholder="Jane Smith" className={INPUT_CLS} />
          </div>
        )}
      </div>
    </div>
  )
}

function FieldRow({ label, hint, children, span }) {
  return (
    <div className={span === 'full' ? 'md:col-span-2' : ''}>
      <label className={LABEL_CLS}>{label}{hint && <span className="text-[#A8A8A4] font-normal ml-1">{hint}</span>}</label>
      {children}
    </div>
  )
}

function Step5Terms({ values, onChange, template, L }) {
  const isAssignment = template?.slug === 'assignment'
  const todayISO = todayISOf()
  return (
    <div>
      <h2 className="text-[16px] font-bold text-[#1A1816] mb-1">Deal terms</h2>
      <p className="text-[13px] text-[#737370] mb-4">{isAssignment ? 'Numbers and dates that pre-fill on the assignment contract. Required fields are marked.' : 'Numbers and dates that pre-fill on the contract. Required fields are marked.'}</p>
      {/* Roland's order: Sale Price, Earnest Money, Due Diligence, Closing Date, Source of Financing, Acceptance Deadline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldRow label={isAssignment ? 'Agreed Purchase Price ($)' : 'Sale Price ($)'} hint="*">
          <input type="number" value={values.purchase_price || ''} onChange={e => onChange('purchase_price', e.target.value)} placeholder={isAssignment ? '15000' : '250000'} className={INPUT_CLS} />
        </FieldRow>
        <FieldRow label={isAssignment ? 'Nonrefundable Deposit ($)' : 'Earnest Money ($)'} hint="*">
          <input type="number" value={values.emd || ''} onChange={e => onChange('emd', e.target.value)} placeholder={isAssignment ? '1000' : '5000'} className={INPUT_CLS} />
        </FieldRow>
        {!isAssignment && (
          <FieldRow label="Due Diligence Period (days)" hint="default 14">
            <input type="number" value={values.due_diligence_days || ''} onChange={e => onChange('due_diligence_days', e.target.value)} placeholder="14" className={INPUT_CLS} />
          </FieldRow>
        )}
        <FieldRow label="Closing Date" hint="*">
          <input type="date" min={todayISO} value={values.closing_date || ''} onChange={e => onChange('closing_date', e.target.value)} className={`${INPUT_CLS} ${values.closing_date && values.closing_date < todayISO ? 'border-[#D03839] focus:border-[#D03839]' : ''}`} />
          {values.closing_date && values.closing_date < todayISO && <p className="text-[11px] text-[#D03839] mt-1">Closing date can't be in the past.</p>}
        </FieldRow>
        {!isAssignment && (
          <FieldRow label="Source of Financing" hint="cash or financing">
            <select value={values.financing_type || ''} onChange={e => onChange('financing_type', e.target.value)} className={INPUT_CLS + ' bg-white'}>
              <option value="">— Select —</option>
              <option value="cash">Cash</option>
              <option value="financing">Financing</option>
            </select>
          </FieldRow>
        )}
        {!isAssignment && (
          <FieldRow label={`${L.seller} Acceptance Deadline`} hint="default 3 days from today">
            <input type="date" min={todayISO} value={values.acceptance_deadline || ''} onChange={e => onChange('acceptance_deadline', e.target.value)} className={`${INPUT_CLS} ${values.acceptance_deadline && values.acceptance_deadline < todayISO ? 'border-[#D03839] focus:border-[#D03839]' : ''}`} />
            {values.acceptance_deadline && values.acceptance_deadline < todayISO && <p className="text-[11px] text-[#D03839] mt-1">Acceptance deadline can't be in the past.</p>}
          </FieldRow>
        )}
      </div>

      {!isAssignment && (
        <div className="mt-6">
          <p className="text-[11px] font-bold text-[#A8A8A4] uppercase tracking-wide mb-3">Closing details <span className="font-normal normal-case">(optional)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Title Company / Escrow Agent" hint="who holds the earnest money"><input type="text" value={values.emd_escrow || ''} onChange={e => onChange('emd_escrow', e.target.value)} placeholder="e.g. Stewart Title of Texas" className={INPUT_CLS} /></FieldRow>
            <FieldRow label="Closing Location" hint="usually title company address"><input type="text" value={values.closing_location || ''} onChange={e => onChange('closing_location', e.target.value)} placeholder="Same as escrow holder if not sure" className={INPUT_CLS} /></FieldRow>
            <FieldRow label="Property Tax ID(s)"><input type="text" value={values.property_tax_id || ''} onChange={e => onChange('property_tax_id', e.target.value)} placeholder="Parcel / APN" className={INPUT_CLS} /></FieldRow>
            <FieldRow label="Other Description" hint="optional"><input type="text" value={values.other_description || ''} onChange={e => onChange('other_description', e.target.value)} placeholder="e.g. includes adjacent lot 4B" className={INPUT_CLS} /></FieldRow>
          </div>
        </div>
      )}

      {isAssignment && (
        <div className="mt-6">
          <p className="text-[11px] font-bold text-[#A8A8A4] uppercase tracking-wide mb-3">Underlying Purchase Contract</p>
          <p className="text-[12px] text-[#737370] mb-3">Reference the original Purchase Contract you're assigning.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="Original Seller Name" hint="* property owner from the original Purchase Contract"><input type="text" value={values.original_seller_name || ''} onChange={e => onChange('original_seller_name', e.target.value)} placeholder="Jane Doe" className={INPUT_CLS} /></FieldRow>
            <FieldRow label="Original Purchase Contract Signed Date" hint="*"><input type="date" value={values.original_psa_date || ''} onChange={e => onChange('original_psa_date', e.target.value)} className={INPUT_CLS} /></FieldRow>
          </div>
        </div>
      )}

      <div className="mt-6">
        <FieldRow label="Additional Terms" hint={isAssignment ? 'one per line (up to 6 lines)' : 'optional'}>
          <textarea value={values.special_terms || ''} onChange={e => onChange('special_terms', e.target.value)} rows={isAssignment ? 6 : 4} placeholder={isAssignment ? 'Each line becomes one of the 6 numbered lines on the contract.' : 'Any other deal-specific terms…'} className="w-full p-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20 resize-none" />
        </FieldRow>
      </div>
    </div>
  )
}

// ── Live contract preview — mirrors the real signed document, fills in live ──
function Fill({ value }) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return <span className="font-semibold text-[#1A1816]">{value}</span>
  }
  return <span className="inline-block align-baseline bg-[#FEF9E7] border-b border-[#E0B100] rounded-[1px]" style={{ minWidth: '64px', height: '0.95em' }}>&#8203;</span>
}
function LiveContractPreview({ isAssignment, buyerName, sellerName, fieldValues: fv }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const money = (v) => (v !== '' && v != null && !Number.isNaN(Number(v))) ? `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null
  const longDate = (v) => v ? (() => { try { return new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) } catch { return v } })() : null
  const funds = fv.financing_type ? (fv.financing_type === 'cash' ? 'Cash' : 'Financing') : null
  return (
    <div className="bg-white border border-[#E8E8E4] rounded shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-[#FAFAF8] border-b border-[#E8E8E4] flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-[#737370]" />
        <span className="text-[11px] font-semibold text-[#737370] uppercase tracking-wide" style={{ fontFamily: 'DM Sans, sans-serif' }}>Live preview · the actual contract, filling in as you type</span>
      </div>
      <div className="px-6 py-5 max-h-[74vh] overflow-y-auto text-[11px] leading-[1.55] text-[#1A1816]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', textAlign: 'justify' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[12px] font-bold uppercase tracking-wide">{isAssignment ? 'Assignment of Sale Contract Agreement' : 'Contract to Purchase Real Estate'}</h3>
          <span className="text-[11px] font-extrabold text-[#D03839] shrink-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>DeelMap</span>
        </div>

        {isAssignment ? (
          <>
            <p className="mb-1">Property Address: <Fill value={fv.property_address} /></p>
            <p className="mb-2">This agreement is made this <Fill value={today} />, by and between <Fill value={sellerName} /> (Assignor) and <Fill value={buyerName} /> (Assignee) regarding the sale of the above referenced property.</p>
            <p className="mb-1.5">Whereas <Fill value={sellerName} /> (Assignor) has entered into a Purchase and Sale Contract with <Fill value={fv.original_seller_name} /> (Seller) on <Fill value={longDate(fv.original_psa_date)} /> for the purchase of subject property.</p>
            <p className="mb-1.5 text-[#444441]">Whereas, Assignor wishes to assign its rights, interests and obligations in the Purchase and Sale Contract to Assignee for the final purchase of subject property.</p>
            <p className="mb-1.5">Now therefore, it is hereby agreed between Assignor and Assignee as follows:</p>
            <p className="mb-1.5"><b>1) ASSIGNMENT FEE:</b> Assignee shall pay Assignor an assignment fee of <Fill value={money(fv.purchase_price)} /> of which <Fill value={money(fv.emd)} /> shall be paid upon execution and shall represent a nonrefundable deposit. The balance shall be payable to Assignor at time of closing.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">2) INSPECTION PERIOD:</b> Assignee waives any inspection period contained in the attached contract. All inspections have been completed prior to the execution of this agreement.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">3) OWNERSHIP &amp; PROPERTY ACCESS ACKNOWLEDGMENT:</b> Assignee acknowledges that Assignor does not authorize Assignee to enter the Subject Property without Assignor&rsquo;s direct authorization, and holds Assignor harmless from related liability.</p>
            <p className="mb-1.5 text-[#444441]">Assignee agrees and accepts all terms and conditions of the subject contract for Purchase and Sale between Buyer and Seller in its entirety.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">4) LIMITATION OF ASSIGNMENT:</b> This Agreement and the subject contract are not assignable by Assignee without the written consent of the Assignor.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">5) DISCLOSURES &amp; ACKNOWLEDGMENT:</b> Assignor makes no warranty regarding inspection or other reports. Assignee is dealing directly with Assignor, is not represented by a real estate agent, and acknowledges receipt of the original Purchase and Sale Contract and all addendums.</p>
            <p className="mb-1.5"><b>6) CLOSING DATE:</b> The closing date of the subject transaction shall be <Fill value={longDate(fv.closing_date)} />.</p>
            <p className="mb-3"><b>7) ADDITIONAL TERMS:</b> <Fill value={fv.special_terms} /></p>
            <p className="mb-3 text-[#444441]">All other terms and conditions of the Subject Purchase and Sale Contract not specifically amended hereby or inconsistent herewith shall remain in full force and effect.</p>
            <p className="font-bold mb-2">AGREED AND ACCEPTED</p>
            <div className="space-y-1.5 pt-2 border-t border-[#E8E8E4]">
              <p>Assignor: <Fill value={null} /> &nbsp;&nbsp; Date: <Fill value={null} /></p>
              <p>Print Name: <Fill value={sellerName} /></p>
              <p className="pt-1">Assignee: <Fill value={null} /> &nbsp;&nbsp; Date: <Fill value={null} /></p>
              <p>Print Name: <Fill value={buyerName} /></p>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2">This contract dated: <Fill value={today} /> in which Buyer: <Fill value={buyerName} /> whose address is <Fill value={fv.buyer_address} /> and/or assigns (the &ldquo;BUYER&rdquo;) and Seller: <Fill value={sellerName} /> whose address is <Fill value={fv.seller_address} /> (the &ldquo;SELLER&rdquo;) hereby agree that the SELLER will sell and BUYER will buy the following described real estate:</p>
            <p className="mb-1">ADDRESS(s): <Fill value={fv.property_address} /></p>
            <p className="mb-1">PROPERTY TAX ID(s): <Fill value={fv.property_tax_id} /></p>
            <p className="mb-2">OTHER DESCRIPTION (if applicable): <Fill value={fv.other_description} /></p>
            <p className="mb-2 text-[#444441]">together with all fixtures, all electrical, mechanical, plumbing, HVAC, and any other systems as are currently installed or attached thereto, together with all the improvements thereon and all appurtenances thereto, all being hereinafter collectively referred to as the &ldquo;Property.&rdquo;</p>
            <p className="font-bold underline mb-1.5">SELLER AGREES:</p>
            <p className="mb-1.5"><b>1) SALE PRICE:</b> <Fill value={money(fv.purchase_price)} />, <b>SOURCE OF FUNDS</b> (cash/financing): <Fill value={funds} /></p>
            <p className="mb-1.5"><b>2) DEPOSIT:</b> Upon acceptance Buyer will submit an earnest money deposit of <Fill value={money(fv.emd)} /> to <Fill value={fv.emd_escrow} /> which will be credited to the BUYER when sale closes. This deposit will be returned to the BUYER if the title does not transfer in accordance with this agreement.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">3) CLOSING COSTS &amp; TAXES:</b> BUYER pays all closing costs, deed prep, and title insurance. Current year taxes are prorated at closing; any previous year&rsquo;s taxes and/or transfer tax to be paid by SELLER.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">4) RENTS &amp; DEPOSITS (if applicable):</b> Rents are prorated at closing and transfer to the BUYER. Tenant deposits per the existing lease also transfer to the BUYER at closing.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">5) TITLE &amp; JUDGMENTS:</b> Seller warrants there are no judgments threatening the equity in the property and no bankruptcy pending. Title is to be free, clear, and unencumbered; all liens shall be paid at closing by the seller.</p>
            <p className="mb-1.5"><b>6) DUE DILIGENCE PERIOD:</b> BUYER has <Fill value={fv.due_diligence_days} /> days to perform due diligence following the SELLER&rsquo;s acceptance. The BUYER may cancel for any reason during this period and receive a full return of earnest money.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">7) CONDITION:</b> Property is sold &ldquo;AS-IS&rdquo; with no warranties by the SELLER, who will disclose any known material defects. Appliances remain with the property unless otherwise stated.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">8) POSSESSION:</b> Possession and occupancy, with all keys and openers, will be delivered to the BUYER when title transfers.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">9) ASSIGNABILITY:</b> This purchase contract IS assignable. SELLER agrees the buyer may place signs and market the property immediately upon acceptance by both parties.</p>
            <p className="mb-1.5"><b>10) ACCEPTANCE:</b> This instrument becomes binding when accepted by the Seller and signed by both parties. If it is not accepted and signed by the Seller on or prior to <Fill value={longDate(fv.acceptance_deadline)} />, this contract shall be void.</p>
            <p className="mb-1.5"><b>11) CLOSING:</b> Closing will take place on or before <Fill value={longDate(fv.closing_date)} /> subject to a 90-day period to clear any title problems. Closing will take place at <Fill value={fv.closing_location} />.</p>
            <p className="mb-1.5 text-[#444441]"><b className="text-[#1A1816]">12) TIME IS OF THE ESSENCE:</b> Time is of the essence; relevant time periods are calculated in business days.</p>
            <p className="mb-3"><b>13) ADDITIONAL TERMS (if applicable):</b> <Fill value={fv.special_terms} /></p>
            <div className="space-y-2 pt-2 border-t border-[#E8E8E4]">
              <p>BUYER Print: <Fill value={buyerName} /> &nbsp;&nbsp; Sign/Date: <Fill value={null} /></p>
              <p>SELLER Print: <Fill value={sellerName} /> &nbsp;&nbsp; Sign/Date: <Fill value={null} /></p>
              {fv.co_seller_name ? <p>SELLER Print: <Fill value={fv.co_seller_name} /> &nbsp;&nbsp; Sign/Date: <Fill value={null} /></p> : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Step6Review({ template, L, fieldValues, buyerName, buyerEmail, sellerName, sellerEmail, contractRole, onJump, selfDeal }) {
  const isAssignment = template?.slug === 'assignment'
  const youTag = (role) => contractRole === role ? ' (you)' : ''
  const termsItems = isAssignment
    ? [
        { label: 'Agreed Purchase Price', value: fmtPrice(fieldValues.purchase_price) },
        { label: 'Nonrefundable Deposit', value: fmtPrice(fieldValues.emd) },
        { label: 'Closing Date',          value: fmtDate(fieldValues.closing_date) },
        { label: 'Original Seller',       value: fieldValues.original_seller_name || '—' },
        { label: 'Original Purchase Contract Date', value: fmtDate(fieldValues.original_psa_date) },
        { label: 'Additional Terms',      value: fieldValues.special_terms || '—' },
      ]
    : [
        { label: 'Sale Price',            value: fmtPrice(fieldValues.purchase_price) },
        { label: 'Earnest Money',         value: fmtPrice(fieldValues.emd) },
        { label: 'Due Diligence',         value: fieldValues.due_diligence_days ? `${fieldValues.due_diligence_days} days` : '—' },
        { label: 'Closing Date',          value: fmtDate(fieldValues.closing_date) },
        { label: 'Source of Financing',   value: fieldValues.financing_type ? (fieldValues.financing_type === 'cash' ? 'Cash' : 'Financing') : '—' },
        { label: `${L.seller} Acceptance Deadline`, value: fmtDate(fieldValues.acceptance_deadline) },
        { label: 'Title Company / Escrow Agent', value: fieldValues.emd_escrow || '—' },
        { label: 'Closing Location',      value: fieldValues.closing_location || '—' },
        { label: 'Property Tax ID',       value: fieldValues.property_tax_id || '—' },
        { label: 'Other Description',     value: fieldValues.other_description || '—' },
        { label: 'Additional Terms',      value: fieldValues.special_terms || '—' },
      ]
  const rows = [
    { section: 'Property', step: 2, items: [{ label: 'Address', value: fieldValues.property_address || '—' }] },
    { section: `${L.buyer}`, step: 3, items: [
        { label: `${L.buyer} Name${youTag('buyer')}`, value: buyerName || '—' },
        { label: 'Email', value: buyerEmail || '—' },
        { label: 'Mailing Address', value: fieldValues.buyer_address || '—' },
        ...(fieldValues.co_buyer_name ? [{ label: `Co-${L.buyer}`, value: fieldValues.co_buyer_name }] : []),
      ] },
    { section: `${L.seller}`, step: 4, items: [
        { label: `${L.seller} Name${youTag('seller')}`, value: sellerName || '—' },
        { label: 'Email', value: sellerEmail || '—' },
        { label: 'Mailing Address', value: fieldValues.seller_address || '—' },
        ...(fieldValues.co_seller_name ? [{ label: `Co-${L.seller}`, value: fieldValues.co_seller_name }] : []),
      ] },
    { section: 'Terms', step: 5, items: termsItems },
  ]
  return (
    <div>
      <h2 className="text-[16px] font-bold text-[#1A1816] mb-1">Review &amp; send</h2>
      <p className="text-[13px] text-[#737370] mb-4">Double-check everything. The {L.seller.toLowerCase()} signs first; the {L.buyer.toLowerCase()} gets a signing link after.</p>
      {selfDeal && <div className="mb-4 p-3 bg-[#FEF0EF] border border-[#F5C4C0] rounded text-[12px] text-[#D03839]">The {L.buyer.toLowerCase()} and {L.seller.toLowerCase()} have the same email. Use different emails to send.</div>}
      <div className="space-y-4">
        {rows.map(group => (
          <div key={group.section} className="border border-[#E8E8E4] rounded">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E8E8E4] bg-[#FAFAF8]">
              <p className="text-[12px] font-bold text-[#1A1816] uppercase tracking-wide">{group.section}</p>
              <button type="button" onClick={() => onJump(group.step)} className="text-[12px] text-[#D03839] hover:underline font-semibold">Edit</button>
            </div>
            <div className="divide-y divide-[#F0F0EC]">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-start gap-4 px-4 py-2.5">
                  <p className="text-[12px] text-[#737370] w-[200px] shrink-0">{item.label}</p>
                  <p className="text-[13px] text-[#1A1816] flex-1 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
