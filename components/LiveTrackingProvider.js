// components/LiveTrackingProvider.js
'use client'
import { useLiveTracking } from '@/hooks/useLiveTracking'

export function LiveTrackingProvider({ children }) {
  useLiveTracking()
  return <>{children}</>
}
