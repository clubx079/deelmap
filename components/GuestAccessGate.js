'use client'
import { useState, useEffect } from 'react'
import { Lock, Clock, Eye, X } from 'lucide-react'

const MAX_FREE_VIEWS = 2 // Number of free property views
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const STORAGE_KEY = 'ableman_guest_views'

export function useGuestAccess(user, propertyId) {
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)
  const [viewCount, setViewCount] = useState(0)
  const [showLockModal, setShowLockModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true) // Start with checking state

  useEffect(() => {
    // Skip all checks if user is logged in
    if (user) {
      setIsLocked(false)
      setShowLockModal(false)
      setIsChecking(false)
      return
    }

    // Load guest view data from localStorage
    const loadGuestData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          return JSON.parse(stored)
        }
      } catch (e) {
        console.error('Error loading guest data:', e)
      }
      return { views: [], lockoutUntil: null }
    }

    const saveGuestData = (data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (e) {
        console.error('Error saving guest data:', e)
      }
    }

    const guestData = loadGuestData()
    const now = Date.now()

    // Check if currently in lockout period
    if (guestData.lockoutUntil && guestData.lockoutUntil > now) {
      setIsLocked(true)
      setLockoutTimeLeft(Math.ceil((guestData.lockoutUntil - now) / 1000))
      setShowLockModal(true)
      setViewCount(guestData.views.length)
      setIsChecking(false)
      return
    }

    // Clear expired lockout
    if (guestData.lockoutUntil && guestData.lockoutUntil <= now) {
      guestData.lockoutUntil = null
      guestData.views = [] // Reset views after lockout expires
      saveGuestData(guestData)
    }

    // Check if this property was already viewed
    const alreadyViewed = guestData.views.includes(propertyId)

    if (!alreadyViewed) {
      // Add this property to viewed list
      guestData.views.push(propertyId)

      // Check if exceeded free views
      if (guestData.views.length > MAX_FREE_VIEWS) {
        // Start lockout
        guestData.lockoutUntil = now + LOCKOUT_DURATION
        saveGuestData(guestData)
        setIsLocked(true)
        setLockoutTimeLeft(Math.ceil(LOCKOUT_DURATION / 1000))
        setShowLockModal(true)
      } else {
        saveGuestData(guestData)
      }
    }

    setViewCount(guestData.views.length)
    setIsChecking(false)
  }, [user, propertyId])

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLocked || lockoutTimeLeft <= 0) return

    const timer = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          setIsLocked(false)
          setShowLockModal(false)
          // Clear lockout from storage
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
              const data = JSON.parse(stored)
              data.lockoutUntil = null
              data.views = []
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            }
          } catch (e) {}
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLocked, lockoutTimeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Trigger lockout manually (e.g., when user clicks "Maybe Later")
  const triggerLockout = () => {
    if (user) return // Don't lock logged-in users

    const now = Date.now()
    const guestData = {
      views: [],
      lockoutUntil: now + LOCKOUT_DURATION
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guestData))
    } catch (e) {
      console.error('Error saving lockout:', e)
    }

    setIsLocked(true)
    setLockoutTimeLeft(Math.ceil(LOCKOUT_DURATION / 1000))
    setShowLockModal(true)
  }

  return {
    isLocked,
    lockoutTimeLeft,
    viewCount,
    showLockModal,
    setShowLockModal,
    formatTime,
    remainingFreeViews: Math.max(0, MAX_FREE_VIEWS - viewCount),
    isChecking,
    triggerLockout
  }
}

export function GuestLockModal({
  isOpen,
  onClose,
  lockoutTimeLeft,
  formatTime,
  onSignUp,
  canClose = false
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Blur backdrop */}
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative z-10">
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        )}

        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#b29578] to-[#9a7e61] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Free Preview Limit Reached
          </h2>

          <p className="text-gray-600 mb-4">
            You have viewed your free property previews. Sign up now to unlock unlimited access!
          </p>

          {lockoutTimeLeft > 0 && (
            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Or wait</span>
                <span className="text-2xl font-bold font-mono text-[#b29578]">
                  {formatTime(lockoutTimeLeft)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={onSignUp}
            className="w-full bg-[#b29578] hover:bg-[#9a7e61] text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Sign Up Free - Instant Access
          </button>

          <p className="text-xs text-gray-500">
            Join thousands of investors accessing exclusive deals
          </p>
        </div>
      </div>
    </div>
  )
}

export function GuestViewBanner({ viewCount, remainingFreeViews, onSignUp }) {
  if (remainingFreeViews <= 0) return null

  return (
    <div className="bg-gradient-to-r from-[#022b41] to-[#033a56] text-white px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {remainingFreeViews === 1 ? 'Last free preview!' : `${remainingFreeViews} free previews left`}
          </p>
          <p className="text-xs text-white/70">Sign up for unlimited access</p>
        </div>
      </div>
      <button
        onClick={onSignUp}
        className="bg-[#b29578] hover:bg-[#9a7e61] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Sign Up Free
      </button>
    </div>
  )
}

export function ContentBlurOverlay({ onSignUp }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      {/* Blur overlay */}
      <div
        className="absolute inset-0 backdrop-blur-md bg-white/30"
        style={{ backdropFilter: 'blur(8px)' }}
      />

      {/* CTA */}
      <div className="relative z-20 text-center p-6 max-w-sm">
        <div className="w-14 h-14 bg-[#b29578] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Unlock Full Details
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Sign up to view property description, repairs, and more
        </p>
        <button
          onClick={onSignUp}
          className="bg-[#b29578] hover:bg-[#9a7e61] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
        >
          Sign Up Free
        </button>
      </div>
    </div>
  )
}

// Full page loading overlay while checking guest access
export function GuestCheckingOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />
      <div className="relative z-10 text-center">
        <div className="w-12 h-12 border-4 border-[#b29578] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}
