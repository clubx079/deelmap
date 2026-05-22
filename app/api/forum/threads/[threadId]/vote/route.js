import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request, { params }) {
  const { threadId } = params
  const userId = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = sb()

  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id, vote_count')
    .eq('id', threadId)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('forum_votes')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase.from('forum_votes').delete().eq('id', existing.id)
    const newCount = Math.max((thread.vote_count || 1) - 1, 0)
    await supabase.from('forum_threads').update({ vote_count: newCount }).eq('id', threadId)
    return NextResponse.json({ voted: false, vote_count: newCount })
  } else {
    await supabase.from('forum_votes').insert({ thread_id: threadId, user_id: userId })
    const newCount = (thread.vote_count || 0) + 1
    await supabase.from('forum_threads').update({ vote_count: newCount }).eq('id', threadId)
    return NextResponse.json({ voted: true, vote_count: newCount })
  }
}
