import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function GET(request, { params }) {
  const { threadId } = params
  const userId = request.headers.get('Authorization')?.replace('Bearer ', '').trim()

  const supabase = sb()

  const { data: thread, error: tErr } = await supabase
    .from('forum_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (tErr || !thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  let userVoted = false
  if (userId) {
    const { data: vote } = await supabase
      .from('forum_votes')
      .select('id')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .maybeSingle()
    userVoted = !!vote
  }

  return NextResponse.json({ thread, replies: replies || [], userVoted })
}
