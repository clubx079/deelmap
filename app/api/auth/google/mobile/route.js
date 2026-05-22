import { NextResponse } from 'next/server'

function getBaseUrl(request) {
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export async function POST(request) {
  try {
    const baseUrl = getBaseUrl(request)
    const clientId = process.env.GOOGLE_CLIENT_ID

    if (!clientId) {
      return NextResponse.json({ message: 'Google OAuth is not configured' }, { status: 500 })
    }

    // Redirect goes to mobile-callback which will deep-link back to the app
    const redirectUri = `${baseUrl}/api/auth/google/mobile-callback`

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.append('client_id', clientId)
    googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
    googleAuthUrl.searchParams.append('response_type', 'code')
    googleAuthUrl.searchParams.append('scope', 'email profile')
    googleAuthUrl.searchParams.append('access_type', 'offline')
    googleAuthUrl.searchParams.append('prompt', 'select_account')

    return NextResponse.json({ url: googleAuthUrl.toString() })
  } catch (error) {
    console.error('Mobile Google OAuth error:', error)
    return NextResponse.json({ message: 'Failed to initiate Google sign in' }, { status: 500 })
  }
}
