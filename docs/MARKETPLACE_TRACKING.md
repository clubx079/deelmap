# Marketplace property tracking

Tracking runs when a user opens a **deal detail page** (`/[slug]`). Each time they open the page we create a **new session** (one row per visit).

## Four metrics stored

| Metric | What it is | Where it’s stored |
|--------|------------|-------------------|
| **Page view** | Each time the user opens the deal detail page | One row per visit in `property_analytics` (unique `session_id` per load). **Count of rows** = how many times they opened that deal. |
| **Visit count** | Same as page view count | `COUNT(*)` for `property_id` (and optionally `user_id`) in `property_analytics`. |
| **Images viewed** | Number of distinct photos they viewed this visit (gallery + modal) | `images_viewed` on that session row, updated via `update_behavior`. |
| **Time spent** | Time on the deal this visit; total = sum across all their visits | `active_time_seconds` / `duration_seconds` per row. **Total time on deal** = `SUM(active_time_seconds)` (or `duration_seconds`) for that `property_id` (and optionally `user_id`). |

Device type (mobile/tablet/desktop) is stored per view.

## Flow

- **`PropertyDetail`** ([slug] page) uses **`usePropertyAnalytics(property)`**.
- **On every mount** we generate a **new session ID** (no reuse), so each deal page open = one new **page view** and one new row.
- We send **`start_view`** to `POST /api/analytics/property-tracking` with propertyId, sessionId, userId/userEmail, viewport, deviceType, UTM if present.
- **`trackImageView(count)`** is called when the user changes the main gallery image or the photo in the fullscreen modal; we send **`update_behavior`** with `imagesViewed: count` → stored as **`images_viewed`**.
- **Time:** we send **`update_active_time`** periodically while they’re active, and **`end_view`** on unmount; the API updates **`active_time_seconds`** and **`duration_seconds`** for that session.

## Stored data (per session row)

- `property_id`, `session_id`, `user_id` / `user_email`, `device_type`, viewport, referrer, timestamps.
- `images_viewed` (number of photos viewed this visit).
- `active_time_seconds`, `duration_seconds` (time on deal this visit).
- Optional: `viewed_photos`, `scrolled_to_bottom`, `viewed_description`, etc.

## Files

| File | Role |
|------|------|
| `hooks/usePropertyAnalytics.js` | Session ID, `start_view` / `update_behavior` / `end_view`, `trackImageView`, client device type. |
| `app/api/analytics/property-tracking/route.js` | Handles `start_view` (with device_type), `update_behavior` (e.g. `images_viewed`), `update_active_time`, `end_view`. |
| `components/property/PropertyDetail.js` | Uses `usePropertyAnalytics(property)`, calls `trackImageView` on gallery/modal photo change. |
| `components/property/PropertyImageModal.js` | Calls `onPhotoView(index)` when user changes photo in modal. |

## How to get totals for a deal

- **Page view count (how many times users opened this deal):**  
  `SELECT COUNT(*) FROM property_analytics WHERE property_id = :id`
- **Total time spent on this deal (all users):**  
  `SELECT COALESCE(SUM(active_time_seconds), 0) FROM property_analytics WHERE property_id = :id`
- **Per user:** add `AND user_id = :userId` (or `user_email = :email`) to the above.
- **Images viewed** is per session (`images_viewed` on each row); for “total images viewed” across visits you can sum or take max per property.

## DB / RPC

- **`property_analytics`** (or equivalent) stores one row per visit (per `property_id` + `session_id`).
- **`upsert_property_view_with_special_access`** or **`upsert_property_view`** is used for `start_view` and should accept and store `p_device_type`, viewport, etc.
- Ensure these RPCs and the table exist in your Supabase project so tracking and counts persist.
