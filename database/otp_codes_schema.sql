-- OTP codes store (replaces in-memory Map for signup + password reset).
-- Survives restarts, shared across server instances, rate-limited, attempt-capped.
-- Run this in the Supabase SQL editor against the marketplace database.

create extension if not exists pgcrypto;

create table if not exists otp_codes (
  id                uuid primary key default gen_random_uuid(),
  identifier        text not null,            -- lowercased email (or phone) the code was sent to
  purpose           text not null,            -- 'signup' | 'password_reset'
  code_hash         text not null,            -- bcrypt hash of the 6-digit code (never stored in plaintext)
  meta              jsonb,                    -- optional extra data (e.g. names)
  attempts          int  not null default 0,  -- failed verify attempts; capped before lockout
  send_count        int  not null default 1,  -- sends within the current rate-limit window
  window_started_at timestamptz not null default now(),
  last_sent_at      timestamptz not null default now(),
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);

-- One active code per (identifier, purpose); saveOtp upserts on this.
create unique index if not exists otp_codes_identifier_purpose_idx
  on otp_codes (identifier, purpose);

create index if not exists otp_codes_expires_idx on otp_codes (expires_at);

-- Service role only. RLS on with no policies = anon/auth clients cannot read or write.
alter table otp_codes enable row level security;
