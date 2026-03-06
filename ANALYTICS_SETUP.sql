-- ============================================================================
-- DEELMAP ANALYTICS SETUP
-- Run this entire file once in your Supabase SQL Editor.
-- It is safe to re-run (all statements use CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================================

-- ============================================================================
-- STEP 1: updated_at trigger function (required by property_analytics trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: visitor_summary table (used by /api/live-tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_summary (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  session_id    text                     NOT NULL,
  user_id       uuid                     NULL,
  user_email    text                     NULL,
  user_first_name text                   NULL,
  user_last_name  text                   NULL,
  is_guest      boolean                  NULL DEFAULT true,
  visit_date    date                     NOT NULL,
  first_visit_at  timestamp with time zone NULL DEFAULT now(),
  last_visit_at   timestamp with time zone NULL DEFAULT now(),
  total_page_views  integer              NULL DEFAULT 0,
  pages_visited   text[]                 NULL DEFAULT '{}',
  properties_viewed uuid[]               NULL DEFAULT '{}',
  total_time_spent_seconds integer       NULL DEFAULT 0,
  device_type   text                     NULL,
  browser       text                     NULL,
  os            text                     NULL,
  referrer      text                     NULL,
  utm_source    text                     NULL,
  is_returning_visitor boolean           NULL DEFAULT false,
  CONSTRAINT visitor_summary_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_visitor_summary_session_id
  ON public.visitor_summary USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_summary_visit_date
  ON public.visitor_summary USING btree (visit_date);
CREATE INDEX IF NOT EXISTS idx_visitor_summary_user_id
  ON public.visitor_summary USING btree (user_id);

-- ============================================================================
-- STEP 3: analytics_settings table (used by SMS notification system)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id                      uuid     NOT NULL DEFAULT gen_random_uuid(),
  enabled                 boolean  NOT NULL DEFAULT false,
  threshold               integer  NOT NULL DEFAULT 2,
  message_template        text     NOT NULL DEFAULT 'Hey {seller_name}! Your property at {address} got {no_of_views} new views. Engage with them right now: {magic_link}',
  from_phone              text     NULL DEFAULT '+13323333839',
  progressive_milestones  jsonb    NULL,
  cooldown_enabled        boolean  NOT NULL DEFAULT false,
  cooldown_hours          integer  NOT NULL DEFAULT 24,
  quiet_hours_enabled     boolean  NOT NULL DEFAULT false,
  quiet_hours_start       integer  NOT NULL DEFAULT 22,
  quiet_hours_end         integer  NOT NULL DEFAULT 8,
  quiet_hours_timezone    text     NOT NULL DEFAULT 'America/New_York',
  queue_outside_hours     boolean  NOT NULL DEFAULT false,
  created_at  timestamp with time zone NULL DEFAULT now(),
  updated_at  timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT analytics_settings_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Insert a single default row if the table is empty
INSERT INTO public.analytics_settings (enabled)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_settings);

-- ============================================================================
-- STEP 4: upsert_property_view  (fallback – no special-link fields)
-- Called by /api/analytics/property-tracking when the primary RPC doesn't exist
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_property_view(
  p_property_id      uuid,
  p_session_id       text,
  p_property_address text,
  p_property_price   numeric,
  p_referrer         text,
  p_user_agent       text,
  p_ip_address       inet,
  p_device_type      text,
  p_viewport_width   integer,
  p_viewport_height  integer,
  p_utm_source       text,
  p_user_id          uuid    DEFAULT NULL,
  p_user_email       text    DEFAULT NULL,
  p_user_first_name  text    DEFAULT NULL,
  p_user_last_name   text    DEFAULT NULL,
  p_user_phone       text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  -- Update existing record for this property + session + day
  UPDATE property_analytics
  SET
    view_end_time     = NOW(),
    page_views        = page_views + 1,
    updated_at        = NOW(),
    user_id           = COALESCE(p_user_id,         user_id),
    user_email        = COALESCE(p_user_email,       user_email),
    user_first_name   = COALESCE(p_user_first_name,  user_first_name),
    user_last_name    = COALESCE(p_user_last_name,   user_last_name),
    user_phone        = COALESCE(p_user_phone,       user_phone)
  WHERE property_id = p_property_id
    AND session_id  = p_session_id
    AND DATE(created_at AT TIME ZONE 'UTC') = v_today;

  -- No row for today → insert fresh record
  IF NOT FOUND THEN
    INSERT INTO property_analytics (
      property_id, session_id, property_address, property_price,
      referrer, user_agent, ip_address, device_type,
      viewport_width, viewport_height, utm_source,
      user_id, user_email, user_first_name, user_last_name, user_phone,
      view_start_time, view_end_time, active_time_seconds,
      page_views, contact_status, created_at, updated_at
    ) VALUES (
      p_property_id, p_session_id, p_property_address, p_property_price,
      p_referrer, p_user_agent, p_ip_address, p_device_type,
      p_viewport_width, p_viewport_height, p_utm_source,
      p_user_id, p_user_email, p_user_first_name, p_user_last_name, p_user_phone,
      NOW(), NOW(), 0,
      1, NULL, NOW(), NOW()
    );
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: upsert_property_view_with_special_access  (primary RPC)
-- Adds utm_code + is_special_link_access support.
-- Called by /api/analytics/property-tracking action=start_view
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_property_view_with_special_access(
  p_property_id      uuid,
  p_session_id       text,
  p_property_address text,
  p_property_price   numeric,
  p_referrer         text,
  p_user_agent       text,
  p_ip_address       inet,
  p_device_type      text,
  p_viewport_width   integer,
  p_viewport_height  integer,
  p_utm_source       text,
  p_utm_code         text    DEFAULT NULL,
  p_is_special_link  boolean DEFAULT false,
  p_user_id          uuid    DEFAULT NULL,
  p_user_email       text    DEFAULT NULL,
  p_user_first_name  text    DEFAULT NULL,
  p_user_last_name   text    DEFAULT NULL,
  p_user_phone       text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  -- Attempt update first (session exists for today)
  UPDATE property_analytics
  SET
    view_end_time         = NOW(),
    page_views            = page_views + 1,
    updated_at            = NOW(),
    user_id               = COALESCE(p_user_id,          user_id),
    user_email            = COALESCE(p_user_email,        user_email),
    user_first_name       = COALESCE(p_user_first_name,   user_first_name),
    user_last_name        = COALESCE(p_user_last_name,    user_last_name),
    user_phone            = COALESCE(p_user_phone,        user_phone),
    is_special_link_access = COALESCE(p_is_special_link,  is_special_link_access),
    utm_code              = COALESCE(p_utm_code,          utm_code)
  WHERE property_id = p_property_id
    AND session_id  = p_session_id
    AND DATE(created_at AT TIME ZONE 'UTC') = v_today;

  IF NOT FOUND THEN
    INSERT INTO property_analytics (
      property_id, session_id, property_address, property_price,
      referrer, user_agent, ip_address, device_type,
      viewport_width, viewport_height, utm_source, utm_code,
      is_special_link_access,
      user_id, user_email, user_first_name, user_last_name, user_phone,
      view_start_time, view_end_time, active_time_seconds,
      page_views, contact_status, created_at, updated_at
    ) VALUES (
      p_property_id, p_session_id, p_property_address, p_property_price,
      p_referrer, p_user_agent, p_ip_address, p_device_type,
      p_viewport_width, p_viewport_height, p_utm_source, p_utm_code,
      COALESCE(p_is_special_link, false),
      p_user_id, p_user_email, p_user_first_name, p_user_last_name, p_user_phone,
      NOW(), NOW(), 0,
      1, NULL, NOW(), NOW()
    );
  END IF;
END;
$$;

-- ============================================================================
-- STEP 6: update_property_behavior  (atomic behavior update)
-- Replaces the .order().limit() UPDATE workaround in the API route.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_property_behavior(
  p_property_id             uuid,
  p_session_id              text,
  p_scrolled_to_bottom      boolean DEFAULT NULL,
  p_viewed_description      boolean DEFAULT NULL,
  p_viewed_repairs          boolean DEFAULT NULL,
  p_viewed_photos           boolean DEFAULT NULL,
  p_clicked_inquiry         boolean DEFAULT NULL,
  p_clicked_inspection_report boolean DEFAULT NULL,
  p_clicked_more_photos     boolean DEFAULT NULL,
  p_clicked_share           boolean DEFAULT NULL,
  p_zoomed_map              boolean DEFAULT NULL,
  p_images_viewed           integer DEFAULT NULL,
  p_full_view_achieved      boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE property_analytics
  SET
    scrolled_to_bottom      = COALESCE(p_scrolled_to_bottom,          scrolled_to_bottom),
    viewed_description      = COALESCE(p_viewed_description,          viewed_description),
    viewed_repairs          = COALESCE(p_viewed_repairs,              viewed_repairs),
    viewed_photos           = COALESCE(p_viewed_photos,               viewed_photos),
    clicked_more_photos     = COALESCE(p_clicked_more_photos,         clicked_more_photos),
    clicked_share           = COALESCE(p_clicked_share,               clicked_share),
    zoomed_map              = COALESCE(p_zoomed_map,                  zoomed_map),
    images_viewed           = GREATEST(COALESCE(p_images_viewed, 0),  images_viewed),
    full_view_achieved      = COALESCE(p_full_view_achieved,          full_view_achieved),
    last_active_time        = NOW(),
    updated_at              = NOW()
  WHERE property_id = p_property_id
    AND session_id  = p_session_id
    AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;
END;
$$;

-- ============================================================================
-- STEP 7: update_property_active_time  (atomic active-time increment)
-- Replaces the sequential SELECT + UPDATE pattern in the API route.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_property_active_time(
  p_property_id   uuid,
  p_session_id    text,
  p_is_tab_visible boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_active   timestamp with time zone;
  v_active_time   integer;
  v_diff          integer;
BEGIN
  SELECT last_active_time, active_time_seconds
  INTO   v_last_active, v_active_time
  FROM   property_analytics
  WHERE  property_id = p_property_id
    AND  session_id  = p_session_id
    AND  DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND p_is_tab_visible THEN
    -- Time since last active ping (capped at 10 s to avoid jumps after idle)
    v_diff := LEAST(
      EXTRACT(EPOCH FROM (NOW() - COALESCE(v_last_active, NOW())))::integer,
      10
    );

    UPDATE property_analytics
    SET
      active_time_seconds = COALESCE(v_active_time, 0) + v_diff,
      last_active_time    = NOW(),
      updated_at          = NOW()
    WHERE property_id = p_property_id
      AND session_id  = p_session_id
      AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 8: end_property_view  (atomic session-end update)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.end_property_view(
  p_property_id uuid,
  p_session_id  text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_time integer;
BEGIN
  SELECT active_time_seconds
  INTO   v_active_time
  FROM   property_analytics
  WHERE  property_id = p_property_id
    AND  session_id  = p_session_id
    AND  DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE property_analytics
    SET
      view_end_time    = NOW(),
      duration_seconds = COALESCE(v_active_time, 0),
      updated_at       = NOW()
    WHERE property_id = p_property_id
      AND session_id  = p_session_id
      AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 9: increment_utm_clicks  (UTM link click counter)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_utm_clicks(
  p_property_id uuid,
  p_utm_code    text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE utm_links
  SET
    clicks     = COALESCE(clicks, 0) + 1,
    updated_at = NOW()
  WHERE property_id = p_property_id
    AND utm_code    = p_utm_code;
END;
$$;

-- ============================================================================
-- STEP 10: get_analytics_settings  (reads single settings row)
-- Drop first because return type may differ from any prior version
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_analytics_settings();

CREATE OR REPLACE FUNCTION public.get_analytics_settings()
RETURNS SETOF public.analytics_settings
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.analytics_settings LIMIT 1;
$$;

-- ============================================================================
-- STEP 11: increment_visitor_time  (adds seconds to visitor_summary)
-- Called by /api/live-tracking on page_visit events
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_visitor_time(
  p_session_id  text,
  p_visit_date  date,
  p_seconds     integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.visitor_summary
  SET
    total_time_spent_seconds = COALESCE(total_time_spent_seconds, 0) + COALESCE(p_seconds, 0),
    last_visit_at            = NOW()
  WHERE session_id = p_session_id
    AND visit_date = p_visit_date;
END;
$$;

-- ============================================================================
-- STEP 12: property_engagement_stats view
-- Used by GET /api/analytics/property-tracking?type=summary
-- ============================================================================
CREATE OR REPLACE VIEW public.property_engagement_stats AS
SELECT
  pa.property_id,
  wd.address                                                          AS property_address,
  COUNT(DISTINCT pa.session_id)                                       AS total_unique_views,
  COUNT(DISTINCT pa.user_id) FILTER (WHERE pa.user_id IS NOT NULL)   AS total_registered_views,
  COUNT(DISTINCT pa.session_id) FILTER (WHERE pa.user_id IS NULL)    AS total_guest_views,
  ROUND(AVG(pa.active_time_seconds) FILTER (WHERE pa.active_time_seconds > 0))::integer
                                                                      AS avg_active_seconds,
  ROUND(AVG(pa.duration_seconds) FILTER (WHERE pa.duration_seconds > 0))::integer
                                                                      AS avg_duration_seconds,
  MAX(pa.active_time_seconds)                                         AS max_active_seconds,
  COUNT(*) FILTER (WHERE pa.scrolled_to_bottom   = true)             AS scrolled_to_bottom_count,
  COUNT(*) FILTER (WHERE pa.viewed_description   = true)             AS viewed_description_count,
  COUNT(*) FILTER (WHERE pa.viewed_repairs       = true)             AS viewed_repairs_count,
  COUNT(*) FILTER (WHERE pa.viewed_photos        = true)             AS viewed_photos_count,
  COUNT(*) FILTER (WHERE pa.clicked_more_photos  = true)             AS clicked_more_photos_count,
  COUNT(*) FILTER (WHERE pa.clicked_share        = true)             AS clicked_share_count,
  COUNT(*) FILTER (WHERE pa.zoomed_map           = true)             AS zoomed_map_count,
  COUNT(*) FILTER (WHERE pa.full_view_achieved   = true)             AS full_view_count,
  ROUND(AVG(pa.images_viewed) FILTER (WHERE pa.images_viewed > 0), 1)
                                                                      AS avg_images_viewed,
  MAX(pa.images_viewed)                                               AS max_images_viewed,
  COUNT(*) FILTER (WHERE pa.is_special_link_access = true)           AS special_link_views,
  MIN(pa.created_at)                                                  AS first_viewed_at,
  MAX(pa.created_at)                                                  AS last_viewed_at
FROM public.property_analytics pa
LEFT JOIN public.wholesale_deals wd ON wd.id = pa.property_id
GROUP BY pa.property_id, wd.address;

-- ============================================================================
-- STEP 13: user_engagement_patterns view
-- Used by GET /api/analytics/property-tracking?type=user-patterns
-- ============================================================================
CREATE OR REPLACE VIEW public.user_engagement_patterns AS
SELECT
  pa.user_id,
  pa.user_email,
  pa.user_first_name,
  pa.user_last_name,
  COUNT(DISTINCT pa.property_id)                                       AS total_unique_property_views,
  COUNT(DISTINCT pa.session_id)                                        AS total_sessions,
  SUM(pa.active_time_seconds)                                          AS total_active_seconds,
  ROUND(AVG(pa.active_time_seconds) FILTER (WHERE pa.active_time_seconds > 0))::integer
                                                                       AS avg_active_seconds_per_visit,
  COUNT(*) FILTER (WHERE pa.scrolled_to_bottom  = true)               AS times_scrolled_to_bottom,
  COUNT(*) FILTER (WHERE pa.viewed_description  = true)               AS times_viewed_description,
  COUNT(*) FILTER (WHERE pa.clicked_more_photos = true)               AS times_clicked_more_photos,
  COUNT(*) FILTER (WHERE pa.clicked_share       = true)               AS times_clicked_share,
  MAX(pa.images_viewed)                                                AS max_images_viewed_in_session,
  STRING_AGG(DISTINCT pa.device_type, ', ')                           AS devices_used,
  MIN(pa.created_at)                                                   AS first_activity_at,
  MAX(pa.created_at)                                                   AS last_activity_at
FROM public.property_analytics pa
WHERE pa.user_id IS NOT NULL
   OR pa.user_email IS NOT NULL
GROUP BY pa.user_id, pa.user_email, pa.user_first_name, pa.user_last_name;

-- ============================================================================
-- DONE
-- Verify by running:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'upsert_property_view', 'upsert_property_view_with_special_access',
--     'update_property_behavior', 'update_property_active_time',
--     'end_property_view', 'increment_utm_clicks',
--     'get_analytics_settings', 'increment_visitor_time',
--     'update_updated_at_column'
--   );
-- ============================================================================
