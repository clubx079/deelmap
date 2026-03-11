// /app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Shared storage - in production, use Redis or database
let passwordResetStore = new Map()

if (typeof global !== 'undefined') {
  if (!global.passwordResetStore) global.passwordResetStore = new Map()
  passwordResetStore = global.passwordResetStore
}

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

    // Check OTP from password reset store
    const resetData = passwordResetStore.get(email)
    
    if (!resetData) {
      return NextResponse.json(
        { message: 'Invalid or expired reset session' },
        { status: 400 }
      )
    }

    // Check if OTP has expired (15 minutes from original creation)
    if (Date.now() > resetData.expires) {
      passwordResetStore.delete(email)
      return NextResponse.json(
        { message: 'Reset session has expired. Please request a new reset code.' },
        { status: 400 }
      )
    }

    // Check if OTP was previously verified
    if (!resetData.verified) {
      return NextResponse.json(
        { message: 'Please verify your reset code first' },
        { status: 400 }
      )
    }

    // Verify OTP again for final confirmation
    if (resetData.otp !== otp) {
      return NextResponse.json(
        { message: 'Invalid reset code' },
        { status: 400 }
      )
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

      // Remove the used OTP from store
      passwordResetStore.delete(email)

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