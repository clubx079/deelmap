// app/api/notifications/send-sms/route.js
import { NextResponse } from 'next/server'
import { sendSMS } from '@/lib/sms'

export async function POST(request) {
  try {
    const { to, message, from } = await request.json()

    const result = await sendSMS({ to, message, from })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send SMS',
        details: error.message
      },
      { status: 500 }
    )
  }
}
