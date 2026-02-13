'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useProperties } from '@/hooks/useProperties'
import { getPrimaryPhotoUrl } from '@/utils/propertyPhotos'
import { useAuth } from '@/hooks/useAuth'

export function PropertiesSlider() {
  const { user } = useAuth()
  const { properties, loading } = useProperties({
    filters: { statuses: ['available'] },
    sortBy: 'newest',
    pageSize: 15
  })
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Limit to 15 properties
  const displayProperties = properties.slice(0, 15)
  
  // Calculate number of slides (3 properties per slide)
  const slidesCount = Math.ceil(displayProperties.length / 3)

  // Auto-slide functionality
  useEffect(() => {
    if (displayProperties.length === 0 || isPaused || slidesCount <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slidesCount)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [displayProperties.length, isPaused, slidesCount])

  const goToSlide = (index) => {
    setCurrentIndex(index)
    setIsPaused(true)
    // Resume auto-slide after 10 seconds
    setTimeout(() => setIsPaused(false), 10000)
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slidesCount)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 10000)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slidesCount) % slidesCount)
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 10000)
  }

  // Get properties for current slide
  const getCurrentSlideProperties = () => {
    const start = currentIndex * 3
    return displayProperties.slice(start, start + 3)
  }

  const formatPrice = (price) => {
    if (!price) return 'Contact for Price'
    return `$${Math.round(price).toLocaleString()}`
  }

  const getDisplayAddress = (property) => {
    const fullAddress = property.full_address || 
      `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zip_code || ''}`.trim()
    
    if (user) return fullAddress
    
    const firstCommaIndex = fullAddress.indexOf(',')
    if (firstCommaIndex === -1) return fullAddress
    return fullAddress.substring(firstCommaIndex + 1).trim()
  }

  // Shimmer skeleton component
  const PropertySkeleton = () => (
    <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="h-48 bg-slate-200"></div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-6 bg-slate-200 rounded w-32"></div>
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-px bg-slate-200 my-3"></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-8 bg-slate-200 rounded"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
          <div className="h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Featured Properties
            </h2>
            <p className="text-slate-600 text-lg">
              Discover exclusive deals before they hit the market
            </p>
          </div>

          {/* Shimmer Loading State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PropertySkeleton />
            <PropertySkeleton />
            <PropertySkeleton />
          </div>
        </div>
      </section>
    )
  }

  if (displayProperties.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Featured Properties
          </h2>
          <p className="text-slate-600 text-lg">
            Discover exclusive deals before they hit the market
          </p>
        </div>

        {/* Properties Slider */}
        <div className="relative">
          {/* Navigation Arrows - Outside container */}
          {slidesCount > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 hidden lg:block bg-white border-2 border-slate-300 rounded-full p-3 hover:border-slate-900 hover:bg-slate-50 transition-all shadow-lg z-10"
                aria-label="Previous properties"
              >
                <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hidden lg:block bg-white border-2 border-slate-300 rounded-full p-3 hover:border-slate-900 hover:bg-slate-50 transition-all shadow-lg z-10"
                aria-label="Next properties"
              >
                <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Properties Grid */}
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {Array.from({ length: slidesCount }).map((_, slideIndex) => {
                const slideProperties = displayProperties.slice(slideIndex * 3, slideIndex * 3 + 3)
                return (
                  <div
                    key={slideIndex}
                    className="w-full flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 px-2"
                  >
                    {slideProperties.map((property) => {
                      const featureImage = getPrimaryPhotoUrl(property.property_photos) ||
                        'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Property+Image'
                      
                      return (
                        <Link
                          key={property.id}
                          href={`/${property.id}`}
                          className="group bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-slate-900 transition-all duration-300 hover:shadow-lg"
                        >
                          {/* Property Image */}
                          <div className="relative h-48 overflow-hidden bg-slate-100">
                            <Image
                              src={featureImage}
                              alt={getDisplayAddress(property)}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            
                            {/* Status Badge */}
                            {property.status && (
                              <div className="absolute top-2 left-2">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                  property.status.toLowerCase() === 'sold' 
                                    ? 'bg-red-500 text-white' 
                                    : property.status.toLowerCase() === 'pending'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-900 text-white'
                                }`}>
                                  {property.status.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Property Details */}
                          <div className="p-4">
                            {/* Price */}
                            <div className="text-xl font-bold text-slate-900 mb-1.5">
                              {formatPrice(property.price)}
                            </div>

                            {/* Address */}
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2 min-h-[2rem]">
                              {getDisplayAddress(property)}
                            </p>

                            {/* Property Features */}
                            <div className="flex items-center gap-3 text-xs text-slate-700 mb-3 pb-3 border-b border-slate-200">
                              {property.bedrooms && (
                                <span className="font-medium">{property.bedrooms} bed</span>
                              )}
                              {property.bathrooms && (
                                <span className="font-medium">{property.bathrooms} bath</span>
                              )}
                              {property.sqft && (
                                <span className="font-medium">{property.sqft.toLocaleString()} sqft</span>
                              )}
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-3 gap-2">
                              {property.gross_yield && (
                                <div>
                                  <div className="text-[10px] text-slate-500 mb-0.5">Gross Yield</div>
                                  <div className="text-sm font-bold text-slate-900">
                                    {property.gross_yield}%
                                  </div>
                                </div>
                              )}
                              {property.cap_rate && (
                                <div>
                                  <div className="text-[10px] text-slate-500 mb-0.5">Cap Rate</div>
                                  <div className="text-sm font-bold text-slate-900">
                                    {property.cap_rate}%
                                  </div>
                                </div>
                              )}
                              {property.cash_on_cash && (
                                <div>
                                  <div className="text-[10px] text-slate-500 mb-0.5">Cash on Cash</div>
                                  <div className="text-sm font-bold text-slate-900">
                                    {property.cash_on_cash}%
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Dot Navigation */}
        {slidesCount > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {Array.from({ length: slidesCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-3 h-3 bg-slate-900'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* View All Link */}
        <div className="text-center mt-10">
          <Link
            href="/marketplace"
            className="inline-block bg-slate-900 text-white px-8 py-3 text-sm font-semibold transition-all hover:bg-slate-800 rounded-lg"
          >
            View All Properties
          </Link>
        </div>
      </div>
    </section>
  )
}
