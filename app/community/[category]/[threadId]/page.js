'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { use } from 'react'
import { ChevronLeft, ThumbsUp, MessageSquare, Send } from 'lucide-react'

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
    if (!user) return
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-5 w-32 bg-[#E8E8E4] rounded animate-pulse" />
        <div className="bg-white rounded border border-[#E8E8E4] p-6 space-y-3 animate-pulse">
          <div className="h-6 w-3/4 bg-[#E8E8E4] rounded" />
          <div className="h-4 w-1/4 bg-[#E8E8E4] rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-4 bg-[#E8E8E4] rounded" />
            <div className="h-4 bg-[#E8E8E4] rounded" />
            <div className="h-4 w-2/3 bg-[#E8E8E4] rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-[14px] text-[#737370]">Thread not found.</p>
        <Link href={`/community/${category}`} className="text-[13px] text-[#D03839] hover:underline mt-2 inline-block">
          Back to category
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/community/${category}`}
        className="inline-flex items-center gap-1 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors mb-5"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      {/* Original Post */}
      <div className="bg-white rounded border border-[#E8E8E4] mb-4">
        <div className="px-5 py-5">
          <h1 className="text-[20px] font-bold text-[#1A1816] mb-3 leading-snug">{thread.title}</h1>
          <div className="flex items-center gap-2 mb-4">
            <Avatar name={thread.user_name} size={7} />
            <div>
              <span className="text-[13px] font-semibold text-[#1A1816]">{thread.user_name}</span>
              <span className="text-[12px] text-[#A8A8A4] ml-2">{timeAgo(thread.created_at)}</span>
            </div>
          </div>
          <div className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap">
            {thread.body}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[#E8E8E4] flex items-center gap-4">
          <button
            onClick={handleVote}
            disabled={!user || voting}
            className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded border transition-colors ${
              userVoted
                ? 'bg-[#EBF3FC] border-[#BFDBFE] text-[#2563EB]'
                : 'border-[#E8E8E4] text-[#737370] hover:border-[#D4D4CF] hover:text-[#1A1816]'
            } disabled:cursor-not-allowed`}
            title={!user ? 'Sign in to vote' : undefined}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {thread.vote_count || 0} {thread.vote_count === 1 ? 'vote' : 'votes'}
          </button>
          <span className="flex items-center gap-1.5 text-[13px] text-[#737370]">
            <MessageSquare className="w-3.5 h-3.5" />
            {thread.reply_count || 0} {thread.reply_count === 1 ? 'reply' : 'replies'}
          </span>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-[12px] font-semibold text-[#A8A8A4] uppercase tracking-wide px-1">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </p>
          {replies.map((reply, i) => (
            <div key={reply.id} className="bg-white rounded border border-[#E8E8E4] px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={reply.user_name} size={7} />
                <div>
                  <span className="text-[13px] font-semibold text-[#1A1816]">{reply.user_name}</span>
                  <span className="text-[12px] text-[#A8A8A4] ml-2">{timeAgo(reply.created_at)}</span>
                </div>
              </div>
              <p className="text-[14px] text-[#444441] leading-relaxed whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {user ? (
        <div className="bg-white rounded border border-[#E8E8E4] px-5 py-5">
          <p className="text-[13px] font-semibold text-[#1A1816] mb-3">Leave a reply</p>
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            className="w-full px-3 py-2.5 text-[14px] border border-[#E8E8E4] rounded focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] bg-white resize-none mb-3"
          />
          {replyError && <p className="text-[13px] text-[#D03839] mb-2">{replyError}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleReply}
              disabled={submitting || !replyBody.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded border border-[#E8E8E4] px-5 py-6 text-center">
          <p className="text-[14px] text-[#737370] mb-3">Sign in to join the conversation</p>
          <Link
            href="/login"
            className="inline-block px-5 py-2 text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  )
}
