# Current API Keys Usage

## Favorites API Routes (user_favorites table - in SELLER database)

**Files:**
- `app/api/favorites/check/route.js`
- `app/api/favorites/route.js`

**Currently Using:**
1. **URL:** `NEXT_PUBLIC_SELLER_SUPABASE_URL` (fallback: `NEXT_PUBLIC_SUPABASE_URL`)
2. **Anon Key:** `NEXT_PUBLIC_SELLER_SUPABASE_ANON_KEY` (fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. **Service Role Key:** `SELLER_SUPABASE_SERVICE_ROLE_KEY` (fallback: `SUPABASE_SERVICE_ROLE_KEY`)

**Database:** Seller database (same as `users` table)
**Table:** `user_favorites`

---

## Login/Signup Routes (users table - in SELLER database)

**Files:**
- `app/api/auth/verify-otp/route.js`
- `app/api/auth/signin/route.js`

**Currently Using:**
1. **URL:** `NEXT_PUBLIC_SELLER_SUPABASE_URL` (fallback: `NEXT_PUBLIC_SUPABASE_URL`)
2. **Anon Key:** `NEXT_PUBLIC_SELLER_SUPABASE_ANON_KEY` (fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. **Service Role Key:** `SELLER_SUPABASE_SERVICE_ROLE_KEY` (fallback: `SUPABASE_SERVICE_ROLE_KEY`)

**Database:** Seller database
**Table:** `users`

---

## Deal Detail Page (wholesale_deals - in MARKETPLACE database)

**File:**
- `app/[slug]/page.js`

**Currently Using:**
- `supabaseMarketplace` from `lib/supabase.js`
- Which uses:
  1. **URL:** `NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL`
  2. **Anon Key:** `NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY`

**Database:** Marketplace database
**Tables:** `wholesale_deals`, `property_photos`, `temp_seller_logins`

---

## Summary

**For Favorites API (SELLER database):**
- URL: `NEXT_PUBLIC_SELLER_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- Anon Key: `NEXT_PUBLIC_SELLER_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Service Key: `SELLER_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

**For Deal Detail Page (MARKETPLACE database):**
- URL: `NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL`
- Anon Key: `NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY`
