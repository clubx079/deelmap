// app/api/notifications/check-viewers/route.js
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { requireInternalSecret } from '@/lib/internalAuth'

// This endpoint checks for properties with 2+ unique viewers and notifies temp sellers
export async function POST(request) {
  try {
    const denied = requireInternalSecret(request)
    if (denied) return denied

    // 1. Get all properties with 2+ unique viewers from property_analytics
    const { data: propertiesWithViewers, error: analyticsError } = await supabase
      .from('property_analytics')
      .select('property_id, property_address, user_email, user_first_name, user_last_name')
      .not('user_email', 'is', null) // Only count logged-in users

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError)
      return NextResponse.json({ error: analyticsError.message }, { status: 500 })
    }

    // Group by property_id and count unique viewers
    const propertyViewerMap = {}
    propertiesWithViewers.forEach(view => {
      if (!propertyViewerMap[view.property_id]) {
        propertyViewerMap[view.property_id] = {
          property_address: view.property_address,
          unique_viewers: new Set(),
          viewer_details: []
        }
      }
      propertyViewerMap[view.property_id].unique_viewers.add(view.user_email)
      propertyViewerMap[view.property_id].viewer_details.push({
        email: view.user_email,
        name: `${view.user_first_name || ''} ${view.user_last_name || ''}`.trim()
      })
    })

    // Filter properties with exactly 2 unique viewers (just reached threshold)
    const propertiesWithTwoViewers = Object.entries(propertyViewerMap)
      .filter(([_, data]) => data.unique_viewers.size === 2)
      .map(([property_id, data]) => ({
        property_id,
        property_address: data.property_address,
        unique_viewer_count: data.unique_viewers.size
      }))

    if (propertiesWithTwoViewers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No properties with exactly 2 viewers found',
        checked: propertiesWithViewers.length
      })
    }

    // 2. For each property, find the temp seller and send notification
    const notifications = []

    for (const property of propertiesWithTwoViewers) {
      // Get the property details and temp_seller_id
      const { data: propertyData, error: propertyError } = await supabase
        .from('wholesale_deals')
        .select('id, full_address, temp_seller_id')
        .eq('id', property.property_id)
        .single()

      if (propertyError || !propertyData || !propertyData.temp_seller_id) {
        console.log(`No temp seller found for property ${property.property_id}`)
        continue
      }

      // Get temp seller details
      const { data: seller, error: sellerError } = await supabase
        .from('temp_seller_logins')
        .select('id, seller_phone, sender_email, seller_name, sms_from_number, magic_link_token')
        .eq('id', propertyData.temp_seller_id)
        .single()

      if (sellerError || !seller || !seller.sms_from_number) {
        console.log(`No phone number found for temp seller ${propertyData.temp_seller_id}`)
        continue
      }

      // Generate or use existing magic link
      let magicToken = seller.magic_link_token

      if (!magicToken) {
        magicToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

        // Update temp_seller_logins with magic link
        await supabase
          .from('temp_seller_logins')
          .update({
            magic_link_token: magicToken,
            magic_link_expires_at: expiresAt.toISOString()
          })
          .eq('id', seller.id)
      }

      // Prepare notification data
      notifications.push({
        seller_id: seller.id,
        seller_name: seller.seller_name,
        seller_phone: seller.sms_from_number,
        property_address: propertyData.full_address || property.property_address,
        magic_token: magicToken,
        unique_viewers: property.unique_viewer_count
      })
    }

    // 3. Send SMS notifications via OpenPhone
    const smsResults = []

    for (const notification of notifications) {
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || ''}/temp-seller/onboard?token=${notification.magic_token}`

      const smsMessage = `Hey ${notification.seller_name || 'there'}! Your property at ${notification.property_address} got ${notification.unique_viewers} new views. Engage with them right now: ${magicLink}`

      const smsResult = await sendSMS({
        to: notification.seller_phone,
        message: smsMessage,
        from: '(332) 333-3839'
      })

      smsResults.push({
        seller: notification.seller_name,
        phone: notification.seller_phone,
        property: notification.property_address,
        sms_sent: smsResult.success,
        sms_response: smsResult
      })
    }

    return NextResponse.json({
      success: true,
      properties_checked: propertiesWithViewers.length,
      properties_with_two_viewers: propertiesWithTwoViewers.length,
      notifications_sent: notifications.length,
      sms_results: smsResults
    })

  } catch (error) {
    console.error('Viewer check error:', error)
    return NextResponse.json(
      { error: 'Failed to check viewers' },
      { status: 500 }
    )
  }
}
