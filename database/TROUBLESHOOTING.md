# Troubleshooting: User Registration 500 Error

## Current Error
```
PGRST202: Could not find the function public.create_user_with_details(...) in the schema cache
PGRST204: Could not find the 'first_name' column of 'users' in the schema cache
```

## Root Cause
The database schema is missing columns and/or the RPC function, OR the schema cache hasn't been refreshed after adding them.

---

## Step-by-Step Fix (MUST DO IN ORDER)

### ✅ Step 1: Run Diagnostic Script First

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the contents of `check_schema_status.sql`
4. Click **"Run"**
5. **Check the results:**
   - If you see **0 rows** for columns → columns are missing
   - If you see **0 rows** for function → function is missing
   - If you see **NO** for can_execute → permissions are missing

### ✅ Step 2: Run the Complete Fix Script

1. In **Supabase SQL Editor**, click **"New Query"** (or clear the previous one)
2. Copy the **ENTIRE** contents of `complete_fix_schema.sql`
3. Paste into SQL Editor
4. Click **"Run"** button (or Cmd/Ctrl + Enter)
5. **Wait for success message** - you should see:
   ```
   NOTICE: Added first_name column (or already exists)
   NOTICE: Added last_name column (or already exists)
   ...
   NOTICE: RPC function create_user_with_details exists
   ```

### ✅ Step 3: Refresh Schema Cache (CRITICAL - MOST PEOPLE MISS THIS!)

**This is the most important step and is often forgotten!**

1. In Supabase Dashboard, click **Settings** (⚙️ gear icon in left sidebar)
2. Click **"API"** in the settings menu
3. Scroll down to find **"Reload Schema Cache"** section
4. Click the **"Reload Schema Cache"** button (or "Refresh" button)
5. **Wait 10-15 seconds** for it to complete
6. You should see a success message or the button should change state

**⚠️ Without this step, PostgREST won't know about your new function/columns!**

### ✅ Step 4: Verify Everything Works

Run the diagnostic script again (`check_schema_status.sql`) to confirm:
- All 5 columns exist
- Function exists
- Permissions are granted

### ✅ Step 5: Test Registration

Try signing up again. It should work now!

---

## Common Issues

### Issue 1: "Function still not found after refresh"
**Solution:**
- Wait 30 seconds and try again (cache refresh can take time)
- Check if you're using the correct Supabase project
- Verify the function exists by running the diagnostic script

### Issue 2: "Columns still not found"
**Solution:**
- Make sure you ran the complete fix script (not just parts of it)
- Check if there are any errors in the SQL Editor output
- Verify you're looking at the correct database/project

### Issue 3: "Permission denied"
**Solution:**
- Make sure Step 3 (Grant Permissions) in the fix script ran successfully
- Check the diagnostic script output for permission issues

### Issue 4: "Still getting 500 error"
**Solution:**
- Check Railway logs for the exact error message
- Verify your Supabase connection strings are correct
- Make sure you're using the right Supabase project (not a different one)

---

## Quick Verification Commands

Run these in Supabase SQL Editor to verify:

```sql
-- Check columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('first_name', 'last_name', 'phone', 'states_of_interest', 'verified');

-- Check function
SELECT proname FROM pg_proc 
WHERE proname = 'create_user_with_details';

-- Check permissions
SELECT has_function_privilege('anon', 'create_user_with_details(text, text, text, text, text, jsonb)', 'EXECUTE');
```

All should return results if everything is set up correctly.

---

## Still Not Working?

1. **Check Railway Logs:**
   - Go to Railway dashboard
   - Check the logs for your deployment
   - Look for the exact error message

2. **Verify Supabase Connection:**
   - Check your `.env` or environment variables
   - Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
   - Verify you're connecting to the right Supabase project

3. **Contact Support:**
   - Share the exact error from Railway logs
   - Share the output of the diagnostic script
   - Share which steps you've completed
