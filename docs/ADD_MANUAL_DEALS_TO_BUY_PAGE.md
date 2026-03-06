# Add seller manual deals to the Buy / Marketplace page

## Goal

The **Buy** (marketplace) page in the buyer portal (`deelmap-buyer`) currently shows only **scraped deals** from `wholesale_deals`. We want to **also show deals that sellers add manually**, which live in the `properties` table (with images in `property_images`). Both sources should appear in one unified list with the same filters, map, cards, and detail pages.

---

## Current state

| Location | What it does |
|----------|----------------|
| **`app/marketplace/page.js`** | Buy page: uses `useProperties` for the list, `FilterBar`, `PropertyMap`, `PropertyCard`. |
| **`hooks/useProperties.js`** | Fetches only from `wholesale_deals` (with `property_photos`). No `properties` table. |
| **`app/[slug]/page.js`** | Property detail: fetches a single deal by `id` from `wholesale_deals` only. |
| **`app/saved-properties/page.js`** | Fetches favorites by id from `wholesale_deals` only. |
| **`components/property/FilterBar.js`** | Loads available states from `wholesale_deals` for filter options. |
| **`components/property/PropertyCard.js`** | Expects: `id`, `property_photos`, `price`, `bedrooms`, `bathrooms`, `sqft`, `full_address`, `address`, `city`, `state`, `zip_code`, etc. |
| **`components/property/PropertyDetail.js`** | Expects `property_photos`, `full_address`, `address`, `city`, `state`, `zip_code`, `sqft`, `address_google_lat/lng`, `temp_seller_id` (for Contact Agent). |
| **`utils/propertyPhotos.js`** | `getPreferredPhotoUrl(photo)` uses `photo.optimized_url \|\| photo.photo_url \|\| photo.original_url`. |

Manual properties use:

- **Table:** `properties` (with `property_images` for photos).
- **Columns:** `id`, `seller_id`, `address`, `slug`, `price`, `bedrooms`, `bathrooms`, `floor_area`, `property_type`, `property_status`, `status`, `latitude`, `longitude`, etc.  
- **Images:** `property_images` with `image_url`, `image_key`, `sort_order` (no `photo_url` / `display_order`).

So we need a **single canonical shape** that both sources are mapped into, and one place that does the merge (API or hook).

---

## Recommended approach: unified API + canonical shape

1. **Define one canonical listing shape** used everywhere in the buyer app (cards, map, detail, saved). It should match what `PropertyCard` and `PropertyDetail` already expect, so minimal UI changes.

2. **Add a single API** in `deelmap-buyer` that:
   - Fetches **public/active** rows from both `wholesale_deals` and `properties`.
   - Maps each row to the **same canonical shape**.
   - Merges, sorts, and applies filters (state, price, beds, baths, sqft, status, search, etc.).
   - Returns paginated results and total count.

3. **Switch the marketplace to this API**  
   - `useProperties` (or a new hook) calls this API instead of querying `wholesale_deals` directly.  
   - FilterBar’s “available states” can come from the same API or from two tables (merge and dedupe).

4. **Detail page**  
   - Accept an id (and optionally `source`: `manual` | `scraped`).  
   - Resolve the deal from the correct table (`properties` + `property_images` vs `wholesale_deals` + `property_photos`), map to the same canonical shape, then render with `PropertyDetail`.  
   - Card links can stay `/${id}`; the detail page tries `wholesale_deals` first by id, then `properties` by id, so both sources work with the same URL pattern if ids are unique across tables (or use a prefixed id, e.g. `manual-{uuid}`, and parse in the API/detail).

5. **Saved properties**  
   - Favorites store `property_id` (and optionally `source` if needed).  
   - When loading saved, fetch by list of ids: query both tables (e.g. ids that are in `wholesale_deals` vs in `properties`), map both to canonical shape, merge in the same order as the favorite ids.

