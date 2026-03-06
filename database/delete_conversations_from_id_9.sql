-- Delete all conversations with id >= 9
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Messages linked to these conversations will be removed if FK has ON DELETE CASCADE.

DELETE FROM public.conversations
WHERE id >= 9;

-- Optional: see how many rows were affected (run after the delete)
-- SELECT COUNT(*) FROM public.conversations;
