// hooks/usePropertyAnalytics.js
import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function usePropertyAnalytics(property) {
  const { user } = useAuth()
  const sessionIdRef = useRef(null)
  const startTimeRef = useRef(null)
  const activeTimeIntervalRef = useRef(null)
  const isActiveRef = useRef(true)
  const lastActivityRef = useRef(Date.now())
  const trackingInitializedRef = useRef(false) // Add this to prevent double initialization
  const behaviorRef = useRef({
    scrolledToBottom: false,
    viewedDescription: false,
    viewedRepairs: false,
    viewedPhotos: false,
    clickedMorePhotos: false,
    clickedShare: false,
    zoomedMap: false,
    imagesViewed: 0,
    fullViewAchieved: false
  })
  const lastUpdateRef = useRef(0)

  const generateSessionId = useCallback(() => {
    // Check if we already have a session ID for this property today
    const sessionKey = `analytics_session_${property.id}`
    const storedSession = sessionStorage.getItem(sessionKey)
    
    if (storedSession) {
      const { id, date } = JSON.parse(storedSession)
      const today = new Date().toDateString()
      
      // Reuse session ID if it's from today
      if (date === today) {
        return id
      }
    }
    
    // Generate new session ID
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(sessionKey, JSON.stringify({
      id: newId,
      date: new Date().toDateString()
    }))
    
    return newId
  }, [property.id])

  const getUTMSource = useCallback(() => {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('u') || null
  }, [])

  const getUTMCode = useCallback(() => {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('u') || null
  }, [])

  const isSpecialLink = useCallback(() => {
    if (typeof window === 'undefined') return false
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('u') === 'sl'
  }, [])

  const sendAnalytics = useCallback(async (action, behaviorData = {}) => {
    try {
      const response = await fetch('/api/analytics/property-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          propertyAddress: property.address,
          propertyPrice: property.price,
          userId: user?.id,
          userEmail: user?.email,
          sessionId: sessionIdRef.current,
          action,
          behaviorData: {
            ...behaviorData,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          },
          utmSource: action === 'start_view' ? getUTMSource() : undefined,
          utmCode: action === 'start_view' ? getUTMCode() : undefined,
          isSpecialLink: action === 'start_view' ? isSpecialLink() : undefined
        }),
      })

      const result = await response.json()
      
      // If user is a system user, stop all tracking
      if (result.systemUser) {
        if (activeTimeIntervalRef.current) {
          clearInterval(activeTimeIntervalRef.current)
        }
        return { systemUser: true }
      }

      if (!response.ok) {
        console.warn('Analytics tracking failed:', response.statusText)
      }

      return result
    } catch (error) {
      console.warn('Analytics error:', error)
      return { error: true }
    }
  }, [property, user, getUTMSource, getUTMCode, isSpecialLink])

  const updateActiveTime = useCallback(() => {
    if (!isActiveRef.current) return
    
    const now = Date.now()
    const timeSinceLastActivity = (now - lastActivityRef.current) / 1000

    // Only track if user was active in last 5 seconds
    if (timeSinceLastActivity < 5) {
      sendAnalytics('update_active_time')
    }
  }, [sendAnalytics])

  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    isActiveRef.current = true
  }, [])

  const updateBehavior = useCallback((newBehavior) => {
    const now = Date.now()
    if (now - lastUpdateRef.current < 2000) return

    Object.assign(behaviorRef.current, newBehavior)
    lastUpdateRef.current = now
    
    sendAnalytics('update_behavior', behaviorRef.current)
  }, [sendAnalytics])

  const trackBehavior = useCallback((behaviorType, value = true) => {
    if (behaviorRef.current[behaviorType] === value) return
    
    behaviorRef.current[behaviorType] = value
    updateBehavior({ [behaviorType]: value })
  }, [updateBehavior])

  const trackImageView = useCallback((imageCount) => {
    const currentCount = behaviorRef.current.imagesViewed
    if (imageCount > currentCount) {
      trackBehavior('imagesViewed', imageCount)
    }
  }, [trackBehavior])

  useEffect(() => {
    if (!property?.id) return
    
    // Prevent double initialization in React Strict Mode
    if (trackingInitializedRef.current) {
      return
    }
    
    trackingInitializedRef.current = true
    sessionIdRef.current = generateSessionId()
    startTimeRef.current = Date.now()
    isActiveRef.current = true
    lastActivityRef.current = Date.now()

    // Start tracking with a small delay to ensure only one call
    const initTimeout = setTimeout(() => {
      sendAnalytics('start_view').then(result => {
        // If system user, don't set up any tracking
        if (result?.systemUser) {
          return
        }

        // Track active time every 3 seconds
        activeTimeIntervalRef.current = setInterval(() => {
          updateActiveTime()
        }, 3000)
      })
    }, 100)

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true })
    })

    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden
      if (!document.hidden) {
        startTimeRef.current = Date.now()
        lastActivityRef.current = Date.now()
        // When returning to tab, treat as returning view not new view
        sendAnalytics('start_view')
      }
    }

    const handleScroll = () => {
      if (!isActiveRef.current) return

      const scrolled = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrolled + windowHeight >= documentHeight - 100) {
        trackBehavior('scrolledToBottom')
        trackBehavior('fullViewAchieved', true)
      }
    }

    const observeTabSections = () => {
      if (!window.IntersectionObserver) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              const target = entry.target
              if (target.id === 'description-section' || target.textContent?.includes('Property Description')) {
                trackBehavior('viewedDescription')
              }
              if (target.id === 'repairs-section' || target.textContent?.includes('Repair Information')) {
                trackBehavior('viewedRepairs')
              }
            }
          })
        },
        { threshold: 0.5 }
      )

      setTimeout(() => {
        const descSection = document.querySelector('[data-tab="description"]')
        const repairsSection = document.querySelector('[data-tab="repairs"]')
        
        if (descSection) observer.observe(descSection)
        if (repairsSection) observer.observe(repairsSection)
      }, 1000)

      return observer
    }

    const trackImageViews = () => {
      const images = document.querySelectorAll('img[src*="property"], img[alt*="property"]')
      if (images.length > 0) {
        trackBehavior('viewedPhotos')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    const observer = observeTabSections()
    trackImageViews()

    return () => {
      clearTimeout(initTimeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('scroll', handleScroll)
      activityEvents.forEach(event => {
        window.removeEventListener(event, trackActivity)
      })
      if (observer) observer.disconnect()
      if (activeTimeIntervalRef.current) {
        clearInterval(activeTimeIntervalRef.current)
      }
      
      if (sessionIdRef.current && isActiveRef.current) {
        sendAnalytics('end_view')
      }
      
      // Reset for next mount
      trackingInitializedRef.current = false
    }
  }, [property?.id, generateSessionId, sendAnalytics, trackBehavior, updateActiveTime, trackActivity])

  return {
    trackMorePhotosClick: () => trackBehavior('clickedMorePhotos'),
    trackShareClick: () => trackBehavior('clickedShare'),
    trackMapZoom: () => trackBehavior('zoomedMap'),
    trackImageView,
    trackCustomBehavior: trackBehavior,
    sessionId: sessionIdRef.current
  }
}