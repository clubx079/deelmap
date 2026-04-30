// /app/api/auth/signin/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

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
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) return vercelIP.split(',')[0].trim()
  return null
}

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    const clientIP = getClientIP(request)

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    // Find user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, first_name, last_name, phone, active, blocked, suspended')
      .eq('email', email)
      .single()

    if (error || !user) {
      console.log('User not found:', email)
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Check if suspended (IP-based suspension with appeal process)
    if (user.suspended) {
      console.log('User account is suspended:', email)
      return NextResponse.json({
        message: 'Your account has been suspended. You can submit a review request to appeal.',
        suspended: true
      }, { status: 403 })
    }

    // Check if user is active and not blocked
    if (user.blocked || !user.active) {
      console.log('User account is blocked or inactive:', email)
      return NextResponse.json({ message: 'Account is blocked or inactive' }, { status: 403 })
    }

    // Check if user has a password (required for password-based login)
    if (!user.password) {
      console.log('User has no password set:', email)
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Check password - compare against password column
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      console.log('Invalid password for user:', email)
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Update last_login_at and capture login IP
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString(), ip_address: clientIP || null })
      .eq('id', user.id)

    console.log('User signed in successfully:', email)

    return NextResponse.json({
      message: 'Sign in successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || null,
        phone: user.phone
      }
    })

  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { message: 'Sign in failed' },
      { status: 500 }
    )
  }
}