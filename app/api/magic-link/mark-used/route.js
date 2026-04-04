import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

// POST - Mark a magic link token as used
export async function POST(request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token parameter is required'
      }, { status: 400 })
    }

    // Update token as used
    const { error } = await supabase
      .from('magic_link_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token)

    if (error) {
      console.error('Error marking token as used:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to mark token as used'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Token marked as used'
    })

  } catch (error) {
    console.error('Error marking token as used:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
