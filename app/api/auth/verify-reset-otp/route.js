// /app/api/auth/verify-reset-otp/route.js
import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/otpStore'

export async function POST(request) {
  try {
    const { email, otp } = await request.json()

    // Validate required fields
    if (!email || !otp) {
      return NextResponse.json(
        { message: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Validate the reset code without consuming it (the password-reset step re-checks it)
    const result = await verifyOtp(email, 'password_reset', otp, { consume: false })
    if (!result.valid) {
      const messages = {
        not_found: 'Invalid or expired reset code',
        expired: 'Reset code has expired. Please request a new one.',
        too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
        config: 'Verification is temporarily unavailable. Please try again.',
      }
      return NextResponse.json({ message: messages[result.reason] || 'Invalid reset code' }, { status: 400 })
    }

    return NextResponse.json({
      message: 'OTP verified successfully',
      success: true
    })

  } catch (error) {
    console.error('Verify reset OTP error:', error)
    
    return NextResponse.json(
      { message: 'Failed to verify reset code. Please try again.' },
      { status: 500 }
    )
  }
}