-- =============================================================================
-- Run this in the MARKETPLACE Supabase project (caoynokephxfyqofpufv)
-- Creates all Seller DB tables so Marketplace becomes the single database.
--
-- If Marketplace already has tables with these names but different structure,
-- drop or rename them first. Tables created: admin, users, settings,
-- seller_applications, properties, property_images, user_favorites.
-- =============================================================================

-- Enable uuid generation if not already (Supabase usually has it)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. admin
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS admin_id_seq;

CREATE TABLE IF NOT EXISTS public.admin (
  id integer NOT NULL DEFAULT nextval('admin_id_seq'::regclass),
  name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  role character varying(100),
  permissions text[] DEFAULT ARRAY['view_properties'::text, 'view_inquiries'::text],
  PRIMARY KEY (id),
  UNIQUE (email)
);

ALTER SEQUENCE admin_id_seq OWNED BY public.admin.id;

-- -----------------------------------------------------------------------------
-- 2. users (buyer/auth – used by deelmap-buyer)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying(255) NOT NULL,
  password character varying(255),
  google_id character varying(255),
  facebook_id character varying(255),
  auth_provider character varying(50) DEFAULT 'email'::character varying,
  first_name character varying(100),
  last_name character varying(100),
  phone character varying(20),
  states_of_interest jsonb DEFAULT '[]'::jsonb,
  verified boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  seller_status character varying(50),
  seller_approved_at timestamp with time zone,
  blocked boolean DEFAULT false,
  PRIMARY KEY (id),
  UNIQUE (email),
  UNIQUE (google_id),
  UNIQUE (facebook_id)
);

-- -----------------------------------------------------------------------------
-- 3. settings (references admin)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS settings_id_seq;

CREATE TABLE IF NOT EXISTS public.settings (
  id integer NOT NULL DEFAULT nextval('settings_id_seq'::regclass),
  user_id integer,
  name character varying(255),
  logo text,
  auto_approve_sellers boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id),
  CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin (id)
);

ALTER SEQUENCE settings_id_seq OWNED BY public.settings.id;

-- -----------------------------------------------------------------------------
-- 4. seller_applications (references users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name character varying(255) NOT NULL,
  contact_person_name character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50) NOT NULL,
  business_type character varying(50) NOT NULL,
  deals_per_month character varying(20) NOT NULL,
  primary_markets text NOT NULL,
  property_types text[] NOT NULL,
  website character varying(500),
  linkedin character varying(500),
  description text,
  status character varying(50) DEFAULT 'pending'::character varying,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password character varying(255),
  PRIMARY KEY (id),
  UNIQUE (user_id),
  CONSTRAINT seller_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users (id),
  CONSTRAINT seller_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);

-- -----------------------------------------------------------------------------
-- 5. properties (references seller_applications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  price numeric,
  bedrooms integer,
  bathrooms numeric,
  floor_area integer,
  state text,
  status text DEFAULT 'draft'::text,
  description text,
  repairs text,
  additional_photos text,
  feature_image_url text,
  seo_title text,
  seo_description text,
  social_title text,
  social_description text,
  social_image_url text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  property_status character varying(20) DEFAULT 'available'::character varying,
  inspection_report_url text,
  inspection_report_key text,
  seller_id uuid,
  PRIMARY KEY (id),
  UNIQUE (slug),
  CONSTRAINT properties_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.seller_applications (id)
);

-- -----------------------------------------------------------------------------
-- 6. property_images (references properties)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  image_url text NOT NULL,
  image_key text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id)
);

-- -----------------------------------------------------------------------------
-- 7. user_favorites (references users; property_id is UUID, no FK – can be wholesale_deals.id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, property_id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users (id)
);

-- =============================================================================
-- INDEXES (non-constraint; PK/UNIQUE already create their indexes)
-- =============================================================================

-- admin
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin USING btree (role);

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_property_status ON public.properties USING btree (property_status);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties USING btree (status);
CREATE INDEX IF NOT EXISTS idx_properties_seller_id ON public.properties USING btree (seller_id);
CREATE INDEX IF NOT EXISTS idx_properties_seller_status ON public.properties USING btree (seller_id, status, property_status);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties USING btree (created_by);

-- property_images
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_sort_order ON public.property_images USING btree (property_id, sort_order);

-- seller_applications
CREATE INDEX IF NOT EXISTS idx_seller_applications_email ON public.seller_applications USING btree (email);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON public.seller_applications USING btree (status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_user_id ON public.seller_applications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_created_at ON public.seller_applications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_applications_password ON public.seller_applications USING btree (password);

-- settings
CREATE INDEX IF NOT EXISTS idx_settings_auto_approve ON public.settings USING btree (auto_approve_sellers) WHERE (auto_approve_sellers = true);

-- user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_property_id ON public.user_favorites USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON public.user_favorites USING btree (created_at DESC);

-- users
CREATE INDEX IF NOT EXISTS idx_users_seller_status ON public.users USING btree (seller_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_users_verified ON public.users USING btree (verified);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON public.users USING btree (facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users USING btree (google_id);
CREATE INDEX IF NOT EXISTS idx_users_active_blocked ON public.users USING btree (active, blocked);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON public.users USING btree (blocked);
