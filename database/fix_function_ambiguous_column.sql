-- Quick Fix: Fix Ambiguous Column Reference in create_user_with_details Function
-- Run this in Supabase SQL Editor to fix the function

-- Drop existing function first to allow parameter name changes
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
    -- Check if user already exists (FIXED: use users.id instead of just id)
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

    -- Return the created user (FIXED: use users.id instead of u.id)
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

-- Grant permissions (in case they're missing)
GRANT EXECUTE ON FUNCTION create_user_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_details TO anon;
GRANT EXECUTE ON FUNCTION create_user_with_details TO service_role;
