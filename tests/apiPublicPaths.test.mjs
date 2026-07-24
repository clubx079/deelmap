import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicApiPath } from '../lib/apiPublicPaths.js'

test('public + internal + curated paths are public', () => {
  for (const p of [
    '/api/auth/login', '/api/auth/google/callback', '/api/health', '/api/contact',
    '/api/coupons/validate', '/api/convert-heic',
    '/api/webhooks/stripe', '/api/contracts/webhook', '/api/magic-link/generate',
    '/api/temp-seller/verify-token', '/api/notifications/send-sms',
    '/api/properties', '/api/deals',
    '/api/community/posts', '/api/community/u/someone',
  ]) assert.equal(isPublicApiPath(p), true, p)
})

test('gated (authenticated) paths are NOT public', () => {
  for (const p of [
    '/api/property-images', '/api/deals/map',
    '/api/buyer/offers', '/api/buyer/billing/payment-methods', '/api/buyer/listings',
    '/api/favorites', '/api/favorites/list', '/api/financing', '/api/referral',
    '/api/contracts/drafts', '/api/contracts/pay', '/api/analytics/property-tracking',
    '/api/debug-property',
  ]) assert.equal(isPublicApiPath(p), false, p)
})
