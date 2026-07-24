import crypto from 'crypto'

// Signed, httpOnly session for buyer-portal auth. Replaces the spoofable
// x-user-id / Bearer<rawId>: the cookie value is HMAC-signed with a server-only
// secret, so a client cannot forge a valid session for an arbitrary user id.
const SECRET = process.env.SESSION_SECRET || 'dev-deelmap-session-secret'
export const SESSION_COOKIE = 'dm_session'
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

const b64u = (s) => Buffer.from(s).toString('base64url')
const unb64u = (s) => Buffer.from(s, 'base64url').toString('utf8')
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('hex')

export function signSession({ userId }) {
  const payload = b64u(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }))
  return `${payload}.${hmac(payload)}`
}

export function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = hmac(payload)
  try {
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch { return null }
  let data
  try { data = JSON.parse(unb64u(payload)) } catch { return null }
  if (!data?.userId) return null
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
  return { userId: data.userId }
}

export function buildSessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
}

export function buildClearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function getSessionUserId(request) {
  const token = request?.cookies?.get?.(SESSION_COOKIE)?.value
  return verifySession(token)?.userId || null
}
