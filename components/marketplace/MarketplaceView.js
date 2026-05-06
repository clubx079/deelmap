'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { FilterBar } from '@/components/property/FilterBar'
import { PropertyMap } from '@/components/property/PropertyMap'
import PropertyCard from '@/components/property/PropertyCard'
import { useProperties } from '@/hooks/useProperties'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { Button } from '@/components/ui/Button'
import { ChevronDown, Map, List } from 'lucide-react'

const STATE_TO_ABBR = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC',
}
const normalizeStateToAbbr = (s) => {
  if (!s) return null
  const lower = s.trim().toLowerCase()
  if (lower.length === 2) return lower.toUpperCase()
  return STATE_TO_ABBR[lower] || null
}

function parseSearchString(s) {
  if (!s) return null
  const commaIdx = s.indexOf(',')
  if (commaIdx > 0) {
    return { city: s.substring(0, commaIdx).trim(), state: s.substring(commaIdx + 1).trim() }
  }
  return { city: '', state: s.trim() }
}

function MarketplaceViewInner({ defaultSearch = '' }) {
  const { user } = useAuth()
  const { loadFavorites } = useFavorites()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mapPins, setMapPins] = useState([])

  const initialSearch = searchParams?.get('search') || defaultSearch

  const [filters, setFilters] = useState({
    states: [],
    propertyTypes: [],
    listingType: undefined,
    listingStatus: 'active',
    minPrice: undefined,
    maxPrice: undefined,
    minBeds: undefined,
    maxBeds: undefined,
    minBaths: undefined,
    maxBaths: undefined,
    minFloorArea: undefined,
    maxFloorArea: undefined,
    minGrossYield: undefined,
    maxGrossYield: undefined,
    minCapRate: undefined,
    maxCapRate: undefined,
    minCashOnCash: undefined,
    maxCashOnCash: undefined,
    isHighlighted: false,
    isBoosted: false,
    isHomepageFeatured: false,
  })

  const [selectedProperty, setSelectedProperty] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortDropdownRef = useRef(null)
  const [showMobileSortDropdown, setShowMobileSortDropdown] = useState(false)
  const mobileSortRef = useRef(null)
  const [sortBy, setSortBy] = useState('recommended')
  const [mobileView, setMobileView] = useState('map')
  const [searchQuery, setSearchQuery] = useState(() => initialSearch)
  const [searchLocation, setSearchLocation] = useState(() => parseSearchString(initialSearch))

  const {
    properties,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refetch
  } = useProperties({
    filters,
    sortBy,
    searchQuery,
    pageSize: 1000,
    authToken: user?.id ? `Bearer ${user.id}` : undefined
  })

  const handleMarkerClick = (property) => setSelectedProperty(property)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false)
      }
      if (mobileSortRef.current && !mobileSortRef.current.contains(e.target)) {
        setShowMobileSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const SORT_OPTIONS = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'roi', label: 'Highest ROI' },
  ]
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Recommended'
  const handleFiltersChange = (newFilters) => setFilters(newFilters)

  const handleRemoveBoundary = () => {
    setSearchLocation(null)
    setSearchQuery('')
    router.replace('/marketplace')
  }

  const filterPinsByLocation = (pins) => {
    if (!searchLocation?.state && !searchLocation?.city) return pins
    const targetAbbr = normalizeStateToAbbr(searchLocation.state)
    return pins.filter(p => {
      if (targetAbbr) {
        const pState = (p.state || '').toUpperCase().trim()
        if (pState !== targetAbbr) return false
      }
      if (searchLocation.city) {
        const pCity = (p.city || '').toLowerCase().trim()
        const searchCity = searchLocation.city.toLowerCase().trim()
        if (!pCity.includes(searchCity) && !searchCity.includes(pCity)) return false
      }
      return true
    })
  }

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (filters.states?.length > 0) params.append('states', filters.states.join(','))
    if (filters.minPrice > 0) params.append('minPrice', filters.minPrice)
    if (filters.maxPrice > 0) params.append('maxPrice', filters.maxPrice)
    if (filters.minBeds > 0) params.append('minBedrooms', filters.minBeds)
    if (filters.maxBeds > 0) params.append('maxBedrooms', filters.maxBeds)
    if (filters.minBaths > 0) params.append('minBathrooms', filters.minBaths)
    if (filters.maxBaths > 0) params.append('maxBathrooms', filters.maxBaths)
    if (filters.minFloorArea > 0) params.append('minSqft', filters.minFloorArea)
    if (filters.maxFloorArea > 0) params.append('maxSqft', filters.maxFloorArea)
    if (filters.minGrossYield > 0) params.append('minYield', filters.minGrossYield)
    if (filters.maxGrossYield > 0) params.append('maxYield', filters.maxGrossYield)
    if (filters.minCapRate > 0) params.append('minCapRate', filters.minCapRate)
    if (filters.minCashOnCash > 0) params.append('minCashOnCash', filters.minCashOnCash)
    if (filters.propertyTypes?.length > 0) params.append('propertyTypes', filters.propertyTypes.join(','))
    if (filters.listingType && filters.listingType !== 'all') params.append('listingType', filters.listingType)
    if (searchQuery?.trim()) params.append('searchQuery', searchQuery.trim())
    const qs = params.toString()
    fetch(`/api/deals/map${qs ? `?${qs}` : ''}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { if (data.success) setMapPins(data.pins) })
      .catch(err => { if (err.name !== 'AbortError') console.error('Map fetch error:', err) })
    return () => controller.abort()
  }, [JSON.stringify(filters), searchQuery])

  useEffect(() => {
    if (user && properties.length > 0) {
      const propertyIds = properties.map(p => p.id)
      loadFavorites(propertyIds)
    }
  }, [user, properties, loadFavorites])

  const [nearbyProperties, setNearbyProperties] = useState([])
  useEffect(() => {
    if (loading || properties.length > 0 || !searchLocation) {
      setNearbyProperties([])
      return
    }
    const stateAbbr = normalizeStateToAbbr(searchLocation.state)
    if (!stateAbbr) return
    const params = new URLSearchParams()
    params.append('page', '1')
    params.append('limit', '8')
    params.append('sortBy', 'newest')
    params.append('states', stateAbbr)
    params.append('listingType', 'wholesale')
    fetch(`/api/deals?${params}`)
      .then(r => r.json())
      .then(data => setNearbyProperties(data.properties || []))
      .catch(() => setNearbyProperties([]))
  }, [loading, properties.length, searchLocation?.state])

  const isInBounds = (property, bounds) => {
    if (!bounds) return true
    let lat = parseFloat(property.address_google_lat)
    let lng = parseFloat(property.address_google_lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      lat = parseFloat(property.latitude)
      lng = parseFloat(property.longitude)
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true
    return bounds.contains({ lat, lng })
  }

  const locationFilteredPins = filterPinsByLocation(mapPins.length > 0 ? mapPins : properties)

  const visibleProperties = (() => {
    let list = mapBounds && properties.length > 0
      ? properties.filter(p => isInBounds(p, mapBounds))
      : properties
    list = filterPinsByLocation(list)
    if (sortBy === 'recommended') return [...list].sort((a, b) => {
      const aAuction = a.listing_type === 'auction' ? 1 : 0
      const bAuction = b.listing_type === 'auction' ? 1 : 0
      return aAuction - bAuction
    })
    if (sortBy === 'price-low') return [...list].sort((a, b) => (a.price || 0) - (b.price || 0))
    if (sortBy === 'price-high') return [...list].sort((a, b) => (b.price || 0) - (a.price || 0))
    if (sortBy === 'roi') return [...list].sort((a, b) => (b.gross_yield || b.cap_rate || 0) - (a.gross_yield || a.cap_rate || 0))
    return list
  })()

  const resultCount = visibleProperties.length

  const RightHeader = () => (
    <div className="px-5 py-4 border-b border-[#E8E8E4] bg-white">
      <h1 className="text-[22px] font-bold text-[#1A1816] mb-0.5">Investment Properties</h1>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#737370]">{resultCount.toLocaleString()} opportunities available</p>
        <div className="relative flex items-center gap-2" ref={sortDropdownRef}>
          <span className="text-[13px] font-medium text-[#1A1816]">Sort:</span>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 h-9 px-3 bg-white border border-[#E8E8E4] rounded text-[13px] font-semibold text-[#1A1816] hover:border-[#1A1816] transition-colors"
          >
            {sortLabel}
            <ChevronDown className={`w-3.5 h-3.5 text-[#737370] transition-transform duration-200 ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-[#E8E8E4] rounded shadow-xl z-50 w-52 overflow-hidden">
              <div className="px-4 pt-3 pb-1.5 border-b border-[#F0F0EC]">
                <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Sort by</p>
              </div>
              <div className="py-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowSortDropdown(false) }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors hover:bg-[#FAFAF8] ${
                      sortBy === opt.value ? 'font-semibold text-[#1A1816]' : 'text-[#444441]'
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const LoadingState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8E8E4] border-t-[#D03839] mx-auto mb-4"></div>
        <p className="text-[14px] text-[#737370]">Loading properties...</p>
      </div>
    </div>
  )

  const ErrorState = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-[#D03839] text-base font-semibold mb-2">Unable to Load Properties</div>
        <p className="text-[#737370] mb-4">{error}</p>
        <Button onClick={refetch} className="mt-4" variant="primary">Try Again</Button>
      </div>
    </div>
  )

  const EmptyState = ({ layout = 'vertical' }) => {
    const hasNearby = nearbyProperties.length > 0
    const stateAbbr = searchLocation ? normalizeStateToAbbr(searchLocation.state) : null
    const locationLabel = searchQuery || (stateAbbr ? stateAbbr : null)
    if (hasNearby) {
      return (
        <div className="px-4 py-6">
          <div className="mb-5">
            <h3 className="text-[16px] font-bold text-[#1A1816] mb-1">
              No properties found{locationLabel ? ` in "${locationLabel}"` : ''}
            </h3>
            <p className="text-[13px] text-[#737370]">
              Showing available deals{stateAbbr ? ` elsewhere in ${stateAbbr}` : ' nearby'}
            </p>
          </div>
          <div className="space-y-3">
            {nearbyProperties.map(p => (
              <PropertyCard key={p.id} property={p} isLoggedIn={!!user} layout={layout} />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[#737370]">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-[#1A1816] mb-2">
            No properties found{locationLabel ? ` in "${locationLabel}"` : ''}
          </h3>
          <p>Try adjusting your filters to see more results.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchQuery={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); if (!val) { setSearchLocation(null); router.replace('/marketplace') } }}
        onLocationSelect={setSearchLocation}
      />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="fixed top-[192px] left-0 right-0 z-30 bg-white border-b border-[#E8E8E4]">
          {/* Row 1: Map/List toggle + deals count */}
          <div className="px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center bg-[#F3F3F0] rounded p-0.5 gap-0.5">
              <button
                onClick={() => setMobileView('map')}
                className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded text-[13px] font-semibold transition-all ${
                  mobileView === 'map' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370]'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={() => setMobileView('list')}
                className={`flex items-center gap-1.5 px-3 min-h-[44px] rounded text-[13px] font-semibold transition-all ${
                  mobileView === 'list' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Listings
              </button>
            </div>
            <p className="text-[12px] text-[#737370]">{resultCount.toLocaleString()} deals</p>
          </div>
          {/* Row 2: Sort — under the deals count */}
          <div className="relative border-t border-[#F0F0EC] px-4 py-2" ref={mobileSortRef}>
            <button
              onClick={() => setShowMobileSortDropdown(!showMobileSortDropdown)}
              className={`flex items-center gap-2 h-9 px-3 border rounded text-[13px] font-medium transition-colors ${
                showMobileSortDropdown ? 'border-[#1A1816] bg-[#FAFAF8]' : 'border-[#E8E8E4] bg-white'
              } text-[#1A1816]`}
            >
              <span className="text-[#737370] font-normal">Sort:</span>
              <span className="font-semibold">{sortLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#737370] transition-transform duration-200 ${showMobileSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            <div className={`absolute top-full left-0 right-0 bg-white border-t border-b border-[#E8E8E4] shadow-lg z-50 transition-all duration-200 origin-top ${
              showMobileSortDropdown
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}>
              <div className="px-4 pt-3 pb-1.5 border-b border-[#F0F0EC]">
                <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Sort by</p>
              </div>
              <div className="py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setShowMobileSortDropdown(false) }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-[14px] transition-colors active:bg-[#F3F3F0] ${
                      sortBy === opt.value ? 'font-semibold text-[#1A1816] bg-[#FAFAF8]' : 'text-[#444441]'
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-[#D03839] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {mobileView === 'map' && (
          <div className="fixed inset-0 top-[300px]">
            <PropertyMap
              properties={locationFilteredPins}
              onMarkerClick={handleMarkerClick}
              onBoundsChange={setMapBounds}
              selectedProperty={selectedProperty}
              filters={filters}
              isLoggedIn={!!user}
              searchLocation={searchLocation}
              onRemoveBoundary={handleRemoveBoundary}
            />
          </div>
        )}

        {mobileView === 'list' && (
          <div className="fixed inset-0 top-[300px] overflow-y-auto bg-[#FAFAF8]">
            {loading && properties.length > 0 && (
              <div className="h-0.5 bg-[#F0EFEC] overflow-hidden">
                <div className="h-full bg-[#D03839] animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ width: '40%', animation: 'progress-slide 1.2s ease-in-out infinite' }} />
              </div>
            )}
            {(loading && properties.length === 0) ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (
              <div className="p-3 grid grid-cols-1 gap-3">
                {visibleProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} isLoggedIn={!!user} layout="vertical" />
                ))}
                {visibleProperties.length === 0 && !loading && !loadingMore && !error && <div><EmptyState layout="vertical" /></div>}
                {hasMore && properties.length > 0 && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full h-12 border border-[#E8E8E4] rounded text-[14px] font-semibold text-[#1A1816] bg-white hover:bg-[#FAFAF8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading...</>
                    ) : (
                      `Load More (${properties.length} of ${totalCount || '?'})`
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block fixed inset-0 top-[140px] bg-[#FAFAF8] overflow-hidden">
        <div className="flex h-full">
          <div className="flex-1 bg-[#FAFAF8] relative min-w-[300px]">
            <PropertyMap
              properties={locationFilteredPins}
              onMarkerClick={handleMarkerClick}
              onBoundsChange={setMapBounds}
              selectedProperty={selectedProperty}
              filters={filters}
              isLoggedIn={!!user}
              searchLocation={searchLocation}
              onRemoveBoundary={handleRemoveBoundary}
            />
          </div>
          <div className="flex flex-col bg-white border-l border-[#E8E8E4] flex-shrink-0 w-[680px]">
            <RightHeader />
            {loading && properties.length > 0 && (
              <div className="h-0.5 bg-[#F0EFEC] overflow-hidden">
                <div className="h-full bg-[#D03839]" style={{ width: '40%', animation: 'progress-slide 1.2s ease-in-out infinite' }} />
              </div>
            )}
            {(loading && properties.length === 0) ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
                <div className="space-y-4">
                  {visibleProperties.map((p) => <PropertyCard key={p.id} property={p} isLoggedIn={!!user} layout="horizontal" />)}
                </div>
                {visibleProperties.length === 0 && !loading && !loadingMore && !error && <EmptyState layout="horizontal" />}
                {hasMore && properties.length > 0 && (
                  <div className="py-4 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] disabled:opacity-50 text-white text-[13px] font-semibold rounded transition-all flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading...</>
                      ) : (
                        `Load More (${properties.length} of ${totalCount || '?'})`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function MarketplaceView({ defaultSearch = '' }) {
  return (
    <Suspense>
      <MarketplaceViewInner defaultSearch={defaultSearch} />
    </Suspense>
  )
}
