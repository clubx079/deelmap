// /app/api/auth/verify-reset-otp/route.js
import { NextResponse } from 'next/server'

// Shared storage - in production, use Redis or database
let passwordResetStore = new Map()

if (typeof global !== 'undefined') {
  if (!global.passwordResetStore) global.passwordResetStore = new Map()
  passwordResetStore = global.passwordResetStore
}

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

    // Check OTP from password reset store
    const resetData = passwordResetStore.get(email)
    
    if (!resetData) {
      return NextResponse.json(
        { message: 'Invalid or expired reset code' },
        { status: 400 }
      )
    }

    // Check if OTP has expired (15 minutes)
    if (Date.now() > resetData.expires) {
      passwordResetStore.delete(email)
      return NextResponse.json(
        { message: 'Reset code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (resetData.otp !== otp) {
      return NextResponse.json(
        { message: 'Invalid reset code' },
        { status: 400 }
      )
    }

    console.log(`Reset OTP verified successfully for: ${email}`)

    // Mark OTP as verified but keep it in store for the password reset step
    passwordResetStore.set(email, {
      ...resetData,
      verified: true,
      verifiedAt: Date.now()
    })

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