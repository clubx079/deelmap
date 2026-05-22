# Message Seller & Make Offer — Bug Analysis
**Date:** 2026-04-14
**Deal used for testing:** https://deelmap-production-e7c2.up.railway.app/tjecumu34
(2202 Kenilworth Ave, Cincinnati, OH — Rapid Fire Investments)

---

## Database Finding — `wholesale_deals` schema

Running a direct query on the deal confirmed:

| Field | Value |
|-------|-------|
| `temp_seller_id` | **NULL** |
| `seller_id` | **Column does not exist** in `wholesale_deals` |
| `agent_name` | Andy Klunder |
| `agent_phone` | 8596053273 |
| `agent_email` | andy@rapidfireinvestments.com |
| `source_type` | url_import |

**Key insight:** `seller_id` is not a column in `wholesale_deals`. Only `temp_seller_id` exists. And for this deal (and most scraped/imported deals), `temp_seller_id` is NULL — meaning no linked seller account.

---

## Bug 1: Message Seller — goes to main inbox, no chat opened

### Root Cause

In `components/property/PropertyDetail.js` (line 883):
```js
href={user && (property.temp_seller_id || property.seller_id)
  ? `/buyer/inbox?seller_id=${property.temp_seller_id || property.seller_id}&deal_id=${property.id}`
  : user ? '/buyer/inbox' : '/login'
}
```

**Problem A — `seller_id` column doesn't exist:**
`property.seller_id` is always `undefined` because the column isn't in `wholesale_deals`. The code references a non-existent field.

**Problem B — `temp_seller_id` is NULL for most deals:**
For scraped/imported deals (url_import, email, SMS without a registered sender), `temp_seller_id` is NULL. So both conditions are falsy and the URL falls back to just `/buyer/inbox` — no params, no conversation.

**Problem C — No pre-written message:**
`ChatWindow` has `newMessage` initialized to `''` with no `initialMessage` prop. The inbox page never passes a pre-filled message to `ChatWindow`. There is no mechanism to pre-populate the message input for new conversations.

### What happens for this specific deal (tjecumu34):
- `temp_seller_id = null`, `seller_id = undefined` (column missing)
- Button goes to `/buyer/inbox` with no params
- Inbox loads all existing conversations but opens nothing
- User sees blank right panel saying "Select a conversation"

### Fix needed:
1. Remove reference to `property.seller_id` (column doesn't exist)
2. When `temp_seller_id` is null AND `agent_email`/`agent_name` is available, the button should still work — either by creating a conversation linked to agent info, or by showing a different CTA (e.g. "Contact Agent" with the phone/email directly)
3. Add `initialMessage` prop to `ChatWindow` and pass a pre-written opener (e.g. "Hi, I'm interested in your property at [address]. Could we discuss the details?") when opening a new conversation with no prior messages

---

## Bug 2: Make Offer — property card shows nothing

### Root Cause

In `app/buyer/make-offer/page.js` (line 75-77):
```js
supabase
  .from('wholesale_deals')
  .select('id, slug, price, full_address, address, city, state, temp_seller_id, seller_id')
  .eq('id', propertyId)
  .maybeSingle()
```

**`seller_id` does not exist as a column in `wholesale_deals`.** This causes the Supabase query to return a `42703 column does not exist` error. Because this is inside a `Promise.all` with no `.catch()`, the error silently causes `deal` to be `null`.

Since `deal` is null, the code falls through to the `properties` table fallback. That also returns null for a `wholesale_deals` record. Result: `property` state stays `null`.

With `property = null`:
- `propertyTitle = 'Property'` (generic fallback)
- `thumbnailUrl = null` (gray placeholder box)
- `listedPrice = null` (no price shown)
- The form still renders but shows no meaningful property info

### Fix needed:
1. Remove `seller_id` from the `select()` call — it doesn't exist in the table
2. Add error handling (try/catch or check `error` from Supabase response)
3. Optionally: also select `bedrooms`, `bathrooms`, `property_type` to show more context in the property card

---

## Seller Table Structure — Confirmed

There are **3** seller identity tables in the system:

| Table | Used for | Key fields |
|-------|----------|------------|
| `seller_applications` | Seller portal accounts (manual deal posting) | `contact_person_name`, `business_name`, `email`, `phone` |
| `temp_seller_logins` | Scraped deal senders (SMS/email origin) | `seller_name`, `seller_phone`, `sender_email` |
| `users` | Fallback for buyer-posted deals | `first_name`, `last_name`, `email`, `phone` |

**In `wholesale_deals`:** only `temp_seller_id` links to `temp_seller_logins`. There is **no** `seller_id` column.
**In `properties`:** has `seller_id` → `seller_applications` (manual portal listings only).

The chat API (`/api/buyer/chat`) correctly handles all three lookups in order: `seller_applications` → `temp_seller_logins` → `users`. That logic is fine.

The bug is that `PropertyDetail` and `make-offer` both reference `property.seller_id` which doesn't exist in `wholesale_deals`.

---

## Summary of Fixes Required

| # | File | Change |
|---|------|--------|
| 1 | `PropertyDetail.js` | Remove `property.seller_id` fallback (column doesn't exist in wholesale_deals). When no `temp_seller_id`, show agent contact info (phone/email) instead of broken message button |
| 2 | `PropertyDetail.js` | Pass pre-written message via URL param to inbox, add `initialMessage` support in ChatWindow |
| 3 | `make-offer/page.js` | Remove `seller_id` from the select query (causes 42703 error and null property state) |
| 4 | `make-offer/page.js` | Add error handling on the Promise.all so property card still loads if photos query fails |
