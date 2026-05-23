'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { ChevronUp, MessageSquare, ChevronLeft, Send } from 'lucide-react'

function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function fmt(n) {
  if (!n) return null
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const POST_TYPE_BADGE = {
  deal:       { label: 'Deal',       cls: 'bg-[#DCFCE7] text-[#16A34A]' },
  discussion: { label: 'Discussion', cls: 'bg-[#EBF3FC] text-[#2563EB]' },
  question:   { label: 'Question',   cls: 'bg-[#FEF3C7] text-[#D97706]' },
  wins:       { label: 'Win',        cls: 'bg-[#F3E8FF] text-[#7C3AED]' },
  image:      { label: 'Photo',      cls: 'bg-[#F5F5F3] text-[#737370]' },
}

export default function PostDetailPage({ params }) {
  const { channel, postId } = params
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState(0)
  const [voted, setVoted] = useState(false)
  const [voting, setVoting] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/community/posts/${postId}`).then(r => r.json()),
      fetch(`/api/community/posts/${postId}/comments`).then(r => r.json()),
    ]).then(([p, c]) => {
      if (!p.error) { setPost(p); setVotes(p.upvote_count || 0) }
      setComments(Array.isArray(c) ? c : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [postId])

  async function handleVote() {
    if (!user || voting) return
    setVoting(true)
    const res = await fetch(`/api/community/posts/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    const data = await res.json()
    if (!data.error) { setVotes(data.upvote_count); setVoted(data.voted) }
    setVoting(false)
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!user || !commentBody.trim()) return
    setPosting(true)
    const res = await fetch(`/api/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user?.name || user?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Anonymous',
        body: commentBody.trim(),
      }),
    })
    const data = await res.json()
    if (!data.error) {
      setComments(prev => [data, ...prev])
      setCommentBody('')
      setPost(p => ({ ...p, comment_count: (p.comment_count || 0) + 1 }))
    }
    setPosting(false)
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-6 bg-white border border-[#E8E8E4] rounded w-32" />
        <div className="h-40 bg-white border border-[#E8E8E4] rounded" />
        <div className="h-24 bg-white border border-[#E8E8E4] rounded" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded p-12 text-center">
        <p className="text-[14px] text-[#737370]">Post not found.</p>
        <Link href={`/community/${channel}`} className="text-[13px] text-[#D03839] font-medium mt-2 inline-block">← Back</Link>
      </div>
    )
  }

  const badge = POST_TYPE_BADGE[post.post_type] || { label: post.post_type, cls: 'bg-[#F5F5F3] text-[#737370]' }

  return (
    <div className="space-y-3">
      {/* Back */}
      <Link href={`/community/${channel}`}
        className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to {post.channel?.name || 'channel'}
      </Link>

      {/* Post */}
      <div className="bg-white border border-[#E8E8E4] rounded flex">
        {/* Vote column */}
        <div className="flex flex-col items-center px-3 py-5 gap-1.5 shrink-0 bg-[#FAFAF8] rounded-l border-r border-[#E8E8E4]">
          <button onClick={handleVote}
            className={`p-1 rounded transition-colors ${voted ? 'text-[#D03839]' : 'text-[#A8A8A4] hover:text-[#D03839]'}`}>
            <ChevronUp className="w-5 h-5" strokeWidth={voted ? 2.5 : 2} />
          </button>
          <span className={`text-[13px] font-bold ${voted ? 'text-[#D03839]' : 'text-[#444441]'}`}>{votes}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-5 py-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center h-5 px-2 rounded text-[11px] font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-[12px] text-[#A8A8A4]">by {post.user_name} · {timeAgo(post.created_at)}</span>
            <span className="flex items-center gap-1 text-[12px] text-[#A8A8A4]">
              <MessageSquare className="w-3 h-3" /> {post.comment_count || 0} comments
            </span>
          </div>

          <h1 className="text-[18px] font-bold text-[#1A1816] leading-snug mb-3">{post.title}</h1>

          {post.post_type === 'deal' && (
            <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-4 mb-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {post.address && (
                <div className="col-span-full">
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Address</p>
                  <p className="text-[13px] font-medium text-[#1A1816]">{post.address}</p>
                </div>
              )}
              {post.asking_price && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Asking Price</p>
                  <p className="text-[14px] font-bold text-[#1A1816]">{fmt(post.asking_price)}</p>
                </div>
              )}
              {post.arv && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">ARV</p>
                  <p className="text-[14px] font-bold text-[#1A1816]">{fmt(post.arv)}</p>
                </div>
              )}
              {post.spread > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Spread</p>
                  <p className="text-[14px] font-bold text-[#16A34A]">{fmt(post.spread)}</p>
                </div>
              )}
              {post.est_repairs && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Est. Repairs</p>
                  <p className="text-[13px] font-semibold text-[#1A1816]">{fmt(post.est_repairs)}</p>
                </div>
              )}
              {(post.beds || post.baths) && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Beds / Baths</p>
                  <p className="text-[13px] font-semibold text-[#1A1816]">
                    {post.beds ? `${post.beds} bd` : '—'} / {post.baths ? `${post.baths} ba` : '—'}
                  </p>
                </div>
              )}
              {post.sqft && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Sqft</p>
                  <p className="text-[13px] font-semibold text-[#1A1816]">{post.sqft?.toLocaleString()}</p>
                </div>
              )}
              {post.deal_type && (
                <div>
                  <p className="text-[10px] font-semibold text-[#A8A8A4] uppercase tracking-wide mb-0.5">Deal Type</p>
                  <p className="text-[13px] font-semibold text-[#1A1816]">{post.deal_type}</p>
                </div>
              )}
            </div>
          )}

          {post.body && (
            <p className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap">{post.body}</p>
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="bg-white border border-[#E8E8E4] rounded p-4">
        <p className="text-[13px] font-semibold text-[#1A1816] mb-3">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </p>
        {user ? (
          <form onSubmit={handleComment} className="flex gap-2">
            <textarea
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1 px-3 py-2 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816] resize-none"
            />
            <button type="submit" disabled={posting || !commentBody.trim()}
              className="h-9 w-9 self-end bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center shrink-0">
              {posting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        ) : (
          <p className="text-[13px] text-[#737370]">
            <Link href="/login" className="text-[#D03839] font-medium hover:underline">Log in</Link> to leave a comment.
          </p>
        )}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="bg-white border border-[#E8E8E4] rounded px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-[#A8A8A4]">
                <span className="font-semibold text-[#1A1816] text-[12px]">{c.user_name}</span>
                <span>·</span>
                <span>{timeAgo(c.created_at)}</span>
                {c.upvote_count > 0 && (
                  <span className="flex items-center gap-0.5 text-[#737370]">
                    <ChevronUp className="w-3 h-3" /> {c.upvote_count}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
