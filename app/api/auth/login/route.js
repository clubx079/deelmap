// /app/api/auth/login/route.js


import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { signSession, buildSessionCookie } from '@/lib/session'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    const res = NextResponse.json({
      message: 'Login successful',
      user: data.user,
      session: data.session
    })
    if (data.user?.id) {
      res.headers.append('Set-Cookie', buildSessionCookie(signSession({ userId: data.user.id })))
    }
    return res

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}