'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Share2, Heart, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ShareModal } from './ShareModal'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'

export default function PropertyCard({ property, isLoggedIn = false, layout = 'horizontal' }) {
  const [showShare, setShowShare] = useState(false)
  const { user } = useAuth()
  const { isFavorited, toggleFavorite, loadFavorites } = useFavorites()
  const [isFav, setIsFav] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    if (user && property?.id) loadFavorites([property.id])
  }, [user, property?.id, loadFavorites])

  useEffect(() => {
    if (property?.id) setIsFav(isFavorited(property.id))
  }, [property?.id, isFavorited])

  const {
    id, property_photos, price, arv, bedrooms, bathrooms, sqft,
    full_address, address, city, state, zip_code,
    gross_yield, cap_rate, cash_on_cash, deal_type, status,
    is_highlighted,
  } = property

  const featurePhoto = property_photos?.find(p => p?.is_featured) || property_photos?.[0]
  const featureImage = featurePhoto ? (featurePhoto.optimized_url || featurePhoto.photo_url || '') : ''
  const thumbnailImage = featureImage && featureImage.includes('supabase.co/storage/v1/object/public/')
    ? featureImage.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
    : featureImage

  const slug = property.slug || id
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://deelmap-production-e7c2.up.railway.app'}/${slug}`

  const cityState = [city, state].filter(Boolean).join(', ')
  const displayAddress = isLoggedIn
    ? (full_address || [address, cityState].filter(Boolean).join(', ') || cityState)
    : cityState

  const formatPriceFull = (val) => {
    if (!val) return 'Contact for Price'
    const n = Number(val)
    if (!isFinite(n) || n === 0) return 'Contact for Price'
    return `$${Math.round(n).toLocaleString()}`
  }

  const formatPriceShort = (val) => {
    if (!val) return null
    const n = Number(val)
    if (!isFinite(n) || n === 0) return null
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${Math.round(n).toLocaleString()}`
  }

  // ROI badge: prefer cash_on_cash, fallback gross_yield
  const roiValue = cash_on_cash ?? gross_yield
  const roiLabel = roiValue && Number(roiValue) > 0 ? `+${Number(roiValue).toFixed(0)}% ROI` : null

  // Spread potential
  const priceNum = Number(price) || 0
  const arvNum = Number(arv) || 0
  const spreadNum = arvNum > priceNum && priceNum > 0 ? arvNum - priceNum : 0

  // Property title — filter out "unknown" DB values
  const clean = (v) => (v && v.toLowerCase() !== 'unknown' ? v : null)
  const propertyTitle = clean(property.title) || clean(property.name) || clean(property.property_type) || 'Investment Property'

  // Deal badge
  const getDealBadge = () => {
    const raw = (deal_type || '').toLowerCase()
    if (raw.includes('quick')) return { label: 'Quick Sale', cls: 'bg-[#D03839] text-white' }
    if (raw.includes('new')) return { label: 'New Deal', cls: 'bg-[#D97706] text-white' }
    if (raw.includes('high') || raw.includes('roi')) return { label: 'High ROI', cls: 'bg-[#0F6E56] text-white' }
    if (raw.includes('just') || raw.includes('listed')) return { label: 'Just Listed', cls: 'bg-[#0F6E56] text-white' }
    return null
  }
  const dealBadge = getDealBadge()

  const favBtn = (
    <button
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation()
        if (!user) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
        setFavoriteLoading(true)
        try { await toggleFavorite(property.id); window.dispatchEvent(new CustomEvent('favoriteChanged')) }
        catch (err) { alert(err.message || 'Error') }
        finally { setFavoriteLoading(false) }
      }}
      className={`p-1.5 rounded hover:bg-[#FAFAF8] transition-colors ${favoriteLoading ? 'opacity-50' : ''}`}
      disabled={favoriteLoading}
      title={isFav ? 'Remove from saved' : 'Save'}
    >
      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-[#D03839] text-[#D03839]' : 'text-[#737370]'}`} />
    </button>
  )

  // Highlighted badge (used in both layouts)
  const highlightBadge = (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-white rounded-full px-2.5 py-0.5 mb-1 w-fit"
      style={{ background: 'linear-gradient(90deg, #D03839, #E0583A)', boxShadow: '0 2px 8px rgba(208,56,57,0.30)' }}
    >
      ⭐ Highlighted
    </span>
  )

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(208,56,57,0.10), 0 8px 32px rgba(208,56,57,0.18), 0 2px 8px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 0 0 5px rgba(208,56,57,0.16), 0 10px 40px rgba(208,56,57,0.26), 0 2px 8px rgba(0,0,0,0.08); }
        }
      `}</style>

      {layout === 'vertical' ? (
        /* ── VERTICAL card ── */
        <div
          style={is_highlighted ? { padding: '2px', background: 'linear-gradient(135deg, #D03839 0%, #E8633E 50%, #D03839 100%)', borderRadius: '7px', animation: 'pulse-glow 3s ease-in-out infinite' } : {}}
        >
          <div className={`bg-white ${is_highlighted ? '' : 'border border-[#E8E8E4]'} rounded overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col`} style={is_highlighted ? { borderRadius: '5px' } : {}}>
            {/* Photo */}
            <Link href={`/${slug}`} className="relative block w-full h-[160px] flex-shrink-0 group bg-[#FAFAF8]">
              {is_highlighted && (
                <div className="absolute top-0 inset-x-0 h-[3px] z-10" style={{ background: 'linear-gradient(90deg, #D03839, #E8633E, #D03839)' }} />
              )}
              {thumbnailImage ? (
                <Image
                  src={thumbnailImage}
                  alt={displayAddress || 'Property'}
                  fill
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="400px"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="relative w-20 h-6">
                    <Image src="/assets/logo.svg" alt="DeelMap" fill className="object-contain" />
                  </div>
                  <span className="text-[10px] text-[#A8A8A4] mt-1">No photo</span>
                </div>
              )}
              {roiLabel && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-semibold rounded">
                  {roiLabel}
                </div>
              )}
              {is_highlighted && (
                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-white text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: 'linear-gradient(90deg, #D03839, #E0583A)', boxShadow: '0 2px 8px rgba(208,56,57,0.40)', letterSpacing: '0.3px' }}>
                  ⭐ Highlighted
                </div>
              )}
              <div className="absolute top-2 right-2">{favBtn}</div>
            </Link>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1 min-w-0" style={is_highlighted ? { background: 'linear-gradient(160deg, #fff 50%, #FEF5F4 100%)' } : {}}>
              <Link href={`/${slug}`} className="flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-[#737370] flex-shrink-0" />
                <span className="text-[11px] text-[#737370] truncate">{cityState || 'Location unavailable'}</span>
              </Link>
              {isLoggedIn ? (
                <Link href={`/${slug}`}>
                  <h3 className="text-[13px] font-bold text-[#1A1816] leading-snug line-clamp-2 hover:text-[#D03839] transition-colors mb-1">
                    {full_address || address || cityState}
                  </h3>
                </Link>
              ) : (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))}
                  className="text-[12px] text-[#D03839] font-medium hover:underline text-left mb-1"
                >
                  Login to view address
                </button>
              )}
              {(bedrooms || bathrooms || sqft) && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#737370] mb-1.5 flex-wrap">
                  {sqft && <span>{Number(sqft).toLocaleString()} sf</span>}
                  {sqft && (bedrooms || bathrooms) && <span className="text-[#D4D4CF]">·</span>}
                  {bedrooms && <span>{bedrooms} bd</span>}
                  {bedrooms && bathrooms && <span className="text-[#D4D4CF]">·</span>}
                  {bathrooms && <span>{bathrooms} ba</span>}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-auto pt-1.5">
                <span className="text-[15px] font-bold text-[#1A1816]">{formatPriceFull(price)}</span>
                {arvNum > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8] rounded whitespace-nowrap">
                    ARV {formatPriceShort(arv)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── HORIZONTAL card (default) ── */
        <div
          style={is_highlighted ? { padding: '2px', background: 'linear-gradient(135deg, #D03839 0%, #E8633E 50%, #D03839 100%)', borderRadius: '7px', animation: 'pulse-glow 3s ease-in-out infinite' } : {}}
        >
          <div className={`bg-white ${is_highlighted ? '' : 'border border-[#E8E8E4]'} rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row sm:min-h-[230px]`} style={is_highlighted ? { borderRadius: '5px' } : {}}>
            {/* Photo */}
            <Link href={`/${slug}`} className="relative flex-shrink-0 w-full h-[200px] sm:w-[280px] sm:h-auto sm:self-stretch block group">
              {is_highlighted && (
                <div className="absolute top-0 inset-x-0 h-[3px] z-10" style={{ background: 'linear-gradient(90deg, #D03839, #E8633E, #D03839)' }} />
              )}
              {thumbnailImage ? (
                <Image
                  src={thumbnailImage}
                  alt={displayAddress || 'Property'}
                  fill
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="300px"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAFAF8]">
                  <div className="relative w-28 h-8">
                    <Image src="/assets/logo.svg" alt="DeelMap" fill className="object-contain" />
                  </div>
                  <span className="text-[11px] text-[#A8A8A4] mt-1">No photo</span>
                </div>
              )}
              {roiLabel && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[11px] font-semibold rounded">
                  {roiLabel}
                </div>
              )}
              {is_highlighted && (
                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 text-white text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: 'linear-gradient(90deg, #D03839, #E0583A)', boxShadow: '0 2px 8px rgba(208,56,57,0.40)', letterSpacing: '0.3px' }}>
                  ⭐ Highlighted
                </div>
              )}
            </Link>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col min-w-0 overflow-hidden" style={is_highlighted ? { background: 'linear-gradient(160deg, #fff 50%, #FEF5F4 100%)' } : {}}>
              {/* Row 1: city/state + icons */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link href={`/${slug}`} className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 text-[#737370] flex-shrink-0" />
                  <span className="text-[12px] text-[#737370] truncate">{cityState || 'Location unavailable'}</span>
                </Link>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShare(true) }}
                    className="p-1.5 rounded hover:bg-[#FAFAF8] text-[#737370] transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {favBtn}
                </div>
              </div>
              {is_highlighted && highlightBadge}
              {dealBadge && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded self-start mb-1 ${dealBadge.cls}`}>
                  {dealBadge.label}
                </span>
              )}
              <div className="mb-1.5">
                {isLoggedIn ? (
                  <Link href={`/${slug}`}>
                    <h3 className="text-[15px] font-bold text-[#1A1816] leading-snug line-clamp-1 hover:text-[#D03839] transition-colors">
                      {full_address || address || cityState}
                    </h3>
                  </Link>
                ) : (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))}
                    className="text-[13px] text-[#D03839] font-medium hover:underline text-left"
                  >
                    Login to view full address
                  </button>
                )}
              </div>
              <p className="text-[12px] text-[#1A1816] mb-1.5">{propertyTitle}</p>
              <div className="flex items-center gap-3 text-[13px] text-[#1A1816] mb-3">
                {sqft && <span>{Number(sqft).toLocaleString()} sq ft</span>}
                {sqft && (bedrooms || bathrooms) && <span className="text-[#E8E8E4]">·</span>}
                {bedrooms && <span>{bedrooms} bed</span>}
                {bedrooms && bathrooms && <span className="text-[#E8E8E4]">·</span>}
                {bathrooms && <span>{bathrooms} bath</span>}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[20px] font-bold text-[#1A1816]">{formatPriceFull(price)}</span>
                {arvNum > 0 && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8] rounded whitespace-nowrap">
                    ARV {formatPriceShort(arv)}
                  </span>
                )}
              </div>
              {spreadNum > 0 && (
                <p className="text-[13px] text-[#0F6E56] font-medium mb-3">
                  ↑ ${spreadNum.toLocaleString()} spread potential
                </p>
              )}
              <Link
                href={`/${slug}`}
                className={`mt-auto self-start text-[13px] font-semibold rounded px-3 py-2 transition-all duration-200 ${
                  is_highlighted
                    ? 'text-white hover:opacity-90'
                    : 'text-[#1A1816] border border-[#1A1816] hover:bg-[#1A1816] hover:text-white'
                }`}
                style={is_highlighted ? { background: '#D03839', boxShadow: '0 2px 10px rgba(208,56,57,0.28)' } : {}}
              >
                View Listing
              </Link>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={shareUrl}
        title={displayAddress || 'Property'}
        description={`${bedrooms || 0} bed, ${bathrooms || 0} bath${price ? ` · ${formatPriceFull(price)}` : ''}`}
      />
    </>
  )
}
