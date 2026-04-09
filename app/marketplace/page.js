'use client'
import { useState, useEffect, useRef } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { FilterBar } from '@/components/property/FilterBar'
import { PropertyMap } from '@/components/property/PropertyMap'
import PropertyCard from '@/components/property/PropertyCard'
import { useProperties } from '@/hooks/useProperties'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { Button } from '@/components/ui/Button'
import { ChevronDown, Map, List } from 'lucide-react'

export default function DealsPage() {
  const { user } = useAuth()
  const { loadFavorites } = useFavorites()
  const [mapPins, setMapPins] = useState([])

  const [filters, setFilters] = useState({
    states: [],
    propertyTypes: [],
    statuses: ['all'], // Show all properties by default
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
    maxCashOnCash: undefined
  })

  const [selectedProperty, setSelectedProperty] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const sortDropdownRef = useRef(null)
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'price-low', 'price-high'
  const [mobileView, setMobileView] = useState('map') // 'map' | 'list'
  const [searchQuery, setSearchQuery] = useState('')
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
    pageSize: 30,
    authToken: user?.id ? `Bearer ${user.id}` : undefined
  })
  const handleMarkerClick = (property) => setSelectedProperty(property)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'roi', label: 'Highest ROI' },
  ]
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Newest'
  const handleFiltersChange = (newFilters) => setFilters(newFilters)

  // Fetch map pins with current filters — abort previous in-flight request on each change
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
    if (filters.maxCapRate > 0) params.append('maxCapRate', filters.maxCapRate)
    if (filters.minCashOnCash > 0) params.append('minCashOnCash', filters.minCashOnCash)
    if (filters.maxCashOnCash > 0) params.append('maxCashOnCash', filters.maxCashOnCash)
    if (filters.propertyTypes?.length > 0) params.append('propertyTypes', filters.propertyTypes.join(','))
    if (searchQuery?.trim()) params.append('searchQuery', searchQuery.trim())

    const qs = params.toString()
    fetch(`/api/deals/map${qs ? `?${qs}` : ''}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { if (data.success) setMapPins(data.pins) })
      .catch(err => { if (err.name !== 'AbortError') console.error('Map fetch error:', err) })

    return () => controller.abort()
  }, [JSON.stringify(filters), searchQuery])

  // Load favorites when properties change
  useEffect(() => {
    if (user && properties.length > 0) {
      const propertyIds = properties.map(p => p.id)
      loadFavorites(propertyIds)
    }
  }, [user, properties, loadFavorites])

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

  const visibleProperties = mapBounds && mapPins.length > 0
    ? mapPins.filter(p => isInBounds(p, mapBounds))
    : properties

  const resultCount = mapBounds && mapPins.length > 0
    ? visibleProperties.length
    : (typeof totalCount === 'number' ? totalCount : properties.length)

  const RightHeader = () => (
    <div className="px-5 py-4 border-b border-[#E8E8E4] bg-white">
      <h1 className="text-[22px] font-bold text-[#1A1816] mb-0.5">Investment Properties</h1>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#737370]">{resultCount.toLocaleString()} opportunities available</p>
        <div className="relative flex items-center gap-2" ref={sortDropdownRef}>
          <span className="text-[13px] font-medium text-[#1A1816]">Sort:</span>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 h-9 px-3 bg-white border border-[#E8E8E4] rounded-lg text-[13px] font-semibold text-[#1A1816] hover:border-[#1A1816] transition-colors"
          >
            {sortLabel}
            <ChevronDown className={`w-3.5 h-3.5 text-[#737370] transition-transform duration-200 ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showSortDropdown && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-52 overflow-hidden">
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
        <Button
          onClick={refetch}
          className="mt-4"
          variant="primary"
        >
          Try Again
        </Button>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-[#737370]">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold text-[#1A1816] mb-2">No properties found</h3>
        <p>Try adjusting your filters to see more results.</p>
      </div>
    </div>
  )

  // Removed MapBlurOverlay - no login popup on map

  return (
    <>
      {/* Fixed elements - outside scrollable container */}
      <Navbar />
      
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Toggle bar — fixed below filterbar */}
        <div className="fixed top-[192px] left-0 right-0 z-30 bg-white border-b border-[#E8E8E4] px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center bg-[#F3F3F0] rounded p-0.5 gap-0.5">
            <button
              onClick={() => setMobileView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-all ${
                mobileView === 'map' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370]'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Map
            </button>
            <button
              onClick={() => setMobileView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-all ${
                mobileView === 'list' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Listings
            </button>
          </div>
          <p className="text-[12px] text-[#737370]">{resultCount.toLocaleString()} deals</p>
        </div>

        {/* Map view */}
        {mobileView === 'map' && (
          <div className="fixed inset-0 top-[240px]">
            <PropertyMap
              properties={mapPins.length > 0 ? mapPins : properties}
              onMarkerClick={handleMarkerClick}
              onBoundsChange={setMapBounds}
              selectedProperty={selectedProperty}
              filters={filters}
              isLoggedIn={!!user}
            />
          </div>
        )}

        {/* List view */}
        {mobileView === 'list' && (
          <div className="fixed inset-0 top-[240px] overflow-y-auto bg-[#FAFAF8]">
            {/* Sort bar */}
            <div className="sticky top-0 z-10 px-4 py-2.5 bg-white border-b border-[#E8E8E4] flex items-center justify-end gap-1.5">
              <span className="text-[12px] text-[#737370]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-[12px] font-semibold text-[#1A1816] border-none bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low–High</option>
                <option value="price-high">Price: High–Low</option>
                <option value="roi">Highest ROI</option>
              </select>
            </div>

            {(loading && properties.length === 0) ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (
              <div className="p-3 grid grid-cols-1 gap-3">
                {visibleProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} isLoggedIn={!!user} layout="vertical" />
                ))}
                {visibleProperties.length === 0 && !loading && !loadingMore && !error && <div><EmptyState /></div>}
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

      {/* Desktop Layout - fixed */}
      <div className="hidden lg:block fixed inset-0 top-[140px] bg-[#FAFAF8] overflow-hidden">
        <div className="flex h-full">
          {/* Map - left */}
          <div className="flex-1 bg-[#FAFAF8] relative min-w-[300px]">
            <PropertyMap
              properties={mapPins.length > 0 ? mapPins : properties}
              onMarkerClick={handleMarkerClick}
              onBoundsChange={setMapBounds}
              selectedProperty={selectedProperty}
              filters={filters}
              isLoggedIn={!!user}
            />
          </div>

          {/* Listings - right */}
          <div className="flex flex-col bg-white border-l border-[#E8E8E4] flex-shrink-0 w-[680px]">
            <RightHeader />

            {(loading && properties.length === 0) ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (() => {
              return (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
                <div className="space-y-4">
                  {visibleProperties.map((p) => <PropertyCard key={p.id} property={p} isLoggedIn={!!user} layout="horizontal" />)}
                </div>
                {visibleProperties.length === 0 && !loading && !loadingMore && !error && <EmptyState />}
                {!mapBounds && hasMore && properties.length > 0 && (
                  <div className="py-4 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2.5 bg-[#D03839] hover:bg-[#E0493B] active:bg-[#C73022] disabled:opacity-50 text-white text-[13px] font-semibold rounded transition-all flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Loading...
                        </>
                      ) : (
                        `Load More (${properties.length} of ${totalCount || '?'})`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
            })()}
          </div>
        </div>
      </div>

    </>
  )
}