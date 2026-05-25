import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, notFound, serverError } from '@/lib/community/auth'
import { emailCommentReply, emailPostReply, emailMention } from '@/lib/community/emailNotify'

const MENTION_RE = /(?<![A-Za-z0-9_])@([a-z0-9_]{3,24})/g

// POST — create a comment (or reply if parent_id provided)
export async function POST(request, { params }) {
  const { slug } = await params
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const text = String(body.body || '').trim()
  const parentId = body.parent_id || null
  if (text.length < 1) return badRequest('Comment cannot be empty.')
  if (text.length > 8000) return badRequest('Comment too long (8000 max).')

  // Profile
  const { data: profile } = await supabase
    .from('community_profiles').select('id, handle, is_shadowbanned')
    .eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  // Post — need title + author for email
  const { data: post } = await supabase
    .from('community_posts').select('id, slug, title, author_id, is_locked, is_removed')
    .eq('slug', slug).maybeSingle()
  if (!post || post.is_removed) return notFound('Post not found.')
  if (post.is_locked) return badRequest('This thread is locked.')

  // Parent (if reply): must belong to the same post, must respect depth cap
  let parentAuthorId = null
  if (parentId) {
    const { data: parent } = await supabase
      .from('community_comments').select('id, post_id, depth, author_id')
      .eq('id', parentId).maybeSingle()
    if (!parent || parent.post_id !== post.id) return badRequest('Parent comment not found.')
    if (parent.depth >= 8) return badRequest('Maximum reply depth reached.')
    parentAuthorId = parent.author_id
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: post.id,
      author_id: profile.id,
      parent_id: parentId,
      body: text,
      is_removed: profile.is_shadowbanned,
    })
    .select(`
      id, parent_id, body, score, depth, created_at,
      author:community_profiles!community_comments_author_id_fkey(id, handle, display_name, avatar_url, role_badge)
    `)
    .single()

  if (error) return serverError(error.message)

  // ── Fire-and-forget side effects.
  // In-app notifications for reply/post-author fire via DB triggers
  // (see community_post_reply_notify, community_comment_reply_notify).
  // We handle: reply emails, mention notifications + emails.
  if (!profile.is_shadowbanned) {
    sendCommentSideEffects({
      supabase,
      post,
      replier: profile,
      commentBody: text,
      parentAuthorId,
    }).catch(() => {})
  }

  return NextResponse.json({ comment: { ...data, user_vote: 0 } })
}

async function sendCommentSideEffects({ supabase, post, replier, commentBody, parentAuthorId }) {
  // Recipient = parent comment author for a reply, else post author for a top-level comment
  const recipientProfileId = parentAuthorId || (post.author_id !== replier.id ? post.author_id : null)
  const isReplyToComment = !!parentAuthorId

  if (recipientProfileId && recipientProfileId !== replier.id) {
    const { data: rec } = await supabase
      .from('community_profiles')
      .select('id, handle, user_id, email_replies')
      .eq('id', recipientProfileId).maybeSingle()
    if (rec && rec.email_replies !== false) {
      const { data: u } = await supabase.from('users').select('email').eq('id', rec.user_id).maybeSingle()
      if (u?.email) {
        const args = {
          to: u.email,
          replierHandle: replier.handle,
          postTitle: post.title,
          postSlug: post.slug,
          commentBody,
        }
        if (isReplyToComment) emailCommentReply(args)
        else emailPostReply(args)
      }
    }
  }

  // Mentions
  const mentionedHandles = new Set()
  let m
  while ((m = MENTION_RE.exec(commentBody)) !== null) mentionedHandles.add(m[1])
  if (!mentionedHandles.size) return

  const handles = [...mentionedHandles]
  const { data: mentioned } = await supabase
    .from('community_profiles')
    .select('id, handle, user_id, email_mentions')
    .in('handle', handles)
  if (!mentioned?.length) return

  const userIds = mentioned.map(p => p.user_id).filter(Boolean)
  const emailMap = {}
  if (userIds.length) {
    const { data: us } = await supabase.from('users').select('id, email').in('id', userIds)
    for (const u of us || []) emailMap[u.id] = u.email
  }

  for (const p of mentioned) {
    if (p.id === replier.id) continue
    if (p.id === recipientProfileId) continue // already got a reply email
    if (p.email_mentions !== false) {
      const email = emailMap[p.user_id]
      if (email) {
        emailMention({
          to: email,
          mentionerHandle: replier.handle,
          postTitle: post.title,
          postSlug: post.slug,
          commentBody,
        })
      }
    }

    // In-app mention notification (DB trigger doesn't cover this)
    await supabase.from('community_notifications').insert({
      profile_id: p.id,
      type: 'mention',
      title: `@${replier.handle} mentioned you`,
      body: commentBody.slice(0, 280),
      ref_post_id: post.id,
    })
  }
}
