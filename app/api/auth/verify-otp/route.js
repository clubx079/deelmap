// /app/api/auth/verify-otp/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { verifyOtp } from '@/lib/otpStore'
import { enrollAutomation } from '@/lib/enrollAutomation'
import { classifyBuyer } from '@/lib/starBuyer'
import { signSession, buildSessionCookie } from '@/lib/session'



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

    console.log('[VERIFY-OTP] Verifying OTP for', email)

    // Extract client IP for registration tracking
    const clientIP = getClientIP(request)

    // Verify OTP against the database-backed store (rate-limited + attempt-capped)
    const otpResult = await verifyOtp(email, 'signup', otp)
    if (!otpResult.valid) {
      const messages = {
        not_found: 'OTP not found or expired',
        expired: 'OTP has expired',
        too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
        config: 'Verification is temporarily unavailable. Please try again.',
      }
      return NextResponse.json({ message: messages[otpResult.reason] || 'Invalid OTP' }, { status: 400 })
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
      return NextResponse.json(
        { message: 'This email is already registered. Please sign in.' },
        { status: 409 }
      )
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
      registration_ip: clientIP || null,
      ip_address: clientIP || null
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

    // Onboarding is owned entirely by the admin follow-up automations. At signup
    // we classify the buyer (Star Buyer detection via LLM) and route accordingly:
    //   star  → 'star_buyer'   event (personalized professional flow)
    //   else  → 'buyer_welcome' event (standard flow)
    // The verdict is persisted on the user for admin visibility. Fail-open: any
    // error falls back to the standard welcome. No hardcoded email is sent here.
    ;(async () => {
      const name = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim()
      try {
        const verdict = await classifyBuyer({
          name, email: newUser.email, statesOfInterest: newUser.states_of_interest,
        })

        // Best-effort persist (service role bypasses RLS); never blocks enrollment.
        try {
          await (supabaseService || supabase).from('users').update({
            is_star_buyer: verdict.isStar,
            buyer_tier: verdict.isStar ? 'star' : 'normal',
            star_persona: verdict.persona || null,
            star_company: verdict.company || null,
            star_confidence: verdict.confidence ?? null,
            star_reason: verdict.reason || null,
            classified_at: new Date().toISOString(),
          }).eq('id', newUser.id)
        } catch (e) {
          console.error('[verify-otp] star persist failed:', e?.message || e)
        }

        const event = verdict.isStar ? 'star_buyer' : 'buyer_welcome'
        await enrollAutomation(event, newUser.id, {
          buyer_id: newUser.id, name, email: newUser.email,
          company: verdict.company || '', persona: verdict.persona || '',
          star_reason: verdict.reason || '',
        }, { immediate: true })
      } catch (e) {
        console.error('[verify-otp] classify/enroll failed:', e?.message || e)
      }
    })()

    // Return user data in the format expected by useAuth
    const res = NextResponse.json({
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
    res.headers.append('Set-Cookie', buildSessionCookie(signSession({ userId: newUser.id })))
    return res

  } catch (error) {
    console.error('[VERIFY-OTP] Unexpected error:', error)
    return NextResponse.json(
      { message: 'Failed to verify OTP', error: error.message },
      { status: 500 }
    )
  }
}
