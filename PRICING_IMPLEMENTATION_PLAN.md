# DeelMap — Pricing & Onboarding Implementation Plan

**Prepared:** 2026-04-10
**Last updated:** 2026-04-10 (clarified from Hamza/Yousaf day-start check-in)
**Scope:** deelmap-buyer (buyer portal) + Seller dashboard (sellerportaldeelmap)
**Status:** Planning

---

## 1. Overview

This document covers the full implementation of:
- **Three-tier pricing** (Standard one-time, Pro subscription, Enterprise subscription)
- **Annual billing toggle** (20% discount)
- **Listing enhancement add-ons** (purchased per-listing at checkout)
- **Redesigned seller onboarding** (Registration → Phone verification → Plan selection → Payment → Dashboard)
- **Feature gating** in the Seller Dashboard based on active plan
- **Sell page redirect** — replaces auth popup with a full onboarding flow into the Seller Dashboard

### 1.1 Two User Types (Clarified)

There are **two distinct user types** in the Deelmap ecosystem — they are separate flows and must not be confused:

| Type | Who | Where they onboard | Payment model |
|---|---|---|---|
| **General users (buyers)** | Anyone visiting deelmap.com to post a deal | Buyer portal `/buyer/listings` | Flat $29/listing fee, pay-per-listing only |
| **Subscribers (sellers)** | Dedicated sellers who register via seller portal | Seller portal `/register` | Standard plan, Pro, or Enterprise subscription |

- **Buyers** posting from the buyer portal always pay $29 flat per listing — no subscription needed, no plan selection. This flow already exists.
- **Sellers** registering via the seller portal go through the full onboarding: email → phone OTP → plan selection → Stripe payment.
- Both types coexist. The pricing page and onboarding in this document are **for sellers** (the seller portal path).
- The buyer portal login popup remains unchanged. Only the **"Sign up as a seller"** CTA changes — it redirects to the seller portal instead of showing the buyer signup form.

---

## 2. Pricing Tiers

### 2.1 Standard (Pay-Per-Listing)
| Field | Value |
|---|---|
| Type | One-time |
| Price | $29 per listing |
| Duration | Permanent — listing stays live until manually removed |
| Listing limit | Quantity-based (user selects how many listings at checkout) |
| Stripe object | `price_standard_listing` (one-time, $29 × quantity) |

**Quantity selector:** The pricing page shows a simple $29/listing CTA — no quantity input on the pricing page itself. After clicking "Post a listing", the seller reaches Step 3 of the onboarding flow where they pick a quantity before payment.

**UI — preset tiles + custom input:**
- Four preset tiles: **1 · 3 · 5 · 10** listings (showing $29 / $87 / $145 / $290)
- Selected tile gets red border, matching the pricing page card style
- Below the tiles: "or enter a custom amount" text link — clicking reveals a `+/-` stepper for any other quantity
- Live total updates below: "Total: $__ (N × $29)"
- Default selection: 1 listing

**Important:** The $29 is a **one-time, non-recurring payment**. The listing stays active permanently after payment — there is no expiry or renewal charge. The seller removes it when their deal closes.

**Included features:**
- Basic Seller Dashboard
- Buyer inquiry inbox
- Photo uploads
- Basic analytics (unique buyers + names only)
- Standard support

**NOT included:** Verified seller badge, Priority search placement, CRM features

> **Note:** General users (buyers posting from buyer portal) also pay $29/listing but through a completely separate flow — they are NOT using this Standard plan. This Standard plan is specifically for sellers registering via the seller portal.

---

### 2.2 Pro Seller (Subscription)
| Field | Monthly | Annual |
|---|---|---|
| Price | $99/mo | $948/yr ($79/mo) |
| Listings | 10/month | 10/month |
| Overage | $19/additional listing | $19/additional listing |
| Stripe objects | `price_pro_monthly` | `price_pro_annual` |
| Trial | 7-day free trial | 7-day free trial |

**Included features:**
- Verified seller badge (shown on buy page listing cards)
- Advanced seller dashboard
- Advanced analytics (avg time on listing + engagement metrics)
- Priority search placement
- Priority support
- 10 listings/month

**NOT included:** CRM features, Team accounts

---

