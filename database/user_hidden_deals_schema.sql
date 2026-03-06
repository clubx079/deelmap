-- User hidden deals (not interested) – marketplace DB
-- Used by /api/buyer/not-interested. Run in Supabase SQL Editor (marketplace project).

CREATE TABLE IF NOT EXISTS user_hidden_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_hidden_deals_unique UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hidden_deals_user_id ON user_hidden_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_deals_property_id ON user_hidden_deals(property_id);
