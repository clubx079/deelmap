// /components/property/PropertyDetail.js
'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
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

  // Property analytics tracking
  usePropertyAnalytics(property)

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [purchasePrice, setPurchasePrice] = useState(property.price || property.purchase_price || 0)
  const [downPaymentPercent, setDownPaymentPercent] = useState(25)
  const [estimatedRent, setEstimatedRent] = useState(property.estimated_rent || 0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
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
                <div className="text-gray-700 leading-relaxed">
                  {showFullDescription || property.description.length <= 300
                    ? property.description
                    : `${property.description.substring(0, 300)}...`}
                </div>
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
              {/* Data Source & Save */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {property.data_source_brokerage && (
                    <>
                      <span className="text-sm font-medium text-gray-700">Data Source Brokerage:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {property.data_source_brokerage}
                        </span>
                        {property.mls_source_name && (
                          <span className="text-sm text-gray-600">{property.mls_source_name}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!user) {
                      setShowLoginModal(true)
                      return
                    }

                    setFavoriteLoading(true)
                    try {
                      await toggleFavorite(property.id)
                      // Dispatch event to notify other components
                      window.dispatchEvent(new CustomEvent('favoriteChanged'))
                    } catch (error) {
                      console.error('Error toggling favorite:', error)
                      alert(error.message || 'Failed to update favorite')
                    } finally {
                      setFavoriteLoading(false)
                    }
                  }}
                  className={`flex items-center gap-2 font-medium transition-colors ${
                    isFav
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-slate-600 hover:text-slate-700'
                  } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={favoriteLoading}
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFav ? (
                    <Heart className="h-5 w-5 fill-current text-red-500" />
                  ) : (
                    <Heart className="h-5 w-5 text-slate-600" />
                  )}
                  <span>{isFav ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {/* Connect with Agent Card - Compact Professional Design */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Contact Agent</h3>
                  <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                
                {property.agent?.name && (
                  <p className="text-sm font-medium text-slate-700 mb-1">{property.agent.name}</p>
                )}
                {property.agent?.phone && (
                  <p className="text-sm text-slate-600 mb-4">{property.agent.phone}</p>
                )}
                
                {/* Message Button - Links directly to messages */}
                <Link
                  href={user && property.temp_seller_id 
                    ? `/buyer/inbox?seller_id=${property.temp_seller_id}&deal_id=${property.id}`
                    : user 
                      ? '/buyer/inbox'
                      : '/login'
                  }
                  className="block w-full bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-800 active:bg-slate-700 text-center text-sm transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md mb-2"
                >
                  Send Message
                </Link>
                
                {property.agent?.phone && (
                  <a
                    href={`tel:${property.agent.phone.replace(/\D/g, '')}`}
                    className="block w-full bg-white text-slate-700 font-medium py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-center text-sm transition-all duration-200"
                  >
                    Call Agent
                  </a>
                )}
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
    </div>
  )
}