### 2.3 Enterprise (Subscription)
| Field | Monthly | Annual |
|---|---|---|
| Price | $299/mo | $2,868/yr ($239/mo) |
| Listings | Unlimited | Unlimited |
| Stripe objects | `price_enterprise_monthly` | `price_enterprise_annual` |

**Included features:**
- Everything in Pro
- Unlimited listings
- Basic CRM features
- Lead management tools
- Team accounts
- Custom branding
- Dedicated account support
- API access *(future)*

> **Implementation note (from meeting):** Enterprise-specific features (team accounts, lead management tools, custom branding, API access) are **deferred** — show them on the pricing page but do not implement them in Phase 1–5. Build the tier so it can be activated; the extra features come later. Enterprise payment + listing flow is otherwise identical to Pro.

---

### 2.4 Listing Enhancement Add-ons
| Add-on | Price | Duration | Stripe object |
|---|---|---|---|
| Highlighted listing | $9.99 | 7 days | `price_addon_highlight` |
| Homepage feature | $29/day | Per day booked (max 7-day booking) | `price_addon_homepage` |
| Boost listing | $14.99 | 7 days | `price_addon_boost` |
| Highlight + Boost bundle | $22 one-time | 7-day highlight + 7-day boost | `price_addon_bundle` |

Add-ons are:
- Available on **any tier** (Standard, Pro, Enterprise)
- Purchased **per listing** at checkout
- One-time charges regardless of subscription status

> **From meeting:** Listing enhancements on the pricing page should appear **locked/deactivated** until the seller has an active plan. Once a plan is purchased, they become available. Show them as greyed out with a lock icon before plan activation.

---

## 3. Feature Gating Matrix

| Feature | Standard ($29) | Pro ($99/mo) | Enterprise ($299/mo) |
|---|---|---|---|
| Seller dashboard access | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Buyer inquiry inbox | ✅ | ✅ | ✅ |
| Photo uploads | ✅ | ✅ | ✅ |
| Analytics: unique buyers + names | ✅ | ✅ | ✅ |
| Analytics: avg time on listing | ❌ | ✅ | ✅ |
| Analytics: engagement metrics | ❌ | ✅ | ✅ |
| Standard support | ✅ | ✅ | ✅ |
| Verified seller badge (on buy page cards) | ❌ | ✅ | ✅ |
| Priority search placement | ❌ | ✅ | ✅ |
| Priority support | ❌ | ✅ | ✅ |
| Monthly listing allowance | N × $29 per purchase | 10/month | Unlimited |
| Additional listings | N/A (buy more) | +$19 each | Free |
| CRM features | ❌ | ❌ | 🔜 Deferred |
| Lead management tools | ❌ | ❌ | 🔜 Deferred |
| Team accounts | ❌ | ❌ | 🔜 Deferred |
| Custom branding | ❌ | ❌ | 🔜 Deferred |
| Dedicated account support | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | 🔜 Deferred |

---

## 4. Seller Onboarding Flow (New)

### Current (old) flow:
`/join-seller` → Auth popup → Redirected to seller dashboard

### New flow (for sellers via seller portal):
```
Buyer site: "Sign up as a seller" CTA (on /pricing or /join-seller)
  ↓  (redirect — no popup)
Seller portal: /register
  ↓
Step 1: Email Registration
  - First name, last name, email, password
  - Creates account in Supabase auth + seller_applications table
  ↓
Step 2: Phone Verification
  - Enter phone number
  - Receive 6-digit SMS OTP via Aerophone API (uses existing Deelmap Telnyx number/text bot)
  - Verify → marks phone_verified = true
  ↓
Step 3: Select Plan
  - Show pricing cards (Standard / Pro / Enterprise)
  - Monthly/Annual toggle
  - Standard: show quantity selector (N × $29)
  - User selects plan → stored in session state
  ↓
Step 4: Payment
  - Standard ($29 × N): Stripe one-time PaymentIntent
  - Pro/Enterprise: Stripe Subscription (with 7-day trial for Pro)
  - Store credit card via Stripe Customer (hashed/tokenised by Stripe — never raw card data stored)
  - Add card → Stripe confirms → webhook fires
  ↓
Step 5: Complete
  - Account activated + plan assigned
  - Redirect to Seller Dashboard
```

> **Important — "Sign up as seller" redirect (from meeting):** On the buyer site, the **"Sign up as a seller"** link should redirect directly to the seller portal `/register` page. Do NOT remove or change the existing buyer login popup — that stays as-is for buyers. Only the seller CTA changes. Keep the existing login link on the buyer site unchanged.

