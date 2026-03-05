-- Add property context to conversations (one thread per deal)
-- Run in Supabase SQL Editor on the marketplace DB (same DB used by buyer chat + seller chat).

-- 1. property_id: links conversation to a specific deal/listing (different property = new thread)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS property_id uuid NULL;

-- 2. property_address: display "First name - Address" and in emails
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS property_address text NULL;

-- 3. property_slug: for "View listing" link (e.g. /{slug} on buyer portal)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS property_slug text NULL;

-- 4. property_thumbnail_url: optional cache for list avatar (can be resolved from property_id in API)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS property_thumbnail_url text NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_property_id ON public.conversations (property_id);

COMMENT ON COLUMN public.conversations.property_id IS 'Deal/property this thread is about; one thread per (seller, buyer, property).';
COMMENT ON COLUMN public.conversations.property_address IS 'Display address for list and email.';
COMMENT ON COLUMN public.conversations.property_slug IS 'Slug for View listing URL on buyer portal.';
