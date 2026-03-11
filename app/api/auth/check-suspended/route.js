import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('suspended')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ suspended: false })
    }

    return NextResponse.json({ suspended: !!data.suspended })
  } catch (err) {
    return NextResponse.json({ suspended: false })
  }
}
