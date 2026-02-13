# Quick Fix Guide: User Registration 500 Error

## Problem
Getting a 500 Internal Server Error when trying to sign up:
```
POST /api/auth/verify-otp 500 (Internal Server Error)
Database schema issue...
```

## Solution (5 minutes)

### Step 1: Run the Fix Script
1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy and paste the entire contents of `database/complete_fix_schema.sql`
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. Wait for the script to complete (should show "Success. No rows returned")

### Step 2: Refresh Schema Cache
1. In Supabase Dashboard, go to **Settings** (gear icon in left sidebar)
2. Click **API** in the settings menu
3. Scroll down to find **"Reload Schema Cache"** button
4. Click the button and wait 5-10 seconds

### Step 3: Test Registration
1. Try signing up again on your website
2. The registration should now work

## What the Fix Does

The script:
- ✅ Adds missing columns (`first_name`, `last_name`, `phone`, `states_of_interest`, `verified`) if they don't exist
- ✅ Creates the `create_user_with_details` RPC function that bypasses schema cache issues
- ✅ Grants proper permissions to the function
- ✅ Verifies the setup is correct

## If It Still Doesn't Work

### Check 1: Verify Columns Exist
Run this in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
```

You should see: `first_name`, `last_name`, `phone`, `states_of_interest`, `verified`

### Check 2: Verify Function Exists
Run this in Supabase SQL Editor:
```sql
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'create_user_with_details';
```

You should see the function listed.

### Check 3: Check Function Permissions
Run this in Supabase SQL Editor:
```sql
SELECT 
    p.proname AS function_name,
    r.rolname AS role_name
FROM pg_proc p
JOIN pg_proc_acl pa ON p.oid = pa.prooid
JOIN pg_roles r ON pa.proacl::text LIKE '%' || r.rolname || '%'
WHERE p.proname = 'create_user_with_details';
```

You should see `anon` and `authenticated` roles listed.

## Alternative: Manual Column Addition

If the script doesn't work, you can manually add columns:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS states_of_interest JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
```

Then refresh the schema cache as described in Step 2 above.

## Still Having Issues?

1. Check the Supabase logs: Dashboard > Logs > API Logs
2. Check your application logs for more detailed error messages
3. Verify your Supabase environment variables are correct:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
