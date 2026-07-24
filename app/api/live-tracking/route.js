// app/api/live-tracking/route.js
// API endpoint for tracking live user sessions
//
// DEVIATION FROM TASK-7 BRIEF (flagged, not silently applied): the brief classifies this
// route as "server-to-server/cron" and asks for a requireInternalSecret(CRON_SECRET) guard
// like notifications/send-sms and notifications/check-viewers. That classification does not
// match the code: hooks/useLiveTracking.js calls this route directly from every visitor's
// browser (session_start/heartbeat/page_change/etc, no auth header, no secret) as a
// site-wide analytics beacon. A real internal-secret guard would 403 every legitimate call
// and break live analytics for all users, and embedding CRON_SECRET in client JS to work
// around that would leak the shared secret used by other internal routes. Left unguarded
// pending a real fix (e.g. rate limiting / bot filtering, or a public, non-secret anti-abuse
// token distinct from CRON_SECRET) — see task-7-report.md for detail.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Marketplace DB: wholesale_deals, live_sessions, system_users, etc. (see ENV_CLEAN.md)
const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return request.headers.get('x-vercel-forwarded-for') || null
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Get property info from slug (short code or legacy UUID)
async function getPropertyFromSlug(slug) {
  if (!slug) return null

  let data = null
  const { data: bySlug } = await supabase
    .from('wholesale_deals')
    .select('id, slug, full_address, display_address, address, city, state')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug) data = bySlug

  if (!data && UUID_REGEX.test(slug)) {
    const { data: byId } = await supabase
      .from('wholesale_deals')
      .select('id, slug, full_address, display_address, address, city, state')
      .eq('id', slug)
      .maybeSingle()
    if (byId) data = byId
  }

  if (!data) return null

  const fullAddress = data.full_address || data.display_address ||
    `${data.address || ''}, ${data.city || ''}, ${data.state || ''}`.trim()

  return {
    id: data.id,
    slug: data.slug || null,
    address: fullAddress
  }
}

const LIVE_TRACKING_DEBUG = process.env.LIVE_TRACKING_DEBUG === 'true'

