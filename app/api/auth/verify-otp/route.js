// /app/api/auth/verify-otp/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { withTimeout, fireAndForget } from '@/lib/timeout'

// Shared OTP storage - must match send-otp route
let otpStore = new Map()
if (typeof global !== 'undefined') {
  if (!global.otpStore) global.otpStore = new Map()
  otpStore = global.otpStore
}

// Cleanup expired OTPs periodically to prevent memory leaks
function cleanupExpiredOTPs() {
  const now = Date.now()
  let cleanedCount = 0

  for (const [email, data] of otpStore.entries()) {
    if (data.expires < now) {
      otpStore.delete(email)
      cleanedCount++
    }
  }

  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired OTPs. Current store size: ${otpStore.size}`)
  }
}

// Run cleanup every 5 minutes
if (typeof global !== 'undefined' && !global.otpCleanupInterval) {
  global.otpCleanupInterval = setInterval(cleanupExpiredOTPs, 5 * 60 * 1000)
}

// Format phone number to American format
function formatPhoneNumber(phone) {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // If it's empty after removing non-digits, return as is
  if (!digitsOnly) return phone
  
  // If it's 10 digits (missing country code), add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`
  }
  
  // If it's 11 digits and starts with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`
  }
  
  // If it already has correct length with country code, add + if missing
  if (digitsOnly.length === 11) {
    return `+${digitsOnly}`
  }
  
  // For any other case, return the original (don't abort operation)
  return phone
}

// Insert user to Monday.com
async function insertToMonday(userData) {
  const MONDAY_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQzMTQ5MDY2OCwiYWFpIjoxMSwidWlkIjo2NzgyNDc3MywiaWFkIjoiMjAyNC0xMS0wM1QxMDo0OToyMi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTQ5NDQ5MTQsInJnbiI6InVzZTEifQ.M2y5qvKTBugSmKQLJnPFinl9o1h0H70yCAVnsM75p0M'
  const BOARD_ID = '6039063783'
  const GROUP_ID = 'group_mkwgts1s'

  try {
    const formattedPhone = formatPhoneNumber(userData.phone)

    // Create full name for item_name
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
    const itemName = fullName || userData.email // Fallback to email if no name provided

    // Build column values object
    const columnValues = {
      text_mkvmfa36: userData.firstName || '',
      text_mkvm3swk: userData.lastName || '',
      text2: formattedPhone,
      text0: userData.email
    }

    // Add states of interest if provided (dropdown_mky8cygf column)
    if (userData.statesOfInterest && userData.statesOfInterest.length > 0) {
      // Monday.com dropdown expects { ids: [index1, index2, ...] } format
      // For multiple select with text labels, use { labels: ["label1", "label2"] }
      columnValues.dropdown_mky8cygf = { labels: userData.statesOfInterest }
    }

    const mutation = `
      mutation {
        create_item (
          board_id: ${BOARD_ID},
          group_id: "${GROUP_ID}",
          item_name: "${itemName}",
          column_values: ${JSON.stringify(JSON.stringify(columnValues))}
        ) {
          id
        }
      }
    `

    console.log('Monday.com mutation:', mutation)

    const response = await withTimeout(
      fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_KEY
        },
        body: JSON.stringify({
          query: mutation
        })
      }),
      10000, // 10 second timeout for Monday.com API
      'Monday.com API request timed out'
    )

    const result = await response.json()

    if (result.errors) {
      console.error('Monday.com API errors:', result.errors)
      return { success: false, error: result.errors }
    }

    console.log('User inserted to Monday.com successfully:', result.data)
    return { success: true, data: result.data }

  } catch (error) {
    console.error('Error inserting to Monday.com:', error)
    return { success: false, error: error.message }
  }
}

function getClientIP(request) {
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) return vercelIP.split(',')[0].trim()
  return null
}

// Marketplace DB: users – service role for user creation
const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY

