// Edge-runtime verifier for the dm_session cookie. Middleware runs on Edge, which
// lacks Node's `crypto`, so this reimplements the same HMAC-SHA256 check with Web
// Crypto. Validates the exact cookie lib/session.js issues (same secret + format).
// Fail closed: in production there is no fallback secret — if SESSION_SECRET is
// missing, verification returns null instead of trusting a committed default.
const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-deelmap-session-secret')
export const SESSION_COOKIE = 'dm_session'

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0) return new Uint8Array(0)
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16)
    if (Number.isNaN(byte)) return new Uint8Array(0)
    out[i] = byte
  }
  return out
}

function b64uToJson(b64u) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function verifySessionEdge(token) {
  try {
    if (!SECRET) return null
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    const [payload, sig] = parts
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(sig), new TextEncoder().encode(payload))
    if (!valid) return null
    const data = b64uToJson(payload)
    if (!data || !data.userId) return null
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    return { userId: data.userId }
  } catch {
    return null
  }
}