export async function POST(request) {
  try {
    // Clone the request to read the body for debugging
    const requestClone = request.clone()
    
    // Safely parse JSON body with error handling
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      // Log the raw request details for debugging
      console.error('❌ Live tracking: Invalid JSON body')
      console.error('Error:', jsonError.message)
      
      try {
        const rawText = await requestClone.text()
        console.error('Raw request body:', rawText || '(empty)')
        console.error('Body length:', rawText.length, 'bytes')
        console.error('Content-Type:', requestClone.headers.get('content-type'))
        console.error('Method:', requestClone.method)
        console.error('URL:', requestClone.url)
      } catch (debugError) {
        console.error('Could not read raw body for debugging:', debugError.message)
      }
      
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    
    // Validate required fields
    if (!body || !body.action || !body.sessionId) {
      console.error('Live tracking: Missing required fields (action, sessionId)')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (LIVE_TRACKING_DEBUG) {
      console.log('=== LIVE TRACKING ===', body.action, body.sessionId, body.userEmail || 'Guest', body.currentPage)
    }

    const {
      action,
      sessionId,
      userId,
      userEmail,
      userFirstName,
      userLastName,
      currentPage,
      pageTitle,
      propertySlug,
      referrer,
      deviceType,
      browser,
      os,
      utm_source,
      utm_medium,
      utm_campaign,
      visitedPage,
      timeSpentSeconds,
      scrollDepthPercent
    } = body

    // Skip tracking for system users
    const isSystem = userEmail ? await isSystemUser(userEmail) : false
    if (isSystem) {
      if (LIVE_TRACKING_DEBUG) console.log('>>> Live tracking skipped (system user)')
      return NextResponse.json({ success: true, systemUser: true })
    }

    const ipAddress = getClientIP(request)
    const now = new Date().toISOString()

    // Get property info if on a property page
    let propertyId = null
    let propertyAddress = null
    if (propertySlug) {
      const property = await getPropertyFromSlug(propertySlug)
      if (property) {
        propertyId = property.id
        propertyAddress = property.address
      }
    }

    switch (action) {
      case 'session_start':
      case 'page_change':
      case 'heartbeat':
      case 'tab_visible':
      case 'user_update': {
        if (LIVE_TRACKING_DEBUG) console.log('>>> Upserting live_sessions:', action)
        // Upsert live session
        const { error: sessionError } = await supabase
          .from('live_sessions')
          .upsert({
            session_id: sessionId,
            user_id: userId || null,
            user_email: userEmail || null,
            user_first_name: userFirstName || null,
            user_last_name: userLastName || null,
            is_guest: !userId,
            current_page: currentPage,
            current_page_title: pageTitle,
            property_id: propertyId,
            property_address: propertyAddress,
            last_heartbeat: now,
            is_active: true,
            device_type: deviceType,
            browser: browser,
            os: os,
            ip_address: ipAddress,
            referrer: referrer,
            utm_source: utm_source,
            utm_medium: utm_medium,
            utm_campaign: utm_campaign,
            ...(action === 'session_start' ? { started_at: now } : {})
          }, {
            onConflict: 'session_id'
          })

        if (sessionError) {
          console.error('[live-tracking] DB error:', sessionError.message)
          return NextResponse.json({ error: sessionError.message, details: sessionError }, { status: 500 })
        }
        if (LIVE_TRACKING_DEBUG) console.log('✅ Live session saved:', sessionId)

        // Update or create visitor summary for today
        const today = new Date().toISOString().split('T')[0]

        // First try to get existing record
        const { data: existingSummary } = await supabase
          .from('visitor_summary')
          .select('*')
          .eq('session_id', sessionId)
          .eq('visit_date', today)
          .single()

        if (existingSummary) {
          // Update existing
          const pagesVisited = existingSummary.pages_visited || []
          const propertiesViewed = existingSummary.properties_viewed || []

          if (!pagesVisited.includes(currentPage)) {
            pagesVisited.push(currentPage)
          }
          if (propertyId && !propertiesViewed.includes(propertyId)) {
            propertiesViewed.push(propertyId)
          }

          await supabase
            .from('visitor_summary')
            .update({
              last_visit_at: now,
              total_page_views: existingSummary.total_page_views + (action === 'page_change' ? 1 : 0),
              pages_visited: pagesVisited,
              properties_viewed: propertiesViewed,
              user_id: userId || existingSummary.user_id,
              user_email: userEmail || existingSummary.user_email,
              user_first_name: userFirstName || existingSummary.user_first_name,
              user_last_name: userLastName || existingSummary.user_last_name,
              is_guest: !userId && !existingSummary.user_id
            })
            .eq('id', existingSummary.id)
        } else {
          // Check if this is a returning visitor
          const { data: previousVisits } = await supabase
            .from('visitor_summary')
            .select('id')
            .eq('session_id', sessionId)
            .limit(1)

          // Create new
          await supabase
            .from('visitor_summary')
            .insert({
              session_id: sessionId,
              user_id: userId || null,
              user_email: userEmail || null,
              user_first_name: userFirstName || null,
              user_last_name: userLastName || null,
              is_guest: !userId,
              visit_date: today,
              first_visit_at: now,
              last_visit_at: now,
              total_page_views: 1,
              pages_visited: [currentPage],
              properties_viewed: propertyId ? [propertyId] : [],
              device_type: deviceType,
              browser: browser,
              os: os,
              referrer: referrer,
              utm_source: utm_source,
              is_returning_visitor: !!previousVisits && previousVisits.length > 0
            })
        }

        break
      }

      case 'tab_hidden': {
        // Mark session as temporarily inactive
        await supabase
          .from('live_sessions')
          .update({
            is_active: false,
            last_heartbeat: now
          })
          .eq('session_id', sessionId)
        break
      }

      case 'session_end': {
        // Mark session as ended
        await supabase
          .from('live_sessions')
          .update({
            is_active: false,
            last_heartbeat: now
          })
          .eq('session_id', sessionId)
        break
      }

      case 'page_visit': {
        // Record page visit history
        const { error: visitError } = await supabase
          .from('page_visits')
          .insert({
            session_id: sessionId,
            user_id: userId || null,
            user_email: userEmail || null,
            page_url: visitedPage,
            page_title: pageTitle,
            property_id: propertyId,
            property_address: propertyAddress,
            time_spent_seconds: timeSpentSeconds,
            scroll_depth_percent: scrollDepthPercent,
            device_type: deviceType,
            referrer: referrer,
            left_at: now
          })

        if (visitError) {
          console.error('Error recording page visit:', visitError)
        }

        // Update total time in visitor summary
        const today = new Date().toISOString().split('T')[0]
        await supabase.rpc('increment_visitor_time', {
          p_session_id: sessionId,
          p_visit_date: today,
          p_seconds: timeSpentSeconds || 0
        })

        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Live tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