> **Phone verification:** SMS OTP endpoints have been **created in the seller portal** at `app/api/auth/send-otp/route.js` and `app/api/auth/verify-otp/route.js`. They use the same `ap.airosofts.com` SMS API as the buyer portal. OTP is keyed by email so Step 1 must complete before Step 2.

> **Payment method storage (from meeting):** Store credit card via Stripe Customer object (Stripe handles hashing/tokenisation). Do not store raw card numbers anywhere. For monthly subscriptions, show Upgrade/Cancel in account settings — **cancel button should be buried deep** (not prominently accessible) to discourage easy cancellations.

### Where this lives:
- **Multi-step form:** entirely in the **Seller Portal** (`sellerportaldeelmap/app/register/page.js`)
- The buyer site `/join-seller` (and pricing page CTAs) simply redirect to `SELLER_PORTAL_URL/register?plan=...`

---

## 5. Navigation & "Sell" Page Changes

### 5.1 `/join-seller` page in deelmap-buyer
**Change:** The existing "Sign up as a seller" CTA currently opens an auth popup.

**New behavior:**
- Clicking "Sign up as a seller" → redirect to `SELLER_PORTAL_URL/register`
- Clicking a plan CTA on `/pricing` → redirect to `SELLER_PORTAL_URL/register?plan=pro` (or `standard` / `enterprise`)
- The seller portal handles the full registration + payment flow
- **The buyer login popup stays unchanged** — only the seller-specific CTA changes

**Affected files:**
- `deelmap-buyer/app/join-seller/page.js` — update "Sign up as seller" CTA to redirect (NOT the login link)
- `deelmap-buyer/app/pricing/page.js` — update plan CTA hrefs to `SELLER_PORTAL_URL/register?plan=...`
- `deelmap-buyer/components/layout/Navbar.js` — no change needed

### 5.2 Pricing page CTAs
| Plan | CTA | Destination |
|---|---|---|
| Standard | "Post a listing" | `SELLER_PORTAL_URL/register?plan=standard` |
| Pro | "Start free 7-day trial" | `SELLER_PORTAL_URL/register?plan=pro&billing=monthly` |
| Enterprise | "Talk to sales" | `SELLER_PORTAL_URL/register?plan=enterprise` or contact form |

---

## 6. Stripe Configuration Required

### 6.1 Products & Prices to create in Stripe Dashboard
```
Product: "DeelMap Standard Listing"
  price_standard_listing: $29.00 one-time

Product: "DeelMap Pro Seller"
  price_pro_monthly:  $99.00 / month   (trial_period_days: 7)
  price_pro_annual:   $948.00 / year   (trial_period_days: 7)

Product: "DeelMap Enterprise"
  price_enterprise_monthly: $299.00 / month
  price_enterprise_annual:  $2868.00 / year

Product: "Highlighted Listing"
  price_addon_highlight: $9.99 one-time

Product: "Homepage Feature"
  price_addon_homepage: $29.00 one-time (quantity = number of days, max 7)

Product: "Boost Listing"
  price_addon_boost: $14.99 one-time

Product: "Highlight + Boost Bundle"
  price_addon_bundle: $22.00 one-time
```

### 6.2 Stripe Customer creation
- On registration: create a Stripe Customer for every seller
- Store `stripe_customer_id` in `seller_applications` or `users` table
- Attach payment method to customer for future charges

### 6.3 Webhooks to handle
```
payment_intent.succeeded       → activate Standard listing
customer.subscription.created  → activate Pro/Enterprise plan
customer.subscription.updated  → handle plan upgrade/downgrade
customer.subscription.deleted  → downgrade to no plan, block listings
invoice.payment_failed         → notify seller, suspend active listings
invoice.payment_succeeded      → reset monthly listing count
```

---

## 7. Database Schema Changes

