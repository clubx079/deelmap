-- Seller Applications Table
-- This table stores seller application submissions for approval workflow

CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  contact_person_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,

  -- Business Type
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('individual', 'company')),

  -- Experience & Supply
  deals_per_month VARCHAR(20) NOT NULL CHECK (deals_per_month IN ('1-2', '3-5', '6-10', '10+')),

  -- Market Info
  primary_markets TEXT NOT NULL, -- JSON array of cities/states
  property_types TEXT[] NOT NULL, -- Array: ['single-family', 'multi-family', 'commercial', 'land']

  -- Optional Information
  website VARCHAR(500),
  linkedin VARCHAR(500),
  description TEXT, -- Max 300 characters (enforced in frontend)

  -- Application Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Admin Notes
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- User Association (if they create account first)
  user_id UUID REFERENCES users(id) UNIQUE, -- One user can only have one seller application

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_applications_email ON seller_applications(email);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_created_at ON seller_applications(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_seller_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seller_applications_updated_at
  BEFORE UPDATE ON seller_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_applications_updated_at();

-- Add seller_status column to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS seller_status VARCHAR(50) DEFAULT NULL
CHECK (seller_status IN (NULL, 'pending', 'approved', 'rejected'));

-- Add seller_approved_at column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS seller_approved_at TIMESTAMP WITH TIME ZONE;

-- Index for seller_status
CREATE INDEX IF NOT EXISTS idx_users_seller_status ON users(seller_status);

-- Comments for documentation
COMMENT ON TABLE seller_applications IS 'Stores seller application submissions for manual approval';
COMMENT ON COLUMN seller_applications.status IS 'Application review status: pending, approved, rejected';
COMMENT ON COLUMN seller_applications.deals_per_month IS 'Estimated deals sourced per month: 1-2, 3-5, 6-10, 10+';
COMMENT ON COLUMN seller_applications.property_types IS 'Array of property types seller deals with';
COMMENT ON COLUMN seller_applications.user_id IS 'Links to users table if applicant has account';
COMMENT ON COLUMN users.seller_status IS 'Seller approval status: pending, approved, rejected (NULL for buyers)';
