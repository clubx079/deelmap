'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { initAnalytics, identifyUser, trackPageview } from '@/lib/analytics'

export default function AnalyticsProvider({ children }) {
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (user?.id) identifyUser(user)
  }, [user?.id])

  useEffect(() => {
    trackPageview()
  }, [pathname])

  return children
}
