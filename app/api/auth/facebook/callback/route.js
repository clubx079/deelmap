import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { signSession, buildSessionCookie } from '@/lib/session'

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    const clientIP = getClientIP(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=access_denied`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=missing_code`
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/auth/facebook/callback')}` +
      `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
      `&code=${code}`
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokens = await tokenResponse.json()

    // Get user info from Facebook
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name&access_token=${tokens.access_token}`
    )

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const facebookUser = await userInfoResponse.json()

    if (!facebookUser.email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=email_required`
      )
    }

    // Check if user exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', facebookUser.email)
      .single()

    let user

    if (existingUser) {
      // Update existing user
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          facebook_id: facebookUser.id,
          first_name: facebookUser.first_name || existingUser.first_name,
          last_name: facebookUser.last_name || existingUser.last_name,
          auth_provider: 'facebook',
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
          email: facebookUser.email,
          facebook_id: facebookUser.id,
          first_name: facebookUser.first_name,
          last_name: facebookUser.last_name,
          auth_provider: 'facebook',
          verified: true,
          active: true,
          last_login_at: new Date().toISOString(),
          ip_address: clientIP || null,
        })
        .select()
        .single()

      user = newUser
    }

    // Create a response that redirects and sets user data
    const response = NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL)

    // Set user data in cookie for client to pick up
    response.cookies.set('auth_user', JSON.stringify({
      id: user.id,
      email: user.email,
      user_metadata: {
        name: `${user.first_name} ${user.last_name}`,
        phone: user.phone,
      },
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    if (user?.id) {
      response.headers.append('Set-Cookie', buildSessionCookie(signSession({ userId: user.id })))
    }

    return response
  } catch (error) {
    console.error('Facebook callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=auth_failed`
    )
  }
}
