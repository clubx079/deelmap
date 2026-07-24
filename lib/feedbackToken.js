// Signed token used to prefill the feedback form from a follow-up email link
// (who submitted + which flow). Low-stakes (feedback is not sensitive) — the
// signature just prevents trivial spoofing of user_id/source. Falls back to an
// anonymous submission when the token is missing or invalid.
import crypto from 'crypto'

const SECRET =
  process.env.FEEDBACK_LINK_SECRET ||
  process.env.CONTRACT_DOWNLOAD_SECRET ||
  'deelmap-feedback-dev-secret'

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function signFeedbackToken({ uid, type, source } = {}) {
  const payload = b64url(
    JSON.stringify({ uid: uid || null, type: type || 'anon', source: source || 'general' })
  )
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
  return `${payload}.${sig}`
}

export function verifyFeedbackToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
  if (!sig || sig !== expected) return null
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return { uid: obj.uid || null, type: obj.type || 'anon', source: obj.source || 'general' }
  } catch {
    return null
  }
}
