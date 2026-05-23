import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  const { data, error } = await supabase
    .from('community_channels')
    .select('id, slug, name, description, type, post_count, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data || [])
}
