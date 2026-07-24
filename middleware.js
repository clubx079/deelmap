import { NextResponse } from 'next/server'
import { verifySessionEdge, SESSION_COOKIE } from '@/lib/sessionEdge'
import { decidePerimeter } from '@/lib/perimeter'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value || null
  const inbound = request.headers.get('x-user-id')

  const d = await decidePerimeter(pathname, token, verifySessionEdge, inbound)

  if (d.status === 401) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Rebuild headers: always drop any client-supplied x-user-id (anti-spoof),
  // then set the verified one when we have a session.
  const headers = new Headers(request.headers)
  headers.delete('x-user-id')
  if (d.injectUserId) headers.set('x-user-id', d.injectUserId)
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: '/api/:path*' }
