import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const from = (page - 1) * limit

  let query = sb()
    .from('forum_threads')
    .select('*', { count: 'exact' })
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false })
    .range(from, from + limit - 1)

  if (category) query = query.eq('category_slug', category)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ threads: data || [], total: count || 0, page, limit })
}

export async function POST(request) {
  const userId = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { category_slug, title, body: postBody, user_name } = body
  if (!category_slug || !title?.trim() || !postBody?.trim()) {
    return NextResponse.json({ error: 'category_slug, title, and body are required' }, { status: 400 })
  }

  const supabase = sb()
  const { data: cat } = await supabase
    .from('forum_categories')
    .select('id, thread_count')
    .eq('slug', category_slug)
    .single()

  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('forum_threads')
    .insert({
      category_id: cat.id,
      category_slug,
      title: title.trim(),
      body: postBody.trim(),
      user_id: userId,
      user_name: user_name || 'Member',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('forum_categories')
    .update({ thread_count: (cat.thread_count || 0) + 1 })
    .eq('slug', category_slug)

  return NextResponse.json({ thread: data })
}
