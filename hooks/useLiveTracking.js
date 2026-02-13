// hooks/useLiveTracking.js
// Tracks live user sessions across the website for real-time analytics
import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'

const HEARTBEAT_INTERVAL = 10000 // 10 seconds
const SESSION_TIMEOUT = 30000 // 30 seconds without heartbeat = inactive

export function useLiveTracking() {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const sessionIdRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)
  const pageStartTimeRef = useRef(null)
  const lastPageRef = useRef(null)
  const isInitializedRef = useRef(false)

  // Generate or retrieve session ID
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return null

    const storageKey = 'live_session_id'
    let sessionId = sessionStorage.getItem(storageKey)

    if (!sessionId) {
      sessionId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(storageKey, sessionId)
    }

    return sessionId
  }, [])

  // Get device info
  const getDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return {}

    const ua = navigator.userAgent
    let deviceType = 'desktop'
    let browser = 'Unknown'
    let os = 'Unknown'

    // Detect device type
    if (/Mobi|Android/i.test(ua)) {
      deviceType = 'mobile'
    } else if (/Tablet|iPad/i.test(ua)) {
      deviceType = 'tablet'
    }

    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'MacOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    return { deviceType, browser, os }
  }, [])

  // Get UTM parameters
  const getUTMParams = useCallback(() => {
    if (typeof window === 'undefined') return {}

    const params = new URLSearchParams(window.location.search)
    return {
      utm_source: params.get('utm_source') || params.get('u') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null
    }
  }, [])

  // Get page title
  const getPageTitle = useCallback(() => {
    if (typeof window === 'undefined') return pathname
    return document.title || pathname
  }, [pathname])

  // Extract property info from pathname if on a property page
  const getPropertyInfo = useCallback(() => {
    // Property pages are typically /[id] format (UUID)
    if (pathname && pathname !== '/' && !pathname.startsWith('/login') &&
        !pathname.startsWith('/signup') && !pathname.startsWith('/marketplace') &&
        !pathname.startsWith('/about') && !pathname.startsWith('/contact') &&
        !pathname.startsWith('/financing') && !pathname.startsWith('/profile') &&
        !pathname.startsWith('/saved-properties') && !pathname.startsWith('/join-seller')) {
      const slug = pathname.replace('/', '')
      return { propertySlug: slug }
    }
    return { propertySlug: null }
  }, [pathname])

  // Send tracking data to API
  const sendTrackingData = useCallback(async (action, extraData = {}) => {
    if (!sessionIdRef.current) return

    try {
      const deviceInfo = getDeviceInfo()
      const utmParams = getUTMParams()
      const propertyInfo = getPropertyInfo()

      const response = await fetch('/api/live-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: sessionIdRef.current,
          userId: user?.id || null,
          userEmail: user?.email || null,
          userFirstName: user?.first_name || null,
          userLastName: user?.last_name || null,
          currentPage: pathname,
          pageTitle: getPageTitle(),
          propertySlug: propertyInfo.propertySlug,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
          ...deviceInfo,
          ...utmParams,
          ...extraData
        })
      })

      if (!response.ok) {
        console.warn('Live tracking failed:', response.statusText)
      }

      return response.json()
    } catch (error) {
      console.warn('Live tracking error:', error)
    }
  }, [user, pathname, getDeviceInfo, getUTMParams, getPropertyInfo, getPageTitle])

  // Record page visit when leaving a page
  const recordPageVisit = useCallback(async () => {
    if (!lastPageRef.current || !pageStartTimeRef.current) return

    const timeSpent = Math.round((Date.now() - pageStartTimeRef.current) / 1000)

    await sendTrackingData('page_visit', {
      visitedPage: lastPageRef.current,
      timeSpentSeconds: timeSpent,
      scrollDepthPercent: getScrollDepth()
    })
  }, [sendTrackingData])

  // Get current scroll depth
  const getScrollDepth = () => {
    if (typeof window === 'undefined') return 0
    const scrolled = window.scrollY
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    return Math.round((scrolled / (documentHeight - windowHeight)) * 100) || 0
  }

  // Initialize session (wait for auth to load first)
  useEffect(() => {
    // Wait for auth to finish loading before initializing
    if (authLoading) return
    if (isInitializedRef.current) return

    sessionIdRef.current = getSessionId()
    isInitializedRef.current = true

    // Start session
    sendTrackingData('session_start')

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      sendTrackingData('heartbeat')
    }, HEARTBEAT_INTERVAL)

    // Handle page unload
    const handleUnload = () => {
      recordPageVisit()
      sendTrackingData('session_end')
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [authLoading, getSessionId, sendTrackingData, recordPageVisit])

  // Track page changes
  useEffect(() => {
    if (!sessionIdRef.current) return

    // Record time spent on previous page
    if (lastPageRef.current && lastPageRef.current !== pathname) {
      recordPageVisit()
    }

    // Update current page
    lastPageRef.current = pathname
    pageStartTimeRef.current = Date.now()

    // Send page change event
    sendTrackingData('page_change')
  }, [pathname, sendTrackingData, recordPageVisit])

  // Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendTrackingData('tab_hidden')
      } else {
        sendTrackingData('tab_visible')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [sendTrackingData])

  // Update session when user logs in/out
  useEffect(() => {
    if (sessionIdRef.current && isInitializedRef.current) {
      // Send an update to refresh user info in the session
      sendTrackingData('user_update')
    }
  }, [user?.id, user?.email, sendTrackingData])

  return {
    sessionId: sessionIdRef.current
  }
}
