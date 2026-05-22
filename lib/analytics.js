import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      person_profiles: 'identified_only',
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true },
      },
    })
  }
  initialized = true
}

export function identifyUser(user) {
  if (!POSTHOG_KEY || !user?.id) return
  posthog.identify(user.id, {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  })
}

export function resetIdentity() {
  if (!POSTHOG_KEY) return
  posthog.reset()
}

export function trackPageview() {
  if (!POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture('$pageview', { $current_url: window.location.href })
}

export function trackEvent(name, props = {}) {
  if (!POSTHOG_KEY) return
  posthog.capture(name, props)
}
