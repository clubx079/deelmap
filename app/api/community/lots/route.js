import { NextResponse } from 'next/server'
import { getServiceClient, serverError } from '@/lib/community/auth'

// GET — all active lots, grouped by category, ordered by sort_order within each group.
export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('community_lots')
    .select('id, slug, name, category, accent_color, post_count, member_count, min_equity_to_post, sort_order')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return serverError(error.message)

  const groups = {}
  for (const lot of data || []) {
    if (!groups[lot.category]) {
      groups[lot.category] = { category: lot.category, accent: lot.accent_color, lots: [] }
    }
    groups[lot.category].lots.push(lot)
  }

  const CATEGORY_ORDER = ['real_estate', 'lending', 'finance', 'contractors', 'markets']
  const ordered = CATEGORY_ORDER.filter(c => groups[c]).map(c => groups[c])

  return NextResponse.json({ groups: ordered, flat: data || [] })
}