// Anon client for general queries
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client - bypasses RLS and schema cache more reliably
const supabaseService = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export async function POST(request) {
  try {
    const { email, otp, userData } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 })
    }

    console.log(`[VERIFY-OTP] Verifying OTP for ${email}: ${otp}`)
    console.log('[VERIFY-OTP] Received userData:', userData)

    // Extract client IP for registration tracking
    const clientIP = getClientIP(request)

    // Check if OTP exists and is valid
    const storedOtpData = otpStore.get(email)
    
    if (!storedOtpData) {
      console.log('[VERIFY-OTP] OTP not found for email:', email)
      return NextResponse.json({ message: 'OTP not found or expired' }, { status: 400 })
    }

    if (storedOtpData.expires < Date.now()) {
      console.log('[VERIFY-OTP] OTP expired for email:', email)
      otpStore.delete(email)
      return NextResponse.json({ message: 'OTP has expired' }, { status: 400 })
    }

    if (storedOtpData.otp !== otp.toString()) {
      console.log(`[VERIFY-OTP] OTP mismatch for ${email}. Expected: ${storedOtpData.otp}, Got: ${otp}`)
      return NextResponse.json({ message: 'Invalid OTP' }, { status: 400 })
    }

    // Check if userData is provided (for new user registration)
    if (!userData || !userData.password || (!userData.firstName && !userData.lastName)) {
      return NextResponse.json({ message: 'User data with first name or last name is required' }, { status: 400 })
    }

    // Block signup if the IP belongs to a suspended account
    const adminClient = supabaseService || supabase
    if (clientIP && clientIP !== '::1' && clientIP !== '127.0.0.1') {
      const { data: suspendedByIP } = await adminClient
        .from('users')
        .select('id')
        .eq('registration_ip', clientIP)
        .eq('suspended', true)
        .limit(1)
        .maybeSingle()

      if (suspendedByIP) {
        console.log('[VERIFY-OTP] Blocked signup from suspended IP:', clientIP)
        return NextResponse.json({ message: 'Registration from this network is currently restricted.' }, { status: 403 })
      }
    }

    // Check if user already exists in database (use service role when available to avoid RLS)
    console.log('[VERIFY-OTP] Checking if user exists...')
    const checkClient = supabaseService || supabase
    const { data: existingUser, error: checkError } = await checkClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[VERIFY-OTP] Error checking existing user:', checkError)
    }

    if (existingUser) {
      console.log('[VERIFY-OTP] User already exists:', existingUser.id)
      return NextResponse.json({ message: 'User already exists' }, { status: 400 })
    }

    // Hash password
    console.log('[VERIFY-OTP] Hashing password...')
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    // Prepare user data object (users table uses 'password' column; sign-in reads it)
    const userInsertData = {
      email,
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      phone: userData.phone || '',
      password: hashedPassword,
      auth_provider: 'email',
      states_of_interest: userData.statesOfInterest || [],
      verified: true,
      registration_ip: clientIP || null
    }

    console.log('[VERIFY-OTP] Attempting to create user with data:', {
      email,
      first_name: userInsertData.first_name,
      last_name: userInsertData.last_name,
      phone: userInsertData.phone,
      has_states: userInsertData.states_of_interest.length > 0
    })

    // Check if service role key is configured
    const hasServiceKey = !!supabaseServiceKey
    console.log('[VERIFY-OTP] Service role key configured:', hasServiceKey)
    if (!hasServiceKey) {
      console.warn('[VERIFY-OTP] ⚠️ MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY not set - service role strategies will be skipped')
    }

    // Try multiple strategies in order of preference
    let newUser = null
    let error = null
    let strategy = 'unknown'

    // STRATEGY 1: Try service role client first (bypasses RLS and cache issues better)
    if (supabaseService) {
      console.log('[VERIFY-OTP] Strategy 1: Trying service role client...')
      const { data: serviceUser, error: serviceError } = await supabaseService
        .from('users')
        .insert([userInsertData])
        .select()
        .single()

      if (!serviceError && serviceUser) {
        newUser = serviceUser
        strategy = 'service_role_direct'
        console.log('[VERIFY-OTP] ✅ Success with service role client')
      } else {
        if (serviceError?.message?.includes('Invalid API key')) {
          console.error('[VERIFY-OTP] ❌ Service role key is INVALID or MISSING')
          console.error('[VERIFY-OTP] Check that MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY is set correctly in Railway')
          console.error('[VERIFY-OTP] Key should start with "eyJ" and be the "service_role" key from Supabase Dashboard')
        }
        console.log('[VERIFY-OTP] Service role client failed:', serviceError?.code, serviceError?.message)
        error = serviceError
      }
    } else {
      console.warn('[VERIFY-OTP] Strategy 1: Skipped - service role client not available')
    }

    // STRATEGY 2: Try anon client direct insert
    if (!newUser) {
      console.log('[VERIFY-OTP] Strategy 2: Trying anon client direct insert...')
      const { data: anonUser, error: anonError } = await supabase
        .from('users')
        .insert([userInsertData])
        .select()
        .single()

      if (!anonError && anonUser) {
        newUser = anonUser
        strategy = 'anon_direct'
        console.log('[VERIFY-OTP] ✅ Success with anon client')
      } else {
        console.log('[VERIFY-OTP] Anon client failed:', anonError?.code, anonError?.message)
        error = anonError
      }
    }

    // STRATEGY 3: Try RPC function with service role (if available)
    if (!newUser && supabaseService) {
      const isSchemaCacheError = error && (
        error.code === 'PGRST204' || 
        error.message?.includes('schema cache') || 
        error.message?.includes('Could not find') ||
        error.message?.includes('column') ||
        error.message?.includes('does not exist')
      )

      if (isSchemaCacheError) {
        console.log('[VERIFY-OTP] Strategy 3: Trying RPC function with service role...')
        try {
          const { data: rpcData, error: rpcError } = await supabaseService.rpc('create_user_with_details', {
            p_email: email,
            p_first_name: userData.firstName || '',
            p_last_name: userData.lastName || '',
            p_phone: userData.phone || '',
            p_password_hash: hashedPassword,
            p_states_of_interest: userData.statesOfInterest || []
          })

          if (!rpcError && rpcData && rpcData.length > 0) {
            newUser = rpcData[0]
            strategy = 'service_role_rpc'
            console.log('[VERIFY-OTP] ✅ Success with RPC function (service role)')
          } else {
            console.error('[VERIFY-OTP] RPC function failed (service role):', rpcError)
          }
        } catch (rpcException) {
          console.error('[VERIFY-OTP] Exception calling RPC function (service role):', rpcException)
        }
      }
    }

    // STRATEGY 4: Try RPC function with anon client
    if (!newUser) {
      const isSchemaCacheError = error && (
        error.code === 'PGRST204' || 
        error.message?.includes('schema cache') || 
        error.message?.includes('Could not find') ||
        error.message?.includes('column') ||
        error.message?.includes('does not exist')
      )

      if (isSchemaCacheError) {
        console.log('[VERIFY-OTP] Strategy 4: Trying RPC function with anon client...')
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_with_details', {
            p_email: email,
            p_first_name: userData.firstName || '',
            p_last_name: userData.lastName || '',
            p_phone: userData.phone || '',
            p_password_hash: hashedPassword,
            p_states_of_interest: userData.statesOfInterest || []
          })

          if (!rpcError && rpcData && rpcData.length > 0) {
            newUser = rpcData[0]
            strategy = 'anon_rpc'
            console.log('[VERIFY-OTP] ✅ Success with RPC function (anon)')
          } else {
            console.error('[VERIFY-OTP] RPC function failed (anon):', rpcError)
          }
        } catch (rpcException) {
          console.error('[VERIFY-OTP] Exception calling RPC function (anon):', rpcException)
        }
      }
    }

    // If all strategies failed
    if (!newUser) {
      console.error('[VERIFY-OTP] ❌ All strategies failed')
      console.error('[VERIFY-OTP] Last error:', error)
      console.error('[VERIFY-OTP] Attempted insert data:', JSON.stringify(userInsertData, null, 2))
      
      // Provide detailed error message
      // Build detailed error message
      const troubleshooting = [
        '1. Run database/complete_fix_schema.sql in Supabase SQL Editor',
        '2. Refresh schema cache in Supabase Dashboard (Settings > API > Reload Schema Cache)',
        '3. Verify MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY is set in Railway environment variables',
        '4. Check that the service role key is correct (should start with "eyJ")',
        '5. Make sure you copied the "service_role" key, NOT the "anon" key from Supabase',
        '6. Redeploy your Railway app after adding the environment variable'
      ]

      if (error?.message?.includes('Invalid API key')) {
        troubleshooting.unshift('⚠️ CRITICAL: Service role key is invalid or missing!')
      }

      const errorDetails = {
        message: 'Failed to create user account. Database schema issue detected.',
        strategy: strategy,
        lastError: error?.code || 'unknown',
        lastErrorMessage: error?.message || 'No error message',
        serviceRoleKeyConfigured: hasServiceKey,
        troubleshooting
      }

      return NextResponse.json(errorDetails, { status: 500 })
    }

    console.log('[VERIFY-OTP] ✅ User created successfully using strategy:', strategy)
    console.log('[VERIFY-OTP] User ID:', newUser.id)
    console.log('[VERIFY-OTP] States of interest:', userData.statesOfInterest)

    // Insert to Monday.com (non-blocking - don't fail registration if Monday fails)
    fireAndForget(
      insertToMonday({
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phone: newUser.phone,
        statesOfInterest: userData.statesOfInterest || []
      }).then(result => {
        if (result.success) {
          console.log('[VERIFY-OTP] User synced to Monday.com')
        } else {
          console.error('[VERIFY-OTP] Failed to sync to Monday.com, but user registration succeeded')
        }
      }),
      'Monday.com user sync'
    )

    // Clean up OTP
    otpStore.delete(email)

    // Return user data in the format expected by useAuth
    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        // Computed full name for backward compatibility
        name: `${newUser.first_name} ${newUser.last_name}`.trim()
      }
    })

  } catch (error) {
    console.error('[VERIFY-OTP] Unexpected error:', error)
    return NextResponse.json(
      { message: 'Failed to verify OTP', error: error.message },
      { status: 500 }
    )
  }
}
