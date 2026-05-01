// /components/property/PropertyDetail.js
'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Heart, Share2,
  MapPin, Building2, Calendar, Square, Map, Bed, Droplets, Car,
  ChevronLeft, ChevronRight,
  TrendingUp, Shield, Star, DollarSign, Wrench, Home, Phone, X, User, Copy, Check
} from 'lucide-react'
import { useProperties } from '@/hooks/useProperties'
import { getPreferredPhotoUrl, getThumbnailUrl } from '@/utils/propertyPhotos'
import { getStartingTier, recordImageLoad } from '@/utils/adaptiveImageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { usePropertyAnalytics } from '@/hooks/usePropertyAnalytics'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'
import { RegistrationModal } from '@/components/RegistrationModal'
import { PropertyImageModal } from './PropertyImageModal'
import { ShareModal } from './ShareModal'
import { Footer } from '@/components/layout/Footer'

export function PropertyDetail({ property }) {
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const { user, loading } = useAuth()
  const { isFavorited, toggleFavorite, loadFavorites } = useFavorites()

  // Property analytics tracking (trackImageView for photo view count)
  const { trackImageView } = usePropertyAnalytics(property)
  const viewedPhotoIndicesRef = useRef(new Set([0]))

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [purchasePrice, setPurchasePrice] = useState(property.price ?? property.purchase_price ?? null)
  const [downPaymentPercent, setDownPaymentPercent] = useState(25)
  const [estimatedRent, setEstimatedRent] = useState(property.estimated_rent ?? null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPhonePopup, setShowPhonePopup] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [modalInitialIndex, setModalInitialIndex] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareTitle, setShareTitle] = useState('')
  const [showOfferModal] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [similarSliderIndex, setSimilarSliderIndex] = useState(0)
  const mapRef = useRef(null)

  const { properties: similarProperties } = useProperties({
    filters: { statuses: ['available'], city: property.city },
    sortBy: 'newest',
    pageSize: 14,
  })

  // Photo gallery
  const photos = useMemo(() => {
    if (!Array.isArray(property.property_photos)) return []
    return [...property.property_photos].sort((a, b) => {
      if (a?.is_featured && !b?.is_featured) return -1
      if (!a?.is_featured && b?.is_featured) return 1
      const aOrder = Number.isFinite(a?.display_order) ? a.display_order : 0
      const bOrder = Number.isFinite(b?.display_order) ? b.display_order : 0
      return aOrder - bOrder
    })
  }, [property.property_photos])
  const currentPhoto = photos[currentPhotoIndex]

  // Adaptive progressive hero image
  const HERO_TIERS = [150, 800, 2400]
  const [heroUrl, setHeroUrl] = useState('')
  const heroTierRef = useRef(0)
  const heroIndexRef = useRef(0)
  const heroLoadStartRef = useRef(0)

  useEffect(() => {
    if (!currentPhoto) {
      setHeroUrl('/placeholder.jpg')
      return
    }
    const startTier = getStartingTier(HERO_TIERS)
    heroTierRef.current = startTier
    heroIndexRef.current = currentPhotoIndex
    heroLoadStartRef.current = performance.now()
    setHeroUrl(getThumbnailUrl(currentPhoto, HERO_TIERS[startTier]) || getPreferredPhotoUrl(currentPhoto) || '/placeholder.jpg')
  }, [currentPhotoIndex, currentPhoto])

  const handleHeroLoaded = useCallback(() => {
    const duration = performance.now() - heroLoadStartRef.current
    const tierWidth = HERO_TIERS[heroTierRef.current] || 2400
    const estimatedBytes = tierWidth * tierWidth * 0.1
    recordImageLoad(estimatedBytes, duration)

    const nextTier = heroTierRef.current + 1
    if (nextTier < HERO_TIERS.length && heroIndexRef.current === currentPhotoIndex) {
      const photo = photos[currentPhotoIndex]
      const nextUrl = getThumbnailUrl(photo, HERO_TIERS[nextTier]) || getPreferredPhotoUrl(photo) || '/placeholder.jpg'
      const img = new window.Image()
      heroLoadStartRef.current = performance.now()
      img.onload = () => {
        if (heroIndexRef.current === currentPhotoIndex) {
          const dur = performance.now() - heroLoadStartRef.current
          const estBytes = HERO_TIERS[nextTier] * HERO_TIERS[nextTier] * 0.1
          recordImageLoad(estBytes, dur)
          heroTierRef.current = nextTier
          setHeroUrl(nextUrl)
        }
      }
      img.src = nextUrl
    }
  }, [currentPhotoIndex, photos])

  // Preload next/prev images
  useEffect(() => {
    if (photos.length <= 1) return
    const toPreload = [
      (currentPhotoIndex + 1) % photos.length,
      (currentPhotoIndex + 2) % photos.length,
      (currentPhotoIndex + 3) % photos.length,
      (currentPhotoIndex - 1 + photos.length) % photos.length,
    ]
    toPreload.forEach((idx) => {
      const url = getThumbnailUrl(photos[idx], 150) || getPreferredPhotoUrl(photos[idx])
      if (url) {
        const img = new window.Image()
        img.src = url
      }
    })
  }, [currentPhotoIndex, photos])

  // Build full address
  const fullAddress = property.full_address || property.display_address ||
    `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip_code || ''}`.trim()

  // Show login modal if user is not authenticated (skip in preview mode)
  useEffect(() => {
    if (loading) return
    if (isPreview) {
      setShowLoginModal(false)
      return
    }
    // Don't auto-show login modal — let user browse with blurred sections
    setShowLoginModal(false)
  }, [user, loading, isPreview])

  useEffect(() => {
    if (user && showLoginModal && !loading) {
      setShowLoginModal(false)
    }
  }, [user, showLoginModal, loading])

  // Track unique photos viewed
  useEffect(() => {
    if (photos.length === 0 || typeof trackImageView !== 'function') return
    viewedPhotoIndicesRef.current.add(currentPhotoIndex)
    trackImageView(viewedPhotoIndicesRef.current.size)
  }, [currentPhotoIndex, photos.length, trackImageView])

  const handlePhotoViewFromModal = useCallback((index) => {
    viewedPhotoIndicesRef.current.add(index)
    if (typeof trackImageView === 'function') {
      trackImageView(viewedPhotoIndicesRef.current.size)
    }
  }, [trackImageView])

  // Load favorite status
  useEffect(() => {
    if (user && property?.id) {
      loadFavorites([property.id])
    }
  }, [user, property?.id, loadFavorites])

  useEffect(() => {
    if (property?.id) {
      setIsFav(isFavorited(property.id))
    }
  }, [property?.id, isFavorited])

  useEffect(() => {
    if (user && similarProperties?.length > 0) {
      loadFavorites(similarProperties.map(p => p.id))
    }
  }, [user, similarProperties, loadFavorites])

  // Initialize Google Map
  useEffect(() => {
    const lat = property.address_google_lat ? parseFloat(property.address_google_lat) : null
    const lng = property.address_google_lng ? parseFloat(property.address_google_lng) : null

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid map coordinates:', { lat, lng })
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Map location not available</div>'
      }
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Map coordinates out of valid range:', { lat, lng })
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Map location not available</div>'
      }
      return
    }

    const loadGoogleMaps = () => {
      if (!window.google) {
        console.error('Google Maps API not loaded')
        return
      }
      if (!mapRef.current) {
        console.error('Map container not found')
        return
      }
      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: fullAddress
        })
      } catch (error) {
        console.error('Error initializing Google Map:', error)
        if (mapRef.current) {
          mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Error loading map</div>'
        }
      }
    }

    const timer = setTimeout(() => {
      loadGoogleMapsAPI()
        .then(() => { loadGoogleMaps() })
        .catch((error) => {
          console.error('Failed to load Google Maps API:', error)
          if (mapRef.current) {
            mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Failed to load map</div>'
          }
        })
    }, 100)

    return () => clearTimeout(timer)
  }, [property.address_google_lat, property.address_google_lng, fullAddress])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8E8E4] border-t-[#D03839] mx-auto mb-4"></div>
          <p className="text-[#737370] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price) => {
    if (price == null || price === '' || (typeof price === 'number' && isNaN(price))) return '-'
    const n = Number(price)
    if (n === 0) return '-'
    return `$${Math.round(n).toLocaleString('en-US')}`
  }

  const formatPercent = (value) => {
    if (value == null || value === '' || (typeof value === 'number' && isNaN(value))) return '-'
    return `${Number(value).toFixed(2)}%`
  }

  // Numeric values for calculations
  const purchasePriceNum = (purchasePrice != null && purchasePrice !== '') ? Number(purchasePrice) : 0
  const estimatedRentNum = (estimatedRent != null && estimatedRent !== '') ? Number(estimatedRent) : 0

  // Financial calculations
  const downPayment = purchasePriceNum * (downPaymentPercent / 100)
  const loanAmount = purchasePriceNum - downPayment
  const monthlyInterestRate = 0.07 / 12
  const numberOfPayments = 30 * 12
  const monthlyPayment = loanAmount > 0
    ? loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
    : 0

  const annualRent = estimatedRentNum * 12
  const annualExpenses = (property.hoa_fees ? parseFloat(property.hoa_fees.replace(/[^0-9.]/g, '')) * 12 : 0) +
    (purchasePriceNum * 0.01) +
    (purchasePriceNum * 0.005) +
    (annualRent * 0.1)
  const netOperatingIncome = annualRent - annualExpenses
  const annualDebtService = monthlyPayment * 12
  const netCashFlow = netOperatingIncome - annualDebtService
  const monthlyNetCashFlow = netCashFlow / 12

  const grossYield = property.gross_yield ?? (purchasePriceNum > 0 ? (annualRent / purchasePriceNum) * 100 : null)
  const capRate = property.cap_rate ?? (purchasePriceNum > 0 ? (netOperatingIncome / purchasePriceNum) * 100 : null)
  const cashOnCash = property.cash_on_cash ?? (downPayment > 0 ? (netCashFlow / downPayment) * 100 : null)
  const estNetCashFlow = property.est_net_cash_flow || monthlyNetCashFlow

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => {
      const next = (prev + 1) % photos.length
      trackImageView(next + 1)
      return next
    })
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => {
      const next = (prev - 1 + photos.length) % photos.length
      trackImageView(next + 1)
      return next
    })
  }

  // Derived values for sidebar
  const price = property.price ?? property.purchase_price
  const arv = property.arv ?? property.after_repair_value ?? null
  const estimatedProfit = (arv && price) ? arv - price : null

  // Property snapshot fields
  const snapshotItems = [
    property.property_type && { icon: <Home className="h-4 w-4" />, label: 'Property Type', value: property.property_type },
    property.year_built && { icon: <Calendar className="h-4 w-4" />, label: 'Year built', value: property.year_built },
    property.sqft && { icon: <Square className="h-4 w-4" />, label: 'Living Area', value: `${Number(property.sqft).toLocaleString()} sq ft` },
    property.lot_size && { icon: <Map className="h-4 w-4" />, label: 'Lot Size', value: property.lot_size },
    property.basement && { icon: <Building2 className="h-4 w-4" />, label: 'Basement', value: property.basement },
    property.parking && { icon: <Car className="h-4 w-4" />, label: 'Parking', value: property.parking },
    property.zoning && { icon: <MapPin className="h-4 w-4" />, label: 'Zoning', value: property.zoning },
    property.school_district && { icon: <Building2 className="h-4 w-4" />, label: 'School District', value: property.school_district },
    property.flood_zone && { icon: <Droplets className="h-4 w-4" />, label: 'Flood Zone', value: property.flood_zone },
  ].filter(Boolean)

  // Investment highlights
  const investmentHighlights = (() => {
    if (Array.isArray(property.investment_highlights) && property.investment_highlights.length > 0) {
      return property.investment_highlights.slice(0, 4).map((h) => ({
        title: h.title || h,
        desc: h.description || h.desc || ''
      }))
    }
    const generated = []
    if (arv && price && price < arv * 0.85) {
      generated.push({ title: 'Below-Market Acquisition', desc: 'Purchase price is significantly below after-repair value, offering built-in equity.' })
    }
    if ((cashOnCash != null && cashOnCash > 15) || (grossYield != null && grossYield > 8)) {
      generated.push({ title: 'High ROI Potential', desc: 'Strong cash-on-cash returns indicate excellent investment performance.' })
    }
    if (generated.length < 4) {
      generated.push({ title: 'Value-Add Opportunity', desc: 'Property offers potential for appreciation through strategic improvements.' })
    }
    if (generated.length < 4) {
      generated.push({ title: 'Strong Rental Market', desc: 'Located in a market with consistent rental demand and low vacancy rates.' })
    }
    return generated.slice(0, 4)
  })()

  const hasRehabData = property.rehab_cost || property.rehab_description || property.condition

  // Helper: intercept action clicks in preview mode
  const handlePreviewAction = (e) => {
    if (isPreview) { e.preventDefault(); setShowPreviewModal(true) }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] relative overflow-x-hidden">
      {/* Preview mode modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded w-full max-w-sm p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-[#FEF0EF] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[#D03839]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <h3 className="text-[16px] font-bold text-[#1A1816] mb-2">You're in Preview Mode</h3>
            <p className="text-[13px] text-[#737370] mb-5">This is how buyers see your listing. When a buyer clicks this button, they'll be prompted to log in before taking any action.</p>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full h-[40px] bg-[#1A1816] hover:bg-[#2A2825] text-white text-[13px] font-semibold rounded transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Preview banner */}
      {isPreview && (
        <div className="sticky top-0 z-[100] bg-[#1A1816] text-white text-center py-2 px-4 text-[13px] font-medium">
          Preview Mode — this is how your listing appears to buyers
        </div>
      )}

      {/* Preview overlay — blocks all content below the nav */}
      {isPreview && (
        <div
          className="fixed inset-0 z-[45] cursor-default"
          onClick={() => setShowPreviewModal(true)}
        />
      )}

      {/* Login Modal */}
      <RegistrationModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        initialStep="login"
        preventClose={false}
        backUrl="/marketplace"
      />

      {/* Image Modal */}
      <PropertyImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        photos={photos}
        initialIndex={modalInitialIndex}
        onPhotoView={handlePhotoViewFromModal}
        preloadedUrl={photos.length > 0 ? getPreferredPhotoUrl(photos[modalInitialIndex]) || null : null}
      />

      {/* Page content */}
      <div>

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E8E8E4] h-14 flex items-center px-4 sm:px-6">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Left: Back link */}
          <Link
            href={isPreview ? `${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'https://sellerportaldeelmap-production-bea8.up.railway.app'}/listings` : '/marketplace'}
            className="flex items-center gap-1.5 text-[#737370] hover:text-[#1A1816] text-sm transition-colors relative z-[50]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isPreview ? 'Back to listings' : 'Back to listings'}</span>
          </Link>

          {/* Center: Logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link href="/">
              <Image
                src="/assets/logo.svg"
                alt="DeelMap"
                width={143}
                height={50}
                className="h-[50px] w-[143px]"
              />
            </Link>
          </div>

          {/* Right: Share + Save + User */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShareUrl(typeof window !== 'undefined' ? window.location.href : ''); setShareTitle(property.full_address || property.display_address || property.address || 'Property'); setShowShareModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E8E8E4] bg-white text-[#444441] hover:bg-[#FAFAF8] transition-colors text-sm font-medium"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={async (e) => {
                if (isPreview) { setShowPreviewModal(true); return }
                if (!user) { setShowLoginModal(true); return }
                setFavoriteLoading(true)
                try {
                  await toggleFavorite(property.id)
                  window.dispatchEvent(new CustomEvent('favoriteChanged'))
                } catch (error) {
                  console.error('Error toggling favorite:', error)
                  alert(error.message || 'Failed to update favorite')
                } finally {
                  setFavoriteLoading(false)
                }
              }}
              disabled={favoriteLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors text-sm font-medium ${
                isFav
                  ? 'bg-[#FEF0EF] border-[#F5C4C0] text-[#D03839]'
                  : 'bg-white border-[#E8E8E4] text-[#444441] hover:bg-[#FAFAF8]'
              } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isFav ? 'Saved' : 'Save'}</span>
            </button>
            {user && (
              <Link href="/buyer/dashboard" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-[#FEF0EF] flex items-center justify-center text-[#D03839] text-[13px] font-semibold ring-2 ring-[#F5C4C0] group-hover:ring-[#D03839] group-hover:scale-110 transition-all duration-200">
                  {user.first_name
                    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
                    : user.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                  }
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Photo Grid */}
      <div className="bg-white border-b border-[#E8E8E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className={`relative h-[260px] sm:h-[460px] rounded overflow-hidden grid gap-[6px] ${photos.length > 1 ? 'sm:grid-cols-2' : ''} grid-cols-1`}>
            {!user && !isPreview && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/10 backdrop-blur-sm rounded">
                <div className="bg-white rounded px-5 py-4 text-center shadow-lg max-w-xs">
                  <p className="text-[14px] font-semibold text-[#1A1816] mb-1">Sign in to view photos</p>
                  <p className="text-[12px] text-[#737370] mb-3">Create a free account to see all property photos</p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="w-full bg-[#D03839] text-white text-[13px] font-semibold py-2 rounded hover:bg-[#E0493B] transition-colors"
                  >
                    Sign in / Create account
                  </button>
                </div>
              </div>
            )}

            {/* Main photo — full width on mobile, left half on sm+ */}
            <div
              className="relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
              onClick={() => { if (photos.length > 0) { setModalInitialIndex(currentPhotoIndex); setShowImageModal(true) } }}
            >
              {photos.length > 0 ? (
                <img
                  src={heroUrl}
                  alt="Main property photo"
                  className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                  onLoad={handleHeroLoaded}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="relative w-48 h-16">
                    <Image src="/assets/logo.svg" alt="DeelMap" fill className="object-contain" />
                  </div>
                  <span className="text-sm text-[#A8A8A4]">Photos coming soon</span>
                </div>
              )}
              {/* Mobile-only: Show all photos button on main photo */}
              {photos.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setModalInitialIndex(0); setShowImageModal(true) }}
                  className="sm:hidden absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-[#E8E8E4] text-[#1A1816] text-[13px] font-semibold px-3 py-1.5 rounded shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/></svg>
                  Show all photos
                </button>
              )}
            </div>

            {/* Right side — hidden on mobile, layout adapts to photo count */}
            {photos.length === 2 && (
              // 2 photos: right = single photo, full height
              <div
                className="hidden sm:block relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
                onClick={() => { setModalInitialIndex(1); setShowImageModal(true) }}
              >
                <img
                  src={getThumbnailUrl(photos[1], 800) || getPreferredPhotoUrl(photos[1]) || '/placeholder.jpg'}
                  alt="Property photo 2"
                  className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); setShowImageModal(true) }}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-[#E8E8E4] text-[#1A1816] text-[13px] font-semibold px-3 py-1.5 rounded shadow-sm transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/></svg>
                  Show all photos
                </button>
              </div>
            )}

            {photos.length === 3 && (
              // 3 photos: right = 2 photos stacked vertically
              <div className="hidden sm:grid grid-cols-1 grid-rows-2 gap-[6px]">
                {[1, 2].map((offset) => (
                  <div
                    key={offset}
                    className="relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
                    onClick={() => { setModalInitialIndex(offset); setShowImageModal(true) }}
                  >
                    <img
                      src={getThumbnailUrl(photos[offset], 800) || getPreferredPhotoUrl(photos[offset]) || '/placeholder.jpg'}
                      alt={`Property photo ${offset + 1}`}
                      className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                    />
                    {offset === 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowImageModal(true) }}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-[#E8E8E4] text-[#1A1816] text-[13px] font-semibold px-3 py-1.5 rounded shadow-sm transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/></svg>
                        Show all photos
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photos.length === 4 && (
              // 4 photos: right = top 2 side by side + bottom 1 full width
              <div className="hidden sm:grid grid-cols-2 grid-rows-2 gap-[6px]">
                {[1, 2].map((offset) => (
                  <div
                    key={offset}
                    className="relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
                    onClick={() => { setModalInitialIndex(offset); setShowImageModal(true) }}
                  >
                    <img
                      src={getThumbnailUrl(photos[offset], 800) || getPreferredPhotoUrl(photos[offset]) || '/placeholder.jpg'}
                      alt={`Property photo ${offset + 1}`}
                      className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                    />
                  </div>
                ))}
                <div
                  className="col-span-2 relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
                  onClick={() => { setModalInitialIndex(3); setShowImageModal(true) }}
                >
                  <img
                    src={getThumbnailUrl(photos[3], 800) || getPreferredPhotoUrl(photos[3]) || '/placeholder.jpg'}
                    alt="Property photo 4"
                    className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowImageModal(true) }}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-[#E8E8E4] text-[#1A1816] text-[13px] font-semibold px-3 py-1.5 rounded shadow-sm transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/></svg>
                    Show all photos
                  </button>
                </div>
              </div>
            )}

            {photos.length >= 5 && (
              // 5+ photos: full 2×2 grid
              <div className="hidden sm:grid grid-cols-2 grid-rows-2 gap-[6px]">
                {[1, 2, 3, 4].map((offset) => {
                  const photo = photos[offset]
                  const isLast = offset === 4
                  return (
                    <div
                      key={offset}
                      className="relative bg-[#E8E8E4] cursor-pointer overflow-hidden rounded"
                      onClick={() => { setModalInitialIndex(offset); setShowImageModal(true) }}
                    >
                      <img
                        src={getThumbnailUrl(photo, 800) || getPreferredPhotoUrl(photo) || '/placeholder.jpg'}
                        alt={`Property photo ${offset + 1}`}
                        className="absolute inset-0 w-full h-full object-cover hover:brightness-95 transition-all duration-200"
                      />
                      {isLast && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowImageModal(true) }}
                          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm border border-[#E8E8E4] text-[#1A1816] text-[13px] font-semibold px-3 py-1.5 rounded shadow-sm transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5"/></svg>
                          Show all photos
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content: two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left column */}
          <div className="flex-1 min-w-0">

            {/* Property overview card */}
            <div className="bg-white border border-[#E8E8E4] rounded p-5 mb-6">
              {/* Location */}
              {(property.city || property.state) && (
                <div className="flex items-center gap-1.5 text-[#737370] text-[13px] mb-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{[property.city, property.state].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Title + Active Deal badge */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className={`text-[22px] sm:text-[26px] font-bold text-[#1A1816] leading-snug break-words ${!user && !isPreview ? 'blur-sm select-none' : ''}`}>
                  {!user && !isPreview ? (property.city && property.state ? `${property.city}, ${property.state}` : 'Address hidden') : fullAddress}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E4F5EC] text-[#0F6E56] text-[13px] font-semibold rounded border border-[#9FDBB8] flex-shrink-0 mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block"></span>
                  {property.status || 'Active Deal'}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 text-[#444441] text-[14px] mb-4">
                {property.sqft && <span><span className="font-semibold">{Number(property.sqft).toLocaleString()}</span> sq ft</span>}
                {property.bedrooms && (
                  <>
                    <span className="text-[#D4D4CF]">·</span>
                    <span><span className="font-semibold">{property.bedrooms}</span> bed</span>
                  </>
                )}
                {property.bathrooms && (
                  <>
                    <span className="text-[#D4D4CF]">·</span>
                    <span><span className="font-semibold">{property.bathrooms}</span> bath</span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[#E8E8E4] mb-4" />

              {/* Description */}
              {property.description && (
                <div className="mb-4">
                  {(() => {
                    const plainText = property.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    return (
                      <>
                        <div
                          className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap break-words"
                          dangerouslySetInnerHTML={{
                            __html: showFullDescription || plainText.length <= 300
                              ? property.description
                              : `${plainText.substring(0, 300)}...`
                          }}
                        />
                        {plainText.length > 300 && (
                          <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="text-[#D03839] hover:text-[#E0493B] text-[13px] font-medium mt-2 flex items-center gap-1 transition-colors"
                          >
                            {showFullDescription ? 'Show less' : 'Show more'}
                            <svg className={`w-4 h-4 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Repairs & Renovations */}
              {property.repairs && (
                <div className="mb-4">
                  <h3 className="text-[13px] font-semibold text-[#1A1816] uppercase tracking-[0.8px] mb-2">Repairs &amp; Renovations</h3>
                  <div
                    className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: property.repairs }}
                  />
                </div>
              )}

              {/* Tags */}
              {Array.isArray(property.deal_tags) && property.deal_tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {property.deal_tags.map((tag, i) => {
                    const t = tag.toLowerCase()
                    const cls = t.includes('roi') || t.includes('high')
                      ? 'bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8]'
                      : t.includes('rehab') || t.includes('cosmetic')
                      ? 'bg-white text-[#0F6E56] border border-[#9FDBB8]'
                      : t.includes('value') || t.includes('flip')
                      ? 'bg-white text-[#D03839] border border-[#F5C4C0]'
                      : 'bg-[#F0F0EC] text-[#444441] border border-[#E8E8E4]'
                    return (
                      <span key={i} className={`px-3 py-1 text-[12px] font-medium rounded-full ${cls}`}>
                        {tag}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Calculator section */}
            <div className="bg-white border border-[#E8E8E4] rounded p-4 sm:p-6 mb-6">
              <h3 className="text-sm font-semibold text-[#A8A8A4] uppercase tracking-[1.1px] mb-4">Return Calculator</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[#737370] mb-1.5">Purchase price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm">$</span>
                    <input
                      type="number"
                      value={purchasePrice == null || purchasePrice === '' ? '' : purchasePrice}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') setPurchasePrice(null)
                        else { const n = parseFloat(v); setPurchasePrice(!isNaN(n) ? n : null) }
                      }}
                      className="w-full h-10 pl-7 pr-3 border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] outline-none text-sm text-[#1A1816]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#737370] mb-1.5">Down payment</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={downPaymentPercent === 0 ? '' : downPaymentPercent}
                      onChange={(e) => {
                        const v = e.target.value
                        setDownPaymentPercent(v === '' ? 0 : (parseFloat(e.target.value) || 0))
                      }}
                      className="w-full h-10 pr-7 pl-3 border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] outline-none text-sm text-[#1A1816]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#737370] mb-1.5">Estimated rent</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm">$</span>
                    <input
                      type="number"
                      value={estimatedRent == null || estimatedRent === '' ? '' : estimatedRent}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '') setEstimatedRent(null)
                        else { const n = parseFloat(v); setEstimatedRent(!isNaN(n) ? n : null) }
                      }}
                      className="w-full h-10 pl-7 pr-3 border border-[#E8E8E4] rounded focus:border-[#D03839] focus:ring-2 focus:ring-[#D03839]/[.12] outline-none text-sm text-[#1A1816]"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#A8A8A4]">Enter values above to calculate your estimated returns and cash flow projections.</p>
            </div>

            {/* PROPERTY SNAPSHOT */}
            {snapshotItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#D03839] uppercase tracking-[1.1px] mb-3">Property Snapshot</h3>
                <div className="bg-white border border-[#E8E8E4] rounded p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {snapshotItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 flex-shrink-0 bg-[#F5F5F3] rounded flex items-center justify-center text-[#444441]">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#1A1816] leading-snug truncate">{item.value}</p>
                          <p className="text-[12px] text-[#737370]">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* INVESTMENT HIGHLIGHTS */}
            {investmentHighlights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#D03839] uppercase tracking-[1.1px] mb-3">Investment Highlights</h3>
                <div className="grid grid-cols-2 gap-3">
                  {investmentHighlights.map((item, i) => {
                    const icons = [
                      <TrendingUp key={0} className="w-4 h-4 text-[#0F6E56]" />,
                      <Shield key={1} className="w-4 h-4 text-[#0F6E56]" />,
                      <Star key={2} className="w-4 h-4 text-[#0F6E56]" />,
                      <DollarSign key={3} className="w-4 h-4 text-[#0F6E56]" />,
                    ]
                    return (
                      <div key={i} className="bg-white border border-[#E8E8E4] rounded p-4">
                        <div className="w-8 h-8 rounded bg-[#E4F5EC] flex items-center justify-center mb-3">
                          {icons[i % icons.length]}
                        </div>
                        <div className="text-sm font-semibold text-[#1A1816] mb-1">{item.title}</div>
                        <div className="text-xs text-[#737370] leading-relaxed">{item.desc}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CONDITION & REHAB */}
            {hasRehabData && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-[#D03839] uppercase tracking-[1.1px] mb-3">Condition &amp; Rehab</h3>
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    {property.condition && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF9EC] border border-[#F5D78E] text-[#B5620A] text-xs font-semibold rounded">
                        <Wrench className="w-3 h-3" />
                        {property.condition}
                      </span>
                    )}
                    {property.rehab_cost && (
                      <span className="text-sm font-semibold text-[#1A1816]">Budget: {formatPrice(property.rehab_cost)}</span>
                    )}
                  </div>
                  {property.rehab_description && (
                    <p className="text-sm text-[#444441] leading-relaxed">{property.rehab_description}</p>
                  )}
                </div>
              </div>
            )}

            {/* MLS Information */}
            {(property.agent_name || property.mls_number) && (
              <div className="mb-6 border-t border-[#E8E8E4] pt-6">
                <div className="flex items-start">
                  {property.data_source_brokerage && (
                    <div>
                      <div className="text-sm font-medium text-[#1A1816]">
                        Listed By: {property.agent_name || 'N/A'}
                        {property.mls_number && `, ${property.mls_number}`}
                      </div>
                      <div className="text-sm text-[#737370]">
                        Source: {property.data_source_brokerage}
                        {property.mls_last_updated_at && (
                          <>, last updated on {new Date(property.mls_last_updated_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right sidebar */}
          <div className="lg:w-[380px] shrink-0">
            <div className={`sticky top-20 ${!user && !isPreview ? 'relative' : ''}`}>
              {!user && !isPreview && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded pointer-events-none">
                  <div className="bg-white border border-[#E8E8E4] rounded px-5 py-4 text-center shadow-md pointer-events-auto">
                    <p className="text-[14px] font-semibold text-[#1A1816] mb-1">Sign in to contact seller</p>
                    <p className="text-[12px] text-[#737370] mb-3">Free account required to view contact info and the map</p>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="w-full bg-[#D03839] text-white text-[13px] font-semibold py-2 rounded hover:bg-[#E0493B] transition-colors"
                    >
                      Sign in / Create account
                    </button>
                  </div>
                </div>
              )}
              <div className="bg-white border border-[#E8E8E4] rounded p-5 mb-4">
                {/* Price row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-[#737370]">Price</span>
                  <span className="text-[22px] font-bold text-[#1A1816]">{formatPrice(price)}</span>
                </div>

                {/* ARV row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-[#737370]">ARV</span>
                  <span className="text-[16px] font-semibold text-[#0F6E56]">{arv ? formatPrice(arv) : '—'}</span>
                </div>

                <hr className="border-[#E8E8E4] mb-3" />

                {/* Estimated Profit row */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[13px] font-medium text-[#737370]">Estimated Profit</span>
                  <span className="text-[16px] font-semibold text-[#0F6E56]">
                    {estimatedProfit != null && estimatedProfit > 0 ? formatPrice(estimatedProfit) : '—'}
                  </span>
                </div>

                {/* Call Seller */}
                <div className="relative mb-3">
                  <button
                    onClick={() => { if (isPreview) { setShowPreviewModal(true); return } property.agent?.phone && setShowPhonePopup(true) }}
                    disabled={!property.agent?.phone}
                    className={`flex items-center justify-center gap-2 w-full font-semibold py-2.5 px-4 rounded text-sm transition-colors ${
                      property.agent?.phone
                        ? 'bg-[#1A1816] hover:bg-[#2C2A28] text-white'
                        : 'bg-[#E8E8E4] text-[#A8A8A4] cursor-not-allowed'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    Call Seller
                  </button>

                  {/* Phone number popup */}
                  {showPhonePopup && property.agent?.phone && (
                    <>
                      <div className="fixed inset-0 z-[9]" onClick={() => setShowPhonePopup(false)} />
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#E8E8E4] rounded shadow-lg p-4 z-10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#737370]">Seller Phone</p>
                        <button onClick={() => setShowPhonePopup(false)} className="p-0.5 text-[#A8A8A4] hover:text-[#1A1816] transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${property.agent.phone}`}
                          className="flex items-center gap-2.5 p-3 bg-[#FAFAF8] border border-[#E8E8E4] rounded hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group flex-1"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#FEF0EF] flex items-center justify-center shrink-0 group-hover:bg-[#D03839] transition-colors">
                            <Phone className="w-4 h-4 text-[#D03839] group-hover:text-white transition-colors" />
                          </div>
                          <span className="text-[15px] font-semibold text-[#1A1816]">{property.agent.phone}</span>
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(property.agent.phone)
                            setPhoneCopied(true)
                            setTimeout(() => setPhoneCopied(false), 2000)
                          }}
                          className="p-3 bg-[#FAFAF8] border border-[#E8E8E4] rounded hover:border-[#1A1816] transition-colors shrink-0"
                          title="Copy number"
                        >
                          {phoneCopied ? <Check className="w-4 h-4 text-[#0F6E56]" /> : <Copy className="w-4 h-4 text-[#737370]" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#A8A8A4] mt-2 text-center">Tap the number to call</p>
                    </div>
                    </>
                  )}
                </div>

                {/* Buyer-posted: only show Call Seller, hide Message Seller + Make Offer */}
                {!property.posted_by && (
                  <>
                    {/* Message Seller */}
                    <Link
                      href={user && (property.temp_seller_id || property.seller_id)
                        ? `/buyer/inbox?seller_id=${property.temp_seller_id || property.seller_id}&deal_id=${property.id}`
                        : user ? '/buyer/inbox' : '/login'
                      }
                      onClick={handlePreviewAction}
                      className="block w-full bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] text-white font-semibold py-2.5 px-4 rounded text-center text-sm transition-colors mb-3"
                    >
                      Message Seller
                    </Link>

                    {/* Make Offer */}
                    {user && !isPreview ? (
                      <Link
                        href={`/buyer/make-offer?property_id=${property.id}&slug=${property.slug || property.id}${property.temp_seller_id || property.seller_id ? `&seller_id=${property.temp_seller_id || property.seller_id}` : ''}`}
                        className="block w-full border border-[#1A1816] text-[#1A1816] font-semibold py-2.5 px-4 rounded text-center text-sm hover:bg-[#FAFAF8] transition-colors"
                      >
                        Make Offer
                      </Link>
                    ) : (
                      <button
                        onClick={() => isPreview ? setShowPreviewModal(true) : setShowLoginModal(true)}
                        className="block w-full border border-[#1A1816] text-[#1A1816] font-semibold py-2.5 px-4 rounded text-center text-sm hover:bg-[#FAFAF8] transition-colors"
                      >
                        Make Offer
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Map */}
              <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
                <div
                  ref={mapRef}
                  className="w-full h-[280px] sm:h-[320px]"
                  style={{ minHeight: '280px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Properties Nearby */}
      {(() => {
        const filtered = similarProperties.filter(p => p.id !== property.id)
        if (filtered.length === 0) return null
        const perPage = 4
        const totalPages = Math.ceil(filtered.length / perPage)
        const visible = filtered.slice(similarSliderIndex * perPage, similarSliderIndex * perPage + perPage)
        return (
          <div className="bg-[#FAFAF8] border-t border-[#E8E8E4] py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[22px] font-bold text-[#1A1816]">Similar Properties Nearby</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimilarSliderIndex(i => Math.max(0, i - 1))}
                    disabled={similarSliderIndex === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E8E8E4] bg-white text-[#737370] hover:border-[#1A1816] hover:text-[#1A1816] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSimilarSliderIndex(i => Math.min(totalPages - 1, i + 1))}
                    disabled={similarSliderIndex === totalPages - 1}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-[#E8E8E4] bg-white text-[#737370] hover:border-[#1A1816] hover:text-[#1A1816] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {visible.map(p => {
                  const featuredPhoto = p.property_photos?.find(ph => ph?.is_featured) || p.property_photos?.[0]
                  const imgUrl = featuredPhoto ? (featuredPhoto.optimized_url || featuredPhoto.photo_url || '') : ''
                  const thumbUrl = imgUrl && imgUrl.includes('supabase.co/storage/v1/object/public/')
                    ? imgUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
                    : imgUrl
                  const cityState = [p.city, p.state].filter(Boolean).join(', ')
                  const pArv = Number(p.arv) || 0
                  const pPrice = Number(p.price) || 0
                  const spread = pArv > pPrice && pPrice > 0 ? pArv - pPrice : 0
                  const roiVal = p.cash_on_cash ?? p.gross_yield
                  const roi = roiVal && Number(roiVal) > 0 ? `+${Number(roiVal).toFixed(0)}% ROI` : null
                  const clean = v => (v && String(v).toLowerCase() !== 'unknown' ? v : null)
                  const title = clean(p.full_address) || clean(p.display_address) || clean(p.address) || cityState || 'Address unavailable'
                  const dealType = (p.deal_type || '').toLowerCase()
                  const dealBadge = dealType.includes('quick')
                    ? { label: 'Quick Sale', cls: 'bg-[#D03839] text-white' }
                    : dealType.includes('high') || dealType.includes('roi')
                    ? { label: 'High ROI', cls: 'bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8]' }
                    : dealType.includes('just') || dealType.includes('listed')
                    ? { label: 'Just Listed', cls: 'bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8]' }
                    : { label: 'New Deal', cls: 'bg-[#FEF3E2] text-[#B5620A] border border-[#F3C97D]' }
                  return (
                    <div key={p.id} className="bg-white rounded overflow-hidden hover:shadow-xl transition-shadow duration-200 flex flex-col">
                      {/* Photo */}
                      <Link href={isPreview ? '#' : `/${p.slug || p.id}`} onClick={isPreview ? (e) => { e.preventDefault(); setShowPreviewModal(true) } : undefined} className="relative h-[200px] bg-[#FAFAF8] flex-shrink-0 overflow-hidden block group">
                        {thumbUrl ? (
                          <Image
                            src={thumbUrl}
                            alt={cityState || 'Property'}
                            fill
                            loading="lazy"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="400px"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAFAF8]">
                            <div className="relative w-24 h-8 mb-1.5">
                              <Image src="/assets/logo.svg" alt="DeelMap" fill className="object-contain opacity-30" />
                            </div>
                            <span className="text-[10px] text-[#A8A8A4]">Photos coming soon</span>
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded ${dealBadge.cls}`}>{dealBadge.label}</span>
                        </div>
                        {roi && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-[#1A1816]/80 text-white">{roi}</span>
                          </div>
                        )}
                      </Link>
                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        {/* Location + icons */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-[#A8A8A4] flex-shrink-0" />
                            <span className="text-[12px] text-[#737370] truncate">{cityState || 'Location unavailable'}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShareUrl(typeof window !== 'undefined' ? `${window.location.origin}/${p.slug || p.id}` : ''); setShareTitle(p.full_address || p.display_address || p.address || 'Property'); setShowShareModal(true) }}
                              className="text-[#A8A8A4] hover:text-[#1A1816] transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async (e) => { e.stopPropagation(); e.preventDefault(); if (isPreview) { setShowPreviewModal(true); return } if (!user) { setShowLoginModal(true); return } try { await toggleFavorite(p.id); window.dispatchEvent(new CustomEvent('favoriteChanged')) } catch (err) { alert(err.message || 'Failed to update favorite') } }}
                              className={`transition-colors ${isFavorited(p.id) ? 'text-[#D03839]' : 'text-[#A8A8A4] hover:text-[#D03839]'}`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFavorited(p.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                        {/* Title */}
                        <h3 className="text-[15px] font-bold text-[#1A1816] mb-1.5 leading-snug line-clamp-1">{title}</h3>
                        {/* Stats */}
                        <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-3">
                          {p.sqft && <span>{Number(p.sqft).toLocaleString()} sq ft</span>}
                          {p.sqft && p.bedrooms && <span>·</span>}
                          {p.bedrooms && <span>{p.bedrooms} bed</span>}
                          {p.bedrooms && p.bathrooms && <span>·</span>}
                          {p.bathrooms && <span>{p.bathrooms} bath</span>}
                        </div>
                        {/* Price + ARV */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[20px] font-bold text-[#1A1816]">{pPrice ? `$${pPrice.toLocaleString()}` : 'Contact for Price'}</span>
                          {pArv > 0 && (
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8] rounded whitespace-nowrap">
                              ARV {pArv >= 1000000 ? `$${(pArv/1000000).toFixed(1)}M` : `$${Math.round(pArv/1000)}k`}
                            </span>
                          )}
                        </div>
                        {/* Spread */}
                        {spread > 0 && (
                          <p className="text-[12px] text-[#0F6E56] font-medium mb-2">↑ ${spread.toLocaleString()} spread potential</p>
                        )}
                        {/* Invest Now */}
                        <div className="mt-auto pt-3 flex justify-end">
                          {isPreview ? (
                            <button
                              onClick={() => setShowPreviewModal(true)}
                              className="px-4 py-2 bg-[#1A1816] text-white text-[12px] font-semibold rounded hover:bg-[#333] transition-colors"
                            >
                              View Listing
                            </button>
                          ) : (
                            <Link
                              href={`/${p.slug || p.id}`}
                              className="px-4 py-2 bg-[#1A1816] text-white text-[12px] font-semibold rounded hover:bg-[#333] transition-colors"
                            >
                              View Listing
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      </div>{/* end blur wrapper */}

      <Footer />

      {/* Share Modal — outside blur wrapper */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title={shareTitle}
        description={shareTitle}
      />
    </div>
  )
}
