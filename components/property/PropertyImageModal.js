'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPreferredPhotoUrl, getThumbnailUrl } from '@/utils/propertyPhotos'
import { getStartingTier, recordImageLoad } from '@/utils/adaptiveImageLoader'

const QUALITY_TIERS = [150, 400, 800, 1200, 2400, null]

export function PropertyImageModal({ isOpen, onClose, photos, initialIndex = 0, onPhotoView, preloadedUrl = null }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [currentTier, setCurrentTier] = useState(0)
  const [displayUrl, setDisplayUrl] = useState('')
  const tierRef = useRef(0)
  const indexRef = useRef(currentIndex)
  const loadStartRef = useRef(0)
  const thumbStripRef = useRef(null)

  const getUrlForTier = useCallback((photo, tier) => {
    const width = QUALITY_TIERS[tier]
    if (width === null) return getPreferredPhotoUrl(photo) || '/placeholder.jpg'
    return getThumbnailUrl(photo, width) || getPreferredPhotoUrl(photo) || '/placeholder.jpg'
  }, [])

  // Progressive load on photo change
  useEffect(() => {
    if (!isOpen || !photos || photos.length === 0) return
    const photo = photos[currentIndex]
    const startTier = getStartingTier(QUALITY_TIERS)
    tierRef.current = startTier
    indexRef.current = currentIndex
    setCurrentTier(startTier)
    setImageLoaded(false)
    loadStartRef.current = performance.now()
    setDisplayUrl(getUrlForTier(photo, startTier))
  }, [currentIndex, isOpen, photos, getUrlForTier])

  const handleImageLoaded = useCallback(() => {
    setImageLoaded(true)
    const duration = performance.now() - loadStartRef.current
    const tierWidth = QUALITY_TIERS[tierRef.current] || 2400
    recordImageLoad(tierWidth * tierWidth * 0.1, duration)
    const nextTier = tierRef.current + 1
    if (nextTier < QUALITY_TIERS.length && indexRef.current === currentIndex) {
      const photo = photos[currentIndex]
      const nextUrl = getUrlForTier(photo, nextTier)
      const img = new window.Image()
      loadStartRef.current = performance.now()
      img.onload = () => {
        if (indexRef.current === currentIndex) {
          const dur = performance.now() - loadStartRef.current
          const w = QUALITY_TIERS[nextTier] || 2400
          recordImageLoad(w * w * 0.1, dur)
          tierRef.current = nextTier
          setCurrentTier(nextTier)
          setDisplayUrl(nextUrl)
        }
      }
      img.src = nextUrl
    }
  }, [currentIndex, photos, getUrlForTier])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setImageLoaded(false)
      // Scroll thumbnail into view
      setTimeout(() => {
        const el = document.getElementById(`thumb-${initialIndex}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }, 100)
    }
  }, [isOpen, initialIndex])

  // Scroll active thumbnail into view on change
  useEffect(() => {
    const el = document.getElementById(`thumb-${currentIndex}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex])

  // Preload all photos at 800px when modal opens
  useEffect(() => {
    if (!isOpen || !photos || photos.length === 0) return
    photos.forEach((photo) => {
      const url = getUrlForTier(photo, 2) // tier 2 = 800px
      if (url) { const img = new window.Image(); img.src = url }
    })
  }, [isOpen, photos, getUrlForTier])

  // Preload adjacent images at full res after current loads
  useEffect(() => {
    if (!imageLoaded || !isOpen || photos.length <= 1) return
    ;[(currentIndex + 1) % photos.length, (currentIndex - 1 + photos.length) % photos.length].forEach((idx) => {
      const url = getUrlForTier(photos[idx], 4) // tier 4 = 2400px
      if (url) { const img = new window.Image(); img.src = url }
    })
  }, [imageLoaded, currentIndex, isOpen, photos, getUrlForTier])

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, photos?.length])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !photos || photos.length === 0) return null

  const currentPhoto = photos[currentIndex]
  const currentPhotoUrl = displayUrl || getUrlForTier(currentPhoto, 0)

  const handleNext = () => {
    const next = (currentIndex + 1) % photos.length
    setCurrentIndex(next)
    if (typeof onPhotoView === 'function') onPhotoView(next)
  }

  const handlePrev = () => {
    const prev = (currentIndex - 1 + photos.length) % photos.length
    setCurrentIndex(prev)
    if (typeof onPhotoView === 'function') onPhotoView(prev)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[#0D0D0D]" onClick={onClose}>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/50 text-[13px] font-medium">
          {currentIndex + 1} <span className="text-white/25">/</span> {photos.length}
        </span>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image */}
      <div
        className="flex-1 flex items-center justify-center px-14 min-h-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading spinner */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          </div>
        )}

        <img
          key={`${currentIndex}-${currentTier}`}
          src={currentPhotoUrl}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ maxHeight: 'calc(100vh - 180px)' }}
          onLoad={handleImageLoaded}
        />

        {/* Prev arrow */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Next arrow */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div
          className="flex-shrink-0 px-5 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={thumbStripRef}
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {photos.map((photo, idx) => {
              const url = getThumbnailUrl(photo, 150) || getPreferredPhotoUrl(photo) || '/placeholder.jpg'
              const isActive = idx === currentIndex
              return (
                <button
                  id={`thumb-${idx}`}
                  key={photo.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx)
                    if (typeof onPhotoView === 'function') onPhotoView(idx)
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all duration-150 ${
                    isActive
                      ? 'ring-2 ring-white opacity-100'
                      : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
