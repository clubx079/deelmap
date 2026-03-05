# Property Slug URLs – Implementation Summary

## Goal

- **URL format:** `domain.com/property-slug` (no Supabase UUID in the URL).
- **Slug format:** 7 letters + 2 numbers (e.g. `kxmnpqr29`).
- **UTM:** Query params (e.g. `?utm_source=twitter`) work when appended after the slug.
- **Old routes:** Legacy UUID and `/property/:id` links still work (resolve or redirect).

---

## 1. Deelmap Buyer (this repo)

### Implemented

- **`app/[slug]/page.js`**
  - Resolves by **slug** first (wholesale_deals and properties).
  - If not found and segment looks like a **UUID**, resolves by **id** (backward compatibility).
  - Metadata/canonical URL use `property.slug || property.id`.
- **`lib/propertyMappers.js`**
  - `normalizeWholesaleDeal` and `normalizeManualProperty` both expose `slug`.
- **`components/property/PropertyCard.js`**
  - Link and share URL use `property.slug || id` (so `/kxmnpqr29` instead of UUID).
- **`components/home/PropertiesSlider.js`**
  - Featured property links use `property.slug || property.id`.
- **`components/property/PropertyMap.js`**
  - Map card click uses `prop.slug || prop.id`.
- **`app/api/live-tracking/route.js`**
  - `getPropertyFromSlug(slug)` tries **slug** first, then **id** when segment is UUID.
- **`next.config.mjs`**
  - Redirect: `/property/:path*` → `/:path*` so old `/property/uuid` or `/property/slug` links still work.

### DB

- **wholesale_deals** and **properties** must have a `slug` column (see `docs/wholesale_deals_slug_migration.sql` and backfill scripts in repo root).

---

## 2. Seller Dashboard (sellerportaldeelmap)

### Slug generation (already in place)

- **New property:** `app/properties/new/page.js` – generates 7 letters + 2 numbers and saves as `slug`.
- **Edit property:** `app/properties/edit/[id]/page.js` – can update slug when address/title changes; same 7+2 format.
- **Backfill:** `scripts/backfill-slugs.js` – currently uses 8-char hex; can be updated to 7+2 if desired for consistency.

No buyer routing changes needed in this repo; it only needs to keep writing `slug` when creating/updating properties.

---

## 3. Gmail Integration (gmail-integration-cloudfare/cloudflare-email-inbox)

### Slug generation (already in place)

- **`src/lib/supabase.js`** – `generateShortSlug()` (7 letters + 2 numbers); used when creating new wholesale_deals (email/URL import).
- New deals get `slug: generateShortSlug()` on insert; existing deals are not given a new slug on update.

**Optional check:** If `src/app/api/wholesale-deals/route.ts` is used to create deals (e.g. from another client), add `slug` to `dealData` using the same 7+2 generator so new rows have a slug.

---

## 4. Call and SMS (call-and-sms)

### Slug generation (already in place)

- **`src/lib/save-to-wholesale.js`** – `generateShortSlug()` (7 letters + 2 numbers); used when saving to `wholesale_deals` via SMS.
- New deals get `slug: generateShortSlug()`; on update, `slug` is not overwritten.

No changes required for slug format.

---

## 5. Feature branch workflow

1. **Deelmap Buyer**
   - Create branch from main: `git checkout main && git pull && git checkout -b feature/slug-urls`
   - All slug routing and link changes are in this branch; commit and push.
2. **Seller Dashboard / Gmail / Call-and-SMS**
   - Slug is already generated (7+2) where properties/deals are created.
   - Create a feature branch from main in each repo if you want to isolate any follow-up (e.g. backfill script 7+2, or ensuring every insert path sets `slug`); otherwise no code change needed for slug generation.

---

## 6. Testing

- **New URL:** Open a property with a slug (e.g. `/kxmnpqr29`) – detail page loads.
- **UTM:** Open `/kxmnpqr29?utm_source=twitter` – page loads and UTM params are preserved.
- **Old UUID:** Open `/{uuid}` – detail page still loads (resolve by id).
- **Old /property/ link:** Open `/property/kxmnpqr29` or `/property/{uuid}` – redirects to `/:path*` and page loads.
- **Links:** Marketplace, featured slider, map, and share button use slug in the URL when available.
