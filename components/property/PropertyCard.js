'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Share2, Bed, Bath, Square, Lock, Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ShareModal } from './ShareModal'
// Photo URL utilities imported if needed for future use
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'

export default function PropertyCard({ property, isLoggedIn = false }) {
  const [showShare, setShowShare] = useState(false)
  const { user } = useAuth()
  const { isFavorited, toggleFavorite, loadFavorites } = useFavorites()
  const [isFav, setIsFav] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

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

  const {
    id,
    property_photos,
    price,
    bedrooms,
    bathrooms,
    sqft,
    full_address,
    address,
    city,
    state,
    zip_code,
    status,
    gross_yield,
    cap_rate,
    cash_on_cash,
    price_per_square_foot,
    year_built,
  } = property

  const featurePhoto = property_photos?.find(p => p?.is_featured) || property_photos?.[0]
  const featureImage = featurePhoto
    ? (featurePhoto.optimized_url || featurePhoto.photo_url || '')
    : ''
  // Use Supabase image transform for fast thumbnail (400px wide)
  const thumbnailImage = featureImage && featureImage.includes('supabase.co/storage/v1/object/public/')
    ? featureImage.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
    : featureImage
  const photoCount = property.photo_count || property_photos?.length || 0
  const hasPhotos = !!thumbnailImage

  // Full address for alt text and share modal (includes zip code)
  const fullAddressText = full_address ||
    `${address || ''}, ${city || ''}, ${state || ''} ${zip_code || ''}`.trim()

  // Display address: full address when logged in, city/state only when not
  const getDisplayAddress = () => {
    const cityState = [city, state].filter(Boolean).join(', ')
    if (isLoggedIn) {
      return fullAddressText || full_address || cityState || ''
    }
    return cityState || (() => {
      const firstCommaIndex = (fullAddressText || '').indexOf(',')
      if (firstCommaIndex === -1) return fullAddressText || ''
      return (fullAddressText || '').substring(firstCommaIndex + 1).trim()
    })()
  }

  const displayAddress = getDisplayAddress()

  // Use slug for URL when available (no Supabase ID in URL); fallback to id for backward compat
  const slug = property.slug || id
  const shareUrl = `https://ableman.co/${slug}`

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return 'bg-red-500'
      case 'pending': return 'bg-orange-500'
      case 'available':
      default: return 'bg-[#b29578]'
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Contact for Price'
    return `$${Math.round(price).toLocaleString()}`
  }

  return (
    <>
      <Link href={`/${slug}`} className="block h-full">
        <div className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200 h-full flex flex-col">
          <div className="relative h-[200px] flex-shrink-0 overflow-hidden bg-gray-100">
            {hasPhotos ? (
              <>
                <Image
                  src={thumbnailImage}
                  alt={fullAddressText || 'Property'}
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
                {/* Photo count badge - top left like Stessa */}
                {photoCount > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-gray-800 rounded shadow-sm">
                      {photoCount > 1 ? `${photoCount} PHOTOS` : '1 PHOTO'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* No photo placeholder - Show DeelMap logo + Coming soon */
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-2">
                <div className="relative w-40 h-12">
                  <Image
                    src="/assets/logo copy.png"
                    alt="DeelMap"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">Photos Coming Soon</span>
              </div>
            )}

            {/* Action buttons - top right */}
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              {/* Favorite button - always visible */}
              <button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  if (!user) {
                    // Trigger auth modal - this will be handled by parent
                    const event = new CustomEvent('showAuth', { detail: { step: 'signin' } })
                    window.dispatchEvent(event)
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
                className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm transition-all duration-200 ${
                  isFav ? 'text-yellow-500 opacity-100' : 'text-gray-700 opacity-70 group-hover:opacity-100'
                } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-red-500' : 'text-slate-600'}`} />
              </button>
              
              {/* Share button - visible on hover */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowShare(true)
                }}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-200"
                title="Share property"
              >
                <Share2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="p-3 flex-1 flex flex-col min-h-[200px]">
            {/* Price */}
            <div className="text-xl font-bold text-gray-900 mb-1">
              {formatPrice(price)}
            </div>

            {/* Address */}
            <p className="text-sm text-gray-600 mb-3 line-clamp-1">
              {displayAddress}
            </p>

            {/* Property details - always show same row so card height is consistent */}
            <div className="flex items-center text-sm text-gray-700 mb-3 min-h-[20px]">
              <span className="font-medium">{bedrooms != null && bedrooms !== '' ? `${bedrooms} bd` : '— bd'}</span>
              <span className="mx-1.5">•</span>
              <span className="font-medium">{bathrooms != null && bathrooms !== '' ? `${bathrooms} ba` : '— ba'}</span>
            </div>

            {/* Metrics Row - exactly like Stessa */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-500 mb-1">Gross yield</div>
                <div className="text-base font-bold text-gray-900">
                  {gross_yield ? `${gross_yield}%` : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Cap rate</div>
                <div className="text-base font-bold text-gray-900">
                  {cap_rate ? `${cap_rate}%` : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Cash on cash</div>
                <div className="text-base font-bold text-gray-900">
                  {cash_on_cash ? `${cash_on_cash}%` : '-'}
                </div>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                <Lock className="w-3.5 h-3.5" />
                <span>Sign in to see full details</span>
              </div>
            )}
          </div>
        </div>
      </Link>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={shareUrl}
        title={fullAddressText || 'Property'}
        description={`${bedrooms || 0} bed, ${bathrooms || 0} bath property${price ? ` for ${formatPrice(price)}` : ''}`}
      />
    </>
  )
}