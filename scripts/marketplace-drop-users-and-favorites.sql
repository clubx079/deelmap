-- Run in MARKETPLACE Supabase SQL Editor.
-- Drops user_favorites and users. CASCADE removes FKs from seller_applications
-- that reference users (reviewed_by, user_id). After this, run
-- marketplace-create-seller-tables.sql to recreate users + user_favorites,
-- then run marketplace-readd-seller-app-fks.sql to restore FKs on seller_applications.

DROP TABLE IF EXISTS public.user_favorites;
DROP TABLE IF EXISTS public.users CASCADE;
