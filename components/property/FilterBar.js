'use client'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, SlidersHorizontal, X, Search, Check } from 'lucide-react'
import { supabaseMarketplace } from '@/lib/supabase'

const PROPERTY_TYPES = [
  'Single Family',
  'Multi Family',
  'Duplex',
  'Condo',
  'Townhouse',
  'Commercial',
  'Land',
  'Mobile Home',
]

const PRICE_PRESETS = [
  { label: 'Under $100k', min: 0, max: 100000 },
  { label: '$100k – $250k', min: 100000, max: 250000 },
  { label: '$250k – $500k', min: 250000, max: 500000 },
  { label: '$500k – $1M', min: 500000, max: 1000000 },
  { label: 'Over $1M', min: 1000000, max: undefined },
]

export function FilterBar({ filters, onFiltersChange, searchQuery, onSearchChange }) {
  const [showAllFilters, setShowAllFilters] = useState(false)
  const [availableStates, setAvailableStates] = useState([])

  const [showPropertyTypes, setShowPropertyTypes] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const [showBedsBaths, setShowBedsBaths] = useState(false)

  const [tempPrice, setTempPrice] = useState({ min: filters.minPrice || '', max: filters.maxPrice || '' })
  const [tempBedsBaths, setTempBedsBaths] = useState({ minBeds: filters.minBeds || '', minBaths: filters.minBaths || '' })
  const [tempFilters, setTempFilters] = useState({
    states: filters.states || [],
    propertyTypes: filters.propertyTypes || [],
    minBeds: filters.minBeds || '',
    minBaths: filters.minBaths || '',
    minFloorArea: filters.minFloorArea || '',
    maxFloorArea: filters.maxFloorArea || '',
    minGrossYield: filters.minGrossYield || '',
    maxGrossYield: filters.maxGrossYield || '',
    minCapRate: filters.minCapRate || '',
    maxCapRate: filters.maxCapRate || '',
    minCashOnCash: filters.minCashOnCash || '',
    maxCashOnCash: filters.maxCashOnCash || '',
  })

  const propertyTypesRef = useRef(null)
  const priceRef = useRef(null)
  const mobilePriceRef = useRef(null)
  const mobileBedsBathsRef = useRef(null)
  const bedsBathsRef = useRef(null)

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

  useEffect(() => { fetchAvailableStates() }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (propertyTypesRef.current && !propertyTypesRef.current.contains(e.target)) setShowPropertyTypes(false)
      if (priceRef.current && !priceRef.current.contains(e.target) && mobilePriceRef.current && !mobilePriceRef.current.contains(e.target)) setShowPrice(false)
      if (bedsBathsRef.current && !bedsBathsRef.current.contains(e.target) && mobileBedsBathsRef.current && !mobileBedsBathsRef.current.contains(e.target)) setShowBedsBaths(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAvailableStates = async () => {
    try {
      const { data, error } = await supabaseMarketplace
        .from('wholesale_deals').select('state').not('state', 'is', null)
      if (error) return
      const uniqueStates = [...new Set(data.map(i => i.state))].filter(Boolean).sort()
        .map(code => ({ value: code, label: STATE_NAMES[code] || code }))
      setAvailableStates(uniqueStates)
    } catch {}
  }

  const closeAll = () => { setShowPropertyTypes(false); setShowPrice(false); setShowBedsBaths(false) }

  const applyPrice = () => {
    onFiltersChange({
      ...filters,
      minPrice: tempPrice.min !== '' ? parseInt(tempPrice.min) : undefined,
      maxPrice: tempPrice.max !== '' ? parseInt(tempPrice.max) : undefined,
    })
    setShowPrice(false)
  }

  const clearPrice = () => {
    setTempPrice({ min: '', max: '' })
    onFiltersChange({ ...filters, minPrice: undefined, maxPrice: undefined })
    setShowPrice(false)
  }

  const applyBedsBaths = () => {
    onFiltersChange({
      ...filters,
      minBeds: tempBedsBaths.minBeds ? parseInt(tempBedsBaths.minBeds) : undefined,
      minBaths: tempBedsBaths.minBaths ? parseFloat(tempBedsBaths.minBaths) : undefined,
    })
    setShowBedsBaths(false)
  }

  const clearBedsBaths = () => {
    setTempBedsBaths({ minBeds: '', minBaths: '' })
    onFiltersChange({ ...filters, minBeds: undefined, minBaths: undefined })
    setShowBedsBaths(false)
  }

  const togglePropertyType = (type) => {
    const current = filters.propertyTypes || []
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
    onFiltersChange({ ...filters, propertyTypes: next })
  }

  const applyAllFilters = () => {
    onFiltersChange({
      ...filters,
      states: tempFilters.states,
      propertyTypes: tempFilters.propertyTypes,
      minBeds: tempFilters.minBeds ? parseInt(tempFilters.minBeds) : undefined,
      minBaths: tempFilters.minBaths ? parseFloat(tempFilters.minBaths) : undefined,
      minFloorArea: tempFilters.minFloorArea ? parseInt(tempFilters.minFloorArea) : undefined,
      maxFloorArea: tempFilters.maxFloorArea ? parseInt(tempFilters.maxFloorArea) : undefined,
      minGrossYield: tempFilters.minGrossYield ? parseFloat(tempFilters.minGrossYield) : undefined,
      maxGrossYield: tempFilters.maxGrossYield ? parseFloat(tempFilters.maxGrossYield) : undefined,
      minCapRate: tempFilters.minCapRate ? parseFloat(tempFilters.minCapRate) : undefined,
      maxCapRate: tempFilters.maxCapRate ? parseFloat(tempFilters.maxCapRate) : undefined,
      minCashOnCash: tempFilters.minCashOnCash ? parseFloat(tempFilters.minCashOnCash) : undefined,
      maxCashOnCash: tempFilters.maxCashOnCash ? parseFloat(tempFilters.maxCashOnCash) : undefined,
    })
    setShowAllFilters(false)
  }

  const resetAllFilters = () => {
    setTempFilters({ states: [], propertyTypes: [], minBeds: '', minBaths: '', minFloorArea: '', maxFloorArea: '', minGrossYield: '', maxGrossYield: '', minCapRate: '', maxCapRate: '', minCashOnCash: '', maxCashOnCash: '' })
  }

  const formatPrice = (val) => {
    if (!val) return ''
    const n = Number(val)
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${Math.round(n / 1000)}k`
    return `$${n}`
  }

  const priceLabel = () => {
    const { minPrice, maxPrice } = filters
    if (!minPrice && !maxPrice) return 'Price'
    if (minPrice && maxPrice) return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
    if (minPrice) return `From ${formatPrice(minPrice)}`
    return `Up to ${formatPrice(maxPrice)}`
  }

  const bedsBathsLabel = () => {
    const { minBeds, minBaths } = filters
    if (!minBeds && !minBaths) return 'Beds/Baths'
    const parts = []
    if (minBeds) parts.push(`${minBeds}+ bd`)
    if (minBaths) parts.push(`${minBaths}+ ba`)
    return parts.join(', ')
  }

  const propertyTypesLabel = () => {
    const types = filters.propertyTypes || []
    if (!types.length) return 'Property Types'
    if (types.length === 1) return types[0]
    return `${types[0]} +${types.length - 1}`
  }

  const hasPriceFilter = filters.minPrice || filters.maxPrice
  const hasBedsBathsFilter = filters.minBeds || filters.minBaths
  const hasPropertyTypesFilter = filters.propertyTypes?.length > 0
  const hasActiveFilters = filters.states?.length > 0 || hasPriceFilter || hasBedsBathsFilter ||
    hasPropertyTypesFilter || filters.minFloorArea || filters.maxFloorArea ||
    filters.minGrossYield || filters.maxGrossYield || filters.minCapRate || filters.maxCapRate ||
    filters.minCashOnCash || filters.maxCashOnCash

  const filterBtn = (active) =>
    `flex items-center gap-2 h-[42px] px-4 border rounded text-[14px] font-medium whitespace-nowrap transition-all cursor-pointer select-none ${
      active
        ? 'bg-[#D03839] border-[#D03839] text-white'
        : 'bg-white border-[#E8E8E4] text-[#1A1816] hover:border-[#1A1816]'
    }`

  return (
    <>
      <div className="bg-white border-b border-[#E8E8E4] fixed top-[80px] left-0 right-0 z-40">
        {/* Mobile layout: search on top, filters below */}
        <div className="lg:hidden px-4 pt-3 pb-2 space-y-2">
          {/* Search row */}
          <div className="flex items-center h-[42px] border border-[#E8E8E4] rounded overflow-hidden w-full focus-within:border-[#1A1816] transition-colors">
            <input
              type="text"
              placeholder="Search markets, cities, or ZIP codes"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="flex-1 h-full px-4 text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none bg-transparent"
            />
            <button className="h-full w-[42px] bg-[#D03839] hover:bg-[#C73022] transition-colors flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Filters row */}
          <div className="flex items-center gap-2 pb-1">
            {/* Price button */}
            <div className="relative" ref={mobilePriceRef}>
              <button
                className={filterBtn(hasPriceFilter)}
                onClick={() => {
                  setShowPrice(!showPrice)
                  setTempPrice({ min: filters.minPrice || '', max: filters.maxPrice || '' })
                }}
              >
                {priceLabel()}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPrice ? 'rotate-180' : ''}`} />
              </button>
              {showPrice && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-80 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 border-b border-[#F0F0EC]">
                    <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Price Range</p>
                  </div>
                  <div className="px-4 py-3 border-b border-[#F0F0EC] flex flex-wrap gap-2">
                    {PRICE_PRESETS.map((p) => {
                      const active = tempPrice.min === String(p.min || '') && tempPrice.max === String(p.max || '')
                      return (
                        <button key={p.label} onClick={() => setTempPrice({ min: p.min || '', max: p.max || '' })}
                          className={`px-3 py-1 rounded-full border text-[12px] font-medium transition-all ${active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider mb-1.5">Min</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] text-[13px]">$</span>
                          <input type="number" placeholder="0" value={tempPrice.min}
                            onChange={(e) => setTempPrice({ ...tempPrice, min: e.target.value })}
                            className="w-full h-10 pl-6 pr-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider mb-1.5">Max</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] text-[13px]">$</span>
                          <input type="number" placeholder="Any" value={tempPrice.max}
                            onChange={(e) => setTempPrice({ ...tempPrice, max: e.target.value })}
                            className="w-full h-10 pl-6 pr-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {hasPriceFilter && (
                        <button onClick={clearPrice} className="flex-1 h-10 border border-[#E8E8E4] rounded-lg text-[13px] font-medium text-[#737370] hover:border-[#C0C0BC] hover:text-[#1A1816] transition-colors">Clear</button>
                      )}
                      <button onClick={applyPrice} className="flex-1 h-10 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors">Apply</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Beds/Baths button */}
            <div className="relative" ref={mobileBedsBathsRef}>
              <button
                className={filterBtn(hasBedsBathsFilter)}
                onClick={() => {
                  setShowBedsBaths(!showBedsBaths)
                  setTempBedsBaths({ minBeds: filters.minBeds || '', minBaths: filters.minBaths || '' })
                }}
              >
                {bedsBathsLabel()}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showBedsBaths ? 'rotate-180' : ''}`} />
              </button>
              {showBedsBaths && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-72 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 border-b border-[#F0F0EC]">
                    <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Beds & Baths</p>
                  </div>
                  <div className="px-4 py-4 space-y-5">
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bedrooms</p>
                      <div className="flex gap-2">
                        {['Any', 1, 2, 3, 4, 5].map((n) => {
                          const val = n === 'Any' ? '' : String(n)
                          const active = tempBedsBaths.minBeds === val
                          return (
                            <button key={n} onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBeds: val })}
                              className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                              {n === 'Any' ? 'Any' : `${n}+`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bathrooms</p>
                      <div className="flex gap-2">
                        {['Any', 1, 2, 3, 4, 5].map((n) => {
                          const val = n === 'Any' ? '' : String(n)
                          const active = tempBedsBaths.minBaths === val
                          return (
                            <button key={n} onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBaths: val })}
                              className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                              {n === 'Any' ? 'Any' : `${n}+`}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {hasBedsBathsFilter && (
                        <button onClick={clearBedsBaths} className="flex-1 h-10 border border-[#E8E8E4] rounded-lg text-[13px] font-medium text-[#737370] hover:border-[#C0C0BC] hover:text-[#1A1816] transition-colors">Clear</button>
                      )}
                      <button onClick={applyBedsBaths} className="flex-1 h-10 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors">Apply</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* All Filters button */}
            <button
              className={filterBtn(hasActiveFilters)}
              onClick={() => {
                closeAll()
                setTempFilters({
                  states: filters.states || [],
                  propertyTypes: filters.propertyTypes || [],
                  minBeds: filters.minBeds || '',
                  minBaths: filters.minBaths || '',
                  minFloorArea: filters.minFloorArea || '',
                  maxFloorArea: filters.maxFloorArea || '',
                  minGrossYield: filters.minGrossYield || '',
                  maxGrossYield: filters.maxGrossYield || '',
                  minCapRate: filters.minCapRate || '',
                  maxCapRate: filters.maxCapRate || '',
                  minCashOnCash: filters.minCashOnCash || '',
                  maxCashOnCash: filters.maxCashOnCash || '',
                })
                setShowAllFilters(true)
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              All Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 bg-white text-[#D03839]">
                  {[hasPriceFilter, hasBedsBathsFilter, hasPropertyTypesFilter, filters.states?.length > 0, filters.minFloorArea || filters.maxFloorArea, filters.minCapRate || filters.maxCapRate, filters.minGrossYield || filters.maxGrossYield, filters.minCashOnCash || filters.maxCashOnCash].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop layout: all in one row */}
        <div className="hidden lg:flex w-full px-10 py-3 items-center gap-3">

          {/* Search */}
          <div className="flex items-center h-[42px] border border-[#E8E8E4] rounded overflow-hidden w-[480px] flex-none focus-within:border-[#1A1816] transition-colors">
            <input
              type="text"
              placeholder="Search markets, cities, or ZIP codes"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="flex-1 h-full px-4 text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none bg-transparent"
            />
            <button className="h-full w-[42px] bg-[#D03839] hover:bg-[#C73022] transition-colors flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Property Types */}
          <div className="relative" ref={propertyTypesRef}>
            <button
              className={filterBtn(hasPropertyTypesFilter)}
              onClick={() => { setShowPropertyTypes(!showPropertyTypes); setShowPrice(false); setShowBedsBaths(false) }}
            >
              {propertyTypesLabel()}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPropertyTypes ? 'rotate-180' : ''}`} />
            </button>

            {showPropertyTypes && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-64 overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-[#F0F0EC]">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Property Type</p>
                </div>
                <div className="py-2">
                  {PROPERTY_TYPES.map((type) => {
                    const active = filters.propertyTypes?.includes(type)
                    return (
                      <button
                        key={type}
                        onClick={() => togglePropertyType(type)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] transition-colors hover:bg-[#FAFAF8] group"
                      >
                        <span className={active ? 'text-[#1A1816] font-semibold' : 'text-[#444441]'}>{type}</span>
                        <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          active ? 'bg-[#D03839] border-[#D03839]' : 'border-[#E8E8E4] group-hover:border-[#C0C0BC]'
                        }`}>
                          {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {hasPropertyTypesFilter && (
                  <div className="px-4 py-3 border-t border-[#F0F0EC]">
                    <button
                      onClick={() => onFiltersChange({ ...filters, propertyTypes: [] })}
                      className="text-[13px] text-[#737370] hover:text-[#D03839] transition-colors font-medium"
                    >
                      Clear selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price */}
          <div className="relative hidden lg:block" ref={priceRef}>
            <button
              className={filterBtn(hasPriceFilter)}
              onClick={() => {
                setShowPrice(!showPrice); setShowPropertyTypes(false); setShowBedsBaths(false)
                setTempPrice({ min: filters.minPrice || '', max: filters.maxPrice || '' })
              }}
            >
              {priceLabel()}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPrice ? 'rotate-180' : ''}`} />
            </button>

            {showPrice && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-80 overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-[#F0F0EC]">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Price Range</p>
                </div>

                {/* Quick presets */}
                <div className="px-4 py-3 border-b border-[#F0F0EC] flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((p) => {
                    const active = tempPrice.min === String(p.min || '') && tempPrice.max === String(p.max || '')
                    return (
                      <button
                        key={p.label}
                        onClick={() => setTempPrice({ min: p.min || '', max: p.max || '' })}
                        className={`px-3 py-1 rounded-full border text-[12px] font-medium transition-all ${
                          active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                {/* Custom inputs */}
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider mb-1.5">Min</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] text-[13px]">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={tempPrice.min}
                          onChange={(e) => setTempPrice({ ...tempPrice, min: e.target.value })}
                          className="w-full h-10 pl-6 pr-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider mb-1.5">Max</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] text-[13px]">$</span>
                        <input
                          type="number"
                          placeholder="Any"
                          value={tempPrice.max}
                          onChange={(e) => setTempPrice({ ...tempPrice, max: e.target.value })}
                          className="w-full h-10 pl-6 pr-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {hasPriceFilter && (
                      <button onClick={clearPrice} className="flex-1 h-10 border border-[#E8E8E4] rounded-lg text-[13px] font-medium text-[#737370] hover:border-[#C0C0BC] hover:text-[#1A1816] transition-colors">
                        Clear
                      </button>
                    )}
                    <button onClick={applyPrice} className="flex-1 h-10 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Beds/Baths */}
          <div className="relative hidden lg:block" ref={bedsBathsRef}>
            <button
              className={filterBtn(hasBedsBathsFilter)}
              onClick={() => {
                setShowBedsBaths(!showBedsBaths); setShowPropertyTypes(false); setShowPrice(false)
                setTempBedsBaths({ minBeds: filters.minBeds || '', minBaths: filters.minBaths || '' })
              }}
            >
              {bedsBathsLabel()}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showBedsBaths ? 'rotate-180' : ''}`} />
            </button>

            {showBedsBaths && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-50 w-72 overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-[#F0F0EC]">
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider">Beds & Baths</p>
                </div>

                <div className="px-4 py-4 space-y-5">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bedrooms</p>
                    <div className="flex gap-2">
                      {['Any', 1, 2, 3, 4, 5].map((n) => {
                        const val = n === 'Any' ? '' : String(n)
                        const active = tempBedsBaths.minBeds === val
                        return (
                          <button
                            key={n}
                            onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBeds: val })}
                            className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${
                              active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
                            }`}
                          >
                            {n === 'Any' ? 'Any' : `${n}+`}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bathrooms</p>
                    <div className="flex gap-2">
                      {['Any', 1, 2, 3, 4, 5].map((n) => {
                        const val = n === 'Any' ? '' : String(n)
                        const active = tempBedsBaths.minBaths === val
                        return (
                          <button
                            key={n}
                            onClick={() => setTempBedsBaths({ ...tempBedsBaths, minBaths: val })}
                            className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${
                              active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'
                            }`}
                          >
                            {n === 'Any' ? 'Any' : `${n}+`}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {hasBedsBathsFilter && (
                      <button onClick={clearBedsBaths} className="flex-1 h-10 border border-[#E8E8E4] rounded-lg text-[13px] font-medium text-[#737370] hover:border-[#C0C0BC] hover:text-[#1A1816] transition-colors">
                        Clear
                      </button>
                    )}
                    <button onClick={applyBedsBaths} className="flex-1 h-10 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All Filters */}
          <button
            className={filterBtn(hasActiveFilters)}
            onClick={() => { closeAll(); setShowAllFilters(true) }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            All Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 bg-white text-[#D03839]">
                {[hasPriceFilter, hasBedsBathsFilter, hasPropertyTypesFilter, filters.states?.length > 0, filters.minFloorArea || filters.maxFloorArea, filters.minCapRate || filters.maxCapRate, filters.minGrossYield || filters.maxGrossYield, filters.minCashOnCash || filters.maxCashOnCash].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>{/* end desktop row */}
      </div>

      {/* All Filters Modal */}
      {showAllFilters && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#E8E8E4] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-[18px] font-bold text-[#1A1816]">All Filters</h2>
                <p className="text-[12px] text-[#A8A8A4] mt-0.5">Refine your search results</p>
              </div>
              <button onClick={() => setShowAllFilters(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#FAFAF8] transition-colors">
                <X className="w-5 h-5 text-[#737370]" />
              </button>
            </div>

            <div className="p-6 space-y-8">

              {/* Property Types */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-[#1A1816]">Property Type</h3>
                  {tempFilters.propertyTypes.length > 0 && (
                    <button onClick={() => setTempFilters({ ...tempFilters, propertyTypes: [] })} className="text-[12px] text-[#D03839] font-medium hover:underline">Clear</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PROPERTY_TYPES.map((type) => {
                    const active = tempFilters.propertyTypes.includes(type)
                    return (
                      <label key={type} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${active ? 'bg-[#FAFAF8] border-[#1A1816]' : 'border-[#E8E8E4] hover:border-[#C0C0BC]'}`}>
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${active ? 'bg-[#D03839] border-[#D03839]' : 'border-[#C0C0BC]'}`}>
                          {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <input type="checkbox" checked={active} onChange={(e) => setTempFilters({ ...tempFilters, propertyTypes: e.target.checked ? [...tempFilters.propertyTypes, type] : tempFilters.propertyTypes.filter(t => t !== type) })} className="sr-only" />
                        <span className={`text-[13px] ${active ? 'font-semibold text-[#1A1816]' : 'text-[#444441]'}`}>{type}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-[#F0F0EC]" />

              {/* Beds & Baths */}
              <div>
                <h3 className="text-[15px] font-bold text-[#1A1816] mb-4">Beds & Baths</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bedrooms</p>
                    <div className="flex gap-2">
                      {['Any', 1, 2, 3, 4, 5].map((n) => {
                        const val = n === 'Any' ? '' : String(n)
                        const active = tempFilters.minBeds === val
                        return (
                          <button key={n} onClick={() => setTempFilters({ ...tempFilters, minBeds: val })}
                            className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                            {n === 'Any' ? 'Any' : `${n}+`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Bathrooms</p>
                    <div className="flex gap-2">
                      {['Any', 1, 2, 3, 4, 5].map((n) => {
                        const val = n === 'Any' ? '' : String(n)
                        const active = tempFilters.minBaths === val
                        return (
                          <button key={n} onClick={() => setTempFilters({ ...tempFilters, minBaths: val })}
                            className={`flex-1 h-9 rounded-lg border text-[13px] font-medium transition-all ${active ? 'bg-[#1A1816] border-[#1A1816] text-white' : 'bg-white border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>
                            {n === 'Any' ? 'Any' : `${n}+`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0F0EC]" />

              {/* States */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-[#1A1816]">State</h3>
                  {tempFilters.states.length > 0 && (
                    <button onClick={() => setTempFilters({ ...tempFilters, states: [] })} className="text-[12px] text-[#D03839] font-medium hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {availableStates.map((state) => {
                    const active = tempFilters.states.includes(state.value)
                    return (
                      <label key={state.value} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                        active ? 'bg-[#FAFAF8] border-[#1A1816]' : 'border-[#E8E8E4] hover:border-[#C0C0BC]'
                      }`}>
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          active ? 'bg-[#D03839] border-[#D03839]' : 'border-[#C0C0BC]'
                        }`}>
                          {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setTempFilters({
                            ...tempFilters,
                            states: e.target.checked
                              ? [...tempFilters.states, state.value]
                              : tempFilters.states.filter(s => s !== state.value)
                          })}
                          className="sr-only"
                        />
                        <span className={`text-[13px] ${active ? 'font-semibold text-[#1A1816]' : 'text-[#444441]'}`}>{state.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-[#F0F0EC]" />

              {/* Square Footage */}
              <div>
                <h3 className="text-[15px] font-bold text-[#1A1816] mb-4">Square Footage</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Min sq ft', key: 'minFloorArea', placeholder: '0' },
                    { label: 'Max sq ft', key: 'maxFloorArea', placeholder: 'No max' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-wider mb-1.5">{label}</label>
                      <input type="number" placeholder={placeholder} value={tempFilters[key]}
                        onChange={(e) => setTempFilters({ ...tempFilters, [key]: e.target.value })}
                        className="w-full h-11 px-4 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F0F0EC]" />

              {/* Investment Metrics */}
              <div>
                <h3 className="text-[15px] font-bold text-[#1A1816] mb-5">Investment Metrics</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Gross Yield', unit: '%', minKey: 'minGrossYield', maxKey: 'maxGrossYield' },
                    { label: 'Cap Rate', unit: '%', minKey: 'minCapRate', maxKey: 'maxCapRate' },
                    { label: 'Cash on Cash Return', unit: '%', minKey: 'minCashOnCash', maxKey: 'maxCashOnCash' },
                  ].map(({ label, unit, minKey, maxKey }) => (
                    <div key={label} className="grid grid-cols-[1fr_2fr] gap-6 items-center">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1816]">{label}</p>
                        <p className="text-[11px] text-[#A8A8A4]">In {unit}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <input type="number" placeholder="Min" value={tempFilters[minKey]}
                            onChange={(e) => setTempFilters({ ...tempFilters, [minKey]: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors" />
                        </div>
                        <div className="relative">
                          <input type="number" placeholder="Max" value={tempFilters[maxKey]}
                            onChange={(e) => setTempFilters({ ...tempFilters, [maxKey]: e.target.value })}
                            className="w-full h-10 px-3 border border-[#E8E8E4] rounded-lg text-[14px] text-[#1A1816] placeholder:text-[#C0C0BC] focus:outline-none focus:border-[#1A1816] transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-[#E8E8E4] px-6 py-4 flex items-center justify-between rounded-b-2xl">
              <button onClick={resetAllFilters} className="text-[14px] font-medium text-[#737370] hover:text-[#1A1816] transition-colors underline underline-offset-2">
                Clear all
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAllFilters(false)} className="h-11 px-5 border border-[#E8E8E4] rounded-lg text-[14px] font-medium text-[#1A1816] hover:bg-[#FAFAF8] transition-colors">
                  Cancel
                </button>
                <button onClick={applyAllFilters} className="h-11 px-6 bg-[#D03839] hover:bg-[#C73022] text-white text-[14px] font-semibold rounded-lg transition-colors">
                  Show results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
