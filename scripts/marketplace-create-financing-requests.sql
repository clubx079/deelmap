-- =============================================================================
-- Run this in your MARKETPLACE Supabase project (SQL Editor).
-- Creates the financing_requests table so financing applications are stored
-- in your main DB.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.financing_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name character varying(255) NOT NULL,
  last_name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50) NOT NULL,
  property_type character varying(100),
  property_address text,
  transaction_type character varying(100),
  loan_amount numeric,
  credit_score character varying(50),
  comments text,
  monday_item_id character varying(255),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT financing_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);

-- Index for listing by user
CREATE INDEX IF NOT EXISTS idx_financing_requests_user_id ON public.financing_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_financing_requests_created_at ON public.financing_requests (created_at DESC);

-- Optional: RLS so users only see their own (enable if you use RLS)
-- ALTER TABLE public.financing_requests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own financing_requests" ON public.financing_requests FOR SELECT USING (auth.uid() = user_id);
