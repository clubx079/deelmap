'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, X, Upload, Star, MapPin, Check, FileText, DollarSign, Home, Sparkles, TrendingUp, Zap, Package } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabaseMarketplace } from '@/lib/supabase'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// Compress image client-side before upload (max 1920px, 85% JPEG quality)
async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1920
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const PROPERTY_TYPES = [
  'Single Family', 'Multi-Family', 'Condo', 'Townhouse',
  'Apartment Building', 'Commercial', 'Land', 'Other'
]

const STEPS = [
  { label: 'Basic Info',   desc: 'Address & price' },
  { label: 'Photos',       desc: 'Upload images' },
  { label: 'Seller Type',  desc: 'Owner or wholesaler' },
  { label: 'Details',      desc: 'Description' },
  { label: 'Payment',      desc: 'Publish listing' },
]
const EDIT_STEPS = [STEPS[0], STEPS[1], STEPS[3]]

const ADD_ONS = [
  { id: 'highlight',  label: 'Highlight Listing',      desc: 'Stand out in search results',          price: 999,  icon: Sparkles },
  { id: 'homepage',  label: 'Feature on Homepage',    desc: 'Shown to all visitors for 7 days',     price: 2900, icon: TrendingUp },
  { id: 'boost',     label: 'Boost Listing',          desc: 'Priority placement for 7 days',        price: 1499, icon: Zap },
  { id: 'bundle',    label: 'Full Visibility Bundle',  desc: 'Highlight + Boost',                    price: 2200, icon: Package },
]

// ─── Shared input/label classes ────────────────────────────────────────
const inputCls = 'w-full h-[42px] px-3 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/12 transition-colors bg-white'
const labelCls = 'block text-[12px] font-medium text-[#1A1816] mb-1.5'