6. **Filters**  
   - State, price, beds, baths, sqft, status, search, etc. must be applied in the API to **both** datasets (or in a single combined query if you use a DB view).  
   - FilterBar can get distinct states from the same API (e.g. `?distinct=state`) or by querying both tables and merging.

---

## Deal detail page: same experience as now

When a user clicks a deal (from the list or map), the **detail page must look and behave exactly as it does today**. No change to the UI or to which fields are shown.

- **Same component:** Keep using `PropertyDetail` as-is. No layout or copy changes.
- **Same data shown:** All fields the detail page currently shows (address, price, beds, baths, sqft, photos, map, description, investment metrics, Contact Agent, etc.) must still be present. For manual deals, map from `properties` / `property_images` into the **same canonical shape** the detail page already expects (see below).
- **What changes:** Only the **source** of the data. Today `app/[slug]/page.js` fetches a single deal by `id` from `wholesale_deals` and `property_photos`. After the change it should:
  1. Try to load the deal by `id` from `wholesale_deals` (with `property_photos`). If found, map to canonical shape and pass to `PropertyDetail`.
  2. If not found, try `properties` by `id` (with `property_images`). Map to the same canonical shape (e.g. `property_photos` from `property_images`, `sqft` from `floor_area`, `full_address` from `address`, lat/lng from `latitude`/`longitude` if present) and pass to `PropertyDetail`.

So the detail page continues to receive one object in the same shape; the only difference is whether that object was produced from a scraped row or a manual row. Contact Agent, favorites, map, and photo gallery should all work the same for both.

---

## Canonical shape (for buyer app)

Use one structure so that **PropertyCard**, **PropertyMap**, and **PropertyDetail** keep working without branching on source. Map both `wholesale_deals` and `properties` into this shape (e.g. in the API or in shared normalizers).

```js
// Canonical listing – same for manual and scraped
{
  id: string,                    // uuid from properties or wholesale_deals (or "manual-{id}" if ids can collide)
  source: 'manual' | 'scraped',   // which table it came from (for detail fetch and Contact Agent)
  // Address
  address: string,
  full_address: string,
  city: string,
  state: string,
  zip_code: string,
  // Coords (for map)
  address_google_lat: number | null,
  address_google_lng: number | null,
  // Details
  price: number,
  bedrooms: number,
  bathrooms: number,
  sqft: number,                   // from floor_area for manual, sqft for scraped
  property_type: string,
  status: string,                 // active, draft, etc.
  // Optional (scraped often has these)
  gross_yield: number | null,
  cap_rate: number | null,
  cash_on_cash: number | null,
  price_per_square_foot: number | null,
  year_built: number | null,
  created_at: string,
  // Photos – always this shape so getPreferredPhotoUrl/getPrimaryPhotoUrl work
  property_photos: Array<{
    id: string | number,
    photo_url?: string,           // or map image_url → photo_url for manual
    optimized_url?: string,
    original_url?: string,
    display_order?: number        // map sort_order for manual
  }>,
  // For Contact Agent on detail (scraped: temp_seller_id; manual: need seller_id → temp_seller or link)
  temp_seller_id: string | null,
  seller_id: string | null        // manual only; use for inbox link if no temp_seller_id
}
```

- **property_photos:** For manual, map `property_images` to this array and set `photo_url` from `image_url` (and `display_order` from `sort_order`) so `getPreferredPhotoUrl` / `getPrimaryPhotoUrl` work without changes.
- **sqft:** Manual has `floor_area` → map to `sqft` in canonical shape.
- **full_address:** Manual may only have `address` → use it for both `address` and `full_address` if needed; scraped has `full_address`.

---

## Implementation checklist (deelmap-buyer)

1. **Canonical mappers**
   - `normalizeWholesaleDeal(row)` → canonical shape (already close; ensure `property_photos` and field names match).
   - `normalizeManualProperty(row, property_images)` → same canonical shape (`property_photos` from `property_images`, `sqft` from `floor_area`, etc.).

