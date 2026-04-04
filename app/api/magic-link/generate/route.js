import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

// Generate a short, URL-safe token (8 characters)
function generateShortToken() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return token
}

// POST - Generate a new magic link token
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      temp_seller_id,
      property_id,
      phone_number,
      property_address,
      views_count
    } = body

    // Validate required fields
    if (!temp_seller_id || !property_id || !phone_number) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: temp_seller_id, property_id, phone_number'
      }, { status: 400 })
    }

    // Generate unique token
    let token = generateShortToken()
    let isUnique = false
    let attempts = 0

    // Ensure token is unique (retry up to 5 times if collision)
    while (!isUnique && attempts < 5) {
      const { data: existing } = await supabase
        .from('magic_link_tokens')
        .select('id')
        .eq('token', token)
        .single()

      if (!existing) {
        isUnique = true
      } else {
        token = generateShortToken()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate unique token'
      }, { status: 500 })
    }

    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Insert token into database
    const { data: tokenData, error: insertError } = await supabase
      .from('magic_link_tokens')
      .insert([{
        token,
        temp_seller_id,
        property_id,
        phone_number,
        property_address: property_address || '',
        views_count: views_count || 0,
        expires_at: expiresAt.toISOString(),
        used: false
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting magic link token:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create magic link token'
      }, { status: 500 })
    }

    // Get seller portal base URL from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'http://localhost:3004'
    const magicLink = `${baseUrl}/register?token=${token}`

    return NextResponse.json({
      success: true,
      token,
      magic_link: magicLink,
      expires_at: expiresAt.toISOString()
    })

  } catch (error) {
    console.error('Error generating magic link:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// GET - Validate a magic link token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token parameter is required'
      }, { status: 400 })
    }

    // Find token in database
    const { data: tokenData, error } = await supabase
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token',
        valid: false
      }, { status: 404 })
    }

    // Check if token is already used
    if (tokenData.used) {
      return NextResponse.json({
        success: false,
        error: 'Token has already been used',
        valid: false
      }, { status: 400 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'Token has expired',
        valid: false
      }, { status: 400 })
    }

    // Token is valid
    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        temp_seller_id: tokenData.temp_seller_id,
        property_id: tokenData.property_id,
        phone_number: tokenData.phone_number,
        property_address: tokenData.property_address,
        views_count: tokenData.views_count
      }
    })

  } catch (error) {
    console.error('Error validating magic link:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      valid: false
    }, { status: 500 })
  }
}
