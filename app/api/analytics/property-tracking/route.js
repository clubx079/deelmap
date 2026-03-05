// app/api/analytics/property-tracking/route.js
// Deal detail tracking – one row per visit (session_id is unique per page load).
// (1) Page view: each start_view = one deal detail page open; count of rows = how many times user opened that deal.
// (2) Images viewed: update_behavior.imagesViewed → images_viewed (how many photos they saw this visit).
// (3) Time spent: update_active_time + end_view → active_time_seconds / duration_seconds per visit; total time = SUM across rows for that property (and optionally user).
// (4) Device type stored per view (mobile/desktop/tablet).
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

// Generate a short, URL-safe token (8 characters)
function generateShortToken() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return token
}

function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    return /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  return 'desktop'
}

function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return request.headers.get('x-vercel-forwarded-for') || 'unknown'
}

async function isSystemUser(email) {
  if (!email) return false
  
  const { data } = await supabase
    .from('system_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single()
  
  return !!data
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      propertyId,
      propertyAddress,
      propertyPrice,
      userId,
      userEmail,
      sessionId,
      action = 'start_view',
      behaviorData = {},
      utmSource = null,
      utmCode = null,
      isSpecialLink = false
    } = body

    if (!propertyId || !sessionId) {
      return NextResponse.json(
        { error: 'Property ID and session ID are required' },
        { status: 400 }
      )
    }

    // Check if user is a system user
    if (userEmail) {
      const isSystem = await isSystemUser(userEmail)
      if (isSystem) {
        return NextResponse.json({ 
          success: true, 
          message: 'System user - tracking skipped',
          systemUser: true 
        })
      }
    }

    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || ''
    const clientIP = getClientIP(request)
    const deviceTypeFromUA = getDeviceType(userAgent)
    const deviceType = (behaviorData?.deviceType && ['mobile', 'tablet', 'desktop'].includes(behaviorData.deviceType))
      ? behaviorData.deviceType
      : deviceTypeFromUA

    if (action === 'start_view') {
      // Get user info if userId provided
      let userEmailData = userEmail, userFirstName = null, userLastName = null, userPhone = null
      
      if (userId) {
        const { data: userData } = await supabase
          .from('users')
          .select('email, first_name, last_name, phone')
          .eq('id', userId)
          .single()

        if (userData) {
          userEmailData = userData.email
          userFirstName = userData.first_name
          userLastName = userData.last_name
          userPhone = userData.phone

          // Double check if user is system user
          const isSystem = await isSystemUser(userEmailData)
          if (isSystem) {
            return NextResponse.json({ 
              success: true, 
              message: 'System user - tracking skipped',
              systemUser: true 
            })
          }
        }
      }

      // Track UTM click if utm_source is provided
      if (utmSource) {
        const { error: utmError } = await supabase.rpc('increment_utm_clicks', {
          p_property_id: propertyId,
          p_utm_code: utmSource
        })

        if (utmError) {
          console.error('Error tracking UTM click:', utmError)
        }
      }

      // Use the enhanced upsert function to atomically handle view tracking with special link support
      const { data, error } = await supabase.rpc('upsert_property_view_with_special_access', {
        p_property_id: propertyId,
        p_session_id: sessionId,
        p_user_id: userId,
        p_user_email: userEmailData,
        p_user_first_name: userFirstName,
        p_user_last_name: userLastName,
        p_user_phone: userPhone,
        p_property_address: propertyAddress,
        p_property_price: propertyPrice,
        p_referrer: referrer,
        p_user_agent: userAgent,
        p_ip_address: clientIP,
        p_device_type: deviceType,
        p_viewport_width: behaviorData.viewportWidth,
        p_viewport_height: behaviorData.viewportHeight,
        p_utm_source: utmSource,
        p_utm_code: utmCode,
        p_is_special_link: isSpecialLink
      })

      // Fallback to old function if new one doesn't exist yet
      if (error && error.message?.includes('upsert_property_view_with_special_access')) {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('upsert_property_view', {
          p_property_id: propertyId,
          p_session_id: sessionId,
          p_user_id: userId,
          p_user_email: userEmailData,
          p_user_first_name: userFirstName,
          p_user_last_name: userLastName,
          p_user_phone: userPhone,
          p_property_address: propertyAddress,
          p_property_price: propertyPrice,
          p_referrer: referrer,
          p_user_agent: userAgent,
          p_ip_address: clientIP,
          p_device_type: deviceType,
          p_viewport_width: behaviorData.viewportWidth,
          p_viewport_height: behaviorData.viewportHeight,
          p_utm_source: utmSource
        })

        if (fallbackError) {
          console.error('Error in upsert_property_view:', fallbackError)
          return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
        }

        // Use fallback result if needed
        const result = fallbackData?.[0]
        return NextResponse.json({
          success: true,
          sessionId: result?.record_id,
          isUniqueView: result?.is_new_view,
          isReturningView: !result?.is_new_view,
          pageViews: result?.current_page_views,
          message: result?.is_new_view ? 'Tracking session started' : 'Returning view tracked'
        })
      }

      if (error) {
        console.error('Error in upsert_property_view_with_special_access:', error)
        return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
      }

      // The function returns void, so we just return success
      // The tracking was successful if we got here

      // AUTO-TRIGGER: Check analytics notification settings and send SMS if threshold reached
      try {
        // Get analytics settings from database
        const { data: settingsData, error: settingsError } = await supabase.rpc('get_analytics_settings')

        if (settingsError) {
          console.error('Error fetching analytics settings:', settingsError)
        }

        // Default to disabled if settings not found
        const settings = settingsData?.[0] || {
          enabled: false,
          threshold: 2,
          message_template: 'Hey {seller_name}! Your property at {address} got {no_of_views} new views. Engage with them right now: {magic_link}',
          from_phone: '(332) 333-3839',
          progressive_milestones: null,
          cooldown_enabled: false,
          cooldown_hours: 24,
          quiet_hours_enabled: false,
          quiet_hours_start: 22,
          quiet_hours_end: 8,
          quiet_hours_timezone: 'America/New_York',
          queue_outside_hours: false
        }

        // Only proceed if notifications are enabled
        if (!settings.enabled) {
          console.log('Analytics notifications are disabled - skipping notification check')
        } else {
          // Count unique viewers for this property
          const { data: uniqueViewers, error: viewerError } = await supabase
            .from('property_analytics')
            .select('user_email')
            .eq('property_id', propertyId)
            .not('user_email', 'is', null)

          if (!viewerError && uniqueViewers) {
            // Get unique user emails
            const uniqueEmails = [...new Set(uniqueViewers.map(v => v.user_email))]
            const viewCount = uniqueEmails.length

            console.log(`🔍 Property ${propertyId} has ${viewCount} unique viewers`)

            // FEATURE 1: Progressive Milestones Support
            // Build array of thresholds to check (progressive milestones or single threshold)
            let thresholdsToCheck = []

            if (settings.progressive_milestones && Array.isArray(settings.progressive_milestones)) {
              // Use progressive milestones
              thresholdsToCheck = settings.progressive_milestones
                .filter(milestone => milestone.enabled === true)
                .map(milestone => ({
                  threshold: milestone.threshold,
                  message: milestone.message || settings.message_template
                }))
              console.log(`🔍 Using progressive milestones:`, thresholdsToCheck.map(t => t.threshold))
            } else {
              // Fallback to single threshold
              thresholdsToCheck = [{
                threshold: settings.threshold,
                message: settings.message_template
              }]
              console.log(`🔍 Using single threshold: ${settings.threshold}`)
            }

            // Loop through each threshold to check
            for (const milestoneConfig of thresholdsToCheck) {
              const currentThreshold = milestoneConfig.threshold
              const messageTemplate = milestoneConfig.message

              // Check if current view count matches this threshold
              if (viewCount === currentThreshold) {
                console.log(`🔍 Property ${propertyId} reached threshold of ${currentThreshold} unique viewers - checking notification status`)

                // Get property and temp seller info
                const { data: property, error: propError } = await supabase
                  .from('wholesale_deals')
                  .select(`
                    id,
                    temp_seller_id,
                    address,
                    city,
                    state,
                    zip_code
                  `)
                  .eq('id', propertyId)
                  .single()

                console.log('🔍 Property fetch result:', { found: !!property, hasTemp: !!property?.temp_seller_id, error: propError?.message })

                if (!propError && property && property.temp_seller_id) {
                  // Get temp seller info
                  const { data: tempSeller, error: sellerError } = await supabase
                    .from('temp_seller_logins')
                    .select('*')
                    .eq('id', property.temp_seller_id)
                    .single()

                  console.log('🔍 Temp seller fetch result:', {
                    found: !!tempSeller,
                    hasSMS: !!tempSeller?.seller_phone,
                    smsNumber: tempSeller?.seller_phone,
                    error: sellerError?.message
                  })

                  if (!sellerError && tempSeller && tempSeller.seller_phone) {
                    // FEATURE 2: Cooldown Check
                    // Check if cooldown is enabled and if any notification was sent recently to this seller
                    let cooldownActive = false

                    if (settings.cooldown_enabled) {
                      const cooldownHours = settings.cooldown_hours || 24
                      const cooldownDate = new Date()
                      cooldownDate.setHours(cooldownDate.getHours() - cooldownHours)

                      console.log(`🔍 Checking cooldown: ${cooldownHours} hours since ${cooldownDate.toISOString()}`)

                      const { data: recentNotifications, error: cooldownCheckError } = await supabase
                        .from('analytics_notifications_sent')
                        .select('id, created_at, notification_threshold')
                        .eq('temp_seller_id', tempSeller.id)
                        .gte('created_at', cooldownDate.toISOString())
                        .order('created_at', { ascending: false })

                      if (!cooldownCheckError && recentNotifications && recentNotifications.length > 0) {
                        cooldownActive = true
                        console.log(`⏱️ Cooldown active - ${recentNotifications.length} notification(s) sent to seller ${tempSeller.id} within last ${cooldownHours} hours`)
                        console.log(`Most recent notification at: ${recentNotifications[0].created_at}`)
                      } else {
                        console.log(`✅ No cooldown - no recent notifications found`)
                      }
                    }

                    // Skip if cooldown is active
                    if (cooldownActive) {
                      console.log(`Skipping notification due to active cooldown period`)
                      continue // Move to next threshold
                    }

                    // Check if notification already sent for this specific threshold
                    const { data: existingNotifications, error: notifCheckError } = await supabase
                      .from('analytics_notifications_sent')
                      .select('id')
                      .eq('property_id', propertyId)
                      .eq('temp_seller_id', tempSeller.id)
                      .eq('notification_threshold', currentThreshold)

                    const notificationAlreadySent = !notifCheckError && existingNotifications && existingNotifications.length > 0

                    console.log('🔍 Notification status:', {
                      alreadySent: notificationAlreadySent,
                      existingCount: existingNotifications?.length || 0,
                      threshold: currentThreshold
                    })

                    if (!notificationAlreadySent) {
                      // Build address string
                      const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`

                      console.log('🔗 Generating magic link...')

                      // Generate unique short token
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
                        console.error('❌ Failed to generate unique token after 5 attempts')
                        continue // Skip this notification
                      }

                      // Set expiration to 30 days from now
                      const expiresAt = new Date()
                      expiresAt.setDate(expiresAt.getDate() + 30)

                      // Insert token into database
                      const { error: insertTokenError } = await supabase
                        .from('magic_link_tokens')
                        .insert([{
                          token,
                          temp_seller_id: tempSeller.id,
                          property_id: propertyId,
                          phone_number: tempSeller.seller_phone,
                          property_address: fullAddress,
                          views_count: viewCount,
                          expires_at: expiresAt.toISOString(),
                          used: false
                        }])

                      if (insertTokenError) {
                        console.error('❌ Error inserting magic link token:', insertTokenError)
                        continue // Skip this notification
                      }

                      // Build magic link URL
                      const baseUrl = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'http://localhost:3004'
                      const magicLink = `${baseUrl}/register?token=${token}`

                      console.log('✅ Magic link generated:', magicLink)

                      // Replace placeholders in message template
                      const smsMessage = messageTemplate
                        .replace('{seller_name}', tempSeller.seller_name || 'there')
                        .replace('{no_of_views}', viewCount.toString())
                        .replace('{address}', fullAddress)
                        .replace('{magic_link}', magicLink)

                      // CRITICAL: Insert notification record FIRST to prevent duplicates (acts as a lock)
                      const { data: insertedNotification, error: trackError } = await supabase
                        .from('analytics_notifications_sent')
                        .insert({
                          property_id: propertyId,
                          temp_seller_id: tempSeller.id,
                          views_count: viewCount,
                          notification_threshold: currentThreshold,
                          message_sent: smsMessage,
                          sms_to: tempSeller.seller_phone,
                          sms_from: settings.from_phone,
                          magic_link_token: token,
                          sms_status: 'pending',
                          sms_error: null
                        })
                        .select()

                      if (trackError) {
                        console.error('⚠️ Notification record already exists or error inserting:', trackError.message)
                        console.log('Skipping SMS send to prevent duplicate')
                      } else {
                        console.log('✅ Notification record created, proceeding to send SMS')

                        // Update temp seller with magic link
                        await supabase
                          .from('temp_seller_logins')
                          .update({
                            magic_link_token: token,
                            magic_link_expires_at: expiresAt.toISOString(),
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', tempSeller.id)

                        console.log(`📱 About to send SMS to ${tempSeller.seller_phone}...`)

                        // FEATURE 3: Quiet Hours Check
                        let shouldQueueNotification = false
                        let quietHoursActive = false

                        if (settings.quiet_hours_enabled) {
                          // Get current time in the configured timezone
                          const timezone = settings.quiet_hours_timezone || 'America/New_York'
                          const quietStart = settings.quiet_hours_start || 22
                          const quietEnd = settings.quiet_hours_end || 8

                          // Get current hour in the specified timezone
                          const currentTime = new Date()
                          const currentHour = parseInt(currentTime.toLocaleString('en-US', {
                            timeZone: timezone,
                            hour: 'numeric',
                            hour12: false
                          }))

                          console.log(`🔍 Quiet hours check: current hour in ${timezone} is ${currentHour}, quiet period is ${quietStart}-${quietEnd}`)

                          // Check if current hour is within quiet hours
                          // Handle wrapping around midnight (e.g., 22:00 to 08:00)
                          if (quietStart > quietEnd) {
                            // Wraps around midnight (e.g., 22 to 8 means 22-23 and 0-7)
                            quietHoursActive = currentHour >= quietStart || currentHour < quietEnd
                          } else {
                            // Does not wrap (e.g., 1 to 6)
                            quietHoursActive = currentHour >= quietStart && currentHour < quietEnd
                          }

                          if (quietHoursActive) {
                            console.log(`🔇 Quiet hours active - current hour ${currentHour} is within ${quietStart}-${quietEnd}`)

                            if (settings.queue_outside_hours) {
                              shouldQueueNotification = true
                              console.log(`📥 Queueing notification for later delivery`)
                            } else {
                              console.log(`❌ Skipping notification - queue_outside_hours is disabled`)
                            }
                          } else {
                            console.log(`✅ Outside quiet hours - proceeding with notification`)
                          }
                        }

                        // Handle notification based on quiet hours status
                        if (quietHoursActive && !settings.queue_outside_hours) {
                          // Skip notification entirely and mark as skipped
                          await supabase
                            .from('analytics_notifications_sent')
                            .update({
                              sms_status: 'skipped',
                              sms_error: 'Skipped due to quiet hours'
                            })
                            .eq('id', insertedNotification[0].id)

                          console.log(`🔇 Notification skipped due to quiet hours`)

                        } else if (shouldQueueNotification) {
                          // Queue notification for later
                          const timezone = settings.quiet_hours_timezone || 'America/New_York'
                          const quietEnd = settings.quiet_hours_end || 8

                          // Calculate next business hour (end of quiet hours)
                          const scheduledTime = new Date()
                          const currentHour = parseInt(scheduledTime.toLocaleString('en-US', {
                            timeZone: timezone,
                            hour: 'numeric',
                            hour12: false
                          }))

                          // Set scheduled time to the end of quiet hours
                          if (currentHour >= quietEnd) {
                            // Schedule for tomorrow at quietEnd
                            scheduledTime.setDate(scheduledTime.getDate() + 1)
                          }
                          scheduledTime.setHours(quietEnd, 0, 0, 0)

                          console.log(`📅 Scheduling notification for ${scheduledTime.toISOString()}`)

                          // Insert into queue
                          const { error: queueError } = await supabase
                            .from('analytics_notifications_queue')
                            .insert({
                              notification_id: insertedNotification[0].id,
                              property_id: propertyId,
                              temp_seller_id: tempSeller.id,
                              scheduled_for: scheduledTime.toISOString(),
                              sms_to: tempSeller.seller_phone,
                              sms_from: settings.from_phone,
                              message: smsMessage,
                              status: 'pending'
                            })

                          if (queueError) {
                            console.error('❌ Error queueing notification:', queueError)
                            await supabase
                              .from('analytics_notifications_sent')
                              .update({
                                sms_status: 'failed',
                                sms_error: `Queue error: ${queueError.message}`
                              })
                              .eq('id', insertedNotification[0].id)
                          } else {
                            // Update notification record as queued
                            await supabase
                              .from('analytics_notifications_sent')
                              .update({
                                sms_status: 'queued',
                                sms_error: null
                              })
                              .eq('id', insertedNotification[0].id)

                            console.log(`✅ Notification queued successfully`)
                          }

                        } else {
                          // Send SMS immediately (normal flow)
                          const smsResult = await sendSMS({
                            to: tempSeller.seller_phone,
                            message: smsMessage,
                            from: settings.from_phone
                          })

                          console.log('📱 SMS Result:', smsResult)

                          // Update notification record with SMS result
                          await supabase
                            .from('analytics_notifications_sent')
                            .update({
                              sms_status: smsResult.success ? 'sent' : 'failed',
                              sms_error: smsResult.success ? null : (smsResult.error || 'Unknown error')
                            })
                            .eq('id', insertedNotification[0].id)

                          if (smsResult.success) {
                            console.log(`✅ SMS sent to ${tempSeller.seller_phone} for property ${propertyId} at threshold ${currentThreshold}`)
                          } else {
                            console.error('❌ Failed to send SMS:', smsResult.error, smsResult.details)
                          }
                        }
                      }
                    } else {
                      console.log(`Notification already sent for property ${propertyId} at threshold ${currentThreshold}`)
                    }
                  }
                }
              }
            }
          }
        }
      } catch (notificationError) {
        // Don't fail the main request if notification fails
        console.error('Error in automatic notification trigger:', notificationError)
      }

      return NextResponse.json({
        success: true,
        message: 'View tracked successfully',
        sessionId: sessionId,
        isSpecialLinkAccess: isSpecialLink
      })
    }

    if (action === 'update_active_time') {
      // Update active time when user is actively viewing
      const { data: session } = await supabase
        .from('property_analytics')
        .select('active_time_seconds, last_active_time')
        .eq('property_id', propertyId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (session) {
        const lastActive = session.last_active_time ? new Date(session.last_active_time) : new Date()
        const now = new Date()
        const timeDiff = Math.round((now - lastActive) / 1000)
        
        // Only add time if it's reasonable (less than 10 seconds since last update)
        const additionalTime = timeDiff < 10 ? timeDiff : 0
        const newActiveTime = (session.active_time_seconds || 0) + additionalTime

        const { error } = await supabase
          .from('property_analytics')
          .update({
            active_time_seconds: newActiveTime,
            last_active_time: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('property_id', propertyId)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error updating active time:', error)
        }

        return NextResponse.json({ success: true, activeTime: newActiveTime })
      }
    }

    if (action === 'update_behavior') {
      const updateData = {
        updated_at: new Date().toISOString(),
        last_active_time: new Date().toISOString()
      }

      if (behaviorData.scrolledToBottom !== undefined) {
        updateData.scrolled_to_bottom = behaviorData.scrolledToBottom
      }
      if (behaviorData.viewedDescription !== undefined) {
        updateData.viewed_description = behaviorData.viewedDescription
      }
      if (behaviorData.viewedRepairs !== undefined) {
        updateData.viewed_repairs = behaviorData.viewedRepairs
      }
      if (behaviorData.viewedPhotos !== undefined) {
        updateData.viewed_photos = behaviorData.viewedPhotos
      }
      if (behaviorData.clickedInquiry !== undefined) {
        updateData.clicked_inquiry = behaviorData.clickedInquiry
      }
      if (behaviorData.clickedInspectionReport !== undefined) {
        updateData.clicked_inspection_report = behaviorData.clickedInspectionReport
      }
      if (behaviorData.clickedMorePhotos !== undefined) {
        updateData.clicked_more_photos = behaviorData.clickedMorePhotos
      }
      if (behaviorData.clickedShare !== undefined) {
        updateData.clicked_share = behaviorData.clickedShare
      }
      if (behaviorData.zoomedMap !== undefined) {
        updateData.zoomed_map = behaviorData.zoomedMap
      }
      if (behaviorData.imagesViewed !== undefined) {
        updateData.images_viewed = behaviorData.imagesViewed
      }
      if (behaviorData.fullViewAchieved !== undefined) {
        updateData.full_view_achieved = behaviorData.fullViewAchieved
      }

      const { error } = await supabase
        .from('property_analytics')
        .update(updateData)
        .eq('property_id', propertyId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error updating behavior:', error)
        return NextResponse.json({ error: 'Failed to update behavior' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Behavior updated' })
    }

    if (action === 'end_view') {
      const { data: session } = await supabase
        .from('property_analytics')
        .select('view_start_time, active_time_seconds')
        .eq('property_id', propertyId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (session) {
        const endTime = new Date()

        const { error } = await supabase
          .from('property_analytics')
          .update({
            view_end_time: endTime.toISOString(),
            duration_seconds: session.active_time_seconds || 0,
            updated_at: endTime.toISOString()
          })
          .eq('property_id', propertyId)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error ending session:', error)
          return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          durationSeconds: session.active_time_seconds || 0,
          message: 'Session ended'
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'summary'

    let query = supabase.from('property_analytics').select('*')

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (type === 'summary') {
      const { data: summaryData, error } = await supabase
        .from('property_engagement_stats')
        .select('*')
        .order('total_unique_views', { ascending: false })

      if (error) {
        console.error('Error fetching summary:', error)
        return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: summaryData })
    }

    if (type === 'user-patterns') {
      const { data: userData, error } = await supabase
        .from('user_engagement_patterns')
        .select('*')
        .order('total_unique_property_views', { ascending: false })

      if (error) {
        console.error('Error fetching user patterns:', error)
        return NextResponse.json({ error: 'Failed to fetch user patterns' }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: userData })
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error fetching analytics:', error)
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Analytics GET API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}