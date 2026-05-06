'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useProperties } from '@/hooks/useProperties'
import { getPrimaryPhotoUrl } from '@/utils/propertyPhotos'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

const TABS = [
  { label: 'All deals', value: 'all', redirect: false },
  { label: 'Fix & flip', value: 'fix', redirect: true },
  { label: 'Buy & hold', value: 'hold', redirect: true },
]

const AVATAR_COLORS = ['bg-orange-400', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500']

const VISIBLE = 4

export function PropertiesSlider() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [featuredBuyerDeals, setFeaturedBuyerDeals] = useState([])
  const [startIndex, setStartIndex] = useState(0)
  const [noAnim, setNoAnim] = useState(false)
  const [step, setStep] = useState(0)
  const [mobileOpacity, setMobileOpacity] = useState(1)
  const [mobileCards, setMobileCards] = useState([])
  const pausedRef = useRef(false)
  const containerRef = useRef(null)

  const { properties, loading } = useProperties({
    filters: { statuses: ['available'], listingType: 'wholesale' },
    sortBy: 'newest',
    pageSize: 12,
  })

  useEffect(() => {
    fetch('/api/buyer/listings/featured')
      .then(r => r.json())
      .then(d => setFeaturedBuyerDeals(d.properties || []))
      .catch(() => {})
  }, [])

  // Measure container width → compute per-card step
  // Depends on `loading` so it re-runs once the carousel div appears in the DOM
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setStep((el.offsetWidth + 16) / VISIBLE)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  useEffect(() => { setStartIndex(0) }, [activeTab])

  const allCards = useMemo(() => {
    const featuredFiltered = featuredBuyerDeals.filter(p => p.listing_type !== 'auction')
    const featuredIds = new Set(featuredFiltered.map(p => p.id))
    const regular = properties.filter(p => !featuredIds.has(p.id) && p.listing_type !== 'auction')
    return [...featuredFiltered, ...regular]
  }, [properties, featuredBuyerDeals])

  const canScroll = allCards.length > VISIBLE
  const displayProperties = allCards.slice(startIndex, startIndex + VISIBLE)
  const cardWidth = step > 0 ? step - 16 : 0

  // Mobile-only fade transition when visible cards change
  useEffect(() => {
    const slice = allCards.slice(startIndex, startIndex + VISIBLE)
    if (slice.length === 0) return
    setMobileOpacity(0)
    const t = setTimeout(() => {
      setMobileCards(slice)
      setMobileOpacity(1)
    }, 200)
    return () => clearTimeout(t)
  }, [startIndex, allCards])

  const moveTo = (newIdx, animate = true) => {
    if (!animate) {
      setNoAnim(true)
      setStartIndex(newIdx)
      requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)))
    } else {
      setNoAnim(false)
      setStartIndex(newIdx)
    }
  }

  const prev = () => {
    const wrapping = startIndex === 0
    const newIdx = wrapping ? Math.max(0, allCards.length - VISIBLE) : startIndex - 1
    moveTo(newIdx, !wrapping)
  }

  const next = () => {
    const wrapping = startIndex + VISIBLE >= allCards.length
    const newIdx = wrapping ? 0 : startIndex + 1
    moveTo(newIdx, !wrapping)
  }

  // Auto-rotate
  useEffect(() => {
    if (!canScroll) return
    const id = setInterval(() => {
      if (pausedRef.current) return
      setStartIndex(i => (i + 1 + VISIBLE > allCards.length ? 0 : i + 1))
    }, 4000)
    return () => clearInterval(id)
  }, [canScroll, allCards.length])

  const formatPrice = (val, listingType) => {
    if (!val) return listingType === 'auction' ? 'Auction Listing' : 'Contact for Price'
    return `$${Math.round(Number(val)).toLocaleString()}`
  }

  const formatShort = (val) => {
    if (!val) return null
    const n = Number(val)
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }

  const getDealBadge = (p) => {
    const raw = (p.deal_type || '').toLowerCase()
    if (raw.includes('quick')) return { label: 'Quick Sale', cls: 'bg-[#D03839] text-white' }
    if (raw.includes('new')) return { label: 'New Deal', cls: 'bg-[#FEF3E2] text-[#B5620A] border border-[#F3C97D]' }
    if (raw.includes('high') || raw.includes('roi')) return { label: 'High ROI', cls: 'bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8]' }
    if (raw.includes('just') || raw.includes('listed')) return { label: 'Just Listed', cls: 'bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8]' }
    return { label: 'New Deal', cls: 'bg-[#FEF3E2] text-[#B5620A] border border-[#F3C97D]' }
  }

  const getROI = (p) => {
    const v = p.cash_on_cash ?? p.gross_yield
    if (!v || Number(v) <= 0) return null
    return `+${Number(v).toFixed(0)}% ROI`
  }

  const getSpread = (p) => {
    const price = Number(p.price) || 0
    const arv = Number(p.arv) || 0
    if (arv > price && price > 0) return arv - price
    return 0
  }

  const getInitials = (p) => {
    const name = p.seller_name || ''
    if (name.trim()) {
      const words = name.trim().split(/\s+/)
      if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
      return name.slice(0, 2).toUpperCase()
    }
    return 'VS'
  }

  const getAvatarColor = (p) => AVATAR_COLORS[(p.id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

  const getSellerName = (p) => {
    if (p.seller_name) return p.seller_name
    return 'Verified Seller'
  }

  const Skeleton = () => (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden animate-pulse">
      <div className="h-[220px] bg-[#E8E8E4]" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-[#E8E8E4] rounded w-24" />
        <div className="h-5 bg-[#E8E8E4] rounded w-3/4" />
        <div className="h-3 bg-[#E8E8E4] rounded w-1/2" />
        <div className="h-6 bg-[#E8E8E4] rounded w-32" />
        <div className="h-3 bg-[#E8E8E4] rounded w-2/3" />
        <div className="h-px bg-[#E8E8E4]" />
        <div className="h-8 bg-[#E8E8E4] rounded" />
      </div>
    </div>
  )

  const PropertyCardInner = ({ p }) => {
    const img = getPrimaryPhotoUrl(p.property_photos)
    const thumbImg = img && img.includes('supabase.co/storage/v1/object/public/')
      ? img.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
      : img
    const cityState = [p.city, p.state].filter(Boolean).join(', ')
    const dealBadge = getDealBadge(p)
    const roi = getROI(p)
    const spread = getSpread(p)
    const arv = Number(p.arv) || 0
    const clean = (v) => (v && String(v).toLowerCase() !== 'unknown' ? v : null)
    const title = clean(p.title) || clean(p.name) || clean(p.property_type) || 'Investment Property'
    const beds = p.bedrooms
    const baths = p.bathrooms
    const sqft = p.sqft

    return (
      <Link href={`/${p.slug || p.id}`} className="block bg-white border border-[#E8E8E4] rounded overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
        {/* Photo */}
        <div className="bg-[#FAFAF8] flex-shrink-0 relative h-[220px] overflow-hidden">
          {thumbImg ? (
            <Image
              src={thumbImg}
              alt={cityState || 'Property'}
              fill
              loading="lazy"
              className="object-cover"
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
            <span className={`text-[11px] font-semibold px-2 py-1 rounded ${dealBadge.cls}`}>
              {dealBadge.label}
            </span>
          </div>
          {roi && (
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[11px] font-semibold px-2 py-1 rounded bg-[#1A1816] text-white">
                {roi}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1 mb-1.5">
            <MapPin className="w-3 h-3 text-[#A8A8A4] flex-shrink-0" />
            <span className="text-[12px] text-[#737370] truncate">{cityState || 'Location unavailable'}</span>
          </div>
          <h3 className="text-[15px] font-bold text-[#1A1816] mb-1.5 leading-snug line-clamp-1">{title}</h3>
          <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-3">
            {sqft && <span>{Number(sqft).toLocaleString()} sq ft</span>}
            {sqft && beds && <span className="text-[#E8E8E4]">·</span>}
            {beds && <span>{beds} bed</span>}
            {beds && baths && <span className="text-[#E8E8E4]">·</span>}
            {baths && <span>{baths} bath</span>}
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[20px] font-bold text-[#1A1816]">{formatPrice(p.price, p.listing_type)}</span>
            {arv > 0 && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8] rounded whitespace-nowrap">
                ARV {formatShort(arv)}
              </span>
            )}
          </div>
          {spread > 0 && (
            <p className="text-[12px] text-[#0F6E56] font-medium mb-3">
              ↑ ${spread.toLocaleString()} spread potential
            </p>
          )}
          <div className="mt-auto pt-3 border-t border-[#F0F0EC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full ${getAvatarColor(p)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                {getInitials(p)}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#1A1816] leading-none">{getSellerName(p)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  <span className="text-[10px] text-[#16A34A] font-medium">Verified</span>
                </div>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-[#D03839]">View deal →</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header row */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[1.1px] mb-2">Live Marketplace</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-[32px] sm:text-[36px] font-bold text-[#1A1816] leading-tight mb-1">
                Featured investment opportunities
              </h2>
              <p className="text-[14px] text-[#737370]">
                Verified off-market properties — deduplicated, structured, investor-ready.
              </p>
            </div>
            <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto lg:flex-shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => tab.redirect ? router.push('/marketplace') : setActiveTab(tab.value)}
                    className={`min-h-[44px] px-4 rounded border text-[13px] font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.value && !tab.redirect
                        ? 'bg-[#D03839] border-[#D03839] text-white'
                        : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {canScroll && (
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={prev}
                    className="w-11 h-11 rounded-full border border-[#E8E8E4] flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] hover:border-[#1A1816] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    className="w-11 h-11 rounded-full border border-[#E8E8E4] flex items-center justify-center text-[#1A1816] hover:bg-[#FAFAF8] hover:border-[#1A1816] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : displayProperties.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Phone: horizontal swipe snap carousel */}
            <div
              className="sm:hidden -mx-6 px-6 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {allCards.map((p) => (
                <div key={p.id} className="flex-shrink-0 w-[82vw] snap-start">
                  <PropertyCardInner p={p} />
                </div>
              ))}
            </div>

            {/* Tablet: 2-col fade transition grid */}
            <div
              className="hidden sm:grid sm:grid-cols-2 gap-4 lg:hidden"
              style={{ opacity: mobileOpacity, transition: 'opacity 200ms ease' }}
            >
              {(mobileCards.length > 0 ? mobileCards : displayProperties).map((p) => (
                <PropertyCardInner key={p.id} p={p} />
              ))}
            </div>

            {/* Desktop: sliding carousel */}
            <div
              ref={containerRef}
              className="hidden lg:block overflow-hidden"
              onMouseEnter={() => { pausedRef.current = true }}
              onMouseLeave={() => { pausedRef.current = false }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  transform: cardWidth > 0 ? `translateX(-${startIndex * step}px)` : undefined,
                  transition: noAnim ? 'none' : 'transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  willChange: 'transform',
                }}
              >
                {allCards.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      flexShrink: 0,
                      width: cardWidth > 0 ? `${cardWidth}px` : 'calc(25% - 12px)',
                    }}
                  >
                    <PropertyCardInner p={p} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Browse all */}
        <div className="text-center mt-10">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 h-11 px-8 border border-[#D03839] text-[#D03839] text-[14px] font-semibold rounded hover:bg-[#FEF0EF] transition-colors"
          >
            Browse all deals →
          </Link>
        </div>
      </div>
    </section>
  )
}
