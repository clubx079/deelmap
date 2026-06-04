# Deelmap Buyer Portal — UX + Functionality Audit

---

## 🔴 Critical (blocks launch / loses money / leaks secrets)

### C1. Stripe webhook crashes in the paid-listing fallback path — `addOns` used before declaration **[verified]**

- **Location:** `app/api/webhooks/stripe/route.js:109-111` (used) vs `:175` (declared)
- **What's wrong:** `addOns` is referenced at lines 109–111 (`addOns.includes('highlight')`, etc.) but is declared with `const addOns = …` at line 175. Because `const` has a temporal dead zone, the reference throws a `ReferenceError` and the handler aborts. This is the **fallback path that creates the listing when the client-side creation fails** (it only runs when no `payments` row exists yet, line 90). Result: the buyer is charged, Stripe fires `payment_intent.succeeded`, but the property is never created and the payment row is never written — money in, nothing delivered, and no record to refund against.
- **Fix:** Move the `const addOns = …` declaration (line 175) and `ADD_ON_PRICES` above line 108, before first use.

### C2. [SECURITY] Live Monday.com API token hardcoded in source **[verified]**

- **Location:** `app/api/auth/verify-otp/route.js:67`
- **What's wrong:** A real Monday.com JWT (`MONDAY_API_KEY = 'eyJhbGci…M75p0M'`) with `me:write` scope is committed in plaintext. Anyone with repo access (or a leaked bundle) can write to the company Monday boards. Board/group IDs are alongside it (`:68-69`).
- **Fix:** Move to `process.env.MONDAY_API_KEY` and **rotate the token immediately** in Monday.com — assume it is compromised.

### C3. [SECURITY] 200 Numverify API keys hardcoded in source **[verified]**

- **Location:** `app/api/auth/verify-phone/route.js:5-207`
- **What's wrong:** The full pool of 200 Numverify keys is embedded in the route file. These are exhaustible, billable credentials exposed to anyone with source/bundle access.
- **Fix:** Move the pool to an env var / secret store (or a server-side proxy) and rotate the exposed keys.

---

## 🟠 High (serious functional, security, or money-correctness — fix before/at launch)

### H1. [SECURITY] OTP stored in an in-memory Map with no rate limiting **[reported]**

- **Location:** `app/api/auth/send-otp/route.js:14-18`, `app/api/auth/verify-otp/route.js:8-12`, `app/api/auth/verify-reset-otp/route.js:44`
- **What's wrong:** OTPs live in a process-global `Map` (lost on every restart/redeploy, and not shared across multiple server instances) and there is no per-email/IP attempt limit. A 6-digit code (1M combinations) with unlimited guesses is brute-forceable, and legitimate users lose their pending code on any deploy.
- **Fix:** Persist OTPs in Supabase/Redis with TTL, and add exponential lockout (e.g. 3 attempts → backoff) per email+IP.

### H2. Focus rings suppressed/missing — WCAG 2.1 AA failure across auth + contract wizard **[verified: signup has 7×** `focus:ring-0`**]**

- **Location:** `app/signup/page.js` (7 inputs with `focus:ring-0`), `app/buyer/contracts/new/page.js:26,382,391,529` (`INPUT_CLS` uses `focus:outline-none focus:border-[#1A1816]`, no ring), `components/ui/Input.js:4` & `components/ui/Select.js:61,68,73` (focus uses off-brand `#b29578` tan)
- **What's wrong:** Keyboard users get no visible focus indicator on core forms. The design system explicitly requires a 2px brand border + `rgba(208,56,57,.12)` ring and states focus must never be suppressed (WCAG AA).
- **Fix:** Replace `focus:ring-0`/`focus:outline-none` with `focus:border-[#D03839] focus:ring-2 focus:ring-[rgba(208,56,57,0.12)]` everywhere; fix the tan focus color in the shared `Input`/`Select`.

---

## 🟠 UX Issues



### U2. Make-offer modal discards form data on backdrop click **[reported]**

- **Location:** `components/MakeOfferModal.js:188`
- **What's wrong:** The backdrop `onClick={handleClose}` closes the modal and loses an in-progress offer with no confirmation.
- **Fix:** Guard `handleClose` to confirm only when `step > 1`, or disable backdrop-close once fields are dirty.

### U3. "Withdraw Offer" fires immediately with no confirmation **[reported]**

- **Location:** `components/buyer/ChatWindow.js:930-934`
- **What's wrong:** One click withdraws an active offer via API with no "are you sure?" — easy to do accidentally and not obviously reversible.
- **Fix:** Add a confirmation step before `handleWithdrawOffer`.

