-- Add ip_address column to users table (tracks last login IP)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ip_address TEXT;
