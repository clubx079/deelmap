'use client'
import { useState, useEffect, useRef } from 'react'
import { supabaseMarketplace } from '@/lib/supabase'

const DEFAULT_PAGE_SIZE = 48

export const useProperties = ({
  filters = {},
  sortBy = 'newest',
  searchQuery = '',
  pageSize = DEFAULT_PAGE_SIZE
} = {}) => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(null)
  const [page, setPage] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    setProperties([])
    setHasMore(true)
    setTotalCount(null)
    setPage(0)
    fetchProperties({ nextPage: 0, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ filters, sortBy, searchQuery, pageSize })])

  const buildQuery = () => {
    let query = supabaseMarketplace
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
      `, { count: 'exact' })

    // Apply state filter (if no states selected, show all)
    if (filters.states && filters.states.length > 0) {
      query = query.in('state', filters.states)
    }

    // Apply status filter - if 'all' is selected or no status, don't filter by status
    const statusesToFilter = filters.statuses && filters.statuses.length > 0
      ? filters.statuses
      : ['all']

    // Only apply status filter if 'all' is not included
    if (!statusesToFilter.includes('all')) {
      query = query.in('status', statusesToFilter)
    }

    // Apply price filters
    if (filters.minPrice && filters.minPrice > 0) {
      query = query.gte('price', filters.minPrice)
    }

    if (filters.maxPrice && filters.maxPrice > 0) {
      query = query.lte('price', filters.maxPrice)
    }

    // Apply bedroom filters
    if (filters.minBeds && filters.minBeds > 0) {
      query = query.gte('bedrooms', filters.minBeds)
    }

    if (filters.maxBeds && filters.maxBeds > 0) {
      query = query.lte('bedrooms', filters.maxBeds)
    }

    // Apply bathroom filters
    if (filters.minBaths && filters.minBaths > 0) {
      query = query.gte('bathrooms', filters.minBaths)
    }

    if (filters.maxBaths && filters.maxBaths > 0) {
      query = query.lte('bathrooms', filters.maxBaths)
    }

    // Apply square footage filters (sqft instead of floor_area)
    if (filters.minFloorArea && filters.minFloorArea > 0) {
      query = query.gte('sqft', filters.minFloorArea)
    }

    if (filters.maxFloorArea && filters.maxFloorArea > 0) {
      query = query.lte('sqft', filters.maxFloorArea)
    }

    // Apply investment metric filters (percent values)
    if (filters.minGrossYield && filters.minGrossYield > 0) {
      query = query.gte('gross_yield', filters.minGrossYield)
    }

    if (filters.maxGrossYield && filters.maxGrossYield > 0) {
      query = query.lte('gross_yield', filters.maxGrossYield)
    }

    if (filters.minCapRate && filters.minCapRate > 0) {
      query = query.gte('cap_rate', filters.minCapRate)
    }

    if (filters.maxCapRate && filters.maxCapRate > 0) {
      query = query.lte('cap_rate', filters.maxCapRate)
    }

    if (filters.minCashOnCash && filters.minCashOnCash > 0) {
      query = query.gte('cash_on_cash', filters.minCashOnCash)
    }

    if (filters.maxCashOnCash && filters.maxCashOnCash > 0) {
      query = query.lte('cash_on_cash', filters.maxCashOnCash)
    }

    const trimmedSearch = searchQuery.trim()
    if (trimmedSearch) {
      // Escape special characters for PostgREST (%, _)
      const escaped = trimmedSearch.replace(/[%_]/g, '\\$&')
      
      // For searches with commas (like "Lexington, KY"), we need to handle them specially
      // PostgREST uses commas as OR separators, so we'll search for the full string
      // and also split by comma to search individual parts
      if (trimmedSearch.includes(',')) {
        // Search for the full string (with comma) in full_address which often contains city, state
        const parts = trimmedSearch.split(',').map(p => p.trim()).filter(p => p)
        if (parts.length > 0) {
          // Search each part individually across all fields
          const searchConditions = []
          parts.forEach(part => {
            const partEscaped = part.replace(/[%_]/g, '\\$&')
            searchConditions.push(
              `address.ilike.%${partEscaped}%,full_address.ilike.%${partEscaped}%,city.ilike.%${partEscaped}%,state.ilike.%${partEscaped}%,zip_code.ilike.%${partEscaped}%`
            )
          })
          // Also search for the full string in full_address
          searchConditions.push(`full_address.ilike.%${escaped}%`)
          query = query.or(searchConditions.join(','))
        }
      } else {
        // Simple search without commas
      query = query.or(
        `address.ilike.%${escaped}%,full_address.ilike.%${escaped}%,city.ilike.%${escaped}%,state.ilike.%${escaped}%,zip_code.ilike.%${escaped}%`
      )
      }
    }

    if (sortBy === 'price-low') {
      query = query.order('price', { ascending: true, nullsFirst: false })
    } else if (sortBy === 'price-high') {
      query = query.order('price', { ascending: false, nullsFirst: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    return query
  }

  const fetchProperties = async ({ nextPage = 0, replace = false } = {}) => {
    const requestId = ++requestIdRef.current

    try {
      if (replace) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const from = nextPage * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await buildQuery().range(from, to)

      if (requestId !== requestIdRef.current) return

      if (error) {
        console.error('Supabase error:', error)
        // Convert technical errors to user-friendly messages
        let userFriendlyError = 'Unable to load properties. Please try again.'
        
        if (error.message) {
          const errorMsg = error.message.toLowerCase()
          if (errorMsg.includes('parse') || errorMsg.includes('logic tree') || errorMsg.includes('syntax')) {
            userFriendlyError = 'There was an issue with your search. Please try a different search term.'
          } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            userFriendlyError = 'Network error. Please check your connection and try again.'
          } else if (errorMsg.includes('timeout')) {
            userFriendlyError = 'Request timed out. Please try again.'
          } else if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
            userFriendlyError = 'You don\'t have permission to view these properties.'
          }
        }
        
        throw new Error(userFriendlyError)
      }

      setTotalCount(typeof count === 'number' ? count : null)
      setProperties(prev =>
        replace ? (data || []) : [...prev, ...(data || [])]
      )
      setHasMore((data?.length || 0) === pageSize)
      setPage(nextPage)
    } catch (err) {
      console.error('Error fetching properties:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return
    fetchProperties({ nextPage: page + 1 })
  }

  const refetch = () => fetchProperties({ nextPage: 0, replace: true })

  return {
    properties,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refetch
  }
}