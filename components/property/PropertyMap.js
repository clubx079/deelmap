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

export function PropertyMap({ properties = [], onMarkerClick, filters, isLoggedIn = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoOverlayRef = useRef(null)
  const router = useRouter()

  useEffect(() => { initMap() }, [])
  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers()
      if (filters?.states?.length) zoomToStates(filters.states)
    }
  }, [properties, filters])

  const initMap = () => {
    if (typeof window === 'undefined') return

    const bootstrap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      mapInstanceRef.current = map
      // Close popup when clicking anywhere on the map
      map.addListener('click', (e) => {
        // Only close if not clicking on a marker or info card
        if (e.placeId === undefined) {
          hideInfoCard()
        }
      })
      
      // Close popup when dragging the map
      map.addListener('dragstart', () => {
        hideInfoCard()
      })
      
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        updateMarkers()
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
    if (s === 'sold') return '#6366f1'        // Purple - matching Stessa
    if (s === 'pending') return '#6366f1'     // Purple - matching Stessa
    return '#6366f1'                          // Purple - matching Stessa
  }

  const updateMarkers = () => {
    const map = mapInstanceRef.current
    if (!map || !window.google) return

    markersRef.current.forEach(({ overlay }) => overlay?.setMap(null))
    markersRef.current = []

    const bounds = new window.google.maps.LatLngBounds()

    properties.forEach((p) => {
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
        `background-color: ${chipColor(p.status)}`,
        'width: 14px',
        'height: 14px',
        'border-radius: 50%',
        'box-shadow: 0 2px 6px rgba(99, 102, 241, 0.5)',
        'position: absolute',
        'transform: translate(-50%, -50%)',
        'z-index: 1000',
        'cursor: pointer',
        'transition: all 0.15s ease',
        'border: 2.5px solid white'
      ].join(';')

      chip.addEventListener('mouseenter', () => {
        chip.style.transform = 'translate(-50%, -50%) scale(1.5)'
        chip.style.zIndex = '1100'
        chip.style.boxShadow = '0 3px 10px rgba(99, 102, 241, 0.7)'
      })

      chip.addEventListener('mouseleave', () => {
        chip.style.transform = 'translate(-50%, -50%) scale(1)'
        chip.style.zIndex = '1000'
        chip.style.boxShadow = '0 2px 6px rgba(99, 102, 241, 0.5)'
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
    const img = getPrimaryPhotoUrl(prop.property_photos)
    const hasPhoto = img && img.length > 0
    const statusText = (prop.status || 'Available').toUpperCase()
    const beds = prop.bedrooms ? `${prop.bedrooms} Beds` : ''
    const baths = prop.bathrooms ? `${prop.bathrooms} Baths` : ''
    const displayAddress = getDisplayAddress(prop)

    const el = document.createElement('div')
    el.className = 'map-info-card-fixed'
    el.style.cursor = 'pointer'
    el.innerHTML = `
      <div style="
        width: 240px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.05);
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="position: relative; height: 120px; background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
          ${hasPhoto ? `
          <img src="${img}" alt="property" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
          " onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;\\'><img src=\\'/assets/logo copy.png\\' alt=\\'DeelMap\\' style=\\'width: 120px; height: auto;\\' /></div>';" />
          ` : `
          <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
            <img src="/assets/logo copy.png" alt="DeelMap" style="width: 120px; height: auto;" />
          </div>
          `}
          <div style="
            position: absolute;
            top: 8px;
            left: 8px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          ">
            <span style="
              background: #3b82f6;
              color: white;
              font-size: 10px;
              font-weight: 600;
              padding: 3px 6px;
              border-radius: 8px;
              text-transform: uppercase;
            ">Active</span>
            <span style="
              background: ${chipColor(prop.status)};
              color: white;
              font-size: 10px;
              font-weight: 600;
              padding: 3px 6px;
              border-radius: 8px;
              text-transform: uppercase;
            ">${statusText}</span>
          </div>
        </div>
        <div style="padding: 12px;">
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: #022b41;
            margin-bottom: 6px;
          ">${fullPrice(prop.price)}</div>
          <div style="
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
            line-height: 1.3;
          ">${displayAddress}</div>
          <div style="
            display: flex;
            gap: 12px;
            font-size: 11px;
            color: #374151;
            font-weight: 600;
          ">
            ${beds ? `<span>${beds}</span>` : ''}
            ${baths ? `<span>${baths}</span>` : ''}
          </div>
        </div>
      </div>
    `
    
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      hideInfoCard()
      router.push(`/${prop.slug}`)
    })

    el.addEventListener('mouseenter', () => {
      el.firstElementChild.style.transform = 'scale(1.02)'
    })

    el.addEventListener('mouseleave', () => {
      el.firstElementChild.style.transform = 'scale(1)'
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
      
      // Screen edge padding: ensures popup doesn't touch screen edges
      const edgePadding = 30
      // Card dimensions match actual visual size (240px wide card)
      const cardWidth = 250
      const cardHeight = 210
      // Popup offset from marker: keeps popup close to marker
      const popupOffset = 15
      
      console.log('🗺️ MAP POPUP CALCULATION START');
      console.log('📍 Marker Position:', { x: pt.x, y: pt.y });
      console.log('📐 Map Dimensions:', { width: mapWidth, height: mapHeight });
      console.log('⚙️ Settings:', { edgePadding, cardWidth, cardHeight, popupOffset });
      
      // Calculate potential positions for all four sides
      const positions = {
        top: {
          left: pt.x,
          top: pt.y - popupOffset,
          transform: 'translate(-50%, -100%)',
          fits: pt.y - cardHeight >= edgePadding && 
                pt.x - cardWidth/2 >= edgePadding && 
                pt.x + cardWidth/2 <= mapWidth - edgePadding
        },
        bottom: {
          left: pt.x,
          top: pt.y + popupOffset,
          transform: 'translate(-50%, 0%)',
          fits: pt.y + cardHeight <= mapHeight - edgePadding && 
                pt.x - cardWidth/2 >= edgePadding && 
                pt.x + cardWidth/2 <= mapWidth - edgePadding
        },
        right: {
          left: pt.x - popupOffset,
          top: pt.y,
          transform: 'translate(-100%, -50%)',
          fits: pt.x - cardWidth >= edgePadding && 
                pt.y - cardHeight/2 >= edgePadding && 
                pt.y + cardHeight/2 <= mapHeight - edgePadding
        },
        left: {
          left: pt.x + popupOffset,
          top: pt.y,
          transform: 'translate(0%, -50%)',
          fits: pt.x + cardWidth <= mapWidth - edgePadding && 
                pt.y - cardHeight/2 >= edgePadding && 
                pt.y + cardHeight/2 <= mapHeight - edgePadding
        },
        topRight: {
          left: pt.x - popupOffset,
          top: pt.y - popupOffset,
          transform: 'translate(-100%, -100%)',
          fits: pt.x - cardWidth >= edgePadding && 
                pt.y - cardHeight >= edgePadding
        },
        topLeft: {
          left: pt.x + popupOffset,
          top: pt.y - popupOffset,
          transform: 'translate(0%, -100%)',
          fits: pt.x + cardWidth <= mapWidth - edgePadding && 
                pt.y - cardHeight >= edgePadding
        },
        bottomRight: {
          left: pt.x - popupOffset,
          top: pt.y + popupOffset,
          transform: 'translate(-100%, 0%)',
          fits: pt.x - cardWidth >= edgePadding && 
                pt.y + cardHeight <= mapHeight - edgePadding
        },
        bottomLeft: {
          left: pt.x + popupOffset,
          top: pt.y + popupOffset,
          transform: 'translate(0%, 0%)',
          fits: pt.x + cardWidth <= mapWidth - edgePadding && 
                pt.y + cardHeight <= mapHeight - edgePadding
        }
      }
      
      console.log('📊 Position Fits Check:');
      Object.keys(positions).forEach(posName => {
        console.log(`  ${posName}: ${positions[posName].fits ? '✅ FITS' : '❌ NO FIT'}`);
      });
      
      // Priority order: prefer top, then bottom, then sides, then corners
      const priority = ['top', 'bottom', 'right', 'left', 'topRight', 'topLeft', 'bottomRight', 'bottomLeft']
      
      let selectedPosition = positions.top // default
      
      // Find the first position that fits
      for (const posName of priority) {
        if (positions[posName].fits) {
          selectedPosition = positions[posName]
          console.log(`✅ Selected Position: ${posName} (first fit found)`);
          break
        }
      }
      
      // If none fit perfectly, choose the best compromise
      if (!selectedPosition.fits) {
        console.log('⚠️ No position fits perfectly, calculating best compromise...');
        
        // Calculate which position has the least overflow
        let bestPosition = positions.top
        let minOverflow = Infinity
        
        for (const posName of priority) {
          const pos = positions[posName]
          let overflow = 0
          
          // Calculate overflow for each edge
          const leftEdge = pos.left - (pos.transform.includes('-100%') ? cardWidth : pos.transform.includes('-50%') ? cardWidth/2 : 0)
          const rightEdge = pos.left + (pos.transform.includes('0%') ? cardWidth : pos.transform.includes('-50%') ? cardWidth/2 : cardWidth)
          const topEdge = pos.top - (pos.transform.includes('-100%') || pos.transform.includes('-50%') ? cardHeight : pos.transform.includes('0%') ? 0 : cardHeight/2)
          const bottomEdge = pos.top + (pos.transform.includes('0%') || pos.transform.includes('-50%') ? cardHeight : pos.transform.includes('-100%') ? 0 : cardHeight/2)
          
          if (leftEdge < edgePadding) overflow += edgePadding - leftEdge
          if (rightEdge > mapWidth - edgePadding) overflow += rightEdge - (mapWidth - edgePadding)
          if (topEdge < edgePadding) overflow += edgePadding - topEdge
          if (bottomEdge > mapHeight - edgePadding) overflow += bottomEdge - (mapHeight - edgePadding)
          
          console.log(`  ${posName}: overflow = ${overflow.toFixed(2)}px`);
          
          if (overflow < minOverflow) {
            minOverflow = overflow
            bestPosition = pos
          }
        }
        
        console.log(`🎯 Best compromise: overflow = ${minOverflow.toFixed(2)}px`);
        
        selectedPosition = bestPosition
        
        console.log('🔧 Adjusting position to keep within bounds...');
        
        // Adjust position to keep within bounds
        const leftEdge = selectedPosition.left - (selectedPosition.transform.includes('-100%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : 0)
        const rightEdge = selectedPosition.left + (selectedPosition.transform.includes('0%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : cardWidth)
        const topEdge = selectedPosition.top - (selectedPosition.transform.includes('-100%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('0%') ? 0 : cardHeight/2)
        const bottomEdge = selectedPosition.top + (selectedPosition.transform.includes('0%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('-100%') ? 0 : cardHeight/2)
        
        console.log('  Before adjustment:', { left: selectedPosition.left, top: selectedPosition.top });
        console.log('  Edges:', { leftEdge, rightEdge, topEdge, bottomEdge });
        
        if (leftEdge < edgePadding) {
          selectedPosition.left = edgePadding + (selectedPosition.transform.includes('-100%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : 0)
          console.log('  ⬅️ Adjusted left edge');
        }
        if (rightEdge > mapWidth - edgePadding) {
          selectedPosition.left = mapWidth - edgePadding - (selectedPosition.transform.includes('0%') ? cardWidth : selectedPosition.transform.includes('-50%') ? cardWidth/2 : cardWidth)
          console.log('  ➡️ Adjusted right edge');
        }
        if (topEdge < edgePadding) {
          selectedPosition.top = edgePadding + (selectedPosition.transform.includes('-100%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('0%') ? 0 : cardHeight/2)
          console.log('  ⬆️ Adjusted top edge');
        }
        if (bottomEdge > mapHeight - edgePadding) {
          selectedPosition.top = mapHeight - edgePadding - (selectedPosition.transform.includes('0%') || selectedPosition.transform.includes('-50%') ? cardHeight : selectedPosition.transform.includes('-100%') ? 0 : cardHeight/2)
          console.log('  ⬇️ Adjusted bottom edge');
        }
        
        console.log('  After adjustment:', { left: selectedPosition.left, top: selectedPosition.top });
      }
      
      console.log('🎉 FINAL POSITION:', {
        left: selectedPosition.left,
        top: selectedPosition.top,
        transform: selectedPosition.transform
      });
      console.log('🗺️ MAP POPUP CALCULATION END\n');
      
      el.style.left = `${selectedPosition.left}px`
      el.style.top = `${selectedPosition.top}px`
      el.style.transform = selectedPosition.transform
      el.style.position = 'absolute'
      el.style.zIndex = '1200'
    }
    overlay.onRemove = function () { el.remove() }
    overlay.setMap(map)

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
    properties.forEach((p) => {
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