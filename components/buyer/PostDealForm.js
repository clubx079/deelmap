'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, X, Upload, Star, MapPin, Check, FileText, DollarSign } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabaseMarketplace } from '@/lib/supabase'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const PROPERTY_TYPES = [
  'Single Family', 'Multi-Family', 'Condo', 'Townhouse',
  'Apartment Building', 'Commercial', 'Land', 'Other'
]

const STEPS = [
  { label: 'Basic Info', desc: 'Address & price' },
  { label: 'Photos',     desc: 'Upload images' },
  { label: 'Details',    desc: 'Description' },
  { label: 'Payment',    desc: '$20 listing fee' },
]
const EDIT_STEPS = STEPS.slice(0, 3)

// ─── Shared input/label classes ────────────────────────────────────────
const inputCls = 'w-full h-[42px] px-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816] transition-colors bg-white'
const labelCls = 'block text-[13px] font-medium text-[#1A1816] mb-1.5'

// ─── Step indicator ────────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-start gap-0 mb-8">
      {steps.map((s, i) => {
        const done    = i < current
        const active  = i === current
        const last    = i === steps.length - 1
        return (
          <div key={i} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all
                ${done   ? 'bg-[#1A1816] text-white'
                : active ? 'bg-[#D03839] text-white ring-4 ring-[#D03839]/15'
                :          'bg-[#F3F3F0] text-[#A8A8A4]'}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`mt-1.5 text-[11px] font-semibold text-center leading-tight hidden sm:block
                ${active ? 'text-[#1A1816]' : done ? 'text-[#737370]' : 'text-[#A8A8A4]'}`}>
                {s.label}
              </span>
            </div>
            {!last && (
              <div className={`flex-1 h-px mt-4 mx-2 transition-colors ${done ? 'bg-[#1A1816]' : 'bg-[#E8E8E4]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Basic Info ────────────────────────────────────────────────
function StepBasicInfo({ data, onChange }) {
  useEffect(() => {
    loadGoogleMapsAPI().then(() => {
      const input = document.getElementById('listing-location-input')
      if (!input || !window.google?.maps?.places) return
      const ac = new window.google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place.address_components) return
        let city = '', state = '', zipcode = '', address = place.formatted_address || ''
        let lat = place.geometry?.location?.lat() || null
        let lng = place.geometry?.location?.lng() || null
        for (const comp of place.address_components) {
          if (comp.types.includes('locality')) city = comp.long_name
          if (comp.types.includes('administrative_area_level_1')) state = comp.short_name
          if (comp.types.includes('postal_code')) zipcode = comp.long_name
        }
        onChange({ location: address, address, city, state, zipcode, latitude: lat, longitude: lng })
      })
    })
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Property Title <span className="text-[#D03839]">*</span></label>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. 3 Bed Single Family in Indianapolis"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Property Address <span className="text-[#D03839]">*</span></label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4] pointer-events-none" />
          <input
            id="listing-location-input"
            type="text"
            defaultValue={data.location || ''}
            placeholder="Start typing an address..."
            className={`${inputCls} pl-9`}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Asking Price ($)</label>
          <input
            type="number"
            value={data.price || ''}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="e.g. 75,000"
            min={0}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Property Type</label>
          <select
            value={data.property_type || ''}
            onChange={e => onChange({ property_type: e.target.value })}
            className={inputCls}
          >
            <option value="">Select type</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Beds</label>
          <input type="number" value={data.bedrooms || ''} onChange={e => onChange({ bedrooms: e.target.value })} min={0} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Baths</label>
          <input type="number" value={data.bathrooms || ''} onChange={e => onChange({ bathrooms: e.target.value })} step={0.5} min={0} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Sq Ft</label>
          <input type="number" value={data.floor_area || ''} onChange={e => onChange({ floor_area: e.target.value })} min={0} placeholder="0" className={inputCls} />
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Photos ────────────────────────────────────────────────────
function StepPhotos({ photos, onPhotosChange, userId }) {
  // photos entries: { image_url, preview_url?, is_featured, sort_order, uploading? }

  const handleFiles = async (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    // 1. Show local previews immediately
    const previews = imageFiles.map((file, i) => ({
      image_url: null,
      preview_url: URL.createObjectURL(file),
      is_featured: false,
      sort_order: photos.length + i,
      uploading: true,
    }))
    const baseIndex = photos.length
    onPhotosChange([...photos, ...previews])

    // 2. Upload each file and swap preview → remote URL
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const imageKey = `manual/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabaseMarketplace.storage
          .from('scraperpropertyphotos')
          .upload(imageKey, file, { cacheControl: '3600', upsert: false })
        const remoteUrl = !error
          ? supabaseMarketplace.storage.from('scraperpropertyphotos').getPublicUrl(imageKey).data.publicUrl
          : null
        onPhotosChange(prev => prev.map((p, idx) =>
          idx === baseIndex + i
            ? { ...p, image_url: remoteUrl || p.preview_url, image_key: imageKey, uploading: false }
            : p
        ))
      } catch {
        onPhotosChange(prev => prev.map((p, idx) =>
          idx === baseIndex + i ? { ...p, uploading: false } : p
        ))
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const anyUploading = photos.some(p => p.uploading)

  return (
    <div className="space-y-4">

      {/* Yellow note */}
      <div className="flex items-start gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-4 py-3">
        <span className="text-[16px] leading-none mt-0.5">💡</span>
        <p className="text-[13px] text-[#92400E]">
          <span className="font-semibold">Tip:</span> Click the <Star className="inline w-3 h-3 mx-0.5 text-[#92400E]" fill="currentColor" /> star on any photo to set it as the <span className="font-semibold">thumbnail</span> shown in search results.
        </p>
      </div>

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="flex flex-col items-center justify-center border-2 border-dashed border-[#E8E8E4] rounded-xl p-8 text-center hover:border-[#1A1816] hover:bg-[#FAFAF8] transition-all cursor-pointer"
      >
        <div className="w-12 h-12 bg-[#F3F3F0] rounded-full flex items-center justify-center mb-3">
          <Upload className="w-5 h-5 text-[#737370]" />
        </div>
        <p className="text-[14px] font-medium text-[#1A1816] mb-1">Drag & drop photos here</p>
        <p className="text-[13px] text-[#A8A8A4] mb-4">PNG, JPG up to 10MB each</p>
        <span className="inline-flex h-[38px] px-5 items-center bg-[#1A1816] text-white text-[13px] font-semibold rounded-lg hover:bg-[#2A2825] transition-colors pointer-events-none">
          Browse files
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </label>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[13px] font-medium text-[#1A1816]">
              {photos.length} photo{photos.length !== 1 ? 's' : ''}
              {anyUploading && <span className="text-[#A8A8A4] font-normal ml-1.5">— uploading...</span>}
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {photos.map((photo, idx) => {
              const src = photo.preview_url || photo.image_url
              return (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-[#F3F3F0] border border-[#E8E8E4]">
                  {src && <img src={src} alt="" className="w-full h-full object-cover" />}

                  {/* Upload spinner overlay */}
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Star (featured) */}
                  {!photo.uploading && (
                    <button
                      onClick={() => onPhotosChange(photos.map((p, i) => ({ ...p, is_featured: i === idx })))}
                      className={`absolute top-1.5 left-1.5 p-1 rounded-full shadow transition-all ${photo.is_featured ? 'bg-[#D03839] text-white' : 'bg-white/90 text-[#737370] hover:text-[#D03839]'}`}
                    >
                      <Star className="w-3 h-3" fill={photo.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  )}

                  {/* Remove */}
                  <button
                    onClick={() => onPhotosChange(photos.filter((_, i) => i !== idx))}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 text-[#737370] hover:text-[#D03839] shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Cover badge */}
                  {photo.is_featured && !photo.uploading && (
                    <div className="absolute bottom-0 left-0 right-0 bg-[#D03839] py-0.5 text-center">
                      <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Cover</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Details ───────────────────────────────────────────────────
function StepDetails({ data, onChange }) {
  const [inspectionUploading, setInspectionUploading] = useState(false)

  const handleInspectionUpload = async (file) => {
    setInspectionUploading(true)
    try {
      const path = `inspection-reports/${Date.now()}-${file.name}`
      const { error } = await supabaseMarketplace.storage.from('scraperpropertyphotos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabaseMarketplace.storage.from('scraperpropertyphotos').getPublicUrl(path)
        onChange({ inspection_report_url: urlData.publicUrl })
      }
    } catch {}
    setInspectionUploading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Property Description</label>
        <textarea
          value={data.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Describe the property, its features, condition, and unique selling points..."
          rows={5}
          className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816] transition-colors resize-none"
        />
      </div>
      <div>
        <label className={labelCls}>Repairs & Renovation Notes</label>
        <textarea
          value={data.repairs || ''}
          onChange={e => onChange({ repairs: e.target.value })}
          placeholder="Detail repairs needed, recent renovations, or planned improvements..."
          rows={4}
          className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816] transition-colors resize-none"
        />
      </div>
      <div>
        <label className={labelCls}>
          Inspection Report <span className="text-[#A8A8A4] font-normal ml-1">(optional)</span>
        </label>
        {data.inspection_report_url ? (
          <div className="flex items-center gap-3 p-3 bg-[#E4F5EC] border border-[#B6E4CE] rounded-lg text-[13px]">
            <div className="w-7 h-7 bg-[#0F6E56] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[#0F6E56] font-medium flex-1">Report uploaded</span>
            <button onClick={() => onChange({ inspection_report_url: null })} className="text-[#D03839] text-[12px] font-medium hover:underline">Remove</button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-3 h-[42px] px-4 border border-dashed border-[#E8E8E4] rounded-lg text-[13px] text-[#737370] hover:border-[#1A1816] hover:text-[#1A1816] transition-colors">
            <FileText className="w-4 h-4 flex-shrink-0" />
            {inspectionUploading ? 'Uploading...' : 'Upload PDF or DOC'}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={e => e.target.files[0] && handleInspectionUpload(e.target.files[0])}
              disabled={inspectionUploading}
            />
          </label>
        )}
      </div>
    </div>
  )
}

// ─── Step 4: Payment ───────────────────────────────────────────────────
function CheckoutForm({ formData, photos, user, onSuccess }) {
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

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })
      if (confirmError) { setError(confirmError.message); setProcessing(false); return }

      if (paymentIntent?.status === 'succeeded') {
        const res = await fetch('/api/buyer/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify(formData),
        })
        const data = await res.json()
        if (data.success && photos.length > 0) {
          // Sort so the starred photo is first (sort_order 0 = cover)
          const sorted = [...photos].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
          const photoRows = sorted.map((p, i) => ({
            property_id: data.id,
            image_url: p.image_url || p.preview_url,
            image_key: p.image_key || null,
            sort_order: i,
          }))
          await supabaseMarketplace.from('property_images').insert(photoRows)
        }
        onSuccess()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <PaymentElement />
      {error && (
        <div className="p-3 bg-[#FEF0EF] border border-[#F5C0BF] rounded-lg text-[13px] text-[#D03839]">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full h-[46px] bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Processing...</>
        ) : (
          <><DollarSign className="w-4 h-4" />Pay $20.00 & Publish</>
        )}
      </button>
    </form>
  )
}

function StepPayment({ formData, photos, user, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [loadingSecret, setLoadingSecret] = useState(true)
  const [secretError, setSecretError] = useState(null)

  useEffect(() => {
    fetch('/api/buyer/listings/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ title: formData.title }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setSecretError(d.error || 'Failed to initialize payment')
      })
      .catch(() => setSecretError('Failed to initialize payment'))
      .finally(() => setLoadingSecret(false))
  }, [])

  if (loadingSecret) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#E8E8E4] border-t-[#D03839]" />
    </div>
  )

  if (secretError) return (
    <div className="p-4 bg-[#FEF0EF] border border-[#F5C0BF] rounded-lg text-[13px] text-[#D03839] text-center">{secretError}</div>
  )

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4">
        <p className="text-[12px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-3">Listing Summary</p>
        <div className="space-y-1.5 mb-4">
          <p className="text-[14px] font-semibold text-[#1A1816]">{formData.title}</p>
          <p className="text-[13px] text-[#737370]">{formData.address}</p>
          {formData.price && (
            <p className="text-[13px] text-[#737370]">${Number(formData.price).toLocaleString()}</p>
          )}
          <p className="text-[13px] text-[#737370]">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="pt-3 border-t border-[#E8E8E4] flex justify-between items-center">
          <span className="text-[13px] font-medium text-[#1A1816]">One-time listing fee</span>
          <span className="text-[16px] font-bold text-[#1A1816]">$20.00</span>
        </div>
      </div>

      {stripePromise && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm formData={formData} photos={photos} user={user} onSuccess={onSuccess} />
        </Elements>
      ) : (
        <div className="p-4 bg-[#FEF3E2] border border-[#F5D9A0] rounded-lg text-[13px] text-[#B5620A] text-center">
          Stripe is not configured. Add <code className="font-mono bg-[#FEF0D4] px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to .env.local
        </div>
      )}
    </div>
  )
}

// ─── Main Form ─────────────────────────────────────────────────────────
export default function PostDealForm({ user, existing, onClose, onSuccess }) {
  const isEdit = !!existing
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    title:                existing?.title || '',
    location:             existing?.location || existing?.address || '',
    address:              existing?.address || '',
    city:                 existing?.city || '',
    state:                existing?.state || '',
    zipcode:              existing?.zipcode || '',
    latitude:             existing?.latitude || null,
    longitude:            existing?.longitude || null,
    price:                existing?.price || '',
    property_type:        existing?.property_type || '',
    bedrooms:             existing?.bedrooms || '',
    bathrooms:            existing?.bathrooms || '',
    floor_area:           existing?.floor_area || '',
    description:          existing?.description || '',
    repairs:              existing?.repairs || '',
    inspection_report_url: existing?.inspection_report_url || null,
  })
  const [photos, setPhotos] = useState(
    (existing?.property_images || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const update = (fields) => setFormData(prev => ({ ...prev, ...fields }))
  const canNext = () => step === 0 ? !!(formData.title?.trim() && formData.address?.trim()) : true

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/buyer/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ id: existing.id, ...formData }),
      })
      if (res.ok) {
        await supabaseMarketplace.from('property_images').delete().eq('property_id', existing.id)
        if (photos.length > 0) {
          const sorted = [...photos].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
          await supabaseMarketplace.from('property_images').insert(
            sorted.map((p, i) => ({ property_id: existing.id, image_url: p.image_url || p.preview_url, image_key: p.image_key || null, sort_order: i }))
          )
        }
        onSuccess()
      }
    } catch {}
    setSaving(false)
  }

  const stepsToShow = isEdit ? EDIT_STEPS : STEPS

  // ─── Success state ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="p-4 lg:p-8 flex flex-col items-center justify-center min-h-[500px] text-center" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="w-16 h-16 bg-[#E4F5EC] rounded-full flex items-center justify-center mb-5">
          <Check className="w-8 h-8 text-[#0F6E56]" />
        </div>
        <h1 className="text-[24px] font-bold text-[#1A1816] mb-2">Deal Published!</h1>
        <p className="text-[15px] text-[#737370] mb-8 max-w-sm">Your listing is now live on the marketplace and visible to buyers.</p>
        <button
          onClick={onSuccess}
          className="h-[44px] px-8 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors"
        >
          View My Listings
        </button>
      </div>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="max-w-2xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to My Listings
          </button>
          <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">
            {isEdit ? 'Edit Listing' : 'Post a Deal'}
          </h1>
          <p className="text-[14px] text-[#737370] mt-1">
            {isEdit ? 'Update your property details below.' : 'Fill in the details to list your property on the marketplace.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E8E4] rounded-xl p-6 lg:p-8">

          {/* Step indicator */}
          <StepIndicator steps={stepsToShow} current={step} />

          {/* Step content */}
          <div className="mb-8">
            {step === 0 && <StepBasicInfo data={formData} onChange={update} />}
            {step === 1 && <StepPhotos photos={photos} onPhotosChange={setPhotos} userId={user?.id} />}
            {step === 2 && <StepDetails data={formData} onChange={update} />}
            {step === 3 && !isEdit && (
              <StepPayment formData={formData} photos={photos} user={user} onSuccess={() => setDone(true)} />
            )}
          </div>

          {/* Navigation — hidden on payment step */}
          {!(step === 3 && !isEdit) && (
            <div className="flex gap-3 pt-2 border-t border-[#F3F3F0]">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="h-[42px] px-5 border border-[#E8E8E4] rounded-lg text-[13px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
                >
                  Back
                </button>
              )}
              {step < stepsToShow.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex-1 h-[42px] bg-[#1A1816] hover:bg-[#2A2825] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-40"
                >
                  Continue
                </button>
              ) : isEdit ? (
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="flex-1 h-[42px] bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              ) : null}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
