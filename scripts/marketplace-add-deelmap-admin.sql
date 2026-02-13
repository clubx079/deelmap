-- Add Deelmap admin and linked settings row
-- Run in MARKETPLACE Supabase SQL Editor (same project as admin/settings tables).
-- Admin: email and password both "admin@deelmap.com". Settings row references this admin.

-- 1) Insert or update admin
INSERT INTO public.admin (name, email, password, role, permissions)
VALUES (
  'Admin User',
  'admin@deelmap.com',
  'admin@deelmap.com',
  'superadmin',
  ARRAY['view_properties', 'view_inquiries', 'manage_admins', 'manage_settings']::text[]
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = now()
RETURNING id, name, email, role;

-- 2) Insert or update settings linked to that admin (using the id from step 1)
INSERT INTO public.settings (user_id, name, auto_approve_sellers)
SELECT a.id, 'Deelmap', false
FROM public.admin a
WHERE a.email = 'admin@deelmap.com'
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();
