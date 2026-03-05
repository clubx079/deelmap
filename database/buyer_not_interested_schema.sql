-- Buyer "Not Interested" preferences
-- Same DB as users / user_favorites (marketplace/seller DB).
-- Stores which deals a user has marked as not interested. Properties are NOT hidden from listings;
-- the UI just shows "Undo" on the detail page so they can revert.
--
-- HOW TO APPLY: In Supabase Dashboard, open the project that backs MARKETPLACE (NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL),
-- go to SQL Editor, and run this entire file.

CREATE TABLE IF NOT EXISTS buyer_not_interested (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT buyer_not_interested_unique UNIQUE (user_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_not_interested_user_id ON buyer_not_interested(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_not_interested_deal_id ON buyer_not_interested(deal_id);

COMMENT ON TABLE buyer_not_interested IS 'User preference: deal marked as not interested. Property still shown; UI shows Undo on detail page.';

-- RLS: allow service role full access; allow authenticated users to manage only their own rows (if anon key is used).
ALTER TABLE buyer_not_interested ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own not_interested"
  ON buyer_not_interested FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own not_interested"
  ON buyer_not_interested FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own not_interested"
  ON buyer_not_interested FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS by default.
