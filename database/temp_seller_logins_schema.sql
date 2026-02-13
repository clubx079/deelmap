
CREATE TABLE IF NOT EXISTS temp_seller_logins (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  seller_phone VARCHAR(50), -- Phone number extracted from SMS (normalized E.164 format)
  sender_email VARCHAR(255), -- Email address if deal came from email
  
  sms_from_number VARCHAR(50), -- The phone number from which SMS came (if SMS source)
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('sms', 'email', 'website', 'unknown')),
  
  seller_name VARCHAR(255), -- Extracted from agent_name, company_name, email signature, or SMS content
  company_name VARCHAR(255), -- Company name if available
  
  magic_link_token VARCHAR(255) UNIQUE, -- Unique token for magic link authentication
  magic_link_expires_at TIMESTAMP WITH TIME ZONE, -- Expiration time for magic link
  magic_link_used_at TIMESTAMP WITH TIME ZONE, -- When magic link was used (if used)
  
  -- Account Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'converted', 'expired')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Links to permanent user account once created
  
  first_deal_id UUID REFERENCES wholesale_deals(id) ON DELETE SET NULL, -- First deal ID from this seller
  first_deal_at TIMESTAMP WITH TIME ZONE, -- When first deal was received
  last_deal_at TIMESTAMP WITH TIME ZONE, -- When last deal was received
  total_deals_count INTEGER DEFAULT 0, -- Total number of deals from this seller
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional extracted info (agent_phone, agent_email, etc.)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_contact_method CHECK (
    seller_phone IS NOT NULL OR sender_email IS NOT NULL
  ),
  CONSTRAINT unique_seller_contact UNIQUE (seller_phone, sender_email, source_type)
);

CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_phone ON temp_seller_logins(seller_phone);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_email ON temp_seller_logins(sender_email);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_source_type ON temp_seller_logins(source_type);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_status ON temp_seller_logins(status);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_magic_token ON temp_seller_logins(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_user_id ON temp_seller_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_created_at ON temp_seller_logins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_seller_logins_last_deal_at ON temp_seller_logins(last_deal_at DESC);

-- Update timestamp trigger for temp_seller_logins
CREATE OR REPLACE FUNCTION update_temp_seller_logins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_temp_seller_logins_updated_at
  BEFORE UPDATE ON temp_seller_logins
  FOR EACH ROW
  EXECUTE FUNCTION update_temp_seller_logins_updated_at();

-- Function to automatically update last_deal_at and total_deals_count
-- This will be called when a new deal is created/updated with temp_seller_id
CREATE OR REPLACE FUNCTION update_seller_deal_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if temp_seller_id is set
  IF NEW.temp_seller_id IS NOT NULL THEN
    UPDATE temp_seller_logins
    SET 
      last_deal_at = NEW.created_at,
      total_deals_count = (
        SELECT COUNT(*) 
        FROM wholesale_deals 
        WHERE temp_seller_id = NEW.temp_seller_id
      ),
      updated_at = NOW()
    WHERE id = NEW.temp_seller_id;
    
    -- Update first_deal_id if this is the first deal
    UPDATE temp_seller_logins
    SET first_deal_id = NEW.id, first_deal_at = NEW.created_at
    WHERE id = NEW.temp_seller_id 
      AND first_deal_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on wholesale_deals to update seller stats

CREATE TRIGGER trigger_update_seller_deal_stats
  AFTER INSERT OR UPDATE OF temp_seller_id ON wholesale_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_deal_stats();



ALTER TABLE wholesale_deals 
ADD COLUMN IF NOT EXISTS temp_seller_id UUID REFERENCES temp_seller_logins(id) ON DELETE SET NULL;

-- Create index for performance (querying deals by seller)
CREATE INDEX IF NOT EXISTS idx_wholesale_deals_temp_seller_id ON wholesale_deals(temp_seller_id);
