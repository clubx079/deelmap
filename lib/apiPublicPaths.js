// The API auth perimeter is default-DENY: middleware 401s any /api/* route that
// is not on this allowlist unless a valid dm_session cookie is present.
//
//   PUBLIC_OPEN    — pre-login / utility, no auth of their own.
//   INTERNAL_AUTH  — enforce their own secret/signature in-handler (webhooks, cron, tokens).
//   PUBLIC_CURATED — public reads that return a safe column projection only.
// Community self-authorizes writes in-handler (requireCommunityProfile) using the
// middleware-injected trusted x-user-id, so the whole prefix is allowlisted here.

const PUBLIC_OPEN = new Set([
  '/api/health',
  '/api/contact',
  '/api/coupons/validate',
  '/api/convert-heic',
])

// Everything under /api/auth/* is pre-login by nature.
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/webhooks',
  '/api/magic-link',
  '/api/temp-seller',
  '/api/community',
]

// Internal-auth exact paths (server-to-server / cron; verify their own secret).
const INTERNAL_AUTH = new Set([
  '/api/contracts/webhook',
  '/api/notifications/send-sms',
  '/api/notifications/check-viewers',
  '/api/live-tracking',
])

// Public-curated reads (safe columns enforced inside the route).
const PUBLIC_CURATED = new Set([
  '/api/properties',
  '/api/deals',
  // The marketplace browse map (pins for logged-out visitors). Returns
  // coordinates + minimal card data only — exact address is blanked in-route.
  '/api/deals/map',
])

export function isPublicApiPath(pathname) {
  if (PUBLIC_OPEN.has(pathname)) return true
  if (INTERNAL_AUTH.has(pathname)) return true
  if (PUBLIC_CURATED.has(pathname)) return true
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true
  }
  return false
}
