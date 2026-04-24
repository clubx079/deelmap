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

  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
  )

  const { data } = await adminClient
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
        // Read from the admin portal's settings table (single source of truth)
        const { data: settingsRow, error: settingsError } = await supabase
          .from('settings')
          .select(`
            analytics_notification_enabled,
            analytics_notification_threshold,
            analytics_message_template,
            analytics_notification_from_phone,
            analytics_cooldown_enabled,
            analytics_cooldown_hours,
            analytics_quiet_hours_enabled,
            analytics_quiet_hours_start,
            analytics_quiet_hours_end,
            analytics_quiet_hours_timezone,
            analytics_queue_outside_hours,
            analytics_progressive_milestones
          `)
          .limit(1)
          .maybeSingle()

        if (settingsError) {
          console.error('[NOTIF] Error fetching settings row:', settingsError.message)
        }

        // Normalize column names to match the rest of the code
        const settings = settingsRow ? {
          enabled:               settingsRow.analytics_notification_enabled ?? false,
          threshold:             settingsRow.analytics_notification_threshold ?? 2,
          message_template:      settingsRow.analytics_message_template || 'Hey {seller_name}! Your property at {address} got {no_of_views} new views. Engage with them right now: {magic_link}',
          from_phone:            settingsRow.analytics_notification_from_phone || '+13323333839',
          progressive_milestones: settingsRow.analytics_progressive_milestones || null,
          cooldown_enabled:      settingsRow.analytics_cooldown_enabled ?? false,
          cooldown_hours:        settingsRow.analytics_cooldown_hours ?? 24,
          quiet_hours_enabled:   settingsRow.analytics_quiet_hours_enabled ?? false,
          quiet_hours_start:     settingsRow.analytics_quiet_hours_start ?? 22,
          quiet_hours_end:       settingsRow.analytics_quiet_hours_end ?? 8,
          quiet_hours_timezone:  settingsRow.analytics_quiet_hours_timezone || 'America/New_York',
          queue_outside_hours:   settingsRow.analytics_queue_outside_hours ?? false,
        } : {
          enabled: false,
          threshold: 2,
          message_template: 'Hey {seller_name}! Your property at {address} got {no_of_views} new views. Engage with them right now: {magic_link}',
          from_phone: '+13323333839',
          progressive_milestones: null,
          cooldown_enabled: false,
          cooldown_hours: 24,
          quiet_hours_enabled: false,
          quiet_hours_start: 22,
          quiet_hours_end: 8,
          quiet_hours_timezone: 'America/New_York',
          queue_outside_hours: false
        }

        console.log('[NOTIF] Settings loaded:', {
          source: settingsRow ? 'settings table' : 'defaults (no settings row found)',
          enabled: settings.enabled,
          threshold: settings.threshold,
          from_phone: settings.from_phone,
          has_progressive_milestones: !!settings.progressive_milestones,
        })

        // Only proceed if notifications are enabled
        if (!settings.enabled) {
          console.log('[NOTIF] Notifications disabled in admin portal — skipping')
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

            console.log(`[NOTIF] Property ${propertyId} — ${viewCount} unique viewers (emails: ${uniqueEmails.join(', ')})`)

            // Build array of thresholds to check
            let thresholdsToCheck = []

            if (settings.progressive_milestones && Array.isArray(settings.progressive_milestones)) {
              thresholdsToCheck = settings.progressive_milestones
                .filter(milestone => milestone.enabled === true)
                .map(milestone => ({
                  threshold: milestone.threshold,
                  message: milestone.message || settings.message_template
                }))
              console.log(`[NOTIF] Progressive milestones:`, thresholdsToCheck.map(t => t.threshold))
            } else {
              thresholdsToCheck = [{
                threshold: settings.threshold,
                message: settings.message_template
              }]
              console.log(`[NOTIF] Single threshold: ${settings.threshold}`)
            }

            // Loop through each threshold to check
            for (const milestoneConfig of thresholdsToCheck) {
              const currentThreshold = milestoneConfig.threshold
              const messageTemplate = milestoneConfig.message

              // Use >= so we don't miss the threshold if the view count is already past it
              if (viewCount >= currentThreshold) {
                console.log(`[NOTIF] viewCount(${viewCount}) >= threshold(${currentThreshold}) — checking if notification already sent`)

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

                console.log('[NOTIF] wholesale_deals fetch:', { found: !!property, temp_seller_id: property?.temp_seller_id || null, error: propError?.message || null })

                if (propError || !property) {
                  console.error('[NOTIF] SKIP — could not fetch property from wholesale_deals:', propError?.message)
                } else if (!property.temp_seller_id) {
                  console.warn('[NOTIF] SKIP — property has no temp_seller_id (not a scraped deal or not linked)')
                } else if (property.temp_seller_id) {
                  // Get temp seller info
                  const { data: tempSeller, error: sellerError } = await supabase
                    .from('temp_seller_logins')
                    .select('*')
                    .eq('id', property.temp_seller_id)
                    .single()

                  console.log('[NOTIF] temp_seller_logins fetch:', {
                    found: !!tempSeller,
                    seller_name: tempSeller?.seller_name || null,
                    has_phone: !!tempSeller?.seller_phone,
                    phone: tempSeller?.seller_phone || null,
                    error: sellerError?.message || null,
                  })

                  if (sellerError || !tempSeller) {
                    console.error('[NOTIF] SKIP — temp seller not found:', sellerError?.message)
                  } else if (!tempSeller.seller_phone) {
                    console.warn('[NOTIF] SKIP — temp seller has no phone number, cannot send SMS')
                  } else if (tempSeller.seller_phone) {
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

                    console.log('[NOTIF] Duplicate check:', {
                      already_sent: notificationAlreadySent,
                      existing_records: existingNotifications?.length || 0,
                      threshold: currentThreshold,
                      existing_ids: existingNotifications?.map(n => n.id) || [],
                      check_error: notifCheckError?.message || null,
                    })

                    if (notificationAlreadySent) {
                      console.log(`[NOTIF] SKIP — notification already sent for property ${propertyId} at threshold ${currentThreshold}`)
                    }

                    if (!notificationAlreadySent) {
                      const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip_code}`

                      console.log('[NOTIF] Generating magic link for:', { fullAddress, seller: tempSeller.seller_name, phone: tempSeller.seller_phone })

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
                        console.error('[NOTIF] SKIP — failed to insert magic_link_tokens:', insertTokenError.message)
                        continue
                      }

                      const baseUrl = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || 'http://localhost:3004'
                      const magicLink = `${baseUrl}/register?token=${token}`

                      console.log('[NOTIF] Magic link generated:', { token, magicLink, expires: expiresAt.toISOString() })

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
                        console.error('[NOTIF] SKIP — failed to insert analytics_notifications_sent (race condition or duplicate):', trackError.message)
                      } else {
                        console.log('[NOTIF] Notification record created (id:', insertedNotification[0]?.id, ') — proceeding to send SMS')

                        // Update temp seller with magic link
                        await supabase
                          .from('temp_seller_logins')
                          .update({
                            magic_link_token: token,
                            magic_link_expires_at: expiresAt.toISOString(),
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', tempSeller.id)

                        console.log(`[NOTIF] Sending SMS to ${tempSeller.seller_phone} from ${settings.from_phone}`)
                        console.log(`[NOTIF] SMS message: "${smsMessage}"`)
                        console.log(`[NOTIF] NEXT_PUBLIC_SELLER_PORTAL_URL=${process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || '(not set — will use localhost:3004)'}`)
                        console.log(`[NOTIF] AIROSOFTS_SMS_API_KEY set: ${!!process.env.AIROSOFTS_SMS_API_KEY}`)

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

                          console.log('[NOTIF] SMS API result:', JSON.stringify(smsResult))

                          await supabase
                            .from('analytics_notifications_sent')
                            .update({
                              sms_status: smsResult.success ? 'sent' : 'failed',
                              sms_error: smsResult.success ? null : (smsResult.error || 'Unknown error')
                            })
                            .eq('id', insertedNotification[0].id)

                          if (smsResult.success) {
                            console.log(`[NOTIF] ✅ SMS sent successfully to ${tempSeller.seller_phone} — property ${propertyId} threshold ${currentThreshold}`)
                          } else {
                            console.error(`[NOTIF] ❌ SMS FAILED to ${tempSeller.seller_phone}:`, smsResult.error, smsResult.details)
                          }
                        }
                      }
                  }
                }
              }
            }
          }
        }
        }
      } catch (notificationError) {
        console.error('[NOTIF] Unhandled error in notification trigger:', notificationError.message, notificationError.stack)
      }

      return NextResponse.json({
        success: true,
        message: 'View tracked successfully',
        sessionId: sessionId,
        isSpecialLinkAccess: isSpecialLink
      })
    }

    if (action === 'update_active_time') {
      // Atomic server-side active time increment via RPC (no race conditions)
      const { error } = await supabase.rpc('update_property_active_time', {
        p_property_id:    propertyId,
        p_session_id:     sessionId,
        p_is_tab_visible: true
      })

      if (error) console.error('Error updating active time:', error)
      return NextResponse.json({ success: true })
    }

    if (action === 'update_behavior') {
      // Single atomic RPC — no partial updates, no .order().limit() workaround
      const { error } = await supabase.rpc('update_property_behavior', {
        p_property_id:              propertyId,
        p_session_id:               sessionId,
        p_scrolled_to_bottom:       behaviorData.scrolledToBottom      ?? null,
        p_viewed_description:       behaviorData.viewedDescription      ?? null,
        p_viewed_repairs:           behaviorData.viewedRepairs          ?? null,
        p_viewed_photos:            behaviorData.viewedPhotos           ?? null,
        p_clicked_inquiry:          behaviorData.clickedInquiry         ?? null,
        p_clicked_inspection_report: behaviorData.clickedInspectionReport ?? null,
        p_clicked_more_photos:      behaviorData.clickedMorePhotos      ?? null,
        p_clicked_share:            behaviorData.clickedShare           ?? null,
        p_zoomed_map:               behaviorData.zoomedMap              ?? null,
        p_images_viewed:            behaviorData.imagesViewed           ?? null,
        p_full_view_achieved:       behaviorData.fullViewAchieved       ?? null
      })

      if (error) {
        console.error('Error updating behavior:', error)
        return NextResponse.json({ error: 'Failed to update behavior' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Behavior updated' })
    }

    if (action === 'end_view') {
      const { error } = await supabase.rpc('end_property_view', {
        p_property_id: propertyId,
        p_session_id:  sessionId
      })

      if (error) {
        console.error('Error ending session:', error)
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Session ended' })
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