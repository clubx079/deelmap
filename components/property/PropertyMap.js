'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getPrimaryPhotoUrl } from '@/utils/propertyPhotos'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

// Approximate state centroids (lat, lng) for properties missing address_google_lat/lng so list and map counts match
const STATE_CENTROIDS = {
  AL: [32.3182, -86.9023], AK: [64.8378, -94.9282], AZ: [34.0489, -111.0937], AR: [35.2010, -91.8318],
  CA: [36.7783, -119.4179], CO: [39.1130, -105.3111], CT: [41.6032, -73.0877], DE: [38.9108, -75.5277],
  FL: [27.6648, -81.5158], GA: [32.1574, -82.9071], HI: [19.8968, -155.5828], ID: [44.0682, -114.7420],
  IL: [40.6331, -89.3985], IN: [40.2672, -86.1349], IA: [41.8780, -93.0977], KS: [38.5266, -96.7265],
  KY: [37.6681, -84.6701], LA: [31.1695, -91.8678], ME: [45.2538, -69.4455], MD: [39.0458, -76.6413],
  MA: [42.4072, -71.3824], MI: [43.3266, -84.5361], MN: [46.7296, -94.6859], MS: [32.3547, -89.3985],
  MO: [37.9643, -91.8318], MT: [46.8797, -110.3626], NE: [41.4925, -99.9018], NV: [38.8026, -116.4194],
  NH: [43.1939, -71.5724], NJ: [40.0583, -74.4057], NM: [34.5199, -105.8701], NY: [43.2994, -74.2179],
  NC: [35.7596, -79.0193], ND: [47.5515, -101.0020], OH: [40.4173, -82.9071], OK: [35.0078, -97.0929],
  OR: [43.8041, -120.5542], PA: [41.2033, -77.1945], RI: [41.5801, -71.4774], SC: [33.8361, -81.1637],
  SD: [43.9695, -99.9018], TN: [35.5175, -86.5804], TX: [31.9686, -99.9018], UT: [39.3210, -111.0937],
  VT: [44.5588, -72.5778], VA: [37.4316, -78.6569], WA: [47.7511, -120.7401], WV: [38.5976, -80.4549],
  WI: [43.7844, -88.7879], WY: [43.0760, -107.2903], DC: [38.9072, -77.0369]
}

