import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`
    const clientId = process.env.FACEBOOK_APP_ID

    if (!clientId) {
      return NextResponse.json(
        { message: 'Facebook OAuth is not configured' },
        { status: 500 }
      )
    }

    // Build Facebook OAuth URL
    const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    facebookAuthUrl.searchParams.append('client_id', clientId)
    facebookAuthUrl.searchParams.append('redirect_uri', redirectUri)
    facebookAuthUrl.searchParams.append('scope', 'email,public_profile')
    facebookAuthUrl.searchParams.append('response_type', 'code')
    facebookAuthUrl.searchParams.append('state', 'facebook_auth')

    return NextResponse.json({ url: facebookAuthUrl.toString() })
  } catch (error) {
    console.error('Facebook OAuth error:', error)
    return NextResponse.json(
      { message: 'Failed to initiate Facebook sign in' },
      { status: 500 }
    )
  }
}
