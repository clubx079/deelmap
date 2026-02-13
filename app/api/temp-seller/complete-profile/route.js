// app/api/temp-seller/complete-profile/route.js
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { token, name, email, password } = await request.json()

    if (!token || !name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // 1. Verify token and get temp seller
    const { data: seller, error: sellerError } = await supabase
      .from('temp_seller_logins')
      .select('*')
      .eq('magic_link_token', token)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (seller.magic_link_expires_at && new Date(seller.magic_link_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 410 }
      )
    }

    // Check if already used
    if (seller.magic_link_used_at) {
      return NextResponse.json(
        { error: 'Profile already completed' },
        { status: 410 }
      )
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // 3. Create user account in users table (or seller_applications table)
    // Note: Adjust this based on your actual seller registration table
    const { data: newUser, error: userError } = await supabase
      .from('seller_applications')
      .insert({
        email: email,
        contact_person_name: name,
        business_name: seller.company_name || name,
        phone: seller.seller_phone,
        status: 'pending', // Or 'approved' if you want to auto-approve
        temp_seller_id: seller.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)

      // Check if email already exists
      if (userError.code === '23505') {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // 4. Mark magic link as used and update temp seller status
    await supabase
      .from('temp_seller_logins')
      .update({
        magic_link_used_at: new Date().toISOString(),
        status: 'converted',
        sender_email: email,
        seller_name: name,
        user_id: newUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', seller.id)

    // 5. Return success with dashboard URL
    const dashboardUrl = process.env.NEXT_PUBLIC_SELLER_DASHBOARD_URL || 'https://deelmapdashboard.com/login'

    return NextResponse.json({
      success: true,
      message: 'Profile completed successfully',
      user: {
        id: newUser.id,
        name: name,
        email: email
      },
      dashboardUrl: `${dashboardUrl}?email=${encodeURIComponent(email)}`
    })

  } catch (error) {
    console.error('Profile completion error:', error)
    return NextResponse.json(
      { error: 'Failed to complete profile' },
      { status: 500 }
    )
  }
}