### 7.1 New table: `seller_plans`
```sql
CREATE TABLE seller_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL,              -- FK to seller_applications.id
  plan_type       text NOT NULL,              -- 'standard' | 'pro' | 'enterprise'
  billing_cycle   text,                       -- 'monthly' | 'annual' | 'one_time'
  status          text NOT NULL DEFAULT 'active', -- 'active' | 'trialing' | 'past_due' | 'canceled'
  stripe_customer_id        text,
  stripe_subscription_id    text,
  stripe_price_id           text,
  trial_ends_at             timestamptz,
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  listings_used_this_period int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

### 7.2 New table: `listing_addons`
```sql
CREATE TABLE listing_addons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       uuid NOT NULL,            -- FK to wholesale_deals or properties
  seller_id         uuid NOT NULL,
  addon_type        text NOT NULL,            -- 'highlight' | 'homepage' | 'boost' | 'bundle'
  stripe_payment_intent_id text,
  amount_paid       int,                      -- in cents
  days_purchased    int,                      -- for homepage_feature
  starts_at         timestamptz DEFAULT now(),
  ends_at           timestamptz,
  status            text DEFAULT 'active',    -- 'active' | 'expired'
  created_at        timestamptz DEFAULT now()
);
```

### 7.3 Changes to `seller_applications`
```sql
ALTER TABLE seller_applications ADD COLUMN stripe_customer_id text;
ALTER TABLE seller_applications ADD COLUMN phone_verified boolean DEFAULT false;
ALTER TABLE seller_applications ADD COLUMN plan_type text DEFAULT null;
ALTER TABLE seller_applications ADD COLUMN onboarding_step int DEFAULT 1;
-- 1=registration, 2=phone_verify, 3=plan_select, 4=payment, 5=complete
```

### 7.4 Changes to `wholesale_deals` / `properties`
```sql
ALTER TABLE wholesale_deals ADD COLUMN is_highlighted boolean DEFAULT false;
ALTER TABLE wholesale_deals ADD COLUMN highlight_ends_at timestamptz; -- 7 days from purchase
ALTER TABLE wholesale_deals ADD COLUMN is_homepage_featured boolean DEFAULT false;
ALTER TABLE wholesale_deals ADD COLUMN homepage_feature_ends_at timestamptz;
ALTER TABLE wholesale_deals ADD COLUMN is_boosted boolean DEFAULT false;
ALTER TABLE wholesale_deals ADD COLUMN boost_ends_at timestamptz;
ALTER TABLE wholesale_deals ADD COLUMN search_priority int DEFAULT 0;
-- 0=normal, 1=boosted, 2=priority(Pro), 3=priority+boosted
```

---

## 8. New API Endpoints

### 8.1 Seller Portal (`sellerportaldeelmap`)

#### Registration & Auth
```
POST /api/auth/register-seller
  body: { first_name, last_name, email, password }
  → creates Supabase auth user + seller_applications row + Stripe Customer
  → returns: { seller_id, step: 2 }

