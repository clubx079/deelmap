// /components/forms/GooglePlacesAutocomplete.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

export default function GooglePlacesAutocomplete({ onAddressSelect, onInputChange, defaultValue = '', className, placeholder = 'Enter property address...' }) {
  const [value, setValue] = useState(defaultValue)
  const autocompleteRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  useEffect(() => {
    let isMounted = true
    loadGoogleMapsAPI()
      .then(() => {
        if (isMounted) initializeAutocomplete()
      })
      .catch((error) => {
        console.error('Failed to load Google Places API:', error)
      })
    return () => { isMounted = false }
  }, [])

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      }
    )

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setValue(place.formatted_address)

        let county = ''
        let state = ''
        let stateShort = ''
        let city = ''
        let zipcode = ''

        if (place.address_components) {
          for (const component of place.address_components) {
            const types = component.types
            if (types.includes('administrative_area_level_2')) county = component.long_name
            if (types.includes('administrative_area_level_1')) { state = component.long_name; stateShort = component.short_name }
            if (types.includes('locality')) city = component.long_name
            if (types.includes('postal_code')) zipcode = component.long_name
          }
        }

        onAddressSelect({
          address: place.formatted_address,
          latitude: lat,
          longitude: lng,
          county,
          state,
          stateShort,
          city,
          zipcode,
        })
      }
    })
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => { setValue(e.target.value); onInputChange?.(e.target.value) }}
      placeholder={placeholder}
      className={className || "w-full px-4 py-3 border border-[#E8E8E4] rounded focus:border-[#D03839] focus:outline-none transition-colors text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4]"}
      autoComplete="off"
    />
  )
}
