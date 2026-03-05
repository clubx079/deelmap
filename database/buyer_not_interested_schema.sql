-- Buyer "Not Interested" preferences
-- Same DB as users / user_favorites (marketplace/seller DB).
-- Stores which deals a user has marked as not interested. Properties are NOT hidden from listings;
-- the UI just shows "Undo" on the detail page so they can revert.

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