2. **Unified listings API**
   - Add e.g. `app/api/deals/route.js` (or `app/api/listings/route.js`).
   - **GET** with query params: `states`, `statuses`, `minPrice`, `maxPrice`, `minBeds`, `maxBeds`, `minBaths`, `maxBaths`, `minFloorArea`, `maxFloorArea`, `minGrossYield`, `maxGrossYield`, `minCapRate`, `maxCapRate`, `minCashOnCash`, `maxCashOnCash`, `search`, `sortBy`, `page`, `pageSize`.
   - Fetch from both tables (only public/active: e.g. `status = 'active'` for wholesale_deals, and for properties only rows that are published, e.g. `status` not draft and maybe `property_status = 'available'`).
   - Apply same filters to both (state from `state`, price, beds, baths, sqft/floor_area, search on address/full_address/city/state/zip).
   - Map both to canonical shape, merge arrays, sort (e.g. by `created_at` or price), paginate, return `{ data, totalCount }`.
   - Optionally support `?distinct=state` to return unique states for FilterBar.

3. **useProperties (or new hook)**
   - Replace direct `wholesale_deals` Supabase query with `fetch('/api/deals?...')` using the same filter/sort/pagination params.
   - Map response into the same structure the rest of the app expects (or have the API return the canonical shape directly).

4. **Detail page `app/[slug]/page.js`** (same UI as now – only data source and mapping change)
   - Keep rendering with `PropertyDetail` and the same props shape. No UI/layout changes.
   - If slug is a uuid, try fetching from `wholesale_deals` by id first; if not found, fetch from `properties` by id.
   - If you use prefixed ids (e.g. `manual-{uuid}`), parse and query the right table.
   - Load images from the correct table (`property_photos` vs `property_images`), map to canonical `property_photos` shape, then pass to `PropertyDetail`.
   - Map manual rows so all fields PropertyDetail uses are present: `full_address`, `address`, `city`, `state`, `zip_code`, `sqft` (from `floor_area`), `address_google_lat`/`address_google_lng` (from `latitude`/`longitude` if available), `property_photos`, etc.
   - Resolve agent: scraped uses `temp_seller_id` → `temp_seller_logins`; manual may use `seller_id` → decide how “Contact Agent” works (e.g. link to inbox with `seller_id` if that’s how seller threads are identified).

5. **Saved properties**
   - When loading favorites, split ids into “likely scraped” vs “likely manual” (e.g. by prefix or by querying both tables with `in('id', ids)`).
   - Fetch from `wholesale_deals` and `properties` (with images), map both to canonical shape, merge in the order of the user’s favorite ids.

6. **FilterBar**
   - Populate “available states” from the new API (e.g. `GET /api/deals?distinct=state`) or by fetching distinct state from both tables and merging.

7. **PropertyCard / PropertyDetail**
   - No changes if the API and detail page always pass the canonical shape. Ensure `temp_seller_id` or `seller_id` is set so “Contact Agent” works for both manual and scraped (buyer inbox already supports `seller_id`).

8. **Favorites / user_favorites**
   - If `property_id` is a uuid, it might refer to either table. When saving a favorite, store the same id the card/detail use. When loading, resolve from both tables as in saved-properties. If you need to distinguish, add a `source` column or store a composite key; otherwise two tables with disjoint id sets is enough.

---

## Summary

- **One canonical listing shape** for both manual and scraped.
- **One API** that reads from both `wholesale_deals` and `properties`, filters/sorts/paginates, and returns that shape.
- **Marketplace (Buy) page** uses this API so the list includes both.
- **Detail page** resolves by id (and optional source) from both tables and maps to the same shape.
- **Saved properties** and **FilterBar** use the same API or the same mappers so manual and scraped deals are handled consistently.
- **No UI changes** to PropertyCard/PropertyDetail if the canonical shape matches what they already expect; only ensure manual rows get `property_photos` (from `property_images`), `sqft` (from `floor_area`), and address fields set.

This keeps all “two tables, two column sets” logic in one layer (the API and mappers) and lets the rest of the buyer app treat every listing the same.
