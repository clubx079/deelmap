// app/api/temp-seller/verify-token/route.js
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find temp seller with this magic link token
    const { data: seller, error: sellerError } = await supabase
      .from('temp_seller_logins')
      .select('*')
      .eq('magic_link_token', token)
      .single()

    if (sellerError || !seller) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (seller.magic_link_expires_at) {
      const expiresAt = new Date(seller.magic_link_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'This invitation link has expired' },
          { status: 410 }
        )
      }
    }

    // Check if already used
    if (seller.magic_link_used_at) {
      return NextResponse.json(
        { error: 'This invitation link has already been used' },
        { status: 410 }
      )
    }

    // Get viewer count for their property
    const { count: viewerCount } = await supabase
      .from('property_analytics')
      .select('user_email', { count: 'exact', head: true })
      .eq('property_id', seller.first_deal_id)
      .not('user_email', 'is', null)

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        seller_name: seller.seller_name,
        sender_email: seller.sender_email,
        seller_phone: seller.seller_phone,
        company_name: seller.company_name,
        viewer_count: viewerCount || 2
      }
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}
