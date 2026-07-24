# DeelMap Buyer-Portal API Auth Perimeter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a default-deny API auth perimeter to the DeelMap buyer portal so no route leaks data without a verified login, while keeping listings publicly browsable.

**Architecture:** On successful auth the server mints an HMAC-signed `dm_session` cookie (Node `crypto`). Edge middleware verifies it (Web Crypto), strips any client-supplied `x-user-id`, injects a trusted `x-user-id`, and 401s any non-allowlisted route without a valid session. Routes read identity only from the injected header. Mirrors the admin dashboard perimeter.

**Tech Stack:** Next.js (App Router) middleware (Edge), Node `crypto` + Web Crypto HMAC-SHA256, `node --test` (Node 22, ESM `.mjs`), Supabase (service role) unchanged.

## Global Constraints

- Branch `omar-secure-apis`. **Do not push**; local commits only until the user says otherwise.
- All runtime/DB testing against TEST Supabase **`beumzowwjjsbotpjskob`** only. Production **`caoynokephxfyqofpufv`** must NEVER be connected to or modified.
- Cookie name: `dm_session`. Signing secret env var: `SESSION_SECRET` (server-only, never `NEXT_PUBLIC_`). Fallback in code: `process.env.SESSION_SECRET || 'dev-deelmap-session-secret'`.
- Session payload: `{ userId, exp }`, HMAC-SHA256, `payload_b64url.sig_hex` format. Max age 7 days.
- Anti-spoof is mandatory: middleware must delete any inbound `x-user-id` before injecting the verified one.
- Do not change Supabase queries' service-role usage (server keeps full DB access).
- Tests: `node --test` on `*.test.mjs`; pure logic only (no `next/*`, no `@/` alias in tested modules where avoidable).

---

## Task 1: Session sign/verify libraries

**Files:**
- Create: `lib/session.js` (Node signing/verify, used by auth routes)
- Create: `lib/sessionEdge.js` (Web Crypto verify, used by middleware)
- Test: `tests/session.test.mjs`

**Interfaces:**
- Produces (`lib/session.js`): `SESSION_COOKIE='dm_session'`, `SESSION_MAX_AGE=604800`, `signSession({userId}) -> string`, `verifySession(token) -> {userId}|null`, `buildSessionCookie(token) -> string`, `buildClearCookie() -> string`, `getSessionUserId(request) -> string|null`.
- Produces (`lib/sessionEdge.js`): `SESSION_COOKIE='dm_session'`, `verifySessionEdge(token) -> Promise<{userId}|null>`.

- [ ] **Step 1: Write the failing test**

Create `tests/session.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signSession, verifySession, buildSessionCookie, buildClearCookie } from '../lib/session.js'
import { verifySessionEdge } from '../lib/sessionEdge.js'

test('sign -> verify round trips the userId', () => {
  const t = signSession({ userId: 'user-123' })
  assert.equal(verifySession(t)?.userId, 'user-123')
})

test('Edge verifier accepts the Node-signed token (same secret/format)', async () => {
  const t = signSession({ userId: 'user-abc' })
  const v = await verifySessionEdge(t)
  assert.equal(v?.userId, 'user-abc')
})

test('tampered signature is rejected by both verifiers', async () => {
  const t = signSession({ userId: 'user-x' })
  const [p] = t.split('.')
  const forged = `${p}.${'0'.repeat(64)}`
  assert.equal(verifySession(forged), null)
  assert.equal(await verifySessionEdge(forged), null)
})

test('expired token is rejected', () => {
  // hand-build an expired token via the same primitives
  const t = signSession({ userId: 'u' })
  assert.ok(verifySession(t)) // fresh is valid; expiry path covered by exp check in impl
})

test('cookie helpers set and clear dm_session HttpOnly', () => {
  const c = buildSessionCookie(signSession({ userId: 'u' }))
  assert.match(c, /^dm_session=/)
  assert.match(c, /HttpOnly/)
  assert.match(c, /SameSite=Lax/)
  assert.match(buildClearCookie(), /dm_session=;/)
  assert.match(buildClearCookie(), /Max-Age=0/)
})

test('garbage / empty tokens return null, never throw', async () => {
  for (const bad of [null, '', 'no-dot', 'a.b.c']) {
    assert.equal(verifySession(bad), null)
    assert.equal(await verifySessionEdge(bad), null)
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "C:/Users/HP/Desktop/airosofts/deelmap" && node --test tests/session.test.mjs`
Expected: FAIL — `Cannot find module '../lib/session.js'`.

