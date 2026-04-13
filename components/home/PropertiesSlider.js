'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useProperties } from '@/hooks/useProperties'
import { getPrimaryPhotoUrl } from '@/utils/propertyPhotos'
import { MapPin } from 'lucide-react'

const TABS = [
  { label: 'All deals', value: 'all' },
  { label: 'Fix & flip', value: 'fix' },
  { label: 'Buy & hold', value: 'hold' },
  { label: 'Wholesale', value: 'wholesale' },
]

const AVATAR_COLORS = ['bg-orange-400', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500']

export function PropertiesSlider() {
  const [activeTab, setActiveTab] = useState('all')
  const [featuredBuyerDeals, setFeaturedBuyerDeals] = useState([])

  const { properties, loading } = useProperties({
    filters: { statuses: ['available'] },
    sortBy: 'newest',
    pageSize: 12,
  })

  useEffect(() => {
    fetch('/api/buyer/listings/featured')
      .then(r => r.json())
      .then(d => setFeaturedBuyerDeals(d.properties || []))
      .catch(() => {})
  }, [])

  const filterByTab = (props) => {
    if (activeTab === 'all') return props
    return props.filter(p => {
      const dt = (p.deal_type || '').toLowerCase()
      if (activeTab === 'fix') return dt.includes('fix') || dt.includes('flip') || dt.includes('rehab')
      if (activeTab === 'hold') return dt.includes('hold') || dt.includes('rental') || dt.includes('buy')
      if (activeTab === 'wholesale') return dt.includes('wholesale')
      return true
    })
  }

  const displayProperties = (() => {
    const featuredFiltered = filterByTab(featuredBuyerDeals)
    const featuredIds = new Set(featuredFiltered.map(p => p.id))
    const regular = filterByTab(properties).filter(p => !featuredIds.has(p.id))
    return [...featuredFiltered, ...regular].slice(0, 4)
  })()

  const formatPrice = (val) => {
    if (!val) return 'Contact for Price'
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
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto lg:flex-shrink-0 pb-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`h-9 px-4 rounded border text-[13px] font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.value
                      ? 'bg-[#D03839] border-[#D03839] text-white'
                      : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : displayProperties.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayProperties.map((p) => {
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
                <div key={p.id} className="bg-white border border-[#E8E8E4] rounded overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">
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
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="relative w-24 h-8">
                          <Image src="/assets/logo.svg" alt="DeelMap" fill className="object-contain opacity-30" />
                        </div>
                      </div>
                    )}
                    {/* Badges */}
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
                    {/* Location */}
                    <div className="flex items-center gap-1 mb-1.5">
                      <MapPin className="w-3 h-3 text-[#A8A8A4] flex-shrink-0" />
                      <span className="text-[12px] text-[#737370] truncate">{cityState || 'Location unavailable'}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold text-[#1A1816] mb-1.5 leading-snug line-clamp-1">{title}</h3>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-3">
                      {sqft && <span>{Number(sqft).toLocaleString()} sq ft</span>}
                      {sqft && beds && <span className="text-[#E8E8E4]">·</span>}
                      {beds && <span>{beds} bed</span>}
                      {beds && baths && <span className="text-[#E8E8E4]">·</span>}
                      {baths && <span>{baths} bath</span>}
                    </div>

                    {/* Price + ARV */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[20px] font-bold text-[#1A1816]">{formatPrice(p.price)}</span>
                      {arv > 0 && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-[#E4F5EC] text-[#0F6E56] border border-[#9FDBB8] rounded whitespace-nowrap">
                          ARV {formatShort(arv)}
                        </span>
                      )}
                    </div>

                    {/* Spread */}
                    {spread > 0 && (
                      <p className="text-[12px] text-[#0F6E56] font-medium mb-3">
                        ↑ ${spread.toLocaleString()} spread potential
                      </p>
                    )}

                    {/* Divider + seller row */}
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
                      <Link
                        href={`/${p.slug || p.id}`}
                        className="text-[12px] font-semibold text-[#D03839] hover:underline"
                      >
                        View deal
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
