-- Fix users table: Add missing columns if they don't exist
-- Run this in Supabase SQL Editor if columns are missing

-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
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
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
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
END $$;

-- Add states_of_interest column if it doesn't exist
DO $$ 
BEGIN
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

-- Refresh schema cache (this might require Supabase dashboard action)
-- After running the above, go to Supabase Dashboard > Settings > API > Refresh Schema Cache
