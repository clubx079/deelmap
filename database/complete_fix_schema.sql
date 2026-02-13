-- Complete Fix Script for User Registration Schema Issues
-- Run this in Supabase SQL Editor to fix all schema and RPC function issues
-- This script is idempotent - safe to run multiple times

-- ============================================
-- STEP 1: Check and Add Missing Columns
-- ============================================

DO $$ 
BEGIN
    -- Add first_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        RAISE NOTICE 'Added first_name column';
    ELSE
        RAISE NOTICE 'first_name column already exists';
    END IF;

    -- Add last_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        RAISE NOTICE 'Added last_name column';
    ELSE
        RAISE NOTICE 'last_name column already exists';
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column';
    ELSE
        RAISE NOTICE 'phone column already exists';
    END IF;

    -- Add states_of_interest column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'states_of_interest'
    ) THEN
        ALTER TABLE users ADD COLUMN states_of_interest JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added states_of_interest column';
    ELSE
        RAISE NOTICE 'states_of_interest column already exists';
    END IF;

    -- Add verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'verified'
    ) THEN
        ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added verified column';
    ELSE
        RAISE NOTICE 'verified column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create or Replace RPC Function
-- ============================================

-- Drop existing function first (if it exists) to allow parameter name changes
DROP FUNCTION IF EXISTS create_user_with_details(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS create_user_with_details(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_with_details;

-- Create the function with correct parameter name (password_hash instead of password)
CREATE FUNCTION create_user_with_details(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_password_hash TEXT,
    p_states_of_interest JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    verified BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT users.id INTO v_user_id
    FROM users
    WHERE users.email = p_email;

    IF v_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'User with email % already exists', p_email;
    END IF;

    -- Insert new user
    -- Note: The users table uses 'password_hash' not 'password'
    INSERT INTO users (
        email,
        first_name,
        last_name,
        phone,
        password_hash,
        states_of_interest,
        verified
    ) VALUES (
        p_email,
        p_first_name,
        p_last_name,
        p_phone,
        p_password_hash,
        COALESCE(p_states_of_interest, '[]'::jsonb),
        true
    )
    RETURNING users.id INTO v_user_id;

    -- Return the created user
    RETURN QUERY
    SELECT 
        users.id,
        users.email,
        users.first_name,
        users.last_name,
        users.phone,
        users.verified,
        users.created_at
    FROM users
    WHERE users.id = v_user_id;
END;
$$;

-- ============================================
-- STEP 3: Grant Permissions
-- ============================================

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION create_user_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_details TO anon;
GRANT EXECUTE ON FUNCTION create_user_with_details TO service_role;

-- ============================================
-- STEP 4: Verify Setup
-- ============================================

-- Check that all columns exist
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT 'first_name' AS column_name
        UNION SELECT 'last_name'
        UNION SELECT 'phone'
        UNION SELECT 'states_of_interest'
        UNION SELECT 'verified'
    ) AS required
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = required.column_name
    );

    IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns exist';
    END IF;
END $$;

-- Check that function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'create_user_with_details'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE 'RPC function create_user_with_details exists';
    ELSE
        RAISE WARNING 'RPC function create_user_with_details does not exist';
    END IF;
END $$;

-- ============================================
-- IMPORTANT NEXT STEPS
-- ============================================
-- After running this script:
-- 1. Go to Supabase Dashboard > Settings > API
-- 2. Click "Reload Schema Cache" button
-- 3. Wait a few seconds for the cache to refresh
-- 4. Test user registration again
