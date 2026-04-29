import { NextResponse } from 'next/server'

export async function POST(request) {
  const { pin } = await request.json()

  if (!pin || pin.trim() !== process.env.ACCESS_PIN) {
    return NextResponse.json({ error: 'Incorrect access code' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('deelmap_access', 'granted', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year — valid until user clears browser cookies
  })
  return response
}
