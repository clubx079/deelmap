import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(_, { params }) {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', params.id)
    .order('upvote_count', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request, { params }) {
  try {
    const { userId, userName, body } = await request.json()
    if (!userId || !userName || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('community_comments')
      .insert({ post_id: params.id, user_id: userId, user_name: userName, body: body.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Increment post comment count and update hot score
    const { data: post } = await supabase
      .from('community_posts')
      .select('upvote_count, save_count, comment_count, created_at')
      .eq('id', params.id)
      .maybeSingle()

    if (post) {
      const newCommentCount = (post.comment_count || 0) + 1
      const score = (post.upvote_count || 0) + (post.save_count || 0) * 2 + newCommentCount * 0.5
      const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3600000
      const hotScore = score / Math.pow(ageHours + 2, 1.5)
      await supabase.from('community_posts')
        .update({ comment_count: newCommentCount, hot_score: hotScore, last_activity_at: new Date().toISOString() })
        .eq('id', params.id)
    }

    return NextResponse.json(comment)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