-- Phone verification: build in seller portal (separate app, can't share routes) --
POST /api/auth/send-otp  (create in seller portal)
  body: { phone, email }
  → generates 6-digit code, stores in-memory keyed by email, sends via ap.airosofts.com SMS API
  → same logic as deelmap-buyer send-otp but SMS-only (no email path needed)

POST /api/auth/verify-otp  (create in seller portal)
  body: { email, otp }
  → verifies code against store, returns { success: true }
  → does NOT create user (registration is a separate step)
```

#### Plan Selection & Payment
```
POST /api/seller/plan/create-intent
  body: { seller_id, plan_type, billing_cycle }
  → Standard: creates PaymentIntent ($29)
  → Pro/Enterprise: creates Subscription with trial

GET /api/seller/plan
  → returns current plan for authenticated seller

POST /api/seller/plan/upgrade
  body: { plan_type, billing_cycle }
  → upgrades/downgrades Stripe subscription

DELETE /api/seller/plan/cancel
  → cancels subscription at period end
```

#### Add-ons
```
POST /api/seller/addons/purchase
  body: { property_id, addon_type, days? }
  → creates Stripe PaymentIntent for addon
  → on success: updates listing_addons table

GET /api/seller/addons/:property_id
  → returns active addons for a listing
```

#### Webhooks
```
POST /api/webhooks/stripe
  → handles: payment_intent.succeeded, subscription.*, invoice.*
  → updates seller_plans, listing_addons, wholesale_deals
```

### 8.2 Buyer Portal (`deelmap-buyer`)

No new endpoints needed — the buyer portal only redirects to seller portal for onboarding. Marketplace display logic reads `is_boosted`, `is_highlighted`, `is_homepage_featured` from DB.

#### ✅ Buyer listing payment — already secured (3 layers)
The buyer's $29 listing fee flow is fully protected against listings being created without completed payment:

1. **Frontend** (`PostDealForm.js`) — only calls `POST /api/buyer/listings` inside `if (paymentIntent.status === 'succeeded')`. Stripe error at any point stops the flow.
2. **API route** (`/api/buyer/listings` POST) — server-side re-verification: requires `stripe_payment_intent_id`, calls `stripe.paymentIntents.retrieve()`, rejects if status ≠ `'succeeded'`, blocks duplicate intent IDs via `payments` table lookup.
3. **Webhook fallback** (`/api/webhooks/stripe`) — handles `payment_intent.succeeded` as a fallback if the client crashed after payment. Same idempotency check: skips if `payments` table already has that intent ID (prevents double-creation).

The same three-layer pattern should be applied to the seller portal's Standard plan payment when it is built.

---

## 9. Seller Dashboard Feature Gating

### 9.1 Plan detection
Each page/component in the seller dashboard checks `seller_plans` for the active seller:
- Fetch plan on app load → store in React context `SellerPlanContext`
- All gated features read from this context

### 9.2 Gated UI components

**Verified badge** (Pro + Enterprise only)
- Show "Verified Seller" badge on the **buy page listing cards** (visible to buyers browsing) — reference: similar to Backflip's verified badge UI
- Also show on seller dashboard header
- `is_verified` computed from `plan_type IN ('pro', 'enterprise') AND status = 'active'`
- Implemented inside the listing card component on the buy/marketplace page

**Analytics (from meeting — tiered by plan)**
- **Buyer portal (any plan):** name + unique views only (already implemented in `PropertyAnalyticsSidebar.js`)
- **Seller dashboard Standard:** same as buyer portal — unique buyers + names only, no extra stats
- **Seller dashboard Pro:** unique buyers + avg time on listing + engagement metrics (device breakdown, sort options)
- **Seller dashboard Enterprise:** same as Pro (slightly more in future, deferred for now)

**Priority search placement** (Pro + Enterprise)
- Set `search_priority = 2` on all their active listings
- Marketplace query: `ORDER BY search_priority DESC, created_at DESC`

**CRM tab** (Enterprise only)
- Sidebar CRM link — hidden for Standard/Pro
- Show upgrade prompt if Standard/Pro user tries to access

**Team accounts** (Enterprise only)
- Invite team members feature — hidden unless Enterprise

**Monthly listing counter** (Pro)
- Show "7 of 10 listings used this month" banner in dashboard
- On 11th listing: charge $19 automatically via stored payment method

**Unlimited listings** (Enterprise)
- No counter shown, no overage charge

### 9.3 Upgrade prompts
When a Standard/Pro user tries to access a Pro/Enterprise feature:
- Show inline modal: "Upgrade to [Pro/Enterprise] to unlock [feature]"
- CTA: "Upgrade Plan" → opens plan selection page

---

## 10. Listing Checkout Flow with Add-ons

### For Standard users (per-listing purchase):
```
Step 1: Fill listing form (address, price, photos, details)
Step 2: Add-on selection (optional)
  - Checkboxes for: Highlighted ($9.99), Homepage ($29/day × days), Boost ($14.99), Bundle ($22)
Step 3: Summary + payment
  - Base: $29
  - Add-ons: itemized
  - Total: calculated
  - Pay → listing goes live
```

### For Pro/Enterprise users (subscription):
```
Step 1: Fill listing form
Step 2: Add-on selection (optional, addons are extra charges even for subscribers)
Step 3: If add-ons selected → charge stored payment method
  - No base listing fee (covered by subscription)
  - Only add-on charges
  - Confirm → listing goes live
Step 4: If no add-ons → listing goes live immediately (no payment step)
```

### Listing quota enforcement (Pro):
- Before publishing: check `listings_used_this_period` vs `10`
- If at limit → show "You've used 10/10 listings. Additional listings are $19 each."
- Charge $19 via stored payment method → increment counter → publish

---

## 11. Marketplace Display Changes

### Highlighted listings
- Card gets gold border (`border-[#B8974A]` or similar brass color)
- Small "Highlighted" badge on card
- Query: `WHERE is_highlighted = true AND highlight_ends_at > now()`

### Homepage featured
- Maps to the existing **"Featured Investment Opportunities"** carousel section on the homepage (confirmed in meeting)
- Query: `WHERE is_homepage_featured = true AND homepage_feature_ends_at > now()`
- Wire up existing section — no new UI component needed, just update the data query

### Boosted listings
- Appear at top of search results
- `ORDER BY is_boosted DESC, search_priority DESC, created_at DESC`
- Small "Boosted" label on card (subtle, not spammy)

### Priority search placement (Pro/Enterprise subscription)
- Pro/Enterprise sellers' listings get `search_priority = 2`
- Appears above Standard listings in organic results (not above boosts)

---

## 12. Implementation Phases

### Phase 1 — Stripe Setup & Schema (No user-facing changes)
1. Create all Stripe Products & Prices in dashboard
2. Store Price IDs in `.env` files (both projects)
3. Run DB migrations: `seller_plans`, `listing_addons`, alter existing tables
4. Set up Stripe webhook endpoint in seller portal
5. Test webhook handling locally with Stripe CLI

### Phase 2 — Seller Registration Flow (Seller Portal)
1. Build `/register` multi-step page in seller portal:
   - Step 1: Email registration form
   - Step 2: Phone verification — use `POST /api/auth/send-otp` + `POST /api/auth/verify-otp` (already created in seller portal)
   - Step 3: Plan selection cards (with annual toggle) + quantity selector for Standard (how many listings, default 1, total = N × $29)
   - Step 4: Payment (Stripe Elements, save card to Stripe Customer object)
   - Step 5: Success → redirect to dashboard
2. Handle `?plan=` URL param to pre-select plan
3. Create all API endpoints listed in Section 8.1

### Phase 3 — Buyer Site Navigation Updates
1. Update "Sign up as a seller" CTA on `/join-seller` to redirect to seller portal `/register` (do NOT touch buyer login popup)
2. Update `/pricing` page plan CTAs with correct destinations (`SELLER_PORTAL_URL/register?plan=...`)
3. Remove the "Not sure which plan fits?" / "Schedule a call" section from `/pricing/page.js` (per meeting: Hamza confirmed remove entirely — business model is automated, not call-based)

### Phase 4 — Feature Gating in Seller Dashboard
1. Create `SellerPlanContext` — fetch active plan on app load
2. Wrap gated features with `<PlanGate requiredPlan="pro">` component
3. Add verified badge to dashboard header and public listing cards
4. Split analytics sidebar: basic (Standard) vs full (Pro/Enterprise)
5. Add upgrade prompts on locked features

### Phase 5 — Listing Checkout with Add-ons
1. Add add-on selection step to listing creation flow (Standard: step before payment)
2. For Pro/Enterprise: add-on step only shown if they select add-ons
3. Calculate total, create PaymentIntent with line items
4. On success: insert `listing_addons` rows, update listing flags
5. Add scheduled job (cron) to expire add-ons: `UPDATE wholesale_deals SET is_highlighted=false WHERE highlight_ends_at < now()`

### Phase 6 — Marketplace Display
1. Homepage featured deals section — wire to `is_homepage_featured` query
2. Search results ordering — add `search_priority` and `is_boosted` to ORDER BY
3. Highlighted card styling — gold border + badge
4. Boosted label on card

### Phase 7 — Subscription Lifecycle Management
1. Handle invoice.payment_failed → email + in-app notification to seller
2. Handle subscription.deleted → set plan to null, set all listings to draft
3. Monthly listing counter reset on invoice.payment_succeeded
4. Pro overage: auto-charge $19 on 11th listing via Stripe `create_payment_intent` with stored customer
5. Cancel subscription: accessible from **account settings only** — do NOT put a cancel button anywhere prominent. Make it deliberately hard to find (buried in settings, similar to how logout is hidden). The upgrade button should be the primary CTA.

---

## 13. Key Files to Create / Modify

### Seller Portal (`sellerportaldeelmap`)
| File | Action |
|---|---|
| `app/register/page.tsx` | Create — multi-step onboarding |
| `app/register/components/StepRegister.tsx` | Create |
| `app/register/components/StepPhoneVerify.tsx` | Create |
| `app/register/components/StepPlanSelect.tsx` | Create |
| `app/register/components/StepPayment.tsx` | Create |
| `app/api/auth/register-seller/route.ts` | Create |
| `app/api/auth/send-otp/route.js` | ✅ Created |
| `app/api/auth/verify-otp/route.js` | ✅ Created |
| `app/api/seller/plan/route.ts` | Create |
| `app/api/seller/plan/create-intent/route.ts` | Create |
| `app/api/seller/addons/purchase/route.ts` | Create |
| `app/api/webhooks/stripe/route.ts` | Create |
| `context/SellerPlanContext.tsx` | Create |
| `components/PlanGate.tsx` | Create |
| `components/properties/PropertyAnalyticsSidebar.js` | Modify — split by plan tier |
| `app/dashboard/page.tsx` | Modify — show plan badge, listing counter |

### Buyer Portal (`deelmap-buyer`)
| File | Action |
|---|---|
| `app/join-seller/page.js` | Modify — update CTAs to redirect |
| `app/pricing/page.js` | Modify — update plan CTA hrefs |
| `app/marketplace/page.js` | Modify — add sort by priority/boost |
| `app/page.js` | Modify — featured deals section wire-up |
| `components/property/PropertyCard.js` | Modify — add highlight border + boost badge |
| `app/api/deals/route.js` | Modify — add ORDER BY search_priority, is_boosted |
| `app/api/deals/map/route.js` | No change needed |

---

## 14. Environment Variables Needed

### Seller Portal
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

AIROSOFTS_SMS_API_KEY=...        # same value as in deelmap-buyer
AIROSOFTS_SMS_FROM=...           # same Deelmap Telnyx number

STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...
STRIPE_PRICE_ADDON_HIGHLIGHT=price_...
STRIPE_PRICE_ADDON_HOMEPAGE=price_...
STRIPE_PRICE_ADDON_BOOST=price_...
STRIPE_PRICE_ADDON_BUNDLE=price_...
```

### Buyer Portal
```env
# Already has Stripe keys for buyer listing fee
# No new Stripe keys needed — redirects to seller portal for seller payments
```

---

## 15. Open Questions / Decisions Needed

1. **Standard plan add-ons checkout** — should add-ons be purchased in the same Stripe session as the $29 × N listing fee, or as a separate payment?
   *Recommendation: Single session — create a PaymentIntent for total (base × quantity + addons)*

2. **Pro 7-day trial** — does trial require a credit card upfront?
   *Recommendation: Yes, card required but not charged until trial ends (Stripe `trial_period_days`)*

3. **Enterprise — "Talk to sales"** — manual signup or self-serve?
   *Recommendation: Contact form for now, manual plan activation by admin. Enterprise features are deferred anyway.*

4. **Existing sellers (from before pricing launch)** — what plan do they get?
   *Recommendation: Grandfather them as Pro for 30 days, then require plan selection*

5. **Homepage featured section** — ✅ Resolved: confirmed = existing "Featured Investment Opportunities" carousel on homepage. Just wire the query.

6. **Add-on expiry cron** — Railway cron job or Supabase scheduled function?
   *Recommendation: Supabase pg_cron (already using Supabase) — runs every hour*

7. **Phone verification for Standard users** — ✅ Resolved: phone OTP is required for all users in the onboarding flow, before plan selection. Uses Aerophone API (existing Telnyx/Deelmap number).

8. **Standard plan quantity** — ✅ Resolved: quantity selector shown at checkout (not on pricing page). User picks preset tiles (1/3/5/10) or custom amount. Total = N × $29, one-time. Listings stay live permanently until removed.

9. **Map city marker** — when a city/location is searched but has no properties listed, the center map marker looks like a property logo which is confusing. Should be changed to a **circle** or other distinct visual differentiator. (Tracked as separate task, not part of pricing implementation.)

10. **HIC image format** — browser doesn't support HEIC/HIC. Need to convert to PNG on upload. Reference code in admin portal repository. (Tracked as separate task.)

---

## 16. Priorities & Order of Work

When ready to start, implement in this order:

1. ✅ Stripe products + prices created in dashboard
2. ✅ DB migrations run
3. ✅ Webhook endpoint live + tested
4. ✅ Registration flow built in seller portal
5. ✅ Buyer site CTAs updated to redirect
6. ✅ Feature gating in seller dashboard
7. ✅ Add-ons at listing checkout
8. ✅ Marketplace display (highlights, boosts, featured)
9. ✅ Subscription lifecycle (dunning, expiry, overage)

---

*DeelMap Pricing Implementation Plan — internal document*
