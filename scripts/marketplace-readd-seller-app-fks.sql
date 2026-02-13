-- Run in MARKETPLACE Supabase SQL Editor AFTER dropping users and re-running
-- marketplace-create-seller-tables.sql. Restores the foreign keys on
-- seller_applications that reference users.

ALTER TABLE public.seller_applications
  ADD CONSTRAINT seller_applications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.users (id);

ALTER TABLE public.seller_applications
  ADD CONSTRAINT seller_applications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id);
