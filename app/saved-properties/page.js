'use client'
import { useState, useEffect } from 'react'
import PropertyCard from '@/components/property/PropertyCard'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import { supabaseMarketplace } from '@/lib/supabase'
import BuyerPortalLayout from '@/components/buyer/BuyerPortalLayout'
import { Heart, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SavedPropertiesPage() {
  const { user } = useAuth()
  const { getUserFavorites, loadFavorites } = useFavorites()
  const [favoriteProperties, setFavoriteProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadSavedProperties()
  }, [user])

  const loadSavedProperties = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get user's favorite property IDs
      const favorites = await getUserFavorites()
      const propertyIds = favorites.map(f => f.property_id)

      if (propertyIds.length === 0) {
        setFavoriteProperties([])
        setLoading(false)
        return
      }

      // Fetch property details from wholesale_deals (marketplace database)
      const { data: properties, error: fetchError } = await supabaseMarketplace
        .from('wholesale_deals')
        .select(`
          id,
          price,
          bedrooms,
          bathrooms,
          sqft,
          full_address,
          address,
          city,
          state,
          zip_code,
          status,
          gross_yield,
          cap_rate,
          cash_on_cash,
          price_per_square_foot,
          year_built,
          address_google_lat,
          address_google_lng,
          created_at,
          property_photos (
            id,
            photo_url,
            optimized_url,
            original_url,
            display_order
          )
        `)
        .in('id', propertyIds)

      if (fetchError) {
        throw fetchError
      }

      // Maintain the order from favorites (most recent first)
      const favoritesMap = new Map(
        favorites.map(f => [f.property_id, f.created_at])
      )
      
      const sortedProperties = (properties || []).sort((a, b) => {
        const aDate = favoritesMap.get(a.id) || 0
        const bDate = favoritesMap.get(b.id) || 0
        return new Date(bDate) - new Date(aDate)
      })

      setFavoriteProperties(sortedProperties)
      
      // Load favorite status for all properties
      if (sortedProperties.length > 0) {
        loadFavorites(sortedProperties.map(p => p.id))
      }
    } catch (err) {
      console.error('Error loading saved properties:', err)
      setError(err.message || 'Failed to load saved properties')
    } finally {
      setLoading(false)
    }
  }

  // Listen for favorite changes to refresh the list
  useEffect(() => {
    const handleFavoriteChange = () => {
      if (user) {
        loadSavedProperties()
      }
    }
    window.addEventListener('favoriteChanged', handleFavoriteChange)
    return () => window.removeEventListener('favoriteChanged', handleFavoriteChange)
  }, [user])

  if (!user) return null

  return (
    <BuyerPortalLayout>
    <div className="min-h-full bg-slate-50 pt-12 lg:pt-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Saved Properties</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {favoriteProperties.length > 0
                  ? `You have ${favoriteProperties.length} saved ${favoriteProperties.length === 1 ? 'property' : 'properties'}`
                  : 'Properties you save will appear here'}
              </p>
            </div>
            {favoriteProperties.length > 0 && (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Browse More Properties
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse">
                <div className="h-[200px] bg-slate-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Properties</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={loadSavedProperties}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : favoriteProperties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <Star className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Saved Properties Yet</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Start exploring properties and save your favorites for easy access later
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Browse Properties
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
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
