'use client'
import { useState, useEffect, useRef } from 'react'

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
  const [metadata, setMetadata] = useState(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    setProperties([])
    setHasMore(true)
    setTotalCount(null)
    setPage(0)
    fetchProperties({ nextPage: 0, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ filters, sortBy, searchQuery, pageSize })])

  const buildQueryParams = (currentPage) => {
    const params = new URLSearchParams()
    
    // Pagination
    params.append('page', (currentPage + 1).toString())
    params.append('limit', pageSize.toString())
    
    // Sorting
    params.append('sortBy', sortBy)
    
    // Search
    if (searchQuery && searchQuery.trim()) {
      params.append('searchQuery', searchQuery.trim())
    }
    
    // State filter
    if (filters.states && filters.states.length > 0) {
      params.append('states', filters.states.join(','))
    }
    
    // Status filter - if 'all' is selected or no status, don't filter by status
    const statusesToFilter = filters.statuses && filters.statuses.length > 0
      ? filters.statuses
      : ['all']
    
    // Only apply status filter if 'all' is not included
    if (!statusesToFilter.includes('all')) {
      // Note: Status filtering will be applied in the API
      // For now, we'll let the API handle this logic
    }
    
    // Price filters
    if (filters.minPrice && filters.minPrice > 0) {
      params.append('minPrice', filters.minPrice.toString())
    }
    if (filters.maxPrice && filters.maxPrice > 0) {
      params.append('maxPrice', filters.maxPrice.toString())
    }
    
    // Bedroom filters
    if (filters.minBeds && filters.minBeds > 0) {
      params.append('minBedrooms', filters.minBeds.toString())
    }
    if (filters.maxBeds && filters.maxBeds > 0) {
      params.append('maxBedrooms', filters.maxBeds.toString())
    }
    
    // Bathroom filters
    if (filters.minBaths && filters.minBaths > 0) {
      params.append('minBathrooms', filters.minBaths.toString())
    }
    if (filters.maxBaths && filters.maxBaths > 0) {
      params.append('maxBathrooms', filters.maxBaths.toString())
    }
    
    // Square footage filters
    if (filters.minFloorArea && filters.minFloorArea > 0) {
      params.append('minSqft', filters.minFloorArea.toString())
    }
    if (filters.maxFloorArea && filters.maxFloorArea > 0) {
      params.append('maxSqft', filters.maxFloorArea.toString())
    }
    
    // Investment metric filters
    if (filters.minGrossYield && filters.minGrossYield > 0) {
      params.append('minYield', filters.minGrossYield.toString())
    }
    if (filters.maxGrossYield && filters.maxGrossYield > 0) {
      params.append('maxYield', filters.maxGrossYield.toString())
    }
    if (filters.minCapRate && filters.minCapRate > 0) {
      params.append('minCapRate', filters.minCapRate.toString())
    }
    if (filters.maxCapRate && filters.maxCapRate > 0) {
      params.append('maxCapRate', filters.maxCapRate.toString())
    }
    
    return params
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

      const params = buildQueryParams(nextPage)
      const response = await fetch(`/api/deals?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      
      const result = await response.json()

      if (requestId !== requestIdRef.current) return

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch properties')
      }

      setTotalCount(result.totalCount)
      setProperties(prev =>
        replace ? (result.properties || []) : [...prev, ...(result.properties || [])]
      )
      setHasMore(result.hasMore)
      setPage(nextPage)
      setMetadata(result.metadata)
      
    } catch (err) {
      console.error('Error fetching properties:', err)
      
      // Convert technical errors to user-friendly messages
      let userFriendlyError = 'Unable to load properties. Please try again.'
      
      if (err.message) {
        const errorMsg = err.message.toLowerCase()
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          userFriendlyError = 'Network error. Please check your connection and try again.'
        } else if (errorMsg.includes('timeout')) {
          userFriendlyError = 'Request timed out. Please try again.'
        } else if (errorMsg.includes('api request failed')) {
          userFriendlyError = 'Server error. Please try again later.'
        }
      }
      
      setError(userFriendlyError)
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
    refetch,
    metadata
  }
}