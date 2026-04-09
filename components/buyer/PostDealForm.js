'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Upload, Star, Trash2, MapPin, Check } from 'lucide-react'
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

const STEPS = ['Basic Info', 'Photos', 'Details', 'Payment']

// ─── Step 1: Basic Info ────────────────────────────────────────────────
function StepBasicInfo({ data, onChange }) {
  const autocompleteRef = { current: null }

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
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Property Title <span className="text-[#D03839]">*</span></label>
        <input
          type="text"
          value={data.title || ''}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. 3 Bed Single Family in Indianapolis"
          className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Location <span className="text-[#D03839]">*</span></label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
          <input
            id="listing-location-input"
            type="text"
            defaultValue={data.location || ''}
            placeholder="Start typing an address..."
            className="w-full h-[42px] pl-9 pr-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Price ($)</label>
          <input
            type="number"
            value={data.price || ''}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="e.g. 75000"
            min={0}
            className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Property Type</label>
          <select
            value={data.property_type || ''}
            onChange={e => onChange({ property_type: e.target.value })}
            className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816] bg-white"
          >
            <option value="">Select type</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Bedrooms</label>
          <input
            type="number"
            value={data.bedrooms || ''}
            onChange={e => onChange({ bedrooms: e.target.value })}
            min={0}
            className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Bathrooms</label>
          <input
            type="number"
            value={data.bathrooms || ''}
            onChange={e => onChange({ bathrooms: e.target.value })}
            step={0.5}
            min={0}
            className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Sqft</label>
          <input
            type="number"
            value={data.floor_area || ''}
            onChange={e => onChange({ floor_area: e.target.value })}
            min={0}
            className="w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816]"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Photos ────────────────────────────────────────────────────
