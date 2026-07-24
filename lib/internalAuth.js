import { NextResponse } from 'next/server'

// Fail-closed: server-to-server / cron routes must present the shared secret.
export function requireInternalSecret(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
  const auth = request.headers.get('authorization') || ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : request.headers.get('x-internal-secret')
  if (provided !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null // authorized
}
