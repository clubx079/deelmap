// app/api/debug-property/route.js
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId') || 'dc0b8c48-d9a0-45ed-b07f-558edb4dcb9d'

    // Get unique viewers
    const { data: uniqueViewers, error: viewerError } = await supabase
      .from('property_analytics')
      .select('user_email')
      .eq('property_id', propertyId)
      .not('user_email', 'is', null)

    const uniqueEmails = uniqueViewers ? [...new Set(uniqueViewers.map(v => v.user_email))] : []

    // Get property
    const { data: property, error: propError } = await supabase
      .from('wholesale_deals')
      .select('id, temp_seller_id, property_address, city, state, zip')
      .eq('id', propertyId)
      .single()

    let tempSeller = null
    if (property?.temp_seller_id) {
      const { data, error } = await supabase
        .from('temp_seller_logins')
        .select('*')
        .eq('id', property.temp_seller_id)
        .single()
      tempSeller = data
    }

    const notificationAlreadySent = tempSeller?.magic_link_token &&
                                   tempSeller?.magic_link_expires_at &&
                                   new Date(tempSeller.magic_link_expires_at) > new Date()

    return NextResponse.json({
      propertyId,
      uniqueViewers: uniqueEmails.length,
      viewerEmails: uniqueEmails,
      property: property ? {
        address: property.property_address,
        hasTempSeller: !!property.temp_seller_id,
        tempSellerId: property.temp_seller_id
      } : null,
      tempSeller: tempSeller ? {
        name: tempSeller.seller_name,
        smsNumber: tempSeller.sms_from_number,
        hasMagicLink: !!tempSeller.magic_link_token,
        magicLinkExpires: tempSeller.magic_link_expires_at,
        linkExpired: tempSeller.magic_link_expires_at ? new Date(tempSeller.magic_link_expires_at) < new Date() : null
      } : null,
      willSendSMS: uniqueEmails.length === 2 && !notificationAlreadySent && !!tempSeller?.sms_from_number,
      reason: uniqueEmails.length !== 2 ? 'Not exactly 2 viewers' :
              notificationAlreadySent ? 'Magic link already sent and not expired' :
              !tempSeller?.sms_from_number ? 'No SMS number configured' : 'Should send SMS'
    })
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
