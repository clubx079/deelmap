'use client'
import { useState, useEffect } from 'react'
import PropertyCard from '@/components/property/PropertyCard'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import BuyerPortalLayout from '@/components/buyer/BuyerPortalLayout'
import { Star, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SavedPropertiesPage() {
  const { user } = useAuth()
  const { loadFavorites } = useFavorites()
  const [favoriteProperties, setFavoriteProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    loadSavedProperties()
  }, [user])

  const loadSavedProperties = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/favorites/list', {
        headers: { Authorization: `Bearer ${user.id}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load saved deals')
      }
      const data = await res.json()
      const properties = data.properties || []
      setFavoriteProperties(properties)
      if (properties.length > 0) loadFavorites(properties.map(p => p.id))
    } catch (err) {
      setError(err.message || 'Failed to load saved deals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handle = () => { if (user) loadSavedProperties() }
    window.addEventListener('favoriteChanged', handle)
    return () => window.removeEventListener('favoriteChanged', handle)
  }, [user])

  if (!user) return null

  return (
    <BuyerPortalLayout pageTitle="Saved Deals">
      <div className="min-h-full bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        {/* Header */}
        <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">Saved Deals</h1>
            <p className="text-[14px] text-[#737370] mt-1">
              {loading
                ? 'Loading...'
                : favoriteProperties.length > 0
                  ? `${favoriteProperties.length} saved ${favoriteProperties.length === 1 ? 'deal' : 'deals'}`
                  : 'Deals you save will appear here'}
            </p>
          </div>
          {favoriteProperties.length > 0 && (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-4 min-h-[44px] bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors flex-shrink-0"
            >
              Browse More
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Content */}
        <div className="px-4 lg:px-6 pb-6">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded border border-[#E8E8E4] animate-pulse overflow-hidden flex min-h-[230px]">
                  <div className="w-[280px] flex-shrink-0 bg-[#F0F0EE]" />
                  <div className="flex-1 p-5 space-y-3">
                    <div className="h-3 bg-[#F0F0EE] rounded w-1/4" />
                    <div className="h-5 bg-[#F0F0EE] rounded w-3/4" />
                    <div className="h-4 bg-[#F0F0EE] rounded w-1/2" />
                    <div className="h-4 bg-[#F0F0EE] rounded w-1/3" />
                    <div className="mt-auto h-8 bg-[#F0F0EE] rounded w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#FEF0EF] flex items-center justify-center">
                <Star className="w-6 h-6 text-[#D03839]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1A1816]">Failed to load saved deals</p>
                <p className="text-[13px] text-[#737370] mt-1">{error}</p>
              </div>
              <button
                onClick={loadSavedProperties}
                className="inline-flex items-center gap-2 px-5 min-h-[44px] bg-[#D03839] text-white text-[13px] font-semibold rounded hover:bg-[#E0493B] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : favoriteProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#F3F3F1] flex items-center justify-center">
                <Star className="w-6 h-6 text-[#A8A8A4]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1A1816]">No saved deals yet</p>
                <p className="text-[13px] text-[#737370] mt-1 max-w-[280px] mx-auto">
                  Start exploring and save deals you're interested in — they'll appear here.
                </p>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-5 min-h-[44px] bg-[#D03839] text-white text-[13px] font-semibold rounded hover:bg-[#E0493B] transition-colors"
              >
                Browse Deals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
              {favoriteProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  layout="horizontal"
                  isLoggedIn={!!user}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
