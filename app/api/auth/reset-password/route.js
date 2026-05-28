// /app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { verifyOtp } from '@/lib/otpStore'

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request) {
  try {
    const { email, otp, newPassword, confirmPassword } = await request.json()

    // Validate required fields
    if (!email || !otp || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Final validation of the reset code; consume it so it can't be reused
    const result = await verifyOtp(email, 'password_reset', otp, { consume: true })
    if (!result.valid) {
      const messages = {
        not_found: 'Invalid or expired reset session',
        expired: 'Reset session has expired. Please request a new reset code.',
        too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
        config: 'Verification is temporarily unavailable. Please try again.',
      }
      return NextResponse.json({ message: messages[result.reason] || 'Invalid reset code' }, { status: 400 })
    }

    // Create database connection
    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        )
      }

      // Hash the new password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

      // Update user's password in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userData.id)

      if (updateError) {
        throw new Error('Failed to update password')
      }

      console.log(`Password reset successfully for user: ${email}`)

      return NextResponse.json({
        message: 'Password reset successfully',
        success: true
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Reset password error:', error)
    
    // Return generic error message for security
    return NextResponse.json(
      { message: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
}