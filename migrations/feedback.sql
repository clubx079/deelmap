-- Feedback (star rating + optional text), surfaced in the admin portal.
-- User submits at /feedback -> POST /api/feedback -> inserts here.
-- Admin reads this table at admin.deelmap.com/feedback.
-- Idempotent: safe to re-run.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,                                   -- who submitted (nullable for anonymous)
  user_type   text not null default 'anon',           -- buyer | seller | anon
  source      text not null default 'general',        -- welcome | week1 | listing | plan_nudge | general
  rating      int,                                    -- 1..5 (nullable)
  message     text,
  created_at  timestamptz not null default now(),
  status      text not null default 'new',            -- new | handled
  handled_by  uuid,
  handled_at  timestamptz
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx  on public.feedback (status);
alter table public.feedback add constraint feedback_rating_range check (rating is null or (rating between 1 and 5)) not valid;
