import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(_, { params }) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*, channel:community_channels!channel_id(slug, name)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
