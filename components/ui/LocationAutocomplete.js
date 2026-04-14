'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

/**
 * Search input with Google Places city/state autocomplete dropdown.
 * Props:
 *   value          - controlled input value
 *   onChange       - called with raw text as user types
 *   onSelect       - called with { city, state, label } when user picks a suggestion
 *   onSubmit       - called when user presses Enter or clicks the search button
 *   placeholder    - input placeholder
 *   inputClassName - extra classes for the input wrapper div
 *   buttonClassName- extra classes for the search button
 *   inputStyle     - inline style for the input element
 */
export default function LocationAutocomplete({
  value = '',
  onChange,
  onSelect,
  onSubmit,
  onFocus,
  onBlur,
  placeholder = 'Search markets, cities, or ZIP codes',
  inputClassName = '',
  buttonClassName = '',
  inputStyle = {},
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const autocompleteService = useRef(null)
  const debounceTimer = useRef(null)
  const wrapperRef = useRef(null)

  // Load Google Maps + init AutocompleteService
  useEffect(() => {
    loadGoogleMapsAPI().then(() => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService()
      }
    }).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = (input) => {
    if (!autocompleteService.current || !input.trim() || input.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    autocompleteService.current.getPlacePredictions(
      { input, types: ['(regions)'], componentRestrictions: { country: 'us' } },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const results = predictions.slice(0, 6).map((p) => {
            const terms = p.terms || []
            const types = p.types || []
            // State-level result: administrative_area_level_1
            if (types.includes('administrative_area_level_1') || terms.length === 1) {
              const state = terms[0]?.value || ''
              return { city: '', state, label: state, placeId: p.place_id, isState: true }
            }
            // City result
            const city = terms[0]?.value || ''
            const state = terms[1]?.value || ''
            const label = state ? `${city}, ${state}` : city
            return { city, state, label, placeId: p.place_id, isState: false }
          })
          setSuggestions(results)
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      }
    )
  }

  const handleChange = (e) => {
    const val = e.target.value
    onChange?.(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), 200)
  }

  const handleSelect = (suggestion) => {
    onChange?.(suggestion.label)
    onSelect?.(suggestion)
    setOpen(false)
    setSuggestions([])
  }

  const parseLocation = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return null
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(s => s.trim())
      return { city: parts[0] || '', state: parts[1] || '', label: trimmed }
    }
    return { city: '', state: trimmed, label: trimmed }
  }

  const submitLocation = (text) => {
    if (suggestions.length > 0) {
      handleSelect(suggestions[0])
    } else {
      const loc = parseLocation(text)
      if (loc) onSelect?.(loc)
      onSubmit?.(text)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setOpen(false)
      submitLocation(value)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleClear = () => {
    onChange?.('')
    onSelect?.({ city: '', state: '', label: '' })
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative flex items-center h-full w-full ${inputClassName}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); onFocus?.() }}
        onBlur={(e) => { if (!wrapperRef.current?.contains(e.relatedTarget)) onBlur?.() }}
        style={inputStyle}
        className="flex-1 h-full px-4 text-[14px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none bg-transparent"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="px-2 text-[#A8A8A4] hover:text-[#1A1816] transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => { setOpen(false); submitLocation(value) }}
        className={`h-full w-[42px] bg-[#D03839] hover:bg-[#C73022] transition-colors flex items-center justify-center flex-shrink-0 rounded-r ${buttonClassName}`}
      >
        <Search className="w-4 h-4 text-white" />
      </button>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border border-[#E8E8E4] rounded shadow-lg z-50 mt-1 overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId || i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              className="px-4 py-2.5 text-[14px] text-[#1A1816] hover:bg-[#FAFAF8] cursor-pointer flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-[#A8A8A4] flex-shrink-0" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