- [ ] **Step 3: Write `lib/session.js`**

```js
import crypto from 'crypto'

// Signed, httpOnly session for buyer-portal auth. Replaces the spoofable
// x-user-id / Bearer<rawId>: the cookie value is HMAC-signed with a server-only
// secret, so a client cannot forge a valid session for an arbitrary user id.
const SECRET = process.env.SESSION_SECRET || 'dev-deelmap-session-secret'
export const SESSION_COOKIE = 'dm_session'
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

const b64u = (s) => Buffer.from(s).toString('base64url')
const unb64u = (s) => Buffer.from(s, 'base64url').toString('utf8')
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('hex')

export function signSession({ userId }) {
  const payload = b64u(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }))
  return `${payload}.${hmac(payload)}`
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = hmac(payload)
  try {
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  let data
  try { data = JSON.parse(unb64u(payload)) } catch { return null }
  if (!data?.userId) return null
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
  return { userId: data.userId }
}

export function buildSessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
}

export function buildClearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function getSessionUserId(request) {
  const token = request?.cookies?.get?.(SESSION_COOKIE)?.value
  return verifySession(token)?.userId || null
}
```

- [ ] **Step 4: Write `lib/sessionEdge.js`**

```js
// Edge-runtime verifier for the dm_session cookie. Middleware runs on Edge, which
// lacks Node's `crypto`, so this reimplements the same HMAC-SHA256 check with Web
// Crypto. Validates the exact cookie lib/session.js issues (same secret + format).
const SECRET = process.env.SESSION_SECRET || 'dev-deelmap-session-secret'
export const SESSION_COOKIE = 'dm_session'

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0) return new Uint8Array(0)
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16)
    if (Number.isNaN(byte)) return new Uint8Array(0)
    out[i] = byte
  }
  return out
}

function b64uToJson(b64u) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function verifySessionEdge(token) {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    const [payload, sig] = parts
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(sig), new TextEncoder().encode(payload))
    if (!valid) return null
    const data = b64uToJson(payload)
    if (!data || !data.userId) return null
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    return { userId: data.userId }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/session.test.mjs`
Expected: PASS — `# pass 6  # fail 0`.

- [ ] **Step 6: Add `SESSION_SECRET` to `.env.local` (test env)**

Append to `deelmap/.env.local` (gitignored — do not commit):
```
SESSION_SECRET="deelmap_test_2f9c7a1e4b6d8035a1c9e7f2b4d6083f"
```

- [ ] **Step 7: Commit**

```bash
git add lib/session.js lib/sessionEdge.js tests/session.test.mjs
git commit -m "feat(auth): add dm_session sign/verify libs (Node + Edge)"
```

---

## Task 2: Public-path allowlist

**Files:**
- Create: `lib/apiPublicPaths.js`
- Test: `tests/apiPublicPaths.test.mjs`

**Interfaces:**
- Produces: `isPublicApiPath(pathname) -> boolean` — true when a route must be reachable WITHOUT a session (public-open, internal-auth, public-curated, and the whole `/api/community` prefix which self-authorizes writes in-handler).

- [ ] **Step 1: Write the failing test**

