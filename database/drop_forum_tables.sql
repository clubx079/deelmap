-- Drop existing community forum schema.
-- Run in Supabase SQL editor against the Marketplace database.
-- Two generations of forum tables exist in the live DB:
--   1. forum_*           — the public /community forum (code deleted from repo)
--   2. community_*       — an unused/abandoned v2 (zero code references)
-- Both are being removed to make room for the new community build.
-- CASCADE handles FK dependencies; order is dependency-aware for readability.

begin;

-- v1: forum_* tables (powered the old /community route)
drop table if exists public.forum_votes cascade;
drop table if exists public.forum_replies cascade;
drop table if exists public.forum_threads cascade;
drop table if exists public.forum_categories cascade;

-- v2: community_* tables (abandoned schema, no code references)
drop table if exists public.community_votes cascade;
drop table if exists public.community_saves cascade;
drop table if exists public.community_subscriptions cascade;
drop table if exists public.community_comments cascade;
drop table if exists public.community_reputation cascade;
drop table if exists public.community_posts cascade;
drop table if exists public.community_channels cascade;

-- Storage bucket cleanup must be done from the Supabase dashboard or via the
-- storage API; you cannot drop a bucket from SQL. Steps:
--   1. Empty the bucket: Storage > forum-uploads > select all > delete
--   2. Delete the bucket: Storage > forum-uploads > settings > delete bucket
--
-- Or via the JS client (one-off script):
--   await supabase.storage.emptyBucket('forum-uploads');
--   await supabase.storage.deleteBucket('forum-uploads');

commit;
