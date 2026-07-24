# DeelMap Buyer Portal — API Auth Perimeter (Design Spec)

**Date:** 2026-07-24 · **Branch:** `omar-secure-apis` (off `main`) · **Test DB:** `beumzowwjjsbotpjskob` (prod `caoynokephxfyqofpufv` NEVER touched)

## Goal

Close the deelmap buyer-portal data leaks: ~30 fully-open API routes that return DB data with no login, and ~10 IDOR routes that trust a forgeable client identity header. Do it without changing what a buyer can browse (listings stay public), mirroring the auth perimeter we shipped for the admin dashboard.

## Root cause

- `middleware.js` is a pass-through — no perimeter; every `/api/*` route is publicly reachable.
- Identity is client-supplied and unverified: routes read `x-user-id` header or `Authorization: Bearer <raw userId>` (`lib/community/auth.js:getUserIdFromRequest`, plus inline `getBuyerIdFromRequest` copies). Anyone can set these to any value → impersonation / IDOR.
- Service-role Supabase client used widely → bypasses any RLS.

## Mechanism decision — server-issued HMAC session cookie (not Supabase tokens)

The client does **not** keep a Supabase Auth session: `hooks/useAuth.js` stores a custom `ableman_user` blob in localStorage, `lib/supabase.js` sets no `persistSession`, and although `/api/auth/login` returns `session`, nothing client-side ever reads `access_token` or calls `getSession()`. So sending the Supabase access token would require adding client-side token storage **and hourly refresh** — fragile.

Instead, replicate the **admin-dashboard pattern**: on successful auth the server (which already knows the verified user from `supabase.auth.signInWithPassword`) mints an **HMAC-signed session cookie**; the browser returns it automatically; **Edge middleware verifies it with Web Crypto**. Benefits: no `authedFetch`, no ~48 client call-site edits, no token-refresh logic, and it's a pattern already proven in this codebase.

### Auth flow
1. **Login/signup/OTP/OAuth success** (server routes) → sign `{ userId, iat, exp }` with HMAC-SHA256 using `SESSION_SECRET`; `Set-Cookie: dm_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=…`.
2. **Middleware** (`/api/:path*`), for every request:
   - **Always** delete any client-supplied `x-user-id` header (anti-spoof). If a valid `dm_session` cookie is present, verify it and inject a **trusted** `x-user-id: <verified userId>`.
   - **Gate:** if the path is **not** on the public allowlist and there is no valid session → `401`.
3. **Routes** read identity only from the (now trusted) injected `x-user-id`. `getUserIdFromRequest`/`getBuyerIdFromRequest` are updated to read only that header — the `Bearer <rawId>` fallback is removed.
4. **Logout** clears `dm_session`.

Anti-spoof is essential: because routes trust `x-user-id`, the middleware must strip any inbound copy and set it only from a verified cookie.

## Route classification (the contract)

**Public-open** (no session; pre-login / utility): all `auth/*`, `health`, `contact`, `coupons/validate`, `convert-heic`.

**Internal-auth** (own token/signature, no user session): `webhooks/stripe` (already verifies signature), `contracts/webhook` (**add** a shared-secret/signature check — currently unauthenticated), `magic-link/*`, `temp-seller/*`, `notifications/send-sms` + `notifications/check-viewers` + `live-tracking` (add a `CRON_SECRET`/internal check — these are server-to-server/cron).

**Public-curated** (public, but return only safe columns): `properties`, `deals`, and the `community` read surface (posts, lots, deal-search, sidebar, `u/[handle]`, public post/lot detail). Community keeps its in-handler `requireCommunityProfile` for writes (votes, comments, saves, subscriptions, blocks, hides, reports) — now backed by the trusted injected id.

**Authenticated** (valid session required — gated by middleware): `property-images` (photos), `deals/map` (map), **all** `buyer/*`, `favorites*`, `financing`, `referral*`, `contracts/*` (drafts, download, pay, root), `analytics/property-tracking`.

**Delete:** `debug-property` (leaks viewer emails + `temp_seller_logins.magic_link_token` — account-takeover vector).

**Page-level fix:** `app/[slug]/page.js` fetches seller phone server-side unconditionally and blurs it client-side → the contact info ships to logged-out visitors. Gate that fetch on the verified session.

## Column curation (public routes)

`/api/properties` and `/api/deals` must return a public-safe projection only — **exclude** `contract_url`, `posted_by`/seller identity, seller phone/email, exact street address (keep city/state/zip-approx), internal flags, `rejection_reason`. Replace `.select('*')` with an explicit safe column list. Photos and map remain gated (separate endpoints).

## File structure

- `lib/session.js` — **new.** `signSession({userId})`, `buildSessionCookie(token)`, `buildClearCookie()` (Node crypto, used by auth routes).
- `lib/sessionEdge.js` — **new.** `verifySessionEdge(token)` using Web Crypto (Edge-safe), `SESSION_COOKIE='dm_session'`.
- `lib/apiPublicPaths.js` — **new.** `isPublicApiPath(pathname)` — the allowlist (public-open + internal-auth + public-curated + `/api/community` prefix).
- `middleware.js` — **modify.** Default-deny perimeter + anti-spoof + verified `x-user-id` injection.
- `lib/community/auth.js` — **modify.** `getUserIdFromRequest` → read only injected `x-user-id`.
- `app/api/buyer/offers/route.js`, `app/api/buyer/notifications/route.js` — **modify.** Drop inline `getBuyerIdFromRequest`; use the shared trusted reader.
- Auth entry routes (`auth/login`, `signin`, `register`, `verify-otp`, `google/callback`, `facebook/callback`, `logout`) — **modify.** Set/clear `dm_session`.
- `app/api/properties/route.js`, `app/api/deals/route.js` — **modify.** Safe column projection.
- `app/api/contracts/webhook/route.js` — **modify.** Add internal-secret verification.
- `app/api/debug-property/route.js` — **delete.**
- `app/[slug]/page.js` — **modify.** Gate seller-contact fetch on session.
- `lib/apiPublicPaths.test.mjs`, `tests/perimeter.test.mjs` — **new.** `node --test`.
- `.env.local` — add `SESSION_SECRET` (test value; gitignored).

## Testing (against test DB `beumzowwjjsbotpjskob` only)

1. Unit: allowlist logic + session sign/verify round-trip (`node --test`, pure).
2. Perimeter: gated route without cookie → 401; with a forged `x-user-id` but no cookie → 401 (anti-spoof); public/curated route → 200.
3. E2E on the running app: log in → cookie set → gated routes 200 and scoped to the logged-in user; log out → 401. Curated `properties`/`deals` → 200 with no sensitive columns. `debug-property` → 404.
4. Confirm buyer browse/detail pages still render for logged-out visitors.

## Non-goals / follow-ups

- **Mobile clients**: cookie-based; if a mobile app calls these APIs it would need to send the signed token as `Bearer` — middleware can additionally accept `Authorization: Bearer <dm_session>` (our token, not the raw id). Included as a small extension, not a rewrite.
- Supabase RLS on the deelmap DB (defense in depth) — separate effort.
- Production rollout — test-only for now.
