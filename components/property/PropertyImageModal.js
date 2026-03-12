'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPreferredPhotoUrl, getThumbnailUrl } from '@/utils/propertyPhotos'

// Progressive quality tiers: load fast low-res first, then upgrade
const QUALITY_TIERS = [150, 400, 800, 1200, 2400, null] // null = full original

export function PropertyImageModal({ isOpen, onClose, photos, initialIndex = 0, onPhotoView, preloadedUrl = null }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [thumbnailIndex, setThumbnailIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [currentTier, setCurrentTier] = useState(0)
  const [displayUrl, setDisplayUrl] = useState('')
  const [thumbnailsPerView, setThumbnailsPerView] = useState(8)
  const tierRef = useRef(0)
  const indexRef = useRef(currentIndex)

  // Get URL for a given quality tier
  const getUrlForTier = useCallback((photo, tier) => {
    const width = QUALITY_TIERS[tier]
    if (width === null) return getPreferredPhotoUrl(photo) || '/placeholder.jpg'
    return getThumbnailUrl(photo, width) || getPreferredPhotoUrl(photo) || '/placeholder.jpg'
  }, [])

  // Progressive loading: start at tier 0, upgrade as each loads
  useEffect(() => {
    if (!isOpen || !photos || photos.length === 0) return
    const photo = photos[currentIndex]
    tierRef.current = 0
    indexRef.current = currentIndex
    setCurrentTier(0)
    setImageLoaded(false)
    setDisplayUrl(getUrlForTier(photo, 0))
  }, [currentIndex, isOpen, photos, getUrlForTier])

  const handleImageLoaded = useCallback(() => {
    setImageLoaded(true)
    const nextTier = tierRef.current + 1
    if (nextTier < QUALITY_TIERS.length && indexRef.current === currentIndex) {
      const photo = photos[currentIndex]
      const nextUrl = getUrlForTier(photo, nextTier)
      const img = new window.Image()
      img.onload = () => {
        if (indexRef.current === currentIndex) {
          tierRef.current = nextTier
          setCurrentTier(nextTier)
          setDisplayUrl(nextUrl)
        }
      }
      img.src = nextUrl
    }
  }, [currentIndex, photos, getUrlForTier])

  // Calculate how many thumbnails can fit based on container width
  useEffect(() => {
    if (!isOpen || !photos || photos.length === 0) return

    const calculateThumbnailsPerView = () => {
      if (typeof window === 'undefined') return 8
      const containerWidth = window.innerWidth
      const thumbnailWidth = 96 // w-24 = 96px
      const gap = 8 // gap-2 = 8px
      const padding = 96 // px-12 on each side = 96px total
      const availableWidth = containerWidth - padding
      const calculated = Math.floor(availableWidth / (thumbnailWidth + gap))
      return Math.max(4, Math.min(calculated, photos.length))
    }

    const updateThumbnailsPerView = () => {
      setThumbnailsPerView(calculateThumbnailsPerView())
    }

    updateThumbnailsPerView()
    window.addEventListener('resize', updateThumbnailsPerView)
    return () => window.removeEventListener('resize', updateThumbnailsPerView)
  }, [isOpen, photos])

  // Update current index when modal opens with new initialIndex
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setImageLoaded(false)
      const newThumbnailIndex = Math.max(0, initialIndex - Math.floor(thumbnailsPerView / 2))
      setThumbnailIndex(newThumbnailIndex)
    }
  }, [isOpen, initialIndex, thumbnailsPerView])

  // Preload next/prev first tier when current image loads
  useEffect(() => {
    if (!imageLoaded || !isOpen || photos.length <= 1) return
    const toPreload = [
      (currentIndex + 1) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ]
    toPreload.forEach((idx) => {
      const url = getUrlForTier(photos[idx], 0)
      if (url) {
        const img = new window.Image()
        img.src = url
      }
    })
  }, [imageLoaded, currentIndex, isOpen, photos, getUrlForTier])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, photos.length])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !photos || photos.length === 0) return null

  const currentPhoto = photos[currentIndex]
  const currentPhotoUrl = displayUrl || getUrlForTier(currentPhoto, 0)

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % photos.length
    setCurrentIndex(nextIndex)
    if (typeof onPhotoView === 'function') onPhotoView(nextIndex)
    // Auto-scroll thumbnails
    if (currentIndex >= thumbnailIndex + thumbnailsPerView - 1) {
      setThumbnailIndex((prev) => Math.min(prev + 1, photos.length - thumbnailsPerView))
    }
  }

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length
    setCurrentIndex(prevIndex)
    if (typeof onPhotoView === 'function') onPhotoView(prevIndex)
    // Auto-scroll thumbnails
    if (currentIndex <= thumbnailIndex) {
      setThumbnailIndex((prev) => Math.max(0, prev - 1))
    }
  }

  const handleThumbnailClick = (index) => {
    setCurrentIndex(index)
    if (typeof onPhotoView === 'function') onPhotoView(index)
    // Scroll thumbnails to show selected image
    if (index < thumbnailIndex) {
      setThumbnailIndex(Math.max(0, index - 2))
    } else if (index >= thumbnailIndex + thumbnailsPerView) {
      setThumbnailIndex(Math.min(index - thumbnailsPerView + 1, photos.length - thumbnailsPerView))
    }
  }

  // Calculate visible thumbnails - show all if they fit, otherwise show scrollable set
  const visibleThumbnails = photos.length <= thumbnailsPerView
    ? photos
    : photos.slice(
        thumbnailIndex,
        Math.min(thumbnailIndex + thumbnailsPerView, photos.length)
      )

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-black overflow-hidden w-full max-w-[100vw]"
      style={{ left: 0, right: 0, width: '100vw' }}
      onClick={onClose}
    >
      {/* Close Button - z-[10001] so it stays above navbar and overlay */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10001] bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors shrink-0"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Image Container - no horizontal scroll: constrain to viewport */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 min-h-0 min-w-0 w-full max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Image - fits within viewport, no horizontal scroll */}
        <div className="relative w-full max-w-full flex-1 min-h-0 mb-2 sm:mb-4 overflow-hidden bg-black/80" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Loading spinner - shown until first tier loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <div className="w-16 h-16 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <img
            key={`${currentIndex}-${currentTier}`}
            src={currentPhotoUrl}
            alt={`Property photo ${currentIndex + 1} of ${photos.length}`}
            className="absolute inset-0 w-full h-full object-contain object-center"
            onLoad={handleImageLoaded}
          />

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Slider */}
        {photos.length > 1 && (
          <div className="w-full max-w-full mx-auto px-2 sm:px-4 shrink-0">
            <div className="relative flex items-center gap-2 max-w-full overflow-hidden">
              {/* Left Scroll Button - Only show if there are more thumbnails to scroll */}
              {photos.length > thumbnailsPerView && thumbnailIndex > 0 && (
                <button
                  onClick={() => setThumbnailIndex((prev) => Math.max(0, prev - 1))}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors z-10 flex-shrink-0"
                  aria-label="Scroll thumbnails left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Thumbnail Container - Constrained width to prevent overflow */}
              <div 
                className="flex gap-2 flex-1 justify-center overflow-hidden"
                style={{ 
                  marginLeft: photos.length > thumbnailsPerView && thumbnailIndex > 0 ? '40px' : '0',
                  marginRight: photos.length > thumbnailsPerView && thumbnailIndex + thumbnailsPerView < photos.length ? '40px' : '0'
                }}
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {visibleThumbnails.map((photo, idx) => {
                    const actualIndex = photos.length <= thumbnailsPerView ? idx : thumbnailIndex + idx
                    const thumbnailUrl = getThumbnailUrl(photo, 150) || '/placeholder.jpg'
                    const isActive = actualIndex === currentIndex

                    return (
                      <button
                        key={photo.id || actualIndex}
                        onClick={() => handleThumbnailClick(actualIndex)}
                        className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                          isActive
                            ? 'border-white scale-110'
                            : 'border-white/30 hover:border-white/60'
                        }`}
                      >
                        <img
                          src={thumbnailUrl}
                          alt={`Thumbnail ${actualIndex + 1}`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-white/20" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Scroll Button - Only show if there are more thumbnails to scroll */}
              {photos.length > thumbnailsPerView && thumbnailIndex + thumbnailsPerView < photos.length && (
                <button
                  onClick={() =>
                    setThumbnailIndex((prev) =>
                      Math.min(prev + 1, photos.length - thumbnailsPerView)
                    )
                  }
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors z-10 flex-shrink-0"
                  aria-label="Scroll thumbnails right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
