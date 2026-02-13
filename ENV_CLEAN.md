# DeelMap Buyer – Environment Variables

One database (Marketplace). No Seller DB vars.

---

## Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | App URL (OAuth, emails, links). Use production URL, not localhost. |
| `NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL` | Main Supabase URL |
| `NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY` | Main Supabase anon key |
| `MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY` | Main Supabase service role (server-only) |

---

## Optional – Lender (financing / chat)

Only if you use buyer financing and email reply:

- `NEXT_PUBLIC_LENDER_SUPABASE_URL`
- `NEXT_PUBLIC_LENDER_SUPABASE_ANON_KEY`
- `LENDER_SUPABASE_SERVICE_ROLE_KEY`

---

## Optional – Debug

- `LIVE_TRACKING_DEBUG=true` – Log every live-tracking request (action, session, user, page). Leave unset in production to avoid log noise.

---

## Other (keep as-is)

`DO_SPACES_*` · `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` · `GMAIL_*` · `GOOGLE_CLIENT_*` · `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` · `NEXT_PUBLIC_BUYER_URL` · `NEXT_PUBLIC_LENDER_URL` · `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` · `RECAPTCHA_SECRET_KEY` · `RESEND_API_KEY` · `NEXTAUTH_SECRET`

---

## Don’t use

Remove or avoid: `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SCRAPER_SUPABASE_*`, `NEXT_PUBLIC_SELLER_SUPABASE_*`, `SELLER_SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, localhost URLs.

---

## Copy-paste (.env / Railway)

```env
NEXT_PUBLIC_APP_URL="https://your-app.up.railway.app"
NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL="https://caoynokephxfyqofpufv.supabase.co"
NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY="your-anon-key"
MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Add Lender vars and “Other” vars as needed. Fill in real values for keys and URLs.
