import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, role } = await request.json()
    if (!email || !role) {
      return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
    }

    if (role === 'seller') {
      const { data, error } = await supabase
        .from('seller_applications')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
      return NextResponse.json({ exists: !!data })
    }

    // buyer
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    return NextResponse.json({ exists: !!data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
