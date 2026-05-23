import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
  process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
)

function hotScore(p) {
  const score = (p.upvote_count || 0) + (p.save_count || 0) * 2 + (p.comment_count || 0) * 0.5
  const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3600000
  return score / Math.pow(ageHours + 2, 1.5)
}

export async function POST(request, { params }) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const postId = params.id

    // Check if already voted
    const { data: existing } = await supabase
      .from('community_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', postId)
      .eq('target_type', 'post')
      .maybeSingle()

    const { data: post } = await supabase
      .from('community_posts')
      .select('upvote_count, save_count, comment_count, created_at')
      .eq('id', postId)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    let newCount
    if (existing) {
      // Un-vote
      await supabase.from('community_votes').delete().eq('id', existing.id)
      newCount = Math.max(0, (post.upvote_count || 0) - 1)
    } else {
      // Vote
      await supabase.from('community_votes').insert({ user_id: userId, target_id: postId, target_type: 'post' })
      newCount = (post.upvote_count || 0) + 1
    }

    const updatedPost = { ...post, upvote_count: newCount }
    const newHotScore = hotScore(updatedPost)

    await supabase.from('community_posts')
      .update({ upvote_count: newCount, hot_score: newHotScore })
      .eq('id', postId)

    return NextResponse.json({ upvote_count: newCount, voted: !existing })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
