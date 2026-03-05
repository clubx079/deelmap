'use client'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { supabaseMarketplace } from '@/lib/supabase'

export function FilterBar({ filters, onFiltersChange, searchQuery, onSearchChange }) {
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [availableStates, setAvailableStates] = useState([])
  
  // Dropdown states
  const [showPriceDropdown, setShowPriceDropdown] = useState(false)
  const [showCapRateDropdown, setShowCapRateDropdown] = useState(false)
  const [showBedsBathsDropdown, setShowBedsBathsDropdown] = useState(false)
  
  // Temporary filter values (before Apply is clicked)
  const [tempPrice, setTempPrice] = useState({ min: filters.minPrice || '', max: filters.maxPrice || '' })
  const [tempCapRate, setTempCapRate] = useState({ min: filters.minCapRate || '', max: filters.maxCapRate || '' })
  const [tempBedsBaths, setTempBedsBaths] = useState({ 
    minBeds: filters.minBeds || '', 
    minBaths: filters.minBaths || '' 
  })
  
  const [tempFilters, setTempFilters] = useState({
    states: filters.states || [],
    minPrice: filters.minPrice || '',
    maxPrice: filters.maxPrice || '',
    minBeds: filters.minBeds || '',
    maxBeds: filters.maxBeds || '',
    minBaths: filters.minBaths || '',
    maxBaths: filters.maxBaths || '',
    minFloorArea: filters.minFloorArea || '',
    maxFloorArea: filters.maxFloorArea || '',
    minGrossYield: filters.minGrossYield || '',
    maxGrossYield: filters.maxGrossYield || '',
    minCapRate: filters.minCapRate || '',
    maxCapRate: filters.maxCapRate || '',
    minCashOnCash: filters.minCashOnCash || '',
    maxCashOnCash: filters.maxCashOnCash || ''
  })

  // Refs for closing dropdowns on outside click
  const priceDropdownRef = useRef(null)
  const capRateDropdownRef = useRef(null)
  const bedsBathsDropdownRef = useRef(null)

  const STATE_NAMES = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  }

  useEffect(() => {
    fetchAvailableStates()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target)) {
        setShowPriceDropdown(false)
      }
      if (capRateDropdownRef.current && !capRateDropdownRef.current.contains(event.target)) {
        setShowCapRateDropdown(false)
      }
      if (bedsBathsDropdownRef.current && !bedsBathsDropdownRef.current.contains(event.target)) {
        setShowBedsBathsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAvailableStates = async () => {
    try {
      const { data, error } = await supabaseMarketplace
        .from('wholesale_deals')
        .select('state')
        .not('state', 'is', null)

      if (error) {
        console.error('Error fetching states:', error)
        return
      }

      const uniqueStates = [...new Set(data.map(item => item.state))]
        .filter(state => state)
        .sort()
        .map(stateCode => ({
          value: stateCode,
          label: STATE_NAMES[stateCode] || stateCode
        }))

      setAvailableStates(uniqueStates)
    } catch (err) {
      console.error('Error fetching available states:', err)
    }
  }

  const applyPriceFilter = () => {
    onFiltersChange({
      ...filters,
      minPrice: tempPrice.min ? parseInt(tempPrice.min) : undefined,
      maxPrice: tempPrice.max ? parseInt(tempPrice.max) : undefined
    })
    setShowPriceDropdown(false)
  }

  const applyCapRateFilter = () => {
    onFiltersChange({
      ...filters,
      minCapRate: tempCapRate.min ? parseFloat(tempCapRate.min) : undefined,
      maxCapRate: tempCapRate.max ? parseFloat(tempCapRate.max) : undefined
    })
    setShowCapRateDropdown(false)
  }

  const applyBedsBathsFilter = () => {
    onFiltersChange({
      ...filters,
      minBeds: tempBedsBaths.minBeds ? parseInt(tempBedsBaths.minBeds) : undefined,
      minBaths: tempBedsBaths.minBaths ? parseFloat(tempBedsBaths.minBaths) : undefined
    })
    setShowBedsBathsDropdown(false)
  }

  const applyFilters = () => {
    onFiltersChange({
      ...filters,
      states: tempFilters.states,
      // Price, beds, baths, and cap rate are handled by main page dropdowns, so preserve existing values
      minFloorArea: tempFilters.minFloorArea ? parseInt(tempFilters.minFloorArea) : undefined,
      maxFloorArea: tempFilters.maxFloorArea ? parseInt(tempFilters.maxFloorArea) : undefined,
      minGrossYield: tempFilters.minGrossYield ? parseFloat(tempFilters.minGrossYield) : undefined,
      maxGrossYield: tempFilters.maxGrossYield ? parseFloat(tempFilters.maxGrossYield) : undefined,
      // Cap rate is handled by main page dropdown, so preserve existing value
      minCashOnCash: tempFilters.minCashOnCash ? parseFloat(tempFilters.minCashOnCash) : undefined,
      maxCashOnCash: tempFilters.maxCashOnCash ? parseFloat(tempFilters.maxCashOnCash) : undefined
    })
    setShowAllFilters(false)
  }

  const resetFilters = () => {
    setTempFilters({
      states: [],
      minPrice: '',
      maxPrice: '',
      minBeds: '',
      maxBeds: '',
      minBaths: '',
      maxBaths: '',
      minFloorArea: '',
      maxFloorArea: '',
      minGrossYield: '',
      maxGrossYield: '',
      minCapRate: '',
      maxCapRate: '',
      minCashOnCash: '',
      maxCashOnCash: ''
    })
  }

  const hasActiveFilters = filters.states?.length > 0 || filters.minPrice || filters.maxPrice ||
    filters.minBeds || filters.maxBeds || filters.minBaths || filters.maxBaths ||
    filters.minFloorArea || filters.maxFloorArea || filters.minGrossYield || filters.maxGrossYield ||
    filters.minCapRate || filters.maxCapRate || filters.minCashOnCash || filters.maxCashOnCash

  const hasPriceFilter = filters.minPrice || filters.maxPrice
  const hasCapRateFilter = filters.minCapRate || filters.maxCapRate
  const hasBedsBathsFilter = filters.minBeds || filters.minBaths

  return (
    <>
      <div className="bg-slate-50 border-b border-gray-200 fixed top-20 left-0 right-0 z-40 shadow-sm">
        <div className="w-full px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-1 lg:gap-4">
              {/* Search Bar */}
              <div className="w-full lg:w-80">
                <input
                  type="text"
                  placeholder="Search by address, market, or zip code"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2] focus:outline-none"
                />
              </div>

              {/* Price Range Dropdown */}
              <div className="flex-1 lg:flex-none relative" ref={priceDropdownRef}>
                <button
                  onClick={() => {
                    setShowPriceDropdown(!showPriceDropdown)
                    setShowCapRateDropdown(false)
                    setShowBedsBathsDropdown(false)
                    setTempPrice({ min: filters.minPrice || '', max: filters.maxPrice || '' })
                  }}
                  className={`w-full justify-center lg:w-auto flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-lg border transition-all text-xs lg:text-sm font-medium whitespace-nowrap ${
                    hasPriceFilter
                      ? 'bg-[#4A90E2] border-[#4A90E2] text-white hover:bg-[#357ABD]'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Price Range
                  <ChevronDown className={`w-3 h-3 lg:w-4 lg:h-4 transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showPriceDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Price</label>
                        <input
                          type="number"
                          placeholder="$ 0"
                          value={tempPrice.min}
                          onChange={(e) => setTempPrice({ ...tempPrice, min: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Price</label>
                        <input
                          type="number"
                          placeholder="$ 10,000,000"
                          value={tempPrice.max}
                          onChange={(e) => setTempPrice({ ...tempPrice, max: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                        />
                      </div>
                      <button
                        onClick={applyPriceFilter}
                        className="w-full px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#357ABD] transition-colors text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Beds/Baths Dropdown */}
              <div className="flex-1 lg:flex-none relative" ref={bedsBathsDropdownRef}>
                <button
                  onClick={() => {
                    setShowBedsBathsDropdown(!showBedsBathsDropdown)
                    setShowPriceDropdown(false)
                    setShowCapRateDropdown(false)
                    setTempBedsBaths({
                      minBeds: filters.minBeds || '',
                      minBaths: filters.minBaths || ''
                    })
                  }}
                  className={`w-full justify-center lg:w-auto flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-lg border transition-all text-xs lg:text-sm font-medium whitespace-nowrap ${
                    hasBedsBathsFilter
                      ? 'bg-[#4A90E2] border-[#4A90E2] text-white hover:bg-[#357ABD]'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Beds / Baths
                  <ChevronDown className={`w-3 h-3 lg:w-4 lg:h-4 transition-transform ${showBedsBathsDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showBedsBathsDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Beds</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBeds: tempBedsBaths.minBeds === n.toString() ? '' : n.toString() })}
                              className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm ${
                                tempBedsBaths.minBeds === n.toString()
                                  ? 'bg-[#4A90E2] text-white border-[#4A90E2]'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {n}+
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Baths</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBaths: tempBedsBaths.minBaths === n.toString() ? '' : n.toString() })}
                              className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm ${
                                tempBedsBaths.minBaths === n.toString()
                                  ? 'bg-[#4A90E2] text-white border-[#4A90E2]'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {n}+
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={applyBedsBathsFilter}
                        className="w-full px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#357ABD] transition-colors text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cap Rate Dropdown - desktop only */}
              <div className="hidden lg:block relative" ref={capRateDropdownRef}>
                <button
                  onClick={() => {
                    setShowCapRateDropdown(!showCapRateDropdown)
                    setShowPriceDropdown(false)
                    setShowBedsBathsDropdown(false)
                    setTempCapRate({ min: filters.minCapRate || '', max: filters.maxCapRate || '' })
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium whitespace-nowrap ${
                    hasCapRateFilter
                      ? 'bg-[#4A90E2] border-[#4A90E2] text-white hover:bg-[#357ABD]'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cap Rate
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCapRateDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCapRateDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-50">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Cap Rate (%)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={tempCapRate.min}
                          onChange={(e) => setTempCapRate({ ...tempCapRate, min: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Cap Rate (%)</label>
                        <input
                          type="number"
                          placeholder="25"
                          value={tempCapRate.max}
                          onChange={(e) => setTempCapRate({ ...tempCapRate, max: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                        />
                      </div>
                      <button
                        onClick={applyCapRateFilter}
                        className="w-full px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#357ABD] transition-colors text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* All Filters */}
              <button
                onClick={() => setShowAllFilters(true)}
                className={`flex-1 lg:flex-none w-full justify-center lg:w-auto flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-lg border transition-all text-xs lg:text-sm font-medium whitespace-nowrap ${
                  hasActiveFilters
                    ? 'bg-[#4A90E2] border-[#4A90E2] text-white hover:bg-[#357ABD]'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3 lg:w-4 lg:h-4" />
                All Filters
              </button>
          </div>
        </div>
      </div>

      {/* All Filters Modal */}
      {showAllFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">All Filters</h2>
              <button
                onClick={() => setShowAllFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* States */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">States</h3>
                <div className="grid grid-cols-4 gap-3">
                  {availableStates.map((state) => (
                    <label key={state.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempFilters.states.includes(state.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTempFilters({
                              ...tempFilters,
                              states: [...tempFilters.states, state.value]
                            })
                          } else {
                            setTempFilters({
                              ...tempFilters,
                              states: tempFilters.states.filter(s => s !== state.value)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2]"
                      />
                      <span className="text-sm text-gray-700">{state.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Square Footage */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Square Footage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={tempFilters.minFloorArea}
                      onChange={(e) => setTempFilters({ ...tempFilters, minFloorArea: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum</label>
                    <input
                      type="number"
                      placeholder="No max"
                      value={tempFilters.maxFloorArea}
                      onChange={(e) => setTempFilters({ ...tempFilters, maxFloorArea: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                    />
                  </div>
                </div>
              </div>

              {/* Investment Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Metrics</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gross yield (%)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempFilters.minGrossYield}
                        onChange={(e) => setTempFilters({ ...tempFilters, minGrossYield: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempFilters.maxGrossYield}
                        onChange={(e) => setTempFilters({ ...tempFilters, maxGrossYield: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cash on cash (%)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={tempFilters.minCashOnCash}
                        onChange={(e) => setTempFilters({ ...tempFilters, minCashOnCash: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={tempFilters.maxCashOnCash}
                        onChange={(e) => setTempFilters({ ...tempFilters, maxCashOnCash: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A90E2] focus:border-[#4A90E2]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <button
                onClick={resetFilters}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Clear all
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllFilters(false)}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-2.5 rounded-lg bg-[#4A90E2] text-white hover:bg-[#357ABD] transition-all text-sm font-medium"
                >
                  Show properties
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
