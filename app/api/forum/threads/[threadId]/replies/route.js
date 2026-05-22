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

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { body: replyBody, user_name } = body
  if (!replyBody?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const supabase = sb()

  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id, reply_count')
    .eq('id', threadId)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('forum_replies')
    .insert({
      thread_id: threadId,
      body: replyBody.trim(),
      user_id: userId,
      user_name: user_name || 'Member',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('forum_threads')
    .update({
      reply_count: (thread.reply_count || 0) + 1,
      last_reply_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  return NextResponse.json({ reply: data })
}
