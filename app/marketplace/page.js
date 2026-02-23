'use client'
import { useState, useEffect } from 'react'
import { Map, LayoutGrid } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { FilterBar } from '@/components/property/FilterBar'
import { PropertyMap } from '@/components/property/PropertyMap'
import PropertyCard from '@/components/property/PropertyCard'
import { RegistrationModal } from '@/components/RegistrationModal'
import { useProperties } from '@/hooks/useProperties'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { Button } from '@/components/ui/Button'

export default function DealsPage() {
  const { user } = useAuth()
  const { loadFavorites } = useFavorites()
  const [filters, setFilters] = useState({
    states: [],
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
  const [viewMode, setViewMode] = useState('list')
  const [mobileTab, setMobileTab] = useState('list') // 'list' or 'map'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'price-low', 'price-high'
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
  } = useProperties({ filters, sortBy, searchQuery })
  const [showAuth, setShowAuth] = useState(false)
  const [authInitialStep, setAuthInitialStep] = useState('signup')

  const handleMarkerClick = (property) => setSelectedProperty(property)
  const handleFiltersChange = (newFilters) => setFilters(newFilters)

  // Load favorites when properties change
  useEffect(() => {
    if (user && properties.length > 0) {
      const propertyIds = properties.map(p => p.id)
      loadFavorites(propertyIds)
    }
  }, [user, properties, loadFavorites])

  // Listen for auth modal trigger from PropertyCard
  useEffect(() => {
    const handleShowAuth = (event) => {
      setAuthInitialStep(event.detail?.step || 'signin')
      setShowAuth(true)
    }
    window.addEventListener('showAuth', handleShowAuth)
    return () => window.removeEventListener('showAuth', handleShowAuth)
  }, [])

  const resultCount = typeof totalCount === 'number'
    ? totalCount
    : properties.length

  const RightHeader = () => (
    <div className="px-4 py-2 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-normal text-gray-900">Properties</h1>
          <span className="text-base font-semibold text-slate-900">
            ({resultCount.toLocaleString()})
          </span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] bg-white"
        >
          <option value="newest">Newest</option>
          <option value="price-low">Low to High</option>
          <option value="price-high">High to Low</option>
        </select>
      </div>
    </div>
  )

  const MobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-normal text-gray-900">Properties</h1>
            <span className="text-sm font-semibold text-slate-900">
              ({resultCount.toLocaleString()})
            </span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#b29578] focus:border-[#b29578] bg-white"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Low to High</option>
            <option value="price-high">High to Low</option>
          </select>
        </div>
      </div>
      
      {/* Mobile Tabs */}
      <div className="flex">
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border-b-2 transition-colors ${
            mobileTab === 'list'
              ? 'border-[#b29578] text-[#b29578] bg-[#b29578]/5'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="font-medium">List</span>
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border-b-2 transition-colors ${
            mobileTab === 'map'
              ? 'border-[#b29578] text-[#b29578] bg-[#b29578]/5'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Map className="h-4 w-4" />
          <span className="font-medium">Map</span>
        </button>
      </div>
    </div>
  )

  const LoadingState = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#b29578' }}></div>
        <p className="text-gray-600">Loading properties...</p>
      </div>
    </div>
  )

  const ErrorState = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-lg font-semibold mb-2">Unable to Load Properties</div>
        <p className="text-gray-600 mb-4">{error}</p>
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
      <div className="text-center text-gray-500">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold mb-2">No properties found</h3>
        <p>Try adjusting your filters to see more results.</p>
      </div>
    </div>
  )

  // Removed MapBlurOverlay - no login popup on map

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Add padding to account for fixed Navbar + FilterBar */}
        <div className="pt-[144px]"> {/* 80px (navbar) + 64px (filterbar) */}
        
        {/* Mobile Layout */}
        <div className="lg:hidden">
          <MobileHeader />

          <div className="h-[calc(100vh-200px)] relative">
            {mobileTab === 'list' ? (
              <div className="h-full bg-white">
                {loading ? (
                  <LoadingState />
                ) : error ? (
                  <ErrorState />
                ) : (
                  <div className="h-full overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
                    <div className="space-y-4">
                      {properties.map((p) => (
                        <div key={p.id} className="w-full">
                          <PropertyCard property={p} isLoggedIn={!!user} />
                        </div>
                      ))}
                    </div>
                    {properties.length === 0 && <EmptyState />}
                    {hasMore && !loading && (
                      <div className="pt-4">
                        <Button
                          onClick={loadMore}
                          className="w-full"
                          variant="secondary"
                          disabled={loadingMore}
                        >
                          {loadingMore ? 'Loading more...' : 'Load more'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full relative">
                <PropertyMap
                  properties={properties}
                  onMarkerClick={handleMarkerClick}
                  selectedProperty={selectedProperty}
                  filters={filters}
                  isLoggedIn={!!user}
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block h-[calc(100vh-120px)] relative">
          <div className="flex h-full">
            <div className="flex-1 border-r border-gray-200 bg-gray-50 relative">
                <PropertyMap
                  properties={properties}
                onMarkerClick={handleMarkerClick}
                selectedProperty={selectedProperty}
                filters={filters}
                isLoggedIn={!!user}
              />
            </div>

            <div className="w-[420px] flex flex-col bg-white">
              <RightHeader />

              {loading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState />
              ) : (
                <div className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
                  <div className="space-y-4">
                    {properties.map((p) => <PropertyCard key={p.id} property={p} isLoggedIn={!!user} />)}
                  </div>
                  {properties.length === 0 && <EmptyState />}
                  {hasMore && !loading && (
                    <div className="pt-4">
                      <Button
                        onClick={loadMore}
                        className="w-full"
                        variant="secondary"
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Loading more...' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </div> {/* Close padding div */}
      </div>

      {/* Auth Modal */}
      <RegistrationModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialStep={authInitialStep}
      />
    </>
  )
}