### U4. Dead emoji button in chat composer **[verified]**

- **Location:** `components/buyer/ChatWindow.js:664-666`
- **What's wrong:** The `Smile` button renders but has no `onClick` — clicking does nothing, though `emoji-picker-react` is already a dependency. Looks like an unfinished feature.
- **Fix:** Wire it to an emoji picker, or remove the button until it's implemented.

### U5. Off-brand colors in shared/dashboard UI (design-system violations) **[verified spot-checks: Button/Input/Select; reported: dashboard/contracts/offers]**

- **Locations & offending values:**
  - `components/ui/Button.js:11,13` — primary `bg-[#0EA5E9]` (cyan) instead of `#D03839`
  - `components/ui/Input.js:4`, `components/ui/Select.js:61,68,73` — tan `#b29578` focus, `border-gray-300`
  - `app/buyer/insights/page.js:89-90`, `app/buyer/offers/page.js:30`, `app/buyer/inbox/page.js:13`, `app/buyer/dashboard/page.js:147` — blue `#4A90E2` / `#EBF3FC`
  - `app/buyer/contracts/page.js:10-11` — status badges `#16A34A`/`#DCFCE7` (green) and `#D97706`/`#FEF3C7` (amber) instead of success `#0F6E56`/`#E4F5EC` and warning `#B5620A`/`#FEF3E2`
  - `components/buyer/PostDealForm.js:302-307,535-537,545,561` — error palette `#F97066`/`#B42318`/`#FEF3F2`/`#FECDCA` instead of `#D03839`/`#FEF0EF`
  - `components/property/PropertyDetail.js:242,250,280,291`, `PropertyImageSlider*.js`, `SimpleMap.js:205-206`, `components/ui/Modal.js:44` — generic `gray-400/500/100/200` instead of `#737370`/`#A8A8A4`/`#FAFAF8`
  - `app/page.js:12-19`, `components/home/PropertiesSlider.js:16`, `components/home/LandingHero.js:90` — off-brand testimonial/avatar/play-button colors
- **Fix:** Replace each with the nearest design-system token (red `#D03839` family, success `#0F6E56`, warning `#B5620A`, neutrals `#737370`/`#A8A8A4`/`#E8E8E4`/`#FAFAF8`).

### U6. Make-offer exists as both a modal and a full page, implemented twice **[reported]**

- **Location:** `components/MakeOfferModal.js:19-42` vs `app/buyer/make-offer/page.js:19-42` (duplicated `StepBar`, divergent button heights `min-h-[44px]` vs `py-2.5`)
- **What's wrong:** Two near-identical implementations of the same flow will drift; touch-target/visual inconsistencies already exist between them.
- **Fix:** Extract a shared `StepBar` + offer-form component used by both entry points.

### U7. Signup friction: no confirm-password, back-button loses state, OTP field no auto-focus **[reported]**

- **Location:** `app/signup/page.js:406-427` (no confirm field), `:188-189` (Back skips to signup, re-clears form), `:571-579` (OTP input not auto-focused)
- **Fix:** Add confirm-password with live match feedback; make Back return to the prior step preserving entered data; `ref.focus()` the OTP input when its step mounts.

### U8. Profile email is locked with no path to change it **[reported]**

- **Location:** `app/profile/page.js:384-386` ("Email cannot be changed")
- **Fix:** Add a "Change email" flow (re-verify) or at least a support contact link.

### U9. Empty-state / label clarity gaps **[reported]**

- **Location:** `app/buyer/financerequests/page.js:136` ("No applications yet" — ambiguous), `:98-99` ("Apply for Financing" vs page concept "Financing Requests")
- **Fix:** Use feature-specific copy ("No financing requests yet" / "Request Financing").

---

## 🟡 Polish

### P1. Dead code: `MarketplaceNavbar.js` (off-brand) is never imported **[verified]**

- **Location:** `components/layout/MarketplaceNavbar.js` (uses navy `bg-[#152343]`, `border-gray-700`, blue `bg-[#4A90E2]` button, and the only `href="/login"` in the app)
- **What's wrong:** Grep shows no import/usage anywhere — the real nav is `components/layout/Navbar.js`. The earlier audit pass flagged its colors as 🔴, but since it never renders, it's cleanup, not a user-facing bug.
- **Fix:** Delete the file (and it removes the stale `/login` link in one shot).

### P2. `/login` route redirects to home; no real login page **[verified]**

