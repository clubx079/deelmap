import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Always allow: pin page, pin API, Next.js internals, static assets
  if (
    pathname.startsWith('/pin') ||
    pathname.startsWith('/api/pin') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get('deelmap_access')
  if (cookie?.value === 'granted') {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/pin', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
