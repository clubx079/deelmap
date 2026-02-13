-- User Favorites Schema
-- This table is in the SELLER database (same as users table)
-- Allows users to save/favorite properties for later viewing
-- Note: property_id references wholesale_deals.id from the MARKETPLACE database (different database)

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL, -- References wholesale_deals.id from marketplace database (cross-database reference)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one user can only favorite a property once
  CONSTRAINT user_favorites_unique UNIQUE (user_id, property_id)
  
  -- Note: Cannot add foreign key constraint to users.id or wholesale_deals.id
  -- because wholesale_deals is in a different database (marketplace database)
  -- user_id references users.id in the same database, but we'll handle validation in application code
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_property_id ON user_favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- Add comments
COMMENT ON TABLE user_favorites IS 'Stores user favorite/saved properties. Located in seller database (same as users table)';
COMMENT ON COLUMN user_favorites.user_id IS 'References users.id in the same database (seller database)';
COMMENT ON COLUMN user_favorites.property_id IS 'References wholesale_deals.id from marketplace database (cross-database reference, no FK constraint)';
