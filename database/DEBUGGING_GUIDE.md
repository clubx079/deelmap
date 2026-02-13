# Detailed Debugging Guide: Persistent Schema Cache Issue

## Root Cause Analysis

The error `PGRST202` and `PGRST204` indicate that **PostgREST's schema cache** is stale. Even though:
- ✅ Columns exist in the database
- ✅ Function exists in the database  
- ✅ Permissions are granted

PostgREST (Supabase's API layer) doesn't know about them because its **in-memory cache** hasn't been updated.

## Why This Is So Persistent

1. **PostgREST Caches Aggressively**: For performance, PostgREST caches the entire database schema in memory
2. **Cache Refresh Is Manual**: Unlike some systems, Supabase requires manual cache refresh
3. **Multiple Cache Layers**: There might be multiple cache layers (edge, regional, etc.)
4. **Timing Issues**: Even after refresh, it can take 30-60 seconds to propagate

## The Solution: Multi-Strategy Approach

The updated `verify-otp/route.js` now tries **4 different strategies** in order:

### Strategy 1: Service Role Direct Insert (BEST)
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Bypasses RLS (Row Level Security)
- More reliable with schema cache
- **Requires**: `SUPABASE_SERVICE_ROLE_KEY` environment variable

### Strategy 2: Anon Client Direct Insert
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Standard approach
- Subject to schema cache issues

### Strategy 3: Service Role RPC Function
- Uses service role + RPC function
- Bypasses both RLS and schema cache
- Most reliable fallback

### Strategy 4: Anon Client RPC Function
- Last resort
- Uses anon key + RPC function
- Still subject to some cache issues

## Step-by-Step Fix

### Step 1: Verify Environment Variables

Check Railway dashboard that you have:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  ← CRITICAL!
```

**To get service role key:**
1. Supabase Dashboard → Settings → API
2. Copy "service_role" key (NOT the anon key)
3. Add to Railway environment variables as `MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Run Complete Fix Script

1. Supabase Dashboard → SQL Editor
2. Run `database/complete_fix_schema.sql`
3. Verify success messages

### Step 3: Force Cache Refresh (Multiple Methods)

#### Method A: Dashboard Refresh
1. Settings → API → "Reload Schema Cache"
2. Wait 30 seconds

#### Method B: API Call (More Reliable)
```bash
curl -X POST \
  'https://api.supabase.com/v1/projects/{project_ref}/api/rest/reload' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'apikey: {service_role_key}'
```

#### Method C: Restart PostgREST (Nuclear Option)
1. Supabase Dashboard → Settings → Database
2. Look for "Restart" or "Reload" options
3. This forces a complete cache clear

### Step 4: Verify Function Exists

Run in SQL Editor:
```sql
SELECT 
    proname,
    pg_get_function_arguments(oid) as args
FROM pg_proc 
WHERE proname = 'create_user_with_details';
```

Should return 1 row.

### Step 5: Test with New Logging

The updated code now logs:
- Which strategy is being tried
- Success/failure for each strategy
- Detailed error messages

Check Railway logs to see which strategy works (or if all fail).

## Diagnostic Checklist

- [ ] `MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY` is set in Railway
- [ ] Function exists in database (verified with SQL)
- [ ] Columns exist in database (verified with SQL)
- [ ] Permissions granted (verified with SQL)
- [ ] Schema cache refreshed (Settings → API → Reload)
- [ ] Waited 30+ seconds after cache refresh
- [ ] Checked Railway logs for detailed error messages
- [ ] Verified correct Supabase project is being used

## Common Mistakes

1. **Using wrong Supabase project**: Check URLs match
2. **Service role key not set**: Code falls back to less reliable methods
3. **Cache refresh not waited**: Takes time to propagate
4. **Running script but not refreshing cache**: Most common issue!
5. **Multiple Supabase projects**: Confusing which one to fix

## If Still Not Working

### Check Railway Logs
Look for:
```
[VERIFY-OTP] Strategy 1: Trying service role client...
[VERIFY-OTP] Service role client failed: PGRST204 ...
```

This tells you exactly which strategy failed and why.

### Verify Service Role Key
The service role key should:
- Start with `eyJ...` (JWT token)
- Be different from anon key
- Have "service_role" in Supabase dashboard

### Nuclear Option: Recreate Function
If nothing works, try:
1. Drop the function
2. Recreate it
3. Refresh cache
4. Wait 60 seconds

```sql
DROP FUNCTION IF EXISTS create_user_with_details CASCADE;
-- Then run complete_fix_schema.sql again
```

## Expected Log Output (Success)

```
[VERIFY-OTP] Strategy 1: Trying service role client...
[VERIFY-OTP] ✅ Success with service role client
[VERIFY-OTP] ✅ User created successfully using strategy: service_role_direct
```

## Expected Log Output (Failure)

```
[VERIFY-OTP] Strategy 1: Trying service role client...
[VERIFY-OTP] Service role client failed: PGRST204 ...
[VERIFY-OTP] Strategy 2: Trying anon client direct insert...
[VERIFY-OTP] Anon client failed: PGRST204 ...
[VERIFY-OTP] Strategy 3: Trying RPC function with service role...
[VERIFY-OTP] RPC function failed (service role): PGRST202 ...
[VERIFY-OTP] ❌ All strategies failed
```

This tells you exactly what's failing and helps diagnose the issue.
