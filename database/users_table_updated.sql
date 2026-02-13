-- Updated Users Table Schema with Social Authentication Support
-- This schema supports email/password authentication, Google OAuth, and Facebook OAuth

-- Drop existing table if you want to recreate (CAUTION: This will delete all data)
-- DROP TABLE IF EXISTS users CASCADE;

-- Create updated users table
CREATE TABLE IF NOT EXISTS users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication Fields
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255), -- NULL for social auth users

  -- Social Authentication IDs
  google_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'facebook'

  -- User Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),

  -- User Preferences
  states_of_interest JSONB DEFAULT '[]'::jsonb, -- Array of state codes as JSON

  -- Account Status
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT check_auth_method CHECK (
    (password IS NOT NULL AND auth_provider = 'email') OR
    (google_id IS NOT NULL AND auth_provider = 'google') OR
    (facebook_id IS NOT NULL AND auth_provider = 'facebook')
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with support for email/password and social authentication';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique, required)';
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password (NULL for social auth)';
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID (unique)';
COMMENT ON COLUMN users.facebook_id IS 'Facebook OAuth user ID (unique)';
COMMENT ON COLUMN users.auth_provider IS 'Authentication method: email, google, or facebook';
COMMENT ON COLUMN users.states_of_interest IS 'JSONB array of US state codes user is interested in';
COMMENT ON COLUMN users.verified IS 'Whether user email is verified';
COMMENT ON COLUMN users.active IS 'Whether user account is active';

-- Migration script for existing users table
-- Use this if you already have a users table and want to add social auth columns

/*
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Make password nullable for social auth users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Update auth_provider for existing users
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);

-- Modify states_of_interest to JSONB if it's TEXT[]
-- ALTER TABLE users ALTER COLUMN states_of_interest TYPE JSONB USING to_jsonb(states_of_interest);
*/

-- Example queries

-- Find user by email
-- SELECT * FROM users WHERE email = 'user@example.com';

-- Find user by Google ID
-- SELECT * FROM users WHERE google_id = 'google_user_id_here';

-- Find user by Facebook ID
-- SELECT * FROM users WHERE facebook_id = 'facebook_user_id_here';

-- Get all users registered in the last 30 days
-- SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC;

-- Count users by auth provider
-- SELECT auth_provider, COUNT(*) FROM users GROUP BY auth_provider;

-- Find users interested in specific states
-- SELECT * FROM users WHERE states_of_interest @> '["CA", "NY"]'::jsonb;
