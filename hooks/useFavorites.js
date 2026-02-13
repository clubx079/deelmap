'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState({}) // Map of property_id -> true
  const [loading, setLoading] = useState(false)

  // Get auth token from user
  const getAuthHeader = () => {
    if (!user?.id) return null
    return `Bearer ${user.id}`
  }

  // Check if a property is favorited
  const isFavorited = useCallback((propertyId) => {
    return favorites[propertyId] === true
  }, [favorites])

  // Load favorites for multiple properties (batch check)
  const loadFavorites = useCallback(async (propertyIds) => {
    if (!user?.id || !propertyIds || propertyIds.length === 0) {
      return
    }

    try {
      const authHeader = getAuthHeader()
      if (!authHeader) return

      const response = await fetch('/api/favorites/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ property_ids: propertyIds })
      })

      if (response.ok) {
        const data = await response.json()
        setFavorites(prev => ({ ...prev, ...data.favorited }))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [user])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (propertyId) => {
    if (!user?.id) {
      throw new Error('Please log in to save favorites')
    }

    setLoading(true)
    try {
      const authHeader = getAuthHeader()
      const isCurrentlyFavorited = isFavorited(propertyId)

      const url = isCurrentlyFavorited 
        ? `/api/favorites?property_id=${propertyId}`
        : '/api/favorites'
      
      const method = isCurrentlyFavorited ? 'DELETE' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        ...(method === 'POST' && { body: JSON.stringify({ property_id: propertyId }) })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update favorite')
      }

      // Update local state
      setFavorites(prev => {
        const updated = { ...prev }
        if (isCurrentlyFavorited) {
          delete updated[propertyId]
        } else {
          updated[propertyId] = true
        }
        return updated
      })

      return !isCurrentlyFavorited
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, isFavorited])

  // Get all user favorites
  const getUserFavorites = useCallback(async () => {
    if (!user?.id) {
      return []
    }

    try {
      const authHeader = getAuthHeader()
      if (!authHeader) return []

      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': authHeader
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.favorites || []
      }
    } catch (error) {
      console.error('Error fetching user favorites:', error)
    }

    return []
  }, [user])

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    loadFavorites,
    getUserFavorites,
    loading
  }
}
