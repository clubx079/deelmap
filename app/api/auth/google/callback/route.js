import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function getBaseUrl(request) {
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function getClientIP(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return null
}

export async function GET(request) {
  try {
    const baseUrl = getBaseUrl(request)
    const clientIP = getClientIP(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}?error=access_denied`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}?error=missing_code`
      )
    }

    // Exchange code for tokens (redirect_uri must match the URL Google used to get here)
    const callbackUrl = `${baseUrl}/api/auth/google/callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    )

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const googleUser = await userInfoResponse.json()

    // Check if user exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single()

    let user

    if (existingUser) {
      // Update existing user
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          google_id: googleUser.id,
          first_name: googleUser.given_name || existingUser.first_name,
          last_name: googleUser.family_name || existingUser.last_name,
          auth_provider: 'google',
          verified: true,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ip_address: clientIP || null,
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      user = updatedUser
    } else {
      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: googleUser.email,
          google_id: googleUser.id,
          first_name: googleUser.given_name,
          last_name: googleUser.family_name,
          auth_provider: 'google',
          verified: true,
          active: true,
          last_login_at: new Date().toISOString(),
          ip_address: clientIP || null,
        })
        .select()
        .single()

      user = newUser
    }

    // Create a response that redirects and sets user data (use same domain user is on)
    const response = NextResponse.redirect(baseUrl)

    // Set user data in cookie for client to pick up (include first_name for dashboard welcome)
    response.cookies.set('auth_user', JSON.stringify({
      id: user.id,
      email: user.email,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      user_metadata: {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone: user.phone,
      },
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Google callback error:', error)
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(
      `${baseUrl}?error=auth_failed`
    )
  }
}
