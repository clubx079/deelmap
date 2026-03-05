// /components/property/PropertyDetail.js
'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, ExternalLink, Heart } from 'lucide-react'
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { usePropertyAnalytics } from '@/hooks/usePropertyAnalytics'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'
import { RegistrationModal } from '@/components/RegistrationModal'
import { PropertyImageModal } from './PropertyImageModal'
import { Navbar } from '@/components/layout/Navbar'

export function PropertyDetail({ property }) {
  const { user, loading } = useAuth()
  const { isFavorited, toggleFavorite, loadFavorites } = useFavorites()

  // Property analytics tracking (trackImageView for photo view count)
  const { trackImageView } = usePropertyAnalytics(property)
  const viewedPhotoIndicesRef = useRef(new Set([0]))

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [purchasePrice, setPurchasePrice] = useState(property.price || property.purchase_price || 0)
  const [downPaymentPercent, setDownPaymentPercent] = useState(25)
  const [estimatedRent, setEstimatedRent] = useState(property.estimated_rent || 0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showNotInterestedModal, setShowNotInterestedModal] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const mapRef = useRef(null)

  // Photo gallery - MOVED BEFORE ANY EARLY RETURNS TO FIX HOOKS ORDER
  const photos = useMemo(() => {
    if (!Array.isArray(property.property_photos)) return []
    return [...property.property_photos].sort((a, b) => {
      const aOrder = Number.isFinite(a?.display_order) ? a.display_order : 0
      const bOrder = Number.isFinite(b?.display_order) ? b.display_order : 0
      return aOrder - bOrder
    })
  }, [property.property_photos])
  const currentPhoto = photos[currentPhotoIndex]
  const currentPhotoUrl = getPreferredPhotoUrl(currentPhoto) || '/placeholder.jpg'

  // Build full address - ALSO MOVED BEFORE EARLY RETURNS
  const fullAddress = property.full_address || property.display_address ||
    `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip_code || ''}`.trim()

  // Show login modal if user is not authenticated (only after loading is complete)
  useEffect(() => {
    // Wait for auth check to complete
    if (loading) {
      return
    }
    
    // If not logged in, show login modal
    if (!user) {
      setShowLoginModal(true)
    } else {
      setShowLoginModal(false)
    }
  }, [user, loading])

  // Close modal after successful login
  useEffect(() => {
    if (user && showLoginModal && !loading) {
      setShowLoginModal(false)
    }
  }, [user, showLoginModal, loading])

  // Track unique photos viewed (main gallery + modal) for analytics
  useEffect(() => {
    if (photos.length === 0 || typeof trackImageView !== 'function') return
    viewedPhotoIndicesRef.current.add(currentPhotoIndex)
    trackImageView(viewedPhotoIndicesRef.current.size)
  }, [currentPhotoIndex, photos.length, trackImageView])

  // Callback for modal: when user views another photo in fullscreen, count it
  const handlePhotoViewFromModal = useCallback((index) => {
    viewedPhotoIndicesRef.current.add(index)
    if (typeof trackImageView === 'function') {
      trackImageView(viewedPhotoIndicesRef.current.size)
    }
  }, [trackImageView])

  // Load favorite status when component mounts
  useEffect(() => {
    if (user && property?.id) {
      loadFavorites([property.id])
    }
  }, [user, property?.id, loadFavorites])

  // Update local state when favorites change
  useEffect(() => {
    if (property?.id) {
      setIsFav(isFavorited(property.id))
    }
  }, [property?.id, isFavorited])

  // Initialize Google Map - MOVED BEFORE EARLY RETURN TO FIX HOOKS ORDER
  useEffect(() => {
    // Validate coordinates
    const lat = property.address_google_lat ? parseFloat(property.address_google_lat) : null
    const lng = property.address_google_lng ? parseFloat(property.address_google_lng) : null

    // Check if coordinates are valid numbers
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid map coordinates:', { lat, lng })
      // Show a message or placeholder in the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Map location not available</div>'
      }
      return
    }

    // Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
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
          center: {
            lat: lat,
            lng: lng
          },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        new window.google.maps.Marker({
          position: {
            lat: lat,
            lng: lng
          },
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

    // Wait a bit for the container to be ready
    const timer = setTimeout(() => {
      loadGoogleMapsAPI()
        .then(() => {
          loadGoogleMaps()
        })
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  const formatPrice = (price) => {
    if (!price) return '-'
    return `$${Math.round(price).toLocaleString()}`
  }

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-'
    return `${value.toFixed(1)}%`
  }

  // Calculate financial metrics
  const downPayment = purchasePrice * (downPaymentPercent / 100)
  const loanAmount = purchasePrice - downPayment
  const monthlyInterestRate = 0.07 / 12 // 7% annual rate
  const numberOfPayments = 30 * 12 // 30 years
  const monthlyPayment = loanAmount > 0
    ? loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
    : 0

  const annualRent = estimatedRent * 12
  const annualExpenses = (property.hoa_fees ? parseFloat(property.hoa_fees.replace(/[^0-9.]/g, '')) * 12 : 0) +
    (purchasePrice * 0.01) + // Property tax estimate (1%)
    (purchasePrice * 0.005) + // Insurance estimate (0.5%)
    (annualRent * 0.1) // Maintenance estimate (10% of rent)
  const netOperatingIncome = annualRent - annualExpenses
  const annualDebtService = monthlyPayment * 12
  const netCashFlow = netOperatingIncome - annualDebtService
  const monthlyNetCashFlow = netCashFlow / 12

  // Financial metrics from DB or calculated
  const grossYield = property.gross_yield || (purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0)
  const capRate = property.cap_rate || (purchasePrice > 0 ? (netOperatingIncome / purchasePrice) * 100 : 0)
  const cashOnCash = property.cash_on_cash || (downPayment > 0 ? (netCashFlow / downPayment) * 100 : 0)
  const estNetCashFlow = property.est_net_cash_flow || monthlyNetCashFlow

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Login Modal - Show when user is not authenticated */}
      <RegistrationModal
        isOpen={showLoginModal}
        onClose={() => {
          // Prevent closing - user must login to view full details
          // Modal will close automatically after successful login
        }}
        initialStep="login"
        preventClose={true}
      />

      {/* Image Modal */}
      <PropertyImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        photos={photos}
        initialIndex={currentPhotoIndex}
        onPhotoView={handlePhotoViewFromModal}
      />
      
      {/* Content */}
      <div>
      <Navbar />

      {/* Back to All Listings */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to All Listings</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Photos */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            <div className="mb-6">
              <div 
                className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer group" 
                style={{ height: '420px' }}
                onClick={() => photos.length > 0 && setShowImageModal(true)}
              >
                {photos.length > 0 ? (
                  <>
                    <Image
                      src={currentPhotoUrl}
                      alt={`Property photo ${currentPhotoIndex + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Click overlay hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-full text-sm font-medium text-gray-700">
                        Click to view full size
                      </div>
                    </div>
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            prevPhoto()
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg z-10"
                        >
                          <ChevronLeft className="h-6 w-6 text-gray-800" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            nextPhoto()
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg z-10"
                        >
                          <ChevronRight className="h-6 w-6 text-gray-800" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                          {currentPhotoIndex + 1} / {photos.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-gray-100 gap-2">
                    <div className="relative w-48 h-14">
                      <Image
                        src="/assets/logo copy.png"
                        alt="DeelMap"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Photos Coming soon</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Address & Basic Info */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{fullAddress}</h1>
              <div className="text-4xl font-bold text-gray-900 mb-1">{formatPrice(property.price)}</div>
              {property.status && (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  {property.status}
                </span>
              )}
            </div>

            {/* Basic Stats */}
            <div className="flex items-center gap-6 mb-6 text-gray-700">
              {property.bedrooms && (
                <div className="text-lg">
                  <span className="font-semibold">{property.bedrooms}</span> beds
                </div>
              )}
              {property.bathrooms && (
                <div className="text-lg">
                  <span className="font-semibold">{property.bathrooms}</span> baths
                </div>
              )}
              {property.sqft && (
                <div className="text-lg">
                  <span className="font-semibold">{property.sqft.toLocaleString()}</span> sq ft
                </div>
              )}
              {property.year_built && (
                <div className="text-lg">
                  Built in <span className="font-semibold">{property.year_built}</span>
                </div>
              )}
            </div>

            {/* Financial Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatPercent(grossYield)}</div>
                <div className="text-sm text-gray-600">Gross yield</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatPercent(capRate)}</div>
                <div className="text-sm text-gray-600">Cap rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatPercent(cashOnCash)}</div>
                <div className="text-sm text-gray-600">Cash on cash</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatPrice(estNetCashFlow)}</div>
                <div className="text-sm text-gray-600">Est. cash flow</div>
              </div>
            </div>

            {/* Purchase Calculator */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Down payment</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(parseFloat(e.target.value) || 0)}
                      className="w-full pr-7 pl-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated rent</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input
                      type="number"
                      value={estimatedRent}
                      onChange={(e) => setEstimatedRent(parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Enter values above to calculate your estimated returns and cash flow projections.
              </p>
            </div>

            {/* About This Property */}
            {property.description && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About this property</h2>
                <div 
                  className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: showFullDescription || property.description.length <= 300
                      ? property.description
                      : `${property.description.substring(0, 300)}...`
                  }}
                />
                {property.description.length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 flex items-center transition-colors"
                  >
                    {showFullDescription ? 'Show less' : 'Show more'}
                    <svg
                      className={`w-4 h-4 ml-1 transition-transform ${showFullDescription ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Property Details Table */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Days on market</span>
                  <span className="font-medium text-gray-900">{property.days_on_market || '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Property type</span>
                  <span className="font-medium text-gray-900">{property.property_type || '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Price per square foot</span>
                  <span className="font-medium text-gray-900">
                    {property.price_per_square_foot ? `$${property.price_per_square_foot}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Lot size</span>
                  <span className="font-medium text-gray-900">{property.lot_size || '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">HOA fees</span>
                  <span className="font-medium text-gray-900">{property.hoa_fees || '-'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Neighborhood score</span>
                  <span className="font-medium text-gray-900">
                    {property.neighborhood_score ? `${property.neighborhood_score} / 5` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">School score</span>
                  <span className="font-medium text-gray-900">
                    {property.school_score ? `${property.school_score} / 10` : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Crime score</span>
                  <span className="font-medium text-gray-900">
                    {property.crime_score ? `${property.crime_score} / 10` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* MLS Information */}
            {(property.agent_name || property.mls_number) && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-start">
                  {property.data_source_brokerage && (
                    <div className="mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        Listed By: {property.agent_name || 'N/A'}
                        {property.mls_number && `, ${property.mls_number}`}
                      </div>
                      <div className="text-sm text-gray-600">
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

            {/* External links removed per requirements */}
          </div>

          {/* Right Column - Actions & Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {/* Action Buttons - Full Width */}
              <div className="flex items-center gap-2 mb-4">
                {/* Save Button */}
                <button
                  onClick={async () => {
                    if (!user) {
                      setShowLoginModal(true)
                      return
                    }

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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                    isFav
                      ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={favoriteLoading}
                  title={isFav ? 'Remove from saved' : 'Save property'}
                >
                  {isFav ? (
                    <Heart className="h-4 w-4 fill-current" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  <span>{isFav ? 'Saved' : 'Save'}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
                  title="Share property"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>

                {/* Not Interested Button */}
                <button
                  onClick={() => setShowNotInterestedModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium whitespace-nowrap"
                  title="Not interested"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Not Interested</span>
                </button>
              </div>

              {/* Connect with Agent Card - Simplified */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Contact Agent</h3>
                  <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                
                {/* Message Button Only */}
                <Link
                  href={user && (property.temp_seller_id || property.seller_id)
                    ? `/buyer/inbox?seller_id=${property.temp_seller_id || property.seller_id}&deal_id=${property.id}`
                    : user 
                      ? '/buyer/inbox'
                      : '/login'
                  }
                  className="block w-full bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-800 active:bg-slate-700 text-center text-sm transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md"
                >
                  Send Message
                </Link>
              </div>

              {/* Google Maps Preview */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div
                  ref={mapRef}
                  className="w-full h-[400px]"
                  style={{ minHeight: '400px' }}
                />
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Share Property</h3>
            <p className="text-sm text-slate-600 mb-4">Share this property with others</p>
            
            {/* Copy Link Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 mb-1">Property Link</p>
                  <p className="text-sm text-slate-600 truncate">{typeof window !== 'undefined' ? window.location.href : ''}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    const btn = event.target.closest('button')
                    const originalText = btn.textContent
                    btn.textContent = 'Copied!'
                    setTimeout(() => btn.textContent = originalText, 2000)
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Copy Link
                </button>
              </div>
            </div>

            {/* Social Share Options */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-slate-700 mb-2">Or share via:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const text = encodeURIComponent(`Check out this property: ${fullAddress}`)
                    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z"/></svg>
                  <span>Facebook</span>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const text = encodeURIComponent(`Check out this property: ${fullAddress}`)
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  <span>LinkedIn</span>
                </button>
                <button
                  onClick={() => {
                    const url = encodeURIComponent(window.location.href)
                    const text = encodeURIComponent(`Check out this property: ${fullAddress}`)
                    if (navigator.share) {
                      navigator.share({ title: fullAddress, text: text, url: window.location.href })
                    } else {
                      window.open(`mailto:?subject=${text}&body=${url}`, '_blank')
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  <span>Email</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Not Interested Modal */}
      {showNotInterestedModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowNotInterestedModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Not Interested</h3>
              <p className="text-sm text-slate-600">We'll hide this property from your recommendations and won't show it to you again.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-700 font-medium mb-1">{fullAddress}</p>
              <p className="text-xs text-slate-500">You can always view hidden properties in your settings.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNotInterestedModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement hide property logic
                  console.log('Property marked as not interested:', property.id)
                  setShowNotInterestedModal(false)
                  // Show success message
                  const successDiv = document.createElement('div')
                  successDiv.className = 'fixed top-4 right-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg z-[10000] text-sm font-medium'
                  successDiv.textContent = 'Property hidden successfully'
                  document.body.appendChild(successDiv)
                  setTimeout(() => successDiv.remove(), 3000)
                }}
                className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