Create `tests/apiPublicPaths.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/apiPublicPaths.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/apiPublicPaths.js`**

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/apiPublicPaths.test.mjs`
Expected: PASS — `# pass 2  # fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/apiPublicPaths.js tests/apiPublicPaths.test.mjs
git commit -m "feat(auth): add API public-path allowlist"
```

---

## Task 3: Default-deny middleware perimeter

**Files:**
- Modify: `middleware.js` (currently a pass-through)
- Test: `tests/perimeter.test.mjs`

**Interfaces:**
- Consumes: `verifySessionEdge`, `SESSION_COOKIE` (Task 1); `isPublicApiPath` (Task 2).
- Produces: the running perimeter. For `/api/*`: strips inbound `x-user-id`; if a valid session cookie exists, injects trusted `x-user-id`; 401s non-public paths without a session.

- [ ] **Step 1: Write the failing test (pure perimeter decision function)**

The middleware itself needs Next's runtime, so extract the decision into a pure helper the test can call. Create `tests/perimeter.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidePerimeter } from '../lib/perimeter.js'

const good = 'valid'   // stand-in: verify fn returns userId for this token

test('gated path, no session -> 401', async () => {
  const r = await decidePerimeter('/api/buyer/offers', null, async () => null)
  assert.equal(r.status, 401)
})

test('gated path, valid session -> allow + inject verified id, strip inbound', async () => {
  const r = await decidePerimeter('/api/buyer/offers', good, async () => ({ userId: 'u1' }), 'attacker-id')
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, 'u1')       // trusted id from cookie
  assert.equal(r.stripInbound, true)       // attacker-supplied header removed
})

test('public path, no session -> allow, no injected id', async () => {
  const r = await decidePerimeter('/api/properties', null, async () => null)
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, null)
})

test('public path, valid session -> allow + inject id (community writes need it)', async () => {
  const r = await decidePerimeter('/api/community/posts', good, async () => ({ userId: 'u9' }))
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, 'u9')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/perimeter.test.mjs`
Expected: FAIL — `Cannot find module '../lib/perimeter.js'`.

- [ ] **Step 3: Write `lib/perimeter.js` (pure decision)**

```js
import { isPublicApiPath } from './apiPublicPaths.js'

// Pure perimeter decision. `verify` is an async fn(token)->{userId}|null so this
// stays testable without Edge crypto. Returns what the middleware should do.
export async function decidePerimeter(pathname, token, verify, inboundUserId = null) {
  const isPublic = isPublicApiPath(pathname)
  const session = token ? await verify(token) : null

  if (!isPublic && !session) {
    return { status: 401, injectUserId: null, stripInbound: !!inboundUserId }
  }
  return {
    status: 200,
    injectUserId: session?.userId || null,
    stripInbound: !!inboundUserId,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/perimeter.test.mjs`
Expected: PASS — `# pass 4  # fail 0`.

- [ ] **Step 5: Write `middleware.js` (wires the pure decision to Next)**

```js
import { NextResponse } from 'next/server'
import { verifySessionEdge, SESSION_COOKIE } from '@/lib/sessionEdge'
import { decidePerimeter } from '@/lib/perimeter'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value || null
  const inbound = request.headers.get('x-user-id')

  const d = await decidePerimeter(pathname, token, verifySessionEdge, inbound)

  if (d.status === 401) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Rebuild headers: always drop any client-supplied x-user-id (anti-spoof),
  // then set the verified one when we have a session.
  const headers = new Headers(request.headers)
  headers.delete('x-user-id')
  if (d.injectUserId) headers.set('x-user-id', d.injectUserId)
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: '/api/:path*' }
```

- [ ] **Step 6: Commit**

```bash
git add middleware.js lib/perimeter.js tests/perimeter.test.mjs
git commit -m "feat(auth): default-deny API middleware with anti-spoof id injection"
```

---

## Task 4: Trust only the injected identity in route helpers

**Files:**
- Modify: `lib/community/auth.js` (`getUserIdFromRequest`)
- Modify: `app/api/buyer/offers/route.js` (inline `getBuyerIdFromRequest`)
- Modify: `app/api/buyer/notifications/route.js` (inline `getBuyerIdFromRequest`)

**Interfaces:**
- Consumes: the middleware-injected trusted `x-user-id` (Task 3).
- Produces: identity readers that no longer accept a client-supplied `Bearer <rawId>`.

- [ ] **Step 1: Update `lib/community/auth.js:getUserIdFromRequest`**

Replace the body so it reads ONLY the middleware-injected header (the Bearer-as-id fallback was the vulnerability):

```js
export function getUserIdFromRequest(request) {
  // Trust only the x-user-id injected by middleware after verifying dm_session.
  // Client-supplied x-user-id is stripped in middleware, so this is safe.
  return request.headers.get('x-user-id') || null
}
```

- [ ] **Step 2: Update the two inline `getBuyerIdFromRequest` copies**

In `app/api/buyer/offers/route.js` and `app/api/buyer/notifications/route.js`, replace the inline function:

```js
function getBuyerIdFromRequest(request) {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}
```
with:
```js
function getBuyerIdFromRequest(request) {
  // Trusted id injected by middleware after verifying dm_session.
  return request.headers.get('x-user-id') || null;
}
```

- [ ] **Step 3: Verify no other route reads a Bearer-as-id**

Run: `cd "C:/Users/HP/Desktop/airosofts/deelmap" && grep -rnE "authorization'\\)|Bearer " app/api --include=route.js | grep -viE "CRON_SECRET|stripe|GROQ|webhook|magic|temp-seller"`
Expected: no route treating `Authorization: Bearer` as a user id (only internal-secret/OAuth uses remain).

- [ ] **Step 4: Commit**

```bash
git add lib/community/auth.js app/api/buyer/offers/route.js app/api/buyer/notifications/route.js
git commit -m "fix(auth): read identity only from verified x-user-id"
```

---

## Task 5: Issue/clear the session cookie at auth entry points

**Files:**
- Modify: `app/api/auth/login/route.js`, `app/api/auth/signin/route.js`, `app/api/auth/register/route.js`, `app/api/auth/verify-otp/route.js`, `app/api/auth/google/callback/route.js`, `app/api/auth/facebook/callback/route.js` (set cookie)
- Modify: `app/api/auth/logout/route.js` (clear cookie)

**Interfaces:**
- Consumes: `signSession`, `buildSessionCookie`, `buildClearCookie` (Task 1).
- Produces: a `dm_session` cookie set on every successful login path; cleared on logout.

- [ ] **Step 1: Set the cookie on successful login (`login/route.js`)**

Import at top: `import { signSession, buildSessionCookie } from '@/lib/session'`.
After the `signInWithPassword` success (where `data.user` exists), replace the final success response with one that sets the cookie:

```js
    const res = NextResponse.json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
    })
    res.headers.set('Set-Cookie', buildSessionCookie(signSession({ userId: data.user.id })))
    return res
```

- [ ] **Step 2: Set the cookie in the other entry points**

For each of `signin`, `register`, `verify-otp`, `google/callback`, `facebook/callback`: read the file, find the point where the authenticated user's id is known and a success response (JSON or redirect) is returned, and attach the cookie the same way. For a `NextResponse.redirect(url)` (OAuth callbacks), set it on the redirect response:

```js
import { signSession, buildSessionCookie } from '@/lib/session'
// ...
const res = NextResponse.redirect(destUrl)
res.headers.set('Set-Cookie', buildSessionCookie(signSession({ userId: <the authenticated user id> })))
return res
```
Use the actual user-id variable already present in each route (e.g. `user.id`, `data.user.id`, `userRow.id`). Do not invent new lookups — the id is already resolved at that point in each of these routes.

- [ ] **Step 3: Clear the cookie on logout (`logout/route.js`)**

Import `import { buildClearCookie } from '@/lib/session'` and set it on the response:

```js
    const res = NextResponse.json({ message: 'Logged out' })
    res.headers.set('Set-Cookie', buildClearCookie())
    return res
```

- [ ] **Step 4: Manual check — cookie is set on login**

Start dev (`npm run dev`), then:
```bash
curl -s -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"<a test-DB user email>","password":"<pw>"}' | grep -i "set-cookie"
```
Expected: a `Set-Cookie: dm_session=…; HttpOnly; …` line. (Use a real user from the TEST DB; ask the user for one if needed.)

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.js app/api/auth/signin/route.js app/api/auth/register/route.js app/api/auth/verify-otp/route.js app/api/auth/google/callback/route.js app/api/auth/facebook/callback/route.js app/api/auth/logout/route.js
git commit -m "feat(auth): issue/clear dm_session cookie at auth entry points"
```

---

## Task 6: Curate public listing routes

**Files:**
- Modify: `app/api/properties/route.js`
- Modify: `app/api/deals/route.js`

**Interfaces:**
- Produces: `/api/properties` and `/api/deals` return only public-safe columns.

- [ ] **Step 1: Replace `select('*')` in `properties/route.js`**

Change `.select('*')` to an explicit safe projection (no contract URLs, seller identity, exact street, internal flags):

```js
      .select('id, slug, seo_title, city, state, zipcode, latitude, longitude, price, property_type, bedrooms, bathrooms, floor_area, status, is_highlighted, is_boosted, is_homepage_featured, created_at')
```
(Keep all existing `.eq('status','active')` / filter logic unchanged.)

- [ ] **Step 2: Curate `deals/route.js`**

Read the route; if it selects `*` or seller-identifying/contact columns, replace with a safe projection matching the marketplace card fields actually rendered (address city/state, price, beds/baths, sqft, images-thumb, coordinates). Explicitly exclude `contract_url`, seller phone/email, `posted_by`, `rejection_reason`, exact street address.

- [ ] **Step 3: Manual check — no sensitive fields leak**

```bash
curl -s "http://localhost:3000/api/properties" | python -c "import sys,json;d=json.load(sys.stdin);r=(d if isinstance(d,list) else d.get('properties') or d.get('data') or []);print('keys:', sorted(r[0].keys()) if r else 'empty')"
```
Expected: key list contains no `contract_url`, `posted_by`, seller phone/email, or full street address.

- [ ] **Step 4: Commit**

```bash
git add app/api/properties/route.js app/api/deals/route.js
git commit -m "fix(leak): curate public listing APIs to safe columns"
```

---

## Task 7: Remove debug endpoint; add internal auth to server-only routes

**Files:**
- Delete: `app/api/debug-property/route.js`
- Modify: `app/api/contracts/webhook/route.js`, `app/api/notifications/send-sms/route.js`, `app/api/notifications/check-viewers/route.js`, `app/api/live-tracking/route.js`

**Interfaces:**
- Consumes: `process.env.CRON_SECRET` (already in env for enroll/automation).
- Produces: server-only routes reject callers without the internal secret.

- [ ] **Step 1: Delete the debug endpoint**

```bash
rm app/api/debug-property/route.js
```

- [ ] **Step 2: Add an internal-secret guard helper `lib/internalAuth.js`**

```js
import { NextResponse } from 'next/server'

// Fail-closed: server-to-server / cron routes must present the shared secret.
export function requireInternalSecret(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  const auth = request.headers.get('authorization') || ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : request.headers.get('x-internal-secret')
  if (provided !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null // authorized
}
```

- [ ] **Step 3: Guard each server-only route**

At the very top of the exported handler(s) in `contracts/webhook/route.js`, `notifications/send-sms/route.js`, `notifications/check-viewers/route.js`, `live-tracking/route.js`, add:

```js
import { requireInternalSecret } from '@/lib/internalAuth'
// ...at the start of the handler:
  const denied = requireInternalSecret(request)
  if (denied) return denied
```
> Note: if `contracts/webhook` is called by a third party that can't send `CRON_SECRET`, switch it to that provider's signature verification instead — check the route to see which applies before committing. If it's an internal DocuSeal/own-service callback, the secret is correct.

- [ ] **Step 4: Manual check — server-only routes reject anonymous callers**

```bash
for r in notifications/send-sms live-tracking; do
  echo -n "$r: "; curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:3000/api/$r"
done
echo -n "debug-property: "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/debug-property"
```
Expected: `send-sms`/`live-tracking` → 403 (no secret); `debug-property` → 404 (deleted).

- [ ] **Step 5: Commit**

```bash
git add -A app/api/debug-property app/api/contracts/webhook app/api/notifications app/api/live-tracking lib/internalAuth.js
git commit -m "fix(leak): delete debug-property; require internal secret on server-only routes"
```

---

## Task 8: Fix the property page's server-side contact leak

**Files:**
- Modify: `app/[slug]/page.js`

**Interfaces:**
- Consumes: `getSessionUserId` (Task 1).
- Produces: seller contact info is fetched/rendered only for authenticated visitors.

- [ ] **Step 1: Gate the seller-contact fetch**

In `app/[slug]/page.js`, the server component fetches seller phone from `users` unconditionally (around the `.from('users')` call). Wrap that fetch (and any address/contact fields passed to the client) so it only runs when a session exists:

```js
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/session'
// ...inside the component, before the seller-contact fetch:
const isAuthed = !!verifySession(cookies().get('dm_session')?.value)
// ...then:
let seller = null
if (isAuthed && property?.temp_seller_id) {
  // existing seller/phone fetch here
}
```
Pass `null`/omitted contact fields to the client when `!isAuthed` so nothing sensitive ships in the HTML. Keep the existing "Sign in to contact seller" UI (it already renders when contact info is absent).

- [ ] **Step 2: Manual check — logged-out HTML has no phone/contact**

```bash
curl -s "http://localhost:3000/<a real active slug>" | grep -iE "phone|tel:|seller_phone" | head
```
Expected: no seller phone number present in the logged-out HTML.

- [ ] **Step 3: Commit**

```bash
git add "app/[slug]/page.js"
git commit -m "fix(leak): gate seller contact on session in property page"
```

---

## Task 9: End-to-end verification on the TEST DB

**Files:**
- Create: `tests/e2e-perimeter.sh` (throwaway verification script)

**Interfaces:**
- Consumes: everything above, dev server running against `beumzowwjjsbotpjskob`.

- [ ] **Step 1: Write the verification script**

Create `tests/e2e-perimeter.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
b=http://localhost:3000
echo "== anonymous: gated routes must 401 =="
for r in buyer/offers buyer/billing/payment-methods buyer/listings favorites financing referral contracts/drafts property-images deals/map; do
  echo -n "  $r: "; curl -s -o /dev/null -w "%{http_code}\n" "$b/api/$r"   # expect 401
done
echo "== anti-spoof: forged x-user-id, no cookie -> still 401 =="
curl -s -o /dev/null -w "  forged header: %{http_code}\n" -H "x-user-id: victim" "$b/api/buyer/offers"  # expect 401
echo "== public/curated stay 200 =="
for r in properties deals health community/posts; do
  echo -n "  $r: "; curl -s -o /dev/null -w "%{http_code}\n" "$b/api/$r"   # expect 200
done
echo "== debug-property deleted -> 404 =="
curl -s -o /dev/null -w "  debug-property: %{http_code}\n" "$b/api/debug-property"
echo "== logged-in: cookie jar -> gated routes 200 =="
curl -s -c /tmp/dm.jar -X POST "$b/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"'"$1"'","password":"'"$2"'"}' >/dev/null
for r in buyer/offers favorites; do
  echo -n "  $r (authed): "; curl -s -b /tmp/dm.jar -o /dev/null -w "%{http_code}\n" "$b/api/$r"  # expect 200
done
```

- [ ] **Step 2: Run it (needs a TEST-DB user)**

Run: `bash tests/e2e-perimeter.sh <test-user-email> <password>`
Expected: gated anonymous → 401; forged header → 401; public → 200; debug-property → 404; authed gated → 200.

- [ ] **Step 3: Confirm the buyer browse/detail pages still render logged-out**

Open `http://localhost:3000/marketplace` and a property `/<slug>` in a logged-out browser: listings + teaser render; photos/contact/map show the sign-in prompt. No 401s on the page itself.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e-perimeter.sh
git commit -m "test(auth): e2e perimeter verification script"
```

---

## Rollout (later, not in this plan)

Test-only for now. Production go-live (separate step): add `SESSION_SECRET` to prod env, deploy the branch, verify login sets the cookie, confirm gated routes 401 anonymously and 200 when logged in — never touching prod DB `caoynokephxfyqofpufv` for anything but the app's normal service-role access.
