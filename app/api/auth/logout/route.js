// /app/api/auth/logout/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Clear any server-side session data if you have any
    // For now, just return success since you're using client-side auth
    
    return NextResponse.json({ 
      message: 'Logged out successfully' 
    })
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { message: 'Logout failed' },
      { status: 500 }
    )
  }
}