// ─── Step indicator ────────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="w-full mb-8">
      {/* Progress bar */}
      <div className="relative h-1 bg-[#E8E8E4] rounded-full mb-5 w-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-[#D03839] transition-all duration-500"
          style={{ width: `${((current) / (steps.length - 1)) * 100}%` }}
        />
      </div>
      {/* Step circles row */}
      <div className="flex items-start justify-between w-full">
        {steps.map((s, i) => {
          const done   = i < current
          const active = i === current
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all flex-shrink-0
                ${done   ? 'bg-[#1A1816] text-white'
                : active ? 'bg-[#D03839] text-white ring-4 ring-[#D03839]/15'
                :          'bg-[#F3F3F0] text-[#A8A8A4]'}`}>
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold text-center leading-tight hidden sm:block
                ${active ? 'text-[#1A1816]' : done ? 'text-[#737370]' : 'text-[#A8A8A4]'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 1: Basic Info ────────────────────────────────────────────────
function StepBasicInfo({ data, onChange }) {
  useEffect(() => {
    loadGoogleMapsAPI().then(() => {
      const input = document.getElementById('listing-location-input')
      if (!input || !window.google?.maps?.places) return
      // Pre-fill the address input for edit mode
      if (data.location && !input.value) input.value = data.location
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
        onChange({ location: address, address, city, state, zipcode, latitude: lat, longitude: lng, title: address })
      })
    })
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Property Address <span className="text-[#D03839]">*</span></label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4] pointer-events-none" />
          <input
            id="listing-location-input"
            type="text"
            defaultValue={data.location || data.address || ''}
            placeholder="Start typing an address..."
            className={`${inputCls} pl-9`}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Asking Price ($) <span className="text-[#D03839]">*</span></label>
          <input
            type="number"
            value={data.price || ''}
            onChange={e => onChange({ price: e.target.value })}
            onKeyDown={e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
            placeholder="e.g. 75000"
            min={0}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Property Type <span className="text-[#D03839]">*</span></label>
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
          <label className={labelCls}>Beds <span className="text-[#D03839]">*</span></label>
          <input type="number" value={data.bedrooms || ''} onChange={e => onChange({ bedrooms: e.target.value })} onKeyDown={e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} min={0} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Baths <span className="text-[#D03839]">*</span></label>
          <input type="number" value={data.bathrooms || ''} onChange={e => onChange({ bathrooms: e.target.value })} onKeyDown={e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} step={0.5} min={0} placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Sq Ft <span className="text-[#D03839]">*</span></label>
          <input type="number" value={data.floor_area || ''} onChange={e => onChange({ floor_area: e.target.value })} onKeyDown={e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()} min={0} placeholder="0" className={inputCls} />
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Photos ────────────────────────────────────────────────────
function StepPhotos({ photos, onPhotosChange, userId }) {
  // photos entries: { image_url, preview_url?, is_featured, sort_order, uploading? }

  const handleFiles = async (files) => {
    const checkHeic = f => f.type === 'image/heic' || f.type === 'image/heif' || /\.(heic|heif)$/i.test(f.name)
    const isImage = f => f.type.startsWith('image/') || checkHeic(f)
    const rawFiles = Array.from(files).filter(isImage)
    if (!rawFiles.length) return

    // 1. Show placeholders immediately so user sees tiles right away
    const baseIndex = photos.length
    const placeholders = rawFiles.map((file, i) => ({
      image_url: null,
      preview_url: checkHeic(file) ? null : URL.createObjectURL(file),
      is_featured: false,
      sort_order: baseIndex + i,
      uploading: true,
      converting: checkHeic(file),
    }))
    onPhotosChange(prev => [...prev, ...placeholders])

    // 2. Process + upload each file independently with concurrency limit of 5
    const CONCURRENCY = 5
    const queue = rawFiles.map((file, i) => async () => {
      try {
        let uploadFile = file

        if (checkHeic(file)) {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/convert-heic', { method: 'POST', body: fd })
          if (!res.ok) throw new Error('HEIC conversion failed')
          const blob = await res.blob()
          uploadFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
          onPhotosChange(prev => prev.map((p, idx) =>
            idx === baseIndex + i ? { ...p, preview_url: URL.createObjectURL(uploadFile), converting: false } : p
          ))
        }

        // Compress before upload
        uploadFile = await compressImage(uploadFile)

        const imageKey = `manual/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error } = await supabaseMarketplace.storage
          .from('scraperpropertyphotos')
          .upload(imageKey, uploadFile, { cacheControl: '3600', upsert: false })
        const remoteUrl = !error
          ? supabaseMarketplace.storage.from('scraperpropertyphotos').getPublicUrl(imageKey).data.publicUrl
          : null
        onPhotosChange(prev => prev.map((p, idx) =>
          idx === baseIndex + i
            ? { ...p, image_url: remoteUrl || p.preview_url, image_key: imageKey, uploading: false, converting: false }
            : p
        ))
      } catch {
        onPhotosChange(prev => prev.map((p, idx) =>
          idx === baseIndex + i ? { ...p, uploading: false, converting: false } : p
        ))
      }
    })
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async (_, w) => {
      for (let i = w; i < queue.length; i += CONCURRENCY) await queue[i]()
    })
    await Promise.all(workers)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const anyUploading = photos.some(p => p.uploading)
  const anyConverting = photos.some(p => p.converting)

  return (
    <div className="space-y-4">

      {/* Yellow note */}
      <div className="flex items-start gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded px-4 py-3">
        <svg className="w-4 h-4 text-[#92400E] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        <p className="text-[13px] text-[#92400E]">
          <span className="font-semibold">Tip:</span> Click the <Star className="inline w-3 h-3 mx-0.5 text-[#92400E]" fill="currentColor" /> star on any photo to set it as the <span className="font-semibold">thumbnail</span> shown in search results. At least 1 photo is required.
        </p>
      </div>

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="flex flex-col items-center justify-center border-2 border-dashed border-[#E8E8E4] rounded p-8 text-center hover:border-[#D03839] hover:bg-[#FAFAF8] transition-all cursor-pointer"
      >
        <div className="w-12 h-12 bg-[#F3F3F0] rounded flex items-center justify-center mb-3">
          <Upload className="w-5 h-5 text-[#737370]" />
        </div>
        <p className="text-[14px] font-medium text-[#1A1816] mb-1">Drag & drop photos here</p>
        <p className="text-[13px] text-[#A8A8A4] mb-4">PNG, JPG up to 10MB each</p>
        <span className="inline-flex h-[38px] px-5 items-center bg-[#1A1816] text-white text-[13px] font-semibold rounded hover:bg-[#2A2825] transition-colors pointer-events-none">
          Browse files
        </span>
        <input
          type="file"
          accept="image/*,.heic,.heif"
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
              {anyConverting && <span className="text-[#A8A8A4] font-normal ml-1.5">— converting...</span>}
              {!anyConverting && anyUploading && <span className="text-[#A8A8A4] font-normal ml-1.5">— uploading...</span>}
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {photos.map((photo, idx) => {
              const src = photo.preview_url || photo.image_url
              return (
                <div key={idx} className="relative group aspect-square rounded overflow-hidden bg-[#F3F3F0] border border-[#E8E8E4]">
                  {src && <img src={src} alt="" className="w-full h-full object-cover" />}

                  {/* Upload / convert spinner overlay */}
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1.5">
                      <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {photo.converting && (
                        <span className="text-white text-[10px] font-semibold tracking-wide">Converting...</span>
                      )}
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

// ─── Step 3: Seller Type ───────────────────────────────────────────────
function StepSellerType({ data, onChange }) {
  const [contractUploading, setContractUploading] = useState(false)

  const handleContractUpload = async (file) => {
    setContractUploading(true)
    try {
      const path = `contracts/${Date.now()}-${file.name}`
      const { error } = await supabaseMarketplace.storage.from('scraperpropertyphotos').upload(path, file)
      if (!error) {
        const { data: urlData } = supabaseMarketplace.storage.from('scraperpropertyphotos').getPublicUrl(path)
        onChange({ contract_url: urlData.publicUrl })
      }
    } catch {}
    setContractUploading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[14px] font-semibold text-[#1A1816] mb-1">Are you the owner or a wholesaler? <span className="text-[#D03839]">*</span></p>
        <p className="text-[13px] text-[#737370] mb-4">This helps us verify your listing and protect buyers.</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onChange({ seller_type: 'owner', contract_url: null })}
            className={`flex flex-col items-center gap-3 p-5 border-2 rounded text-center transition-all ${data.seller_type === 'owner' ? 'border-[#D03839] bg-[#FEF0EF]' : 'border-[#E8E8E4] hover:border-[#D4D4CF] bg-white'}`}
          >
            <div className={`w-12 h-12 rounded flex items-center justify-center ${data.seller_type === 'owner' ? 'bg-[#D03839]' : 'bg-[#F3F3F0]'}`}>
              <Home className={`w-6 h-6 ${data.seller_type === 'owner' ? 'text-white' : 'text-[#737370]'}`} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1A1816]">I&apos;m the Owner</p>
              <p className="text-[12px] text-[#737370] mt-0.5">I own this property directly</p>
            </div>
            {data.seller_type === 'owner' && (
              <div className="w-5 h-5 rounded-full bg-[#D03839] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChange({ seller_type: 'wholesaler' })}
            className={`flex flex-col items-center gap-3 p-5 border-2 rounded text-center transition-all ${data.seller_type === 'wholesaler' ? 'border-[#D03839] bg-[#FEF0EF]' : 'border-[#E8E8E4] hover:border-[#D4D4CF] bg-white'}`}
          >
            <div className={`w-12 h-12 rounded flex items-center justify-center ${data.seller_type === 'wholesaler' ? 'bg-[#D03839]' : 'bg-[#F3F3F0]'}`}>
              <FileText className={`w-6 h-6 ${data.seller_type === 'wholesaler' ? 'text-white' : 'text-[#737370]'}`} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1A1816]">I&apos;m a Wholesaler</p>
              <p className="text-[12px] text-[#737370] mt-0.5">I have a contract on this property</p>
            </div>
            {data.seller_type === 'wholesaler' && (
              <div className="w-5 h-5 rounded-full bg-[#D03839] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        </div>
      </div>

      {data.seller_type === 'wholesaler' && (
        <div>
          <label className={labelCls}>Purchase Contract <span className="text-[#D03839]">*</span></label>
          <p className="text-[12px] text-[#737370] mb-2">As a wholesaler, you must upload a copy of your executed purchase contract to proceed.</p>
          {data.contract_url ? (
            <div className="flex items-center gap-3 p-3 bg-[#E4F5EC] border border-[#B6E4CE] rounded text-[13px]">
              <div className="w-7 h-7 bg-[#0F6E56] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[#0F6E56] font-medium flex-1">Contract uploaded</span>
              <button onClick={() => onChange({ contract_url: null })} className="text-[#D03839] text-[12px] font-medium hover:underline">Remove</button>
            </div>
          ) : (
            <label className="cursor-pointer flex items-center gap-3 h-[42px] px-4 border border-dashed border-[#E8E8E4] rounded text-[13px] text-[#737370] hover:border-[#D03839] hover:text-[#1A1816] transition-colors">
              <FileText className="w-4 h-4 flex-shrink-0" />
              {contractUploading ? 'Uploading...' : 'Upload PDF or DOC'}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => e.target.files[0] && handleContractUpload(e.target.files[0])}
                disabled={contractUploading}
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Details ───────────────────────────────────────────────────
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
          className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors resize-none"
        />
      </div>
      <div>
        <label className={labelCls}>Repairs & Renovation Notes</label>
        <textarea
          value={data.repairs || ''}
          onChange={e => onChange({ repairs: e.target.value })}
          placeholder="Detail repairs needed, recent renovations, or planned improvements..."
          rows={4}
          className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#D03839] transition-colors resize-none"
        />
      </div>
      <div>
        <label className={labelCls}>
          Inspection Report <span className="text-[#A8A8A4] font-normal ml-1">(optional)</span>
        </label>
        {data.inspection_report_url ? (
          <div className="flex items-center gap-3 p-3 bg-[#E4F5EC] border border-[#B6E4CE] rounded text-[13px]">
            <div className="w-7 h-7 bg-[#0F6E56] rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[#0F6E56] font-medium flex-1">Report uploaded</span>
            <button onClick={() => onChange({ inspection_report_url: null })} className="text-[#D03839] text-[12px] font-medium hover:underline">Remove</button>
          </div>
        ) : (
          <label className="cursor-pointer flex items-center gap-3 h-[42px] px-4 border border-dashed border-[#E8E8E4] rounded text-[13px] text-[#737370] hover:border-[#D03839] hover:text-[#1A1816] transition-colors">
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

// ─── Step 5: Payment ───────────────────────────────────────────────────
function CheckoutForm({ formData, photos, user, draftId, selectedAddOns, totalCents, onSuccess, onBack }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

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
          body: JSON.stringify({
            ...formData,
            stripe_payment_intent_id: paymentIntent.id,
            amount: totalCents,
            add_ons: selectedAddOns,
            ...(draftId ? { draft_id: draftId } : {}),
          }),
        })
        const data = await res.json()
        if (!data.success) {
          setError('Payment succeeded but listing could not be created. Please contact support with reference: ' + paymentIntent.id)
          setProcessing(false)
          return
        }
        // Only insert photos for brand-new listings (drafts already have photos saved)
        if (!draftId && photos.length > 0) {
          const sorted = [...photos].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
          const photoRows = sorted.map((p, i) => ({
            property_id: data.id,
            image_url: p.image_url || p.preview_url,
            image_key: p.image_key || null,
            sort_order: i,
          }))
          await supabaseMarketplace.from('property_images').insert(photoRows)
        }
        sessionStorage.removeItem(SESSION_KEY)
        onSuccess()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setProcessing(false)
  }

  const featuredPhoto = photos.find(p => p.is_featured) || photos[0]

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div>
        <p className="text-[15px] font-semibold text-[#1A1816] mb-1">Payment Details</p>
        <p className="text-[13px] text-[#737370] mb-5">Your card will be charged <span className="font-semibold text-[#1A1816]">${(totalCents / 100).toFixed(2)}</span> upon submission.</p>
        <PaymentElement />
      </div>

      {/* Your Listing — mobile only, shown between payment element and checkbox */}
      <div className="lg:hidden border border-[#E8E8E4] rounded overflow-hidden bg-white">
        <div className="p-4 bg-[#FAFAF8]">
          <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-widest mb-3">Your Listing</p>
          <div className="flex items-center gap-3">
            {featuredPhoto ? (
              <img
                src={featuredPhoto.image_url || featuredPhoto.preview_url}
                alt=""
                className="w-14 h-14 rounded object-cover flex-shrink-0 border border-[#E8E8E4]"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-[#F3F3F0] flex-shrink-0 flex items-center justify-center border border-[#E8E8E4]">
                <Home className="w-6 h-6 text-[#A8A8A4]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1816] truncate leading-tight">{formData.address || 'Untitled'}</p>
              <p className="text-[11px] text-[#737370] truncate mt-0.5">{formData.address}</p>
            </div>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={e => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#D03839] flex-shrink-0 cursor-pointer"
        />
        <span className="text-[12px] text-[#444441] leading-snug">
          By checking this box, you agree to our{' '}
          <a href="/terms" target="_blank" className="text-[#D03839] underline hover:text-[#E0493B]">User Policy Agreement</a>.
        </span>
      </label>
      {error && (
        <div className="p-3 bg-[#FEF0EF] border border-[#F5C0BF] rounded text-[13px] text-[#D03839]">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing || !agreedToTerms}
        className="w-full h-[48px] bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] active:scale-[0.98] text-white text-[15px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Processing...</>
        ) : (
          <>Confirm and Publish — ${(totalCents / 100).toFixed(2)}</>
        )}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors text-center"
      >
        ← Back to add-ons
      </button>
    </form>
  )
}

const SESSION_KEY = 'deelmap_listing_client_secret'

function StepPayment({ formData, photos, user, draftId, onSuccess }) {
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [clientSecret, setClientSecret] = useState(null)
  const [loadingSecret, setLoadingSecret] = useState(false)
  const [secretError, setSecretError] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const BASE_PRICE = 2900
  const addOnTotal = selectedAddOns.reduce((sum, id) => {
    const addon = ADD_ONS.find(a => a.id === id)
    return sum + (addon?.price || 0)
  }, 0)
  const totalCents = BASE_PRICE + addOnTotal

  const toggleAddOn = (id) => {
    setSelectedAddOns(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id)
      let next = [...prev, id]
      if (id === 'bundle') next = next.filter(a => a !== 'highlight' && a !== 'boost')
      if (id === 'highlight' || id === 'boost') next = next.filter(a => a !== 'bundle')
      return next
    })
    if (showPaymentForm) {
      setShowPaymentForm(false)
      setClientSecret(null)
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  const proceedToPayment = async () => {
    setLoadingSecret(true)
    setSecretError(null)
    try {
      const res = await fetch('/api/buyer/listings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ title: formData.title, formData, amount: totalCents, draft_id: draftId || undefined, add_ons: selectedAddOns }),
      })
      const d = await res.json()
      if (d.clientSecret) {
        sessionStorage.setItem(SESSION_KEY, d.clientSecret)
        setClientSecret(d.clientSecret)
        setShowPaymentForm(true)
      } else {
        setSecretError(d.error || 'Failed to initialize payment')
      }
    } catch {
      setSecretError('Failed to initialize payment')
    }
    setLoadingSecret(false)
  }

  const featuredPhoto = photos.find(p => p.is_featured) || photos[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

      {/* Left column — add-ons or payment form */}
      <div>
        {showPaymentForm && clientSecret ? (
          stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                formData={formData}
                photos={photos}
                user={user}
                draftId={draftId}
                selectedAddOns={selectedAddOns}
                totalCents={totalCents}
                onSuccess={onSuccess}
                onBack={() => { setShowPaymentForm(false); setClientSecret(null); sessionStorage.removeItem(SESSION_KEY) }}
              />
            </Elements>
          ) : (
            <div className="p-4 bg-[#FEF3E2] border border-[#F5D9A0] rounded text-[13px] text-[#B5620A] text-center">
              Stripe is not configured. Add <code className="font-mono bg-[#FEF0D4] px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to .env.local
            </div>
          )
        ) : (
          <div>
            <p className="text-[14px] font-semibold text-[#1A1816] mb-0.5">Boost your listing <span className="text-[12px] font-normal text-[#737370]">(optional)</span></p>
            <p className="text-[12px] text-[#737370] mb-4">Add extras to get more visibility and close faster.</p>
            <div className="space-y-2">
              {ADD_ONS.map(({ id, label, desc, price, icon: Icon }) => {
                const selected = selectedAddOns.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleAddOn(id)}
                    className={`w-full flex items-center gap-3 p-4 border rounded text-left transition-all ${selected ? 'border-[#D03839] bg-[#FEF0EF]' : 'border-[#E8E8E4] hover:border-[#D4D4CF] bg-white'}`}
                  >
                    <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#D03839]' : 'bg-[#F3F3F0]'}`}>
                      <Icon className={`w-4 h-4 ${selected ? 'text-white' : 'text-[#737370]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1816] leading-tight">{label}</p>
                      <p className="text-[12px] text-[#737370]">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[13px] font-bold text-[#1A1816]">+${(price / 100).toFixed(2)}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-[#D03839] bg-[#D03839]' : 'border-[#D4D4CF]'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right column — order summary */}
      <div className="border border-[#E8E8E4] rounded overflow-hidden bg-white flex flex-col">

        {/* Property preview — hidden on mobile (shown inline in CheckoutForm) */}
        <div className="hidden lg:block p-4 bg-[#FAFAF8] border-b border-[#E8E8E4]">
          <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-widest mb-3">Your Listing</p>
          <div className="flex items-center gap-3">
            {featuredPhoto ? (
              <img
                src={featuredPhoto.image_url || featuredPhoto.preview_url}
                alt=""
                className="w-14 h-14 rounded object-cover flex-shrink-0 border border-[#E8E8E4]"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-[#F3F3F0] flex-shrink-0 flex items-center justify-center border border-[#E8E8E4]">
                <Home className="w-6 h-6 text-[#A8A8A4]" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1816] truncate leading-tight">{formData.address || 'Untitled'}</p>
              <p className="text-[11px] text-[#737370] truncate mt-0.5">{formData.address}</p>
            </div>
          </div>
        </div>

        {/* Order lines */}
        <div className="p-4">
          <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-widest mb-3">Order Summary</p>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-[#444441]">Pay Per Listing (30 days)</span>
              <span className="text-[12px] font-medium text-[#1A1816]">$29.00</span>
            </div>
            {selectedAddOns.map(id => {
              const addon = ADD_ONS.find(a => a.id === id)
              if (!addon) return null
              return (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-[12px] text-[#444441]">{addon.label}</span>
                  <span className="text-[12px] font-medium text-[#1A1816]">+${(addon.price / 100).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Total */}
        <div className="px-4 py-3 border-t border-[#E8E8E4]">
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] font-semibold text-[#1A1816]">Total</span>
            <span className="text-[20px] font-bold text-[#1A1816]">${(totalCents / 100).toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-[#A8A8A4] mt-0.5">30-day listing</p>
        </div>

        {/* CTA — only shown on add-ons step */}
        {!showPaymentForm && (
          <div className="px-4 pb-4">
            {secretError && (
              <div className="mb-3 p-2.5 bg-[#FEF0EF] border border-[#F5C0BF] rounded text-[12px] text-[#D03839]">{secretError}</div>
            )}
            <button
              type="button"
              onClick={proceedToPayment}
              disabled={loadingSecret}
              className="w-full h-[44px] bg-[#D03839] hover:bg-[#E0493B] active:scale-[0.98] text-white text-[13px] font-semibold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingSecret ? (
                <><span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />Preparing...</>
              ) : (
                <>Proceed to Payment</>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <svg className="w-3 h-3 text-[#A8A8A4]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] text-[#A8A8A4]">Secured by Stripe</span>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Main Form ─────────────────────────────────────────────────────────
export default function PostDealForm({ user, existing, onClose, onSuccess }) {
  const isDraft = existing?.status === 'draft'
  const isEdit = !!existing && !isDraft
  const [step, setStep] = useState(0)
  const [draftId, setDraftId] = useState(isDraft ? existing?.id : null)
  const [formData, setFormData] = useState({
    title:                existing?.seo_title || existing?.title || '',
    location:             existing?.address || '',
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
    seller_type:          existing?.seller_type || '',
    contract_url:         existing?.contract_url || null,
  })
  const [photos, setPhotos] = useState(() => {
    const sorted = (existing?.property_images || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return sorted.map((p, i) => ({ ...p, is_featured: i === 0 }))
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // Auto-save photos to property_images whenever photos change and draftId exists
  useEffect(() => {
    if (!draftId) return
    const readyPhotos = photos.filter(p => p.image_url && !p.uploading)
    if (readyPhotos.length === 0) return
    const timer = setTimeout(async () => {
      try {
        await supabaseMarketplace.from('property_images').delete().eq('property_id', draftId)
        await supabaseMarketplace.from('property_images').insert(
          readyPhotos.map((p, i) => ({
            property_id: draftId,
            image_url: p.image_url,
            image_key: p.image_key || null,
            sort_order: i,
          }))
        )
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [photos, draftId])

  const update = (fields) => setFormData(prev => ({ ...prev, ...fields }))

  const saveDraft = async (currentFormData, currentPhotos, currentStep) => {
    try {
      if (!draftId) {
        const res = await fetch('/api/buyer/listings/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify(currentFormData),
        })
        const d = await res.json()
        if (d.id) {
          setDraftId(d.id)
          if (currentStep === 1 && currentPhotos.length > 0) {
            await supabaseMarketplace.from('property_images').insert(
              currentPhotos.map((p, i) => ({ property_id: d.id, image_url: p.image_url || p.preview_url, image_key: p.image_key || null, sort_order: i }))
            )
          }
        }
      } else {
        await fetch('/api/buyer/listings/draft', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
          body: JSON.stringify({ id: draftId, ...currentFormData }),
        })
        if (currentStep === 1) {
          await supabaseMarketplace.from('property_images').delete().eq('property_id', draftId)
          if (currentPhotos.length > 0) {
            await supabaseMarketplace.from('property_images').insert(
              currentPhotos.map((p, i) => ({ property_id: draftId, image_url: p.image_url || p.preview_url, image_key: p.image_key || null, sort_order: i }))
            )
          }
        }
      }
    } catch {}
  }

  const handleContinue = async () => {
    if (saving) return
    setSaving(true)
    if (!isEdit) await saveDraft(formData, photos, step)
    setStep(s => s + 1)
    setSaving(false)
  }

  const canNext = () => {
    if (step === 0) return !!(
      formData.address?.trim() &&
      formData.price &&
      formData.property_type &&
      formData.bedrooms !== '' &&
      formData.bathrooms !== '' &&
      formData.floor_area !== ''
    )
    if (step === 1) return photos.length > 0 && !photos.some(p => p.uploading)
    if (step === 2 && !isEdit) return !!(
      formData.seller_type &&
      (formData.seller_type !== 'wholesaler' || formData.contract_url)
    )
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
        <h1 className="text-[24px] font-bold text-[#1A1816] mb-2">Submitted for Review</h1>
        <p className="text-[15px] text-[#737370] mb-2 max-w-sm">Your listing is being reviewed by our team. We check every photo and listing for quality before publishing.</p>
        <p className="text-[13px] text-[#1A1816] mb-8 max-w-sm">You&apos;ll be notified once your listing is approved and goes live on the marketplace.</p>
        <button
          onClick={onSuccess}
          className="h-[44px] px-8 bg-[#D03839] hover:bg-[#E0493B] text-white text-[14px] font-semibold rounded transition-colors"
        >
          View My Listings
        </button>
      </div>
    )
  }

  // ─── Form ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-8" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="max-w-4xl mx-auto">

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
        <div className="bg-white border border-[#E8E8E4] rounded p-6 lg:p-8">

          {/* Step indicator */}
          <StepIndicator steps={stepsToShow} current={step} />

          {/* Step content */}
          <div className="mb-8">
            {step === 0 && <StepBasicInfo data={formData} onChange={update} />}
            {step === 1 && <StepPhotos photos={photos} onPhotosChange={setPhotos} userId={user?.id} />}
            {step === 2 && !isEdit && <StepSellerType data={formData} onChange={update} />}
            {((step === 3 && !isEdit) || (step === 2 && isEdit)) && <StepDetails data={formData} onChange={update} />}
            {step === 4 && !isEdit && (
              <StepPayment formData={formData} photos={photos} user={user} draftId={draftId} onSuccess={() => setDone(true)} />
            )}
          </div>

          {/* Navigation — hidden on payment step */}
          {!(step === 4 && !isEdit) && (
            <div className="flex gap-3 pt-2 border-t border-[#F3F3F0]">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="h-[42px] px-5 border border-[#E8E8E4] rounded text-[13px] font-medium text-[#1A1816] hover:border-[#1A1816] transition-colors"
                >
                  Back
                </button>
              )}
              {step < stepsToShow.length - 1 ? (
                <button
                  onClick={handleContinue}
                  disabled={!canNext() || saving}
                  className="flex-1 h-[42px] bg-[#1A1816] hover:bg-[#2A2825] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              ) : isEdit ? (
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="flex-1 h-[42px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50"
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
