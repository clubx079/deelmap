-- Quick Diagnostic Script - Check Schema Status
-- Run this in Supabase SQL Editor to see what's missing

-- ============================================
-- CHECK 1: Verify Columns Exist
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('first_name', 'last_name', 'phone', 'states_of_interest', 'verified')
ORDER BY column_name;

-- ============================================
-- CHECK 2: Verify Function Exists
-- ============================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'create_user_with_details'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- CHECK 3: Check Function Permissions
-- ============================================
SELECT 
    p.proname AS function_name,
    r.rolname AS role_name,
    CASE 
        WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN 'YES'
        ELSE 'NO'
    END AS can_execute
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'create_user_with_details'
AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY r.rolname;

-- ============================================
-- CHECK 4: Test Function (if it exists)
-- ============================================
-- Uncomment below to test the function (will fail if user exists, but that's OK)
-- SELECT * FROM create_user_with_details(
--     'test@example.com',
--     'Test',
--     'User',
--     '1234567890',
--     'hashed_password_here',
--     '["CA", "NY"]'::jsonb
-- );
