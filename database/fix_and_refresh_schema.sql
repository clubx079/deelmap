-- Fix users table schema and refresh PostgREST cache
-- Run this in Supabase SQL Editor to fix the schema cache issue

-- Step 1: Check current columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
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
END $$;

-- Step 3: Create an RPC function to insert users (bypasses schema cache)
CREATE OR REPLACE FUNCTION create_user_with_details(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_password TEXT,
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
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    INSERT INTO users (
        email,
        first_name,
        last_name,
        phone,
        password,
        states_of_interest,
        verified
    ) VALUES (
        p_email,
        p_first_name,
        p_last_name,
        p_phone,
        p_password,
        p_states_of_interest,
        true
    )
    RETURNING users.id INTO v_user_id;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.verified,
        u.created_at
    FROM users u
    WHERE u.id = v_user_id;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_details TO anon;

-- IMPORTANT: After running this script, refresh the schema cache in Supabase Dashboard:
-- Settings > API > Reload Schema Cache (or use the API endpoint)
