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
  return request.headers.get('x-real-ip') || null
}

export async function GET(request) {
  try {
    const baseUrl = getBaseUrl(request)
    const clientIP = getClientIP(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(`deelmap://auth?error=${error || 'missing_code'}`)
    }

    const callbackUrl = `${baseUrl}/api/auth/google/mobile-callback`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) throw new Error('Token exchange failed')
    const tokens = await tokenResponse.json()

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userInfoResponse.ok) throw new Error('Failed to get user info')
    const googleUser = await userInfoResponse.json()

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single()

    let user
    if (existingUser) {
      const { data: updated } = await supabase
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
      user = updated
    } else {
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

    const userPayload = encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      created_at: user.created_at,
    }))

    // Redirect back to the mobile app via deep link
    return NextResponse.redirect(`deelmap://auth?user=${userPayload}`)
  } catch (err) {
    console.error('Mobile Google callback error:', err)
    return NextResponse.redirect('deelmap://auth?error=auth_failed')
  }
}