export function PropertyMap({ properties = [], onMarkerClick, onBoundsChange, filters, isLoggedIn = false, searchLocation = null }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoOverlayRef = useRef(null)
  const router = useRouter()
  const propertiesRef = useRef(properties)
  const filtersRef = useRef(filters)
  const onBoundsChangeRef = useRef(onBoundsChange)
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange }, [onBoundsChange])

  // Keep refs in sync so callbacks always see latest values
  useEffect(() => { propertiesRef.current = properties }, [properties])
  useEffect(() => { filtersRef.current = filters }, [filters])

  useEffect(() => { initMap() }, [])
  useEffect(() => {
    if (mapInstanceRef.current && window.google) {
      updateMarkers()
      if (filters?.states?.length) zoomToStates(filters.states)
    }
  }, [properties, filters])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear previous boundary
    map.data.forEach(f => map.data.remove(f))

    if (!searchLocation?.city) return

    const stateNameToAbbr = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    }

    const stateFullName = stateNameToAbbr[searchLocation.state?.toUpperCase()] || searchLocation.state || ''
    const params = new URLSearchParams({
      city: searchLocation.city,
      state: stateFullName,
      country: 'US',
      polygon_geojson: '1',
      format: 'json',
      limit: '1',
    })

    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Deelmap/1.0' }
    })
      .then(r => r.json())
      .then(results => {
        if (!results?.length || !results[0].geojson) return
        const map = mapInstanceRef.current
        if (!map) return

        map.data.addGeoJson({ type: 'Feature', geometry: results[0].geojson })
        map.data.setStyle({
          fillOpacity: 0,
          strokeColor: '#D03839',
          strokeWeight: 2,
          strokeOpacity: 0.7,
          clickable: false,
        })

        // Zoom map to the boundary
        const bbox = results[0].boundingbox // [minLat, maxLat, minLng, maxLng]
        if (bbox) {
          const bounds = new window.google.maps.LatLngBounds(
            { lat: parseFloat(bbox[0]), lng: parseFloat(bbox[2]) },
            { lat: parseFloat(bbox[1]), lng: parseFloat(bbox[3]) }
          )
          map.fitBounds(bounds)
        }
      })
      .catch(() => {})
  }, [searchLocation])

  const initMap = () => {
    if (typeof window === 'undefined') return

    const bootstrap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        rotateControl: false,
        scaleControl: false,
        panControl: false,
        mapTypeId: 'roadmap',
        disableDefaultUI: true, // Disable ALL default UI controls
        clickableIcons: false,
        gestureHandling: 'greedy', // Disable the "use ctrl+scroll" message
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      mapInstanceRef.current = map
      
      // Notify parent of bounds after every pan/zoom settles
      map.addListener('idle', () => {
        onBoundsChangeRef.current?.(map.getBounds())
      })

      // Close popup when clicking anywhere on the map
      map.addListener('click', (e) => {
        if (e.placeId === undefined) {
          hideInfoCard()
        }
      })

      // Close popup when dragging the map
      map.addListener('dragstart', () => {
        hideInfoCard()
      })

      // Update markers when map is ready (read from ref to get latest properties)
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        if (propertiesRef.current.length > 0) {
          updateMarkers()
        }
      })
    }

    loadGoogleMapsAPI().then(() => {
      bootstrap()
    }).catch((error) => {
      console.error('Failed to load Google Maps API:', error)
    })
  }

  const shortPrice = (price) => {
    const n = Math.round(Number(price) || 0)
    if (!n) return 'N/A'
    if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${Math.round(n/1_000)}K`
    return `$${n}`
  }

  const fullPrice = (price) => {
    const n = Math.round(Number(price) || 0)
    return n ? `$${n.toLocaleString()}` : 'Contact for price'
  }

  const chipColor = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'sold') return '#D03839'        // Purple - matching Stessa
    if (s === 'pending') return '#D03839'     // Purple - matching Stessa
    return '#D03839'                          // Purple - matching Stessa
  }

  const updateMarkers = () => {
    const map = mapInstanceRef.current
    if (!map || !window.google) return

    const currentProperties = propertiesRef.current
    if (!currentProperties || currentProperties.length === 0) return

    markersRef.current.forEach(({ overlay }) => overlay?.setMap(null))
    markersRef.current = []

    const bounds = new window.google.maps.LatLngBounds()

    currentProperties.forEach((p) => {
      // Use Google verified coordinates from wholesale_deals; fallback chain for missing coords
      let lat = parseFloat(p.address_google_lat)
      let lng = parseFloat(p.address_google_lng)
      
      // Fallback 1: Try latitude/longitude fields
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        lat = parseFloat(p.latitude)
        lng = parseFloat(p.longitude)
      }
      
      // Fallback 2: Try state centroid
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const state = (p.state || '').trim().toUpperCase().slice(0, 2)
        const centroid = state && STATE_CENTROIDS[state]
        if (centroid) {
          lat = centroid[0]
          lng = centroid[1]
        } else {
          // Fallback 3: Default US center as last resort
          console.warn(`Property ${p.id} missing coordinates and state, using US center`)
          lat = 39.8283
          lng = -98.5795
        }
      }

      const anchor = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        visible: false
      })

      const chip = document.createElement('div')
      chip.className = 'price-marker-dot'
      chip.style.cssText = [
        'position: absolute',
        'transform: translate(-50%, -100%)',
        'z-index: 1000',
        'cursor: pointer',
        'transition: transform 0.15s ease',
        'width: 20px',
        'height: 26px',
        'display: flex',
        'align-items: center',
        'justify-content: center'
      ].join(';')
      chip.innerHTML = `<svg width="20" height="26" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z" fill="#D03839"/>
        <circle cx="16" cy="12" r="5" fill="white"/>
      </svg>`

      chip.addEventListener('mouseenter', () => {
        chip.style.transform = 'translate(-50%, -100%) scale(1.2)'
        chip.style.zIndex = '1100'
      })

      chip.addEventListener('mouseleave', () => {
        chip.style.transform = 'translate(-50%, -100%) scale(1)'
        chip.style.zIndex = '1000'
      })

      chip.addEventListener('click', (e) => {
        e.stopPropagation()
        showInfoCard(p, anchor)
        onMarkerClick?.(p)
      })

      const overlay = new window.google.maps.OverlayView()
      overlay.onAdd = function () { this.getPanes().overlayMouseTarget.appendChild(chip) }
      overlay.draw = function () {
        const proj = this.getProjection()
        const pt = proj.fromLatLngToDivPixel(anchor.getPosition())
        chip.style.left = `${pt.x}px`
        chip.style.top = `${pt.y}px`
      }
      overlay.onRemove = function () { chip.remove() }
      overlay.setMap(map)

      markersRef.current.push({ overlay })
      bounds.extend(anchor.getPosition())
    })


    if (!bounds.isEmpty()) {
      map.fitBounds(bounds)
      window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) map.setZoom(15)
      })
    }
  }

  const getDisplayAddress = (prop) => {
    const fullAddressText = prop.full_address ||
      `${prop.address || ''}, ${prop.city || ''}, ${prop.state || ''} ${prop.zip_code || ''}`.trim()
    
    if (!prop.city && !prop.state) {
      // Fallback to full address if city/state not available
      if (isLoggedIn) return fullAddressText
      
      const firstCommaIndex = fullAddressText.indexOf(',')
      if (firstCommaIndex === -1) return fullAddressText
      return fullAddressText.substring(firstCommaIndex + 1).trim()
    }
    
    // Show only city and state (no zip code) for non-logged-in users
    // Show full address for logged-in users
    if (isLoggedIn) {
      return fullAddressText
    }
    
    const cityState = [prop.city, prop.state].filter(Boolean).join(', ')
    return cityState || 'Address not available'
  }

  const buildInfoEl = (prop) => {
    // Support both wholesale_deals (property_photos) and properties (property_images)
    let rawImg = getPrimaryPhotoUrl(prop.property_photos)
    if (!rawImg && Array.isArray(prop.property_images) && prop.property_images.length > 0) {
      const sorted = [...prop.property_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      rawImg = sorted[0]?.image_url || ''
    }
    const img = rawImg && rawImg.includes('supabase.co/storage/v1/object/public/')
      ? rawImg.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain'
      : rawImg
    const hasPhoto = !!img

    const cityState = [prop.city, prop.state].filter(Boolean).join(', ')
    const displayAddr = getDisplayAddress(prop)
    const priceStr = fullPrice(prop.price)
    const arvNum = Number(prop.arv) || 0
    const arvStr = arvNum > 0 ? shortPrice(arvNum) : null

    // floor_area is the sqft column in the properties table
    const sqftVal = prop.sqft || prop.floor_area
    const statParts = []
    if (sqftVal) statParts.push(`${Number(sqftVal).toLocaleString()} sq ft`)
    if (prop.bedrooms) statParts.push(`${prop.bedrooms} bed`)
    if (prop.bathrooms) statParts.push(`${prop.bathrooms} bath`)
    const stats = statParts.join(' · ')

    const el = document.createElement('div')
    el.className = 'map-info-card-fixed'
    el.style.cssText = 'cursor: pointer; width: 260px;'

    el.innerHTML = `
      <div style="
        background: white;
        border-radius: 6px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.14);
        border: 1px solid #E8E8E4;
        font-family: 'DM Sans', sans-serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 260px;
        transition: box-shadow 0.2s ease;
      ">
        <!-- Image (top, same proportions as vertical listing card) -->
        ${hasPhoto ? `
          <div style="width:260px;height:144px;flex-shrink:0;background-image:url('${img}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#FAFAF8;"></div>
        ` : `
          <div style="width:260px;height:144px;flex-shrink:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;background:#FAFAF8;">
            <img src="/assets/logo.svg" alt="DeelMap" style="width:60px;opacity:0.3;" />
            <span style="font-size:10px;color:#A8A8A4;">No photo</span>
          </div>
        `}

        <!-- Content (bottom 20%) -->
        <div style="padding:10px 12px;background:white;">
          <!-- Address -->
          <div style="font-size:12px;font-weight:700;color:#1A1816;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">
            ${displayAddr}
          </div>
          <!-- Stats + Price row -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
            ${stats ? `<div style="font-size:10px;color:#737370;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${stats}</div>` : `<div style="font-size:10px;color:#737370;">${cityState || ''}</div>`}
            <div style="font-size:13px;font-weight:700;color:#1A1816;flex-shrink:0;">${priceStr}</div>
          </div>
        </div>
      </div>
    `

    el.addEventListener('click', (e) => {
      e.stopPropagation()
      hideInfoCard()
      router.push(`/${prop.slug || prop.id}`)
    })

    el.addEventListener('mouseenter', () => {
      el.firstElementChild.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'
    })
    el.addEventListener('mouseleave', () => {
      el.firstElementChild.style.boxShadow = '0 8px 32px rgba(0,0,0,0.14)'
    })

    return el
  }

  const showInfoCard = (prop, anchorMarker) => {
    const map = mapInstanceRef.current
    if (!map) return
    hideInfoCard()

    const el = buildInfoEl(prop)

    const overlay = new window.google.maps.OverlayView()
    overlay.onAdd = function () { this.getPanes().floatPane.appendChild(el) }
    overlay.draw = function () {
      const proj = this.getProjection()
      const pt = proj.fromLatLngToDivPixel(anchorMarker.getPosition())
      
      const mapDiv = map.getDiv()
      const mapWidth = mapDiv.offsetWidth
      const mapHeight = mapDiv.offsetHeight
      
      const edgePadding = 15
      const topPadding = 80
      const cardWidth = 260
      const cardHeight = 215
      const popupOffset = 15

      const screenX = pt.x + (mapWidth / 2)
      const screenY = pt.y + (mapHeight / 2)
      
      // Use screen coordinates for all calculations
      const x = screenX
      const y = screenY
      // Calculate potential positions - simple and direct
      const positions = {
        top: {
          left: x,
          top: y - popupOffset,
          transform: 'translate(-50%, -100%)',
          fits: y - popupOffset - cardHeight >= topPadding &&
                x - cardWidth/2 >= edgePadding &&
                x + cardWidth/2 <= mapWidth - edgePadding
        },
        bottom: {
          left: x,
          top: y + popupOffset,
          transform: 'translate(-50%, 0%)',
          fits: y + popupOffset + cardHeight <= mapHeight - edgePadding &&
                x - cardWidth/2 >= edgePadding &&
                x + cardWidth/2 <= mapWidth - edgePadding
        },
        left: {
          left: x - popupOffset,
          top: y,
          transform: 'translate(-100%, -50%)',
          fits: x - popupOffset - cardWidth >= edgePadding &&
                y - cardHeight/2 >= topPadding &&
                y + cardHeight/2 <= mapHeight - edgePadding
        },
        right: {
          left: x + popupOffset,
          top: y,
          transform: 'translate(0%, -50%)',
          fits: x + popupOffset + cardWidth <= mapWidth - edgePadding &&
                y - cardHeight/2 >= topPadding &&
                y + cardHeight/2 <= mapHeight - edgePadding
        },
        topLeft: {
          left: x - popupOffset,
          top: y - popupOffset,
          transform: 'translate(-100%, -100%)',
          fits: x - popupOffset - cardWidth >= edgePadding &&
                y - popupOffset - cardHeight >= topPadding
        },
        topRight: {
          left: x + popupOffset,
          top: y - popupOffset,
          transform: 'translate(0%, -100%)',
          fits: x + popupOffset + cardWidth <= mapWidth - edgePadding &&
                y - popupOffset - cardHeight >= topPadding
        },
        bottomLeft: {
          left: x - popupOffset,
          top: y + popupOffset,
          transform: 'translate(-100%, 0%)',
          fits: x - popupOffset - cardWidth >= edgePadding &&
                y + popupOffset + cardHeight <= mapHeight - edgePadding
        },
        bottomRight: {
          left: x + popupOffset,
          top: y + popupOffset,
          transform: 'translate(0%, 0%)',
          fits: x + popupOffset + cardWidth <= mapWidth - edgePadding &&
                y + popupOffset + cardHeight <= mapHeight - edgePadding
        }
      }
      
      // Priority order: prefer top, then bottom, then sides, then corners
      const priority = ['top', 'bottom', 'right', 'left', 'topRight', 'topLeft', 'bottomRight', 'bottomLeft']
      
      let selectedPosition = positions.top // default

      // Find the first position that fits
      for (const posName of priority) {
        if (positions[posName].fits) {
          selectedPosition = positions[posName]
          break
        }
      }
      
      // If none fit perfectly, choose the best compromise
      if (!selectedPosition.fits) {
        let bestPosition = positions.top
        let minOverflow = Infinity

        for (const posName of priority) {
          const pos = positions[posName]
          let overflow = 0

          const leftEdge = pos.left - (pos.transform.includes('-100%') ? cardWidth : pos.transform.includes('-50%') ? cardWidth/2 : 0)
          const rightEdge = pos.left + (pos.transform.includes('0%') ? cardWidth : pos.transform.includes('-50%') ? cardWidth/2 : cardWidth)
          const topEdge = pos.top - (pos.transform.includes('-100%') || pos.transform.includes('-50%') ? cardHeight : pos.transform.includes('0%') ? 0 : cardHeight/2)
          const bottomEdge = pos.top + (pos.transform.includes('0%') || pos.transform.includes('-50%') ? cardHeight : pos.transform.includes('-100%') ? 0 : cardHeight/2)

          if (leftEdge < edgePadding) overflow += edgePadding - leftEdge
          if (rightEdge > mapWidth - edgePadding) overflow += rightEdge - (mapWidth - edgePadding)
          if (topEdge < topPadding) overflow += topPadding - topEdge
          if (bottomEdge > mapHeight - edgePadding) overflow += bottomEdge - (mapHeight - edgePadding)

          if (overflow < minOverflow) {
            minOverflow = overflow
            bestPosition = pos
          }
        }

        selectedPosition = bestPosition

        // Adjust position to keep within bounds
        const leftEdge = selectedPosition.left - (selectedPosition.transform.includes('-100%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : 0)
        const rightEdge = selectedPosition.left + (selectedPosition.transform.includes('0%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : cardWidth)
        const topEdge = selectedPosition.top - (selectedPosition.transform.includes('-100%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('0%') ? 0 : cardHeight/2)
        const bottomEdge = selectedPosition.top + (selectedPosition.transform.includes('0%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('-100%') ? 0 : cardHeight/2)

        if (leftEdge < edgePadding) {
          selectedPosition.left = edgePadding + (selectedPosition.transform.includes('-100%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : 0)
        }
        if (rightEdge > mapWidth - edgePadding) {
          selectedPosition.left = mapWidth - edgePadding - (selectedPosition.transform.includes('0%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : cardWidth)
        }
        if (topEdge < topPadding) {
          selectedPosition.top = topPadding + (selectedPosition.transform.includes('-100%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('0%') ? 0 : cardHeight/2)
        }
        if (bottomEdge > mapHeight - edgePadding) {
          selectedPosition.top = mapHeight - edgePadding - (selectedPosition.transform.includes('0%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('-100%') ? 0 : cardHeight/2)
        }
      }

      const finalLeft = selectedPosition.left - (mapWidth / 2)
      let finalTop = selectedPosition.top - (mapHeight / 2)

      // Clamp so the popup never appears above the map container.
      // translate Y=-100% shifts the card up by its full height; account for that.
      const transformYShift = selectedPosition.transform.includes(', -100%') ? -cardHeight
        : selectedPosition.transform.includes(', -50%') ? -cardHeight / 2
        : 0
      const minFinalTop = (topPadding - mapHeight / 2) - transformYShift
      if (finalTop < minFinalTop) finalTop = minFinalTop

      el.style.left = `${finalLeft}px`
      el.style.top = `${finalTop}px`
      el.style.transform = selectedPosition.transform
      el.style.position = 'absolute'
      el.style.zIndex = '1200'
    }
    overlay.onRemove = function () { el.remove() }
    overlay.setMap(map)

    // Reposition after map settles — projection is unstable during fitBounds animation
    window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if (infoOverlayRef.current === overlay) overlay.draw()
    })

    infoOverlayRef.current = overlay
  }

  const hideInfoCard = () => {
    infoOverlayRef.current?.setMap?.(null)
    infoOverlayRef.current = null
  }

  const zoomToStates = (stateCodes = []) => {
    const map = mapInstanceRef.current
    if (!map || !window.google) return
    const b = new window.google.maps.LatLngBounds()
    propertiesRef.current.forEach((p) => {
      if (stateCodes.includes(p.state) && p.latitude && p.longitude) {
        b.extend({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) })
      }
    })
    if (!b.isEmpty()) {
      map.fitBounds(b)
      setTimeout(() => {
        if (map.getZoom() > 15) map.setZoom(15)
      }, 100)
    }
  }

  return <div ref={mapRef} className="w-full h-full min-h-[600px] map-container" />
}