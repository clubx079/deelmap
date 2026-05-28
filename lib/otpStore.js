// Database-backed OTP store: survives restarts, works across server instances,
// rate-limits sends, caps verify attempts, and stores only a bcrypt hash of the code.
// Used by the signup and password-reset flows. Requires the `otp_codes` table
// (see database/otp_codes_schema.sql).
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

const SEND_COOLDOWN_MS = 30 * 1000        // minimum gap between two code sends
const WINDOW_MS = 60 * 60 * 1000          // rate-limit window
const MAX_SENDS_PER_WINDOW = 6            // max code sends per identifier per window
const MAX_VERIFY_ATTEMPTS = 5             // wrong guesses before the code is invalidated

function getClient() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
  const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function norm(identifier) {
  return String(identifier || '').trim().toLowerCase()
}

// Store a freshly generated code (after rate-limit checks).
// Returns { ok } or { ok:false, error:'cooldown'|'rate_limited'|'config'|'db', retryAfterSec }.
export async function saveOtp(identifier, purpose, code, ttlMinutes = 10, meta = null) {
  const supabase = getClient()
  if (!supabase) return { ok: false, error: 'config' }
  const id = norm(identifier)
  const now = Date.now()

  const { data: existing } = await supabase
    .from('otp_codes')
    .select('last_sent_at, send_count, window_started_at')
    .eq('identifier', id).eq('purpose', purpose).maybeSingle()

  let sendCount = 1
  let windowStart = new Date(now).toISOString()

  if (existing) {
    const last = existing.last_sent_at ? new Date(existing.last_sent_at).getTime() : 0
    if (now - last < SEND_COOLDOWN_MS) {
      return { ok: false, error: 'cooldown', retryAfterSec: Math.ceil((SEND_COOLDOWN_MS - (now - last)) / 1000) }
    }
    const winStart = existing.window_started_at ? new Date(existing.window_started_at).getTime() : 0
    if (now - winStart < WINDOW_MS) {
      sendCount = (existing.send_count || 0) + 1
      windowStart = new Date(winStart).toISOString()
      if (sendCount > MAX_SENDS_PER_WINDOW) {
        return { ok: false, error: 'rate_limited', retryAfterSec: Math.ceil((WINDOW_MS - (now - winStart)) / 1000) }
      }
    }
  }

  const code_hash = await bcrypt.hash(String(code), 10)
  const { error } = await supabase.from('otp_codes').upsert({
    identifier: id,
    purpose,
    code_hash,
    meta: meta || null,
    attempts: 0,
    send_count: sendCount,
    window_started_at: windowStart,
    last_sent_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMinutes * 60 * 1000).toISOString(),
  }, { onConflict: 'identifier,purpose' })

  if (error) return { ok: false, error: 'db' }
  return { ok: true }
}

// Verify a submitted code. Consumes (deletes) it on success unless { consume:false }
// (used by two-step flows where one route validates and a later route finalizes).
// Returns { valid:true, meta } or { valid:false, reason:'not_found'|'expired'|'too_many_attempts'|'invalid'|'config' }.
export async function verifyOtp(identifier, purpose, code, { consume = true } = {}) {
  const supabase = getClient()
  if (!supabase) return { valid: false, reason: 'config' }
  const id = norm(identifier)

  const { data: row } = await supabase
    .from('otp_codes')
    .select('id, code_hash, attempts, expires_at, meta')
    .eq('identifier', id).eq('purpose', purpose).maybeSingle()

  if (!row) return { valid: false, reason: 'not_found' }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from('otp_codes').delete().eq('id', row.id)
    return { valid: false, reason: 'expired' }
  }

  if ((row.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    await supabase.from('otp_codes').delete().eq('id', row.id)
    return { valid: false, reason: 'too_many_attempts' }
  }

  const match = await bcrypt.compare(String(code), row.code_hash)
  if (!match) {
    await supabase.from('otp_codes').update({ attempts: (row.attempts || 0) + 1 }).eq('id', row.id)
    return { valid: false, reason: 'invalid' }
  }

  if (consume) {
    await supabase.from('otp_codes').delete().eq('id', row.id)
  }
  return { valid: true, meta: row.meta || null }
}
