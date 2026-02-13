# Fixing PGRST204 Schema Cache Error

## Problem
When creating a new user, you may encounter this error:
```
"Could not find the 'first_name' column of 'users' in the schema cache"
Error code: PGRST204
```

This is a Supabase PostgREST schema cache issue. The columns exist in the database, but PostgREST's schema cache hasn't been refreshed.

## Solution

### Step 1: Run the Fix Script
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open and run the file: `database/fix_and_refresh_schema.sql`
   - This script will:
     - Check existing columns
     - Add missing columns (`first_name`, `last_name`, `states_of_interest`) if they don't exist
     - Create an RPC function `create_user_with_details` that bypasses the schema cache

### Step 2: Refresh Schema Cache
1. In Supabase Dashboard, go to **Settings** > **API**
2. Click **"Reload Schema Cache"** (or use the refresh button)
3. Wait for the cache to refresh (usually takes a few seconds)

### Step 3: Verify the Fix
The code now has a fallback mechanism:
- First, it tries the normal Supabase insert
- If that fails with a schema cache error, it automatically uses the RPC function
- The RPC function bypasses the schema cache and works directly with the database

## Alternative: Manual Schema Refresh via API

If you prefer to refresh the schema cache programmatically, you can use the Supabase Management API:

```bash
curl -X POST \
  'https://api.supabase.com/v1/projects/{project_ref}/api/rest/reload' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'apikey: {service_role_key}'
```

## Testing

After running the fix:
1. Try creating a new user account
2. The registration should work even if the schema cache hasn't been refreshed
3. The RPC function will handle the insert if the normal method fails

## Notes

- The RPC function (`create_user_with_details`) is created with `SECURITY DEFINER` to ensure it has proper permissions
- Both `authenticated` and `anon` roles have execute permission on the function
- The function returns the same structure as a normal insert, so the rest of the code works seamlessly
