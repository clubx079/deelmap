// /app/api/auth/register/route.js

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { email, password, name, phone } = await request.json()

    // Validate required fields
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone
        }
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // If user was created successfully, also create a record in the users table
    if (authData.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          phone,
          role: 'user'
        })

      if (userError) {
        console.error('Error creating user record:', userError)
        // Don't fail the registration if the user record creation fails
        // The auth user was still created successfully
      }
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: authData.user,
      session: authData.session
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}