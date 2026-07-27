-- Star Buyer classification, written once at signup by the buyer portal.
-- A "star" buyer looks like a real-estate professional (investor/agency/wholesaler);
-- they are routed to the 'star_buyer' follow-up automation instead of 'buyer_welcome'.
-- Additive + idempotent — safe to run on prod.

alter table public.users add column if not exists is_star_buyer   boolean not null default false;
alter table public.users add column if not exists buyer_tier      text    not null default 'normal';  -- 'star' | 'normal'
alter table public.users add column if not exists star_persona    text;                                -- agency|investor|wholesaler|broker|fund|professional|casual
alter table public.users add column if not exists star_company    text;
alter table public.users add column if not exists star_confidence numeric;                             -- 0..1
alter table public.users add column if not exists star_reason     text;
alter table public.users add column if not exists classified_at   timestamptz;

-- Fast lookup of star buyers for admin filtering / analytics.
create index if not exists users_is_star_buyer_idx on public.users (is_star_buyer) where is_star_buyer = true;