- **Location:** `app/login/page.js:1-5` (`redirect('/')`)
- **What's wrong:** Auth is handled by `RegistrationModal` via a `showAuth` event, so `/login` just bounces to `/`. Harmless today (only the dead navbar linked to it), but a bookmarked/typed `/login` silently fails to show a login form.
- **Fix:** Either render a real login page at `/login` (reuse the modal's login step) or leave the redirect but document it; ensure no live link points there.

### P3. `rounded-lg`/`rounded-xl` on non-pill elements (should be 4px) **[reported]**

- **Location:** `components/buyer/PostDealForm.js:841,873,879,904,911,913,1035` (and scattered elsewhere)
- **Fix:** Replace with `rounded` (4px). Reserve `rounded-full`/100px for pills/badges only.

### P4. Skeleton/loading placeholders use generic gray, not tokens **[reported]**

- **Location:** `app/saved-properties/page.js:84-85` (`bg-[#F0F0EE]`), `SimpleMap.js:205-206`, `PropertyImageSliderMobile.js:181-228`
- **Fix:** Use `#E8E8E4`/`#FAFAF8` for skeletons.

### P5. Duplicated helpers & magic intervals **[reported]**

- **Location:** `formatCurrency()` redefined in `ChatWindow.js:370-373`, `MakeOfferModal.js`, `offers/page.js`; presence heartbeat `25000ms` at `app/buyer/inbox/page.js:74`; promo input weaker ring (`ring-1 /20`) at `PostDealForm.js:971`
- **Fix:** Centralize `formatCurrency` in `lib/`; normalize heartbeat to 30s; align the promo ring with the standard `ring-2 /12`.

### P6. Auto-save / submit feedback is text-only **[reported]**

- **Location:** `app/buyer/contracts/new/page.js:307-310` ("Saving…" no spinner); auth forms show "Sending Code…" with no spinner (`app/signup/page.js:557-563`)
- **Fix:** Add a small `Loader2` spinner alongside the status text.

### P7. Advertise page CTAs are `mailto:` only **[reported]**

- **Location:** `app/advertise/page.js:78-84,151-157` (two identical `mailto:office@deelmap.co`, no form, no response-time expectation)
- **Fix:** Replace with a contact form route, or add a "responds within 24h" note.

### P8. Mobile (375px) cramping on pricing grid **[reported]**

- **Location:** `app/pricing/page.js:208-268` (4-col grid; `text-[28px]` prices feel tight at narrow widths)
- **Fix:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` and scale price font down on mobile.

---

## ✅ Audit-pass claims that were verified as NON-issues (do not "fix")

These were flagged by the parallel passes but manual verification shows the code is correct — documented to prevent wasted effort:

1. **"Unread-count endpoint uses the wrong header (`x-user-id`) and will never load."** — FALSE. The endpoint reads `x-user-id` (`app/api/buyer/unread-count/route.js:13`) **and the only caller sends exactly that header** (`components/layout/Navbar.js:41`: `headers: { 'x-user-id': user.id }`). They match; unread counts work.
2. **"Social login callbacks are missing / OAuth is incomplete."** — FALSE. Callback routes exist: `app/api/auth/google/callback/route.js`, `app/api/auth/facebook/callback/route.js`, plus `google/mobile-callback` and `google/mobile`. (Whether each fully provisions a session wasn't click-tested, but the handlers are present.)
3. **"Stripe webhook may not verify signatures."** — FALSE. `app/api/webhooks/stripe/route.js:27` calls `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` and 400s on failure; it also handles `payment_failed`, `charge.dispute.created`, and `charge.refunded`. (The real webhook bug is the `addOns` TDZ crash — see C1.)

---

## 🔬 Live-Testing Addendum (Round 2 — run against the running dev server)

This round drove the actual site rather than reading code: every page route was fetched, every internal link crawled, public + protected APIs probed, and key pages screenshotted headless at 375px. **Coverage note:** this exercised the *public* surface and *API auth boundaries*. Logged-in buyer flows still need click-through with a real session (no test login available).

**What passed (good news, tested live):**

- All **54 page routes return 200** (or the correct `307` for `/login` → `/`). No `500`s, no Next.js error overlays, no "could not be found" text on any real route. **[live]**
- The dynamic property route renders with a real slug (`/nwwtdtp82` → 200) and **unknown slugs correctly 404** (`/this-slug-does-not-exist` → 404). **[live]**
- Public data APIs serve (`/api/properties`, `/api/deals`, `/api/deals/map`, `/api/health` → 200); protected APIs reject anonymous callers with **401** (see H5). **[live]**
- The **viewport meta tag is correctly served** (`width=device-width, initial-scale=1`) and the mobile layout activates at 375px — so mobile is not fundamentally broken. **[live]**

**New findings surfaced only by live testing:**

### L1. Dead link in the main navbar — "Community" → `/community` 404s **[live]**

- **Location:** `components/layout/Navbar.js:137` (`{ label: 'Community', href: '/community' }`); confirmed `/community` returns **404** while `/api/community/*` routes exist.
- **Severity:** 🟠 High — it's in the **primary site-wide navigation**, so every visitor sees a top-level menu item that leads to a 404.
- **Fix:** Build the `/community` page, or remove the nav item until it exists.

### L2. Developer test pages are publicly reachable in the app **[live]**

- **Location:** `app/test-email/page.js` (`TestEmailPage`) and `app/testmsg/page.js` (`TestSMSPage`) — both return **200** at `/test-email` and `/testmsg` with prefilled test payloads.
- **Severity:** 🟠 High — these can trigger real email/SMS sends and shouldn't ship to production.
- **Fix:** Delete the pages (and their test API routes), or gate them behind a non-production env check.

### L3. "Advertise with us" points to two different destinations **[live]**

- **Location:** footer `components/layout/Footer.js:23` sends it to `/contact`, but the navbar dropdown `components/layout/Navbar.js:129` sends it to `/advertise` — and `/advertise` is a real, built page (200).
- **Severity:** 🟡 — same label, inconsistent target; footer drops users on the generic contact page instead of the advertise page.
- **Fix:** Point the footer "Advertise with us" link to `/advertise`.

### L4. Placeholder social links in the footer **[live]**

- **Location:** `components/layout/Footer.js:173,179,191` (and the desktop duplicates `:225,229,237`) link to bare `https://twitter.com`, `https://instagram.com`, `https://linkedin.com`.
- **Severity:** 🟡 — these go to the platforms' home pages, not DeelMap's profiles.
- **Fix:** Replace with the real company profile URLs (or remove icons for networks with no presence yet).

### L5. Footer "Help center / Cookie policy / Disclaimer" point to stand-in pages **[live]**

- **Location:** `Footer.js:29` ("Help center" → `/contact`), `:51` ("Cookie policy" → `/privacy-policy`), `:52` ("Disclaimer" → `/terms-of-use`).
- **Severity:** 🟡 — labels promise dedicated pages that don't exist; acceptable as interim but worth a real help center / cookie page.
- **Fix:** Create the dedicated pages or relabel to match where they actually go.

### L6. Homepage hero trust-badges row overflows on narrow screens **[live + verified]**

- **Location:** `app/page.js:261` — `<div className="flex items-center gap-x-8">` wraps three badges (Verified sellers / No spam, no duplicates / Skip the middleman) with **no `flex-wrap`** and a 32px gap. The 375px headless capture shows the third badge clipped off the right edge.
- **Severity:** 🟠 — horizontal overflow / clipped content on the primary landing hero at mobile widths.
- **Fix:** Add `flex-wrap gap-y-2` (and consider reducing `gap-x-8` to `gap-x-4`) so the badges wrap on small screens.
- *Note: headless captures of `/` and `/signup` also showed general right-edge clipping; since the viewport meta and responsive classes are correct, that broader clipping is most likely a headless-capture artifact and should be confirmed in real mobile Safari/Chrome DevTools device mode. The badges-row overflow above is the one defect confirmed in code.*

### L7. DSCR calculator uses sub-11px fonts and a partial focus state **[live + verified]**

- **Location:** `app/dscr-calculator/page.js:13,18,40,48` — labels `text-[10px]`, hints `text-[9.5px]`, card titles `text-[10.5px]`, line items `text-[11.5px]`; `SelectField` (`:28`) has `focus:border` but **no focus ring**; input bg uses off-token `#F3F3F0`.
- **Severity:** 🟡 — below the design system's smallest token (11px caption); readability/accessibility concern on a data-dense tool.
- **Fix:** Raise the smallest sizes to ≥11px, add the brand focus ring to `SelectField`, and use `#FAFAF8` for input backgrounds.

### L8. Footer uses several off-token dark greys **[verified]**

- **Location:** `components/layout/Footer.js` — `bg-[#111111]`, borders `#1E1E1E`/`#222222`/`#333333`, text `#555555`. The design system's only dark token is `#1A1816`.
- **Severity:** 🟡 — design-system drift on the dark footer.
- **Fix:** Consolidate to `#1A1816` (and approved neutrals) or formally add the footer greys to the token set.

---

## 💡 Improvement Opportunities (betterments, not bugs)

Things that work today but could be meaningfully better for a real buyer. None of these are defects — they're upgrades worth considering.

1. **Saved searches + deal alerts.** A `buy-box` API already exists (`/api/buyer/buy-box`, `/api/buyer/notify-buy-box`) — surface it as "save this search" on the marketplace and email/SMS buyers when new matching deals post. High retention value for investors who hunt daily.
2. **Surface "Recently viewed."** `/api/buyer/recently-viewed` already records views — add a recently-viewed row on the marketplace/dashboard so buyers can resume where they left off.
3. **First-run onboarding for new buyers.** A brand-new buyer lands on an empty dashboard. Add a short checklist ("set your buy-box → save your first deal → make your first offer") to convert sign-ups into active users.
4. **Comparable sales / ARV confidence on detail pages.** Buyers evaluate spread; showing comps or an ARV confidence indicator next to the existing ARV would build trust in the numbers.
5. **Inline financing pre-qual on property detail.** Financing already exists as a separate flow; a "see if you pre-qualify" widget on the deal page (using the financing API) would shorten the path from interest → offer.
6. **Notification & email preferences center.** With offers, messages, and buy-box alerts all sending, give buyers one place to control channel/frequency to avoid opt-outs.
7. **Skeleton loaders instead of spinners.** Several pages show spinners or text ("Saving…", "Sending Code…"); content-shaped skeletons (and spinner icons on submit buttons) feel faster and reduce layout shift.
8. **De-duplicate the make-offer modal vs. full page** (also U6) and centralize shared bits (`StepBar`, `formatCurrency`) so the two stay in sync.
9. **Search UX upgrades.** Debounced text search, "draw on map" area search, and list↔map hover sync are table-stakes for marketplaces buyers compare against (Zillow/InvestorLift).
10. **Accessibility pass.** Beyond the focus-ring fixes (H6), audit alt text on property images, keyboard operability of the gallery/modal, and color-contrast on the muted greys.
11. **Offer history & re-offer.** Let buyers see their full offer timeline per property and "re-offer" with one click after a rejection/counter.
12. **Trust signals.** Make the verified-seller badge consistent across cards/detail, show "X buyers viewing" (the live-tracking infra already exists via `LiveTrackingProvider`), and surface deal freshness ("posted 2h ago").

---

## Impact-Ordered Action List

1. **Rotate the leaked Monday.com token and Numverify keys, move both to env/secret storage** (C2, C3) — live credentials, do this first.
2. **Fix the Stripe webhook `addOns` ordering** so the paid-listing fallback can't crash (C1) — buyers are currently chargeable with no listing delivered on that path.
3. **Remove the public `/test-email` and `/testmsg` pages** (L2) — they can fire real email/SMS and must not ship to production.
4. **Reconcile pricing copy with actual charges** (highlight 7 vs 30 days; homepage "$29/day" vs flat $29) (H3) — billing-dispute exposure.
5. **Fix the `/community` dead link in the main navbar** (L1) — a 404 in primary, site-wide navigation.
6. **Add OTP persistence + rate limiting** and **enforce password strength at signup** (H1, H2) — account-security basics before public launch.
7. **Enforce coupon redemption per-user server-side** (H4) — revenue leakage.
8. **Restore focus rings across auth + contract wizard + shared Input/Select + DSCR calculator** (H6, L7) — WCAG 2.1 AA compliance.
9. **Harden auth boundary** — add `middleware.js` checks or a test asserting every `/api/buyer/*` route 401s unauthenticated (H5; per-route 401s already confirmed live).
10. **Remove `target="_blank"` from internal property-card links** (U1) — daily-use friction for every buyer.
11. **Add confirmations to destructive/lossy actions** (offer withdraw U3, make-offer backdrop close U2) and **wire or remove the dead emoji button** (U4).
12. **Fix the homepage hero trust-badges overflow** at 375px (`flex-wrap`) (L6) and verify `/`+`/signup` mobile layout on a real device.
13. **Sweep design-system color violations to tokens** (U5, L8) — blues `#0EA5E9`/`#4A90E2`, tan `#b29578` focus, greens/ambers in contract badges, off-brand error palette, generic grays, footer dark greys.
14. **De-duplicate the make-offer modal/page** and **centralize `formatCurrency`** (U6, P5).
15. **Navigation/footer cleanup:** point "Advertise with us" to `/advertise` (L3), replace placeholder social links (L4), build or relabel Help center/Cookie/Disclaimer (L5).
16. **Polish:** delete dead `MarketplaceNavbar` (P1), decide on `/login` (P2), fix `rounded-lg`→4px (P3), token-ize skeletons (P4), add submit spinners (P6), advertise CTA (P7), pricing mobile grid (P8), DSCR sub-11px fonts (L7).
17. **Then consider the Improvement Opportunities** (saved searches/alerts, recently-viewed, new-buyer onboarding, comps/ARV confidence, etc.) once the defect list is clear.

