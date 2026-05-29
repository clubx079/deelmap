'use client'
import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader'

export function SimpleMap({ properties, onMarkerClick, className = '' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)
  const overlayRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInstanceRef.current) {
      loadGoogleMaps()
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      updateMarkers()
    }
  }, [properties, isLoaded])

  const loadGoogleMaps = () => {
    loadGoogleMapsAPI().then(() => {
      initMap()
    }).catch((error) => {
      console.error('Failed to load Google Maps API:', error)
    })
  }

  const initMap = () => {
    if (!mapRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 4,
      center: { lat: 39.8283, lng: -98.5795 },
      styles: [
        {
          featureType: 'water',
          elementType: 'all',
          stylers: [{ color: '#a2daf2' }]
        }
      ]
    })

    const overlay = new window.google.maps.OverlayView()
    overlay.onAdd = () => {}
    overlay.draw = () => {}
    overlay.onRemove = () => {}
    overlay.setMap(map)

    mapInstanceRef.current = map
    overlayRef.current = overlay
    setIsLoaded(true)
  }

  const updateMarkers = () => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (!mapInstanceRef.current) return

    const bounds = new window.google.maps.LatLngBounds()

    properties.forEach(property => {
      if (property.latitude && property.longitude) {
        const price = Number(property.price)
        const formattedPrice = isFinite(price) ? `$${Math.round(price/1000)}K` : 'N/A'
        
        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(property.latitude), lng: parseFloat(property.longitude) },
          map: mapInstanceRef.current,
          title: property.address,
          label: {
            text: formattedPrice,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2
          }
        })

        marker.addListener('click', () => {
          onMarkerClick?.(property)
          showInfoWindow(property, marker)
        })

        markersRef.current.push(marker)
        bounds.extend(marker.getPosition())
      }
    })

    if (properties.length > 0 && !bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds)
    }
  }

  const showInfoWindow = (property, marker) => {
    if (!mapInstanceRef.current) return
    const price = Number(property.price)
    const formattedPrice = isFinite(price) ? `$${price.toLocaleString()}` : 'N/A'

    if (infoWindowRef.current) {
      infoWindowRef.current.close()
      infoWindowRef.current = null
    }

    const getPixelOffset = () => {
      if (!overlayRef.current || !mapRef.current) {
        return new window.google.maps.Size(0, -24)
      }

      const projection = overlayRef.current.getProjection?.()
      if (!projection) {
        return new window.google.maps.Size(0, -24)
      }

      const point = projection.fromLatLngToDivPixel(marker.getPosition())
      if (!point) {
        return new window.google.maps.Size(0, -24)
      }

      const mapWidth = mapRef.current.clientWidth || 0
      const mapHeight = mapRef.current.clientHeight || 0

      const preferLeft = point.x > mapWidth * 0.5
      const preferUp = point.y > mapHeight * 0.5

      const horizontalOffset = preferLeft ? -220 : 20
      const verticalOffset = preferUp ? -170 : 60

      return new window.google.maps.Size(horizontalOffset, verticalOffset)
    }

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; min-width: 200px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${formattedPrice}</div>
          <div style="margin-bottom: 8px;">${property.address}</div>
          <div style="font-size: 12px; color: #666;">
            ${property.bedrooms || 0} beds • ${property.bathrooms || 0} baths
          </div>
        </div>
      `,
      disableAutoPan: true,
      pixelOffset: getPixelOffset(),
    })

    infoWindowRef.current = infoWindow
    infoWindow.open(mapInstanceRef.current, marker)

    const adjustInfoWindowPosition = () => {
      if (!mapRef.current || !mapInstanceRef.current) return
      const infoWindowEl = mapRef.current.querySelector('.gm-style-iw')
      if (!infoWindowEl) return

      const mapRect = mapRef.current.getBoundingClientRect()
      const infoRect = infoWindowEl.getBoundingClientRect()
      const padding = 60
      const bottomPadding = 140
      let dx = 0
      let dy = 0

      const desiredLeft = mapRect.left + padding
      const desiredRight = mapRect.right - padding
      const desiredTop = mapRect.top + padding
      const desiredBottom = mapRect.bottom - bottomPadding

      if (infoRect.left < desiredLeft) {
        dx = infoRect.left - desiredLeft
      } else if (infoRect.right > desiredRight) {
        dx = infoRect.right - desiredRight
      }

      if (infoRect.top < desiredTop) {
        dy = infoRect.top - desiredTop
      } else if (infoRect.bottom > desiredBottom) {
        dy = -(infoRect.bottom - desiredBottom)
      }

      if (dx !== 0 || dy !== 0) {
        mapInstanceRef.current.panBy(dx, dy)
      }
    }

    // Ensure the info window stays within the visible map area.
    window.google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
      requestAnimationFrame(adjustInfoWindowPosition)
      setTimeout(adjustInfoWindowPosition, 120)
    })
  }

  if (!isLoaded) {
    return (
      <div className={`${className} bg-[#E8E8E4] animate-pulse flex items-center justify-center`}>
        <span className="text-[#737370]">Loading map...</span>
      </div>
    )
  }

  return <div ref={mapRef} className={className} />
}