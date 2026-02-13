-- =============================================================================
-- DATA MIGRATION: Seller DB → Marketplace DB
-- Run the CREATE script first (marketplace-create-seller-tables.sql) in Marketplace.
-- Then export data from Seller and import into Marketplace.
-- =============================================================================

-- OPTION A: If you use Supabase Dashboard
-- 1. In SELLER project: Table Editor → each table → Export as CSV (or use SQL below).
-- 2. In MARKETPLACE project: Table Editor → each table → Insert → paste or import.

-- OPTION B: Use SQL (run in SELLER project to export, then run in MARKETPLACE to insert)
-- Export from Seller: copy the result of each SELECT into a file or use pg_dump.

-- Order matters (FKs): admin → users → settings, seller_applications → properties → property_images; user_favorites after users.
-- Run these INSERTs in MARKETPLACE **after** you have the data from Seller.

-- Example pattern (replace with your actual exported data or use a DB link):
/*
-- 1. admin
INSERT INTO public.admin (id, name, email, password, created_at, updated_at, role, permissions)
SELECT id, name, email, password, created_at, updated_at, role, permissions
FROM dblink('host=... dbname=... user=... password=...', 'SELECT id, name, email, password, created_at, updated_at, role, permissions FROM admin') AS t(...);

-- 2. users
INSERT INTO public.users (...)
SELECT ... FROM ...;
*/

-- Simpler: use Supabase "Export to CSV" from Seller, then "Import data from CSV" in Marketplace for each table in this order:
-- 1. admin
-- 2. users
-- 3. settings
-- 4. seller_applications
-- 5. properties
-- 6. property_images
-- 7. user_favorites

-- After migrating data, update sequences so new rows get correct IDs:
SELECT setval('admin_id_seq', COALESCE((SELECT MAX(id) FROM public.admin), 1));
SELECT setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM public.settings), 1));
