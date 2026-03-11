import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function getClientIP(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) return vercelIP.split(',')[0].trim()
  return null
}

const LOCALHOST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request) {
  try {
    const { message, email } = await request.json()

    const clientIP = getClientIP(request)
    const isLocalhost = !clientIP || LOCALHOST_IPS.includes(clientIP)

    let user = null

    // Try IP lookup first (only on real/deployed environments)
    if (!isLocalhost) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, suspended')
        .eq('registration_ip', clientIP)
        .eq('suspended', true)
        .maybeSingle()
      user = data
    }

    // Fall back to email lookup (covers localhost dev + IP changes/VPN)
    if (!user && email) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, suspended')
        .eq('email', email)
        .eq('suspended', true)
        .maybeSingle()
      user = data
    }

    if (!user) {
      return NextResponse.json({ error: 'No suspended account found' }, { status: 404 })
    }

    // Check if there's already a pending request
    const { data: existing } = await supabaseAdmin
      .from('ip_review_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending review request. Please wait for it to be reviewed.' }, { status: 400 })
    }

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()

    const { error: insertError } = await supabaseAdmin
      .from('ip_review_requests')
      .insert({
        user_email: user.email,
        user_name: fullName || null,
        user_id: user.id,
        ip_address: clientIP || 'localhost',
        message: message || '',
        status: 'pending'
      })

    if (insertError) {
      console.error('Error inserting review request:', insertError)
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Review request submitted successfully' })
  } catch (err) {
    console.error('Request review error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
