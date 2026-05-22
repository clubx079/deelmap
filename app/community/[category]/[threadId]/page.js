'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { use } from 'react'
import { ChevronLeft, ThumbsUp, MessageSquare, Send, Pin } from 'lucide-react'

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ name, size = 8 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'M'
  const colors = ['bg-[#EBF3FC] text-[#2563EB]', 'bg-[#E4F5EC] text-[#0F6E56]', 'bg-[#FEF3E2] text-[#B5620A]', 'bg-[#F3E8FF] text-[#7C3AED]']
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center flex-shrink-0 text-[11px] font-bold`}>
      {initials}
    </div>
  )
}

export default function ThreadPage({ params }) {
  const { category, threadId } = use(params)
  const { user } = useAuth()

  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [userVoted, setUserVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [voting, setVoting] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [sort, setSort] = useState('oldest')
  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(d => {
        const cat = (d.categories || []).find(c => c.slug === category)
        if (cat) setCategoryName(cat.name)
      })
      .catch(() => {})
  }, [category])

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/forum/threads/${threadId}`, {
        headers: user?.id ? { Authorization: `Bearer ${user.id}` } : {},
      })
      const data = await res.json()
      if (data.thread) {
        setThread(data.thread)
        setReplies(data.replies || [])
        setUserVoted(data.userVoted || false)
      }
    } finally {
      setLoading(false)
    }
  }, [threadId, user?.id])

  useEffect(() => {
    if (user !== undefined) fetchThread()
  }, [fetchThread, user])

  const handleVote = async () => {
    if (!user) { setShowAuthModal(true); return }
    setVoting(true)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.id}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUserVoted(data.voted)
        setThread(prev => ({ ...prev, vote_count: data.vote_count }))
      }
    } finally {
      setVoting(false)
    }
  }

  const handleReply = async () => {
    if (!user) { setShowAuthModal(true); return }
    if (!replyBody.trim()) return
    setSubmitting(true)
    setReplyError('')
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({
          body: replyBody,
          user_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setReplyError(data.error || 'Failed to post reply.'); return }
      setReplies(prev => [...prev, data.reply])
      setThread(prev => ({ ...prev, reply_count: (prev.reply_count || 0) + 1 }))
      setReplyBody('')
    } catch {
      setReplyError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const sortedReplies = [...replies].sort((a, b) => {
    const diff = new Date(a.created_at) - new Date(b.created_at)
    return sort === 'oldest' ? diff : -diff
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-24 bg-[#E8E8E4] rounded animate-pulse" />
        <div className="bg-white rounded border border-[#E8E8E4] p-6 space-y-3 animate-pulse">
          <div className="h-6 w-3/4 bg-[#E8E8E4] rounded" />
          <div className="h-4 w-1/4 bg-[#E8E8E4] rounded" />
          <div className="space-y-2 pt-2">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-[#E8E8E4] rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-[#737370]">Thread not found.</p>
        <Link href={`/community/${category}`} className="text-[13px] text-[#D03839] hover:underline mt-2 inline-block">Back to category</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/community/${category}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#737370] hover:text-[#1A1816] transition-colors mb-4 group">
        <div className="w-6 h-6 rounded-full bg-white border border-[#E8E8E4] flex items-center justify-center group-hover:border-[#D4D4CF] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </div>
        {categoryName || 'Back'}
      </Link>

      {/* Single unified card */}
      <div className="bg-white rounded-lg border border-[#E8E8E4] overflow-hidden">

        {/* ── Original Post ── */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={thread.user_name} size={9} />
            <div>
              <p className="text-[13px] font-semibold text-[#1A1816] leading-none mb-0.5">{thread.user_name}</p>
              <p className="text-[11px] text-[#A8A8A4]">{timeAgo(thread.created_at)}</p>
            </div>
            {thread.is_pinned && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-[#0F6E56] bg-[#E4F5EC] px-1.5 py-0.5 rounded">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </span>
            )}
          </div>
          <h1 className="text-[18px] font-bold text-[#1A1816] mb-3 leading-snug">{thread.title}</h1>
          <div className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap mb-4">{thread.body}</div>
          {thread.images?.length > 0 && (
            <div className={`grid gap-2 mb-2 ${thread.images.length === 1 ? 'grid-cols-1' : thread.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {thread.images.map((url, i) => (
                <button key={i} onClick={() => setLightboxImg(url)} className="block rounded overflow-hidden border border-[#E8E8E4] aspect-video bg-[#F5F5F3] hover:opacity-90 transition-opacity">
                  <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post action bar */}
        <div className="flex border-t border-[#E8E8E4]">
          <button
            onClick={handleVote}
            disabled={voting}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors border-r border-[#E8E8E4] ${
              userVoted ? 'text-[#2563EB] bg-[#F0F6FF]' : 'text-[#737370] hover:bg-[#F5F5F3] hover:text-[#1A1816]'
            } disabled:opacity-50`}
          >
            <ThumbsUp className="w-4 h-4" />
            Like{(thread.vote_count || 0) > 0 ? ` · ${thread.vote_count}` : ''}
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-[#737370]">
            <MessageSquare className="w-4 h-4" />
            {thread.reply_count || 0} {(thread.reply_count || 0) === 1 ? 'Comment' : 'Comments'}
          </div>
        </div>

        {/* ── Comments Section ── */}
        <div className="border-t-2 border-[#E8E8E4]">

          {/* Comments header + sort */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-[#F0F0EC]">
            <p className="text-[13px] font-semibold text-[#1A1816]">
              Comments {replies.length > 0 && <span className="font-normal text-[#A8A8A4]">({replies.length})</span>}
            </p>
            {replies.length > 1 && (
              <div className="flex items-center gap-1 bg-[#F5F5F3] rounded p-0.5">
                <button
                  onClick={() => setSort('oldest')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${sort === 'oldest' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370] hover:text-[#1A1816]'}`}
                >
                  Oldest
                </button>
                <button
                  onClick={() => setSort('recent')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${sort === 'recent' ? 'bg-white text-[#1A1816] shadow-sm' : 'text-[#737370] hover:text-[#1A1816]'}`}
                >
                  Newest
                </button>
              </div>
            )}
          </div>

          {/* Reply input */}
          <div id="reply" className="px-5 pt-4 pb-4 border-b border-[#F0F0EC]">
            {user ? (
              <div className="flex gap-3">
                <Avatar name={[user.first_name, user.last_name].filter(Boolean).join(' ') || 'M'} size={8} />
                <div className="flex-1">
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] resize-none bg-[#FAFAF8]"
                  />
                  {replyError && <p className="text-[12px] text-[#D03839] mt-1">{replyError}</p>}
                  {replyBody.trim() && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleReply}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {submitting ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F0F0EC] flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#A8A8A4]" />
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 text-left px-3 py-2 text-[13px] text-[#A8A8A4] border border-[#E8E8E4] rounded-lg bg-[#FAFAF8] hover:border-[#D03839] hover:text-[#737370] transition-colors"
                >
                  Sign in to comment...
                </button>
              </div>
            )}
          </div>

          {/* Replies list */}
          {sortedReplies.length > 0 ? (
            sortedReplies.map((reply, idx) => (
              <div key={reply.id} className={`px-5 py-4 flex gap-3 ${idx < sortedReplies.length - 1 ? 'border-b border-[#F0F0EC]' : ''}`}>
                <Avatar name={reply.user_name} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-[#1A1816]">{reply.user_name}</span>
                    <span className="text-[11px] text-[#A8A8A4]">{timeAgo(reply.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-[#A8A8A4]">No comments yet. Be the first to respond.</p>
            </div>
          )}
        </div>
      </div>

      {lightboxImg && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none">✕</button>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialStep="login" />
    </div>
  )
}