function StepPhotos({ photos, onPhotosChange, userId }) {
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files) => {
    setUploading(true)
    const uploaded = []
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()
        const path = `property-images/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabaseMarketplace.storage
          .from('property-images')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (!error) {
          const { data: urlData } = supabaseMarketplace.storage.from('property-images').getPublicUrl(path)
          uploaded.push({ image_url: urlData.publicUrl, is_featured: false, sort_order: photos.length + uploaded.length })
        }
      } catch {}
    }
    onPhotosChange([...photos, ...uploaded])
    setUploading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')))
  }

  const setFeatured = (idx) => {
    onPhotosChange(photos.map((p, i) => ({ ...p, is_featured: i === idx })))
  }

  const removePhoto = (idx) => {
    onPhotosChange(photos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-[#E8E8E4] rounded-lg p-8 text-center hover:border-[#1A1816] transition-colors"
      >
        <Upload className="w-8 h-8 text-[#A8A8A4] mx-auto mb-2" />
        <p className="text-[14px] text-[#737370] mb-3">Drag & drop photos here, or</p>
        <label className="cursor-pointer inline-flex h-[36px] px-4 items-center bg-[#1A1816] text-white text-[13px] font-medium rounded hover:bg-[#2A2825] transition-colors">
          {uploading ? 'Uploading...' : 'Browse files'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(Array.from(e.target.files))}
            disabled={uploading}
          />
        </label>
      </div>

      {photos.length > 0 && (
        <div>
          <p className="text-[12px] text-[#737370] mb-2">Click the star to set as featured photo</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative group aspect-square rounded overflow-hidden bg-[#FAFAF8]">
                <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                {/* Featured star */}
                <button
                  onClick={() => setFeatured(idx)}
                  className={`absolute top-1 left-1 p-1 rounded-full transition-colors ${photo.is_featured ? 'bg-[#D03839] text-white' : 'bg-white/80 text-[#737370] hover:text-[#D03839]'}`}
                >
                  <Star className="w-3 h-3" fill={photo.is_featured ? 'currentColor' : 'none'} />
                </button>
                {/* Remove */}
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/80 text-[#737370] hover:text-[#D03839] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
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
      const { error } = await supabaseMarketplace.storage.from('property-images').upload(path, file)
      if (!error) {
        const { data: urlData } = supabaseMarketplace.storage.from('property-images').getPublicUrl(path)
        onChange({ inspection_report_url: urlData.publicUrl })
      }
    } catch {}
    setInspectionUploading(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Property Description</label>
        <textarea
          value={data.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Describe the property, its features, and unique selling points..."
          rows={5}
          className="w-full px-3 py-2 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816] resize-none"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Repairs & Renovation</label>
        <textarea
          value={data.repairs || ''}
          onChange={e => onChange({ repairs: e.target.value })}
          placeholder="Detail any repairs needed, recent renovations, or planned improvements..."
          rows={4}
          className="w-full px-3 py-2 border border-[#E8E8E4] rounded text-[14px] focus:outline-none focus:border-[#1A1816] resize-none"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-[#1A1816] mb-1">Inspection Report <span className="text-[#A8A8A4] font-normal">(optional)</span></label>
        {data.inspection_report_url ? (
          <div className="flex items-center gap-2 text-[13px] text-[#0F6E56]">
            <Check className="w-4 h-4" />
            <span>Report uploaded</span>
            <button onClick={() => onChange({ inspection_report_url: null })} className="text-[#D03839] ml-2">Remove</button>
          </div>
        ) : (
          <label className="cursor-pointer inline-flex h-[36px] px-4 items-center border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] hover:border-[#1A1816] transition-colors">
            {inspectionUploading ? 'Uploading...' : 'Upload PDF / DOC'}
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

// ─── Step 4: Payment (Stripe) ──────────────────────────────────────────
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
        // Save the listing
        const res = await fetch('/api/buyer/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify(formData),
        })
        const data = await res.json()

        if (data.success && photos.length > 0) {
          // Save photos linked to the new property
          const photoRows = photos.map((p, i) => ({
            property_id: data.id,
            image_url: p.image_url,
            is_featured: p.is_featured || i === 0,
            sort_order: i,
          }))
          await supabaseMarketplace.from('property_images').insert(photoRows)
        }

        onSuccess()
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setProcessing(false)
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-[13px] text-[#D03839]">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full h-[44px] bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded transition-colors disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay $20 & Publish'}
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
    <div className="flex items-center justify-center py-10">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#E8E8E4] border-t-[#D03839]" />
    </div>
  )

  if (secretError) return (
    <p className="text-[13px] text-[#D03839] text-center py-6">{secretError}</p>
  )

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-lg p-4 text-[13px]">
        <p className="font-semibold text-[#1A1816] mb-2">Listing Summary</p>
        <div className="space-y-1 text-[#737370]">
          <p>{formData.title}</p>
          <p>{formData.address}</p>
          {formData.price && <p>${Number(formData.price).toLocaleString()}</p>}
          <p>{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E8E8E4] flex justify-between font-semibold text-[#1A1816]">
          <span>Listing fee</span>
          <span>$20.00</span>
        </div>
      </div>

      {stripePromise && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm formData={formData} photos={photos} user={user} onSuccess={onSuccess} />
        </Elements>
      ) : (
        <p className="text-[13px] text-[#D03839] text-center">Stripe is not configured yet. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local</p>
      )}
    </div>
  )
}

// ─── Main Form ─────────────────────────────────────────────────────────
export default function PostDealForm({ user, existing, onClose, onSuccess }) {
  const isEdit = !!existing
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    title: existing?.title || '',
    location: existing?.location || existing?.address || '',
    address: existing?.address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    zipcode: existing?.zipcode || '',
    latitude: existing?.latitude || null,
    longitude: existing?.longitude || null,
    price: existing?.price || '',
    property_type: existing?.property_type || '',
    bedrooms: existing?.bedrooms || '',
    bathrooms: existing?.bathrooms || '',
    floor_area: existing?.floor_area || '',
    description: existing?.description || '',
    repairs: existing?.repairs || '',
    inspection_report_url: existing?.inspection_report_url || null,
  })
  const [photos, setPhotos] = useState(
    (existing?.property_images || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const update = (fields) => setFormData(prev => ({ ...prev, ...fields }))

  const canNext = () => {
    if (step === 0) return !!(formData.title?.trim() && formData.address?.trim())
    return true
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/buyer/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ id: existing.id, ...formData }),
      })
      if (res.ok) {
        // Update photos
        await supabaseMarketplace.from('property_images').delete().eq('property_id', existing.id)
        if (photos.length > 0) {
          const rows = photos.map((p, i) => ({
            property_id: existing.id,
            image_url: p.image_url,
            is_featured: p.is_featured || i === 0,
            sort_order: i,
          }))
          await supabaseMarketplace.from('property_images').insert(rows)
        }
        onSuccess()
      }
    } catch {}
    setSaving(false)
  }

  const stepsToShow = isEdit ? ['Basic Info', 'Photos', 'Details'] : STEPS

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="w-14 h-14 bg-[#E4F5EC] rounded-full flex items-center justify-center mb-4">
          <Check className="w-7 h-7 text-[#0F6E56]" />
        </div>
        <h2 className="text-[20px] font-bold text-[#1A1816] mb-2">Deal Published!</h2>
        <p className="text-[14px] text-[#737370] mb-6">Your listing is now live on the marketplace.</p>
        <button
          onClick={onSuccess}
          className="h-[40px] px-6 bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors"
        >
          View My Listings
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-[16px] font-bold text-[#1A1816]">{isEdit ? 'Edit Listing' : 'Post a Deal'}</h2>
        <div className="w-16" />
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-8">
        {stepsToShow.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold flex-shrink-0 transition-colors ${i < step ? 'bg-[#0F6E56] text-white' : i === step ? 'bg-[#D03839] text-white' : 'bg-[#E8E8E4] text-[#737370]'}`}>
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-[11px] font-medium hidden sm:block ${i === step ? 'text-[#1A1816]' : 'text-[#A8A8A4]'}`}>{label}</span>
            {i < stepsToShow.length - 1 && <div className={`flex-1 h-px ml-1 ${i < step ? 'bg-[#0F6E56]' : 'bg-[#E8E8E4]'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {step === 0 && <StepBasicInfo data={formData} onChange={update} />}
        {step === 1 && <StepPhotos photos={photos} onPhotosChange={setPhotos} userId={user?.id} />}
        {step === 2 && <StepDetails data={formData} onChange={update} />}
        {step === 3 && !isEdit && (
          <StepPayment
            formData={formData}
            photos={photos}
            user={user}
            onSuccess={() => setDone(true)}
          />
        )}
      </div>

      {/* Navigation — hide on payment step */}
      {!(step === 3 && !isEdit) && (
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 h-[42px] border border-[#E8E8E4] rounded text-[13px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
            >
              Back
            </button>
          )}
          {step < stepsToShow.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 h-[42px] bg-[#1A1816] hover:bg-[#2A2825] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-40"
            >
              Next
            </button>
          ) : isEdit ? (
            <button
              onClick={handleEditSave}
              disabled={saving}
              className="flex-1 h-[42px] bg-[#D03839] hover:bg-[#C73022] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
