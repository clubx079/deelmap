'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { use } from 'react'
import { ChevronLeft, Plus, ThumbsUp, MessageSquare, Pin, X } from 'lucide-react'

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function CategoryPage({ params }) {
  const { category } = use(params)
  const { user } = useAuth()

  const [categoryData, setCategoryData] = useState(null)
  const [threads, setThreads] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  const fetchThreads = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/threads?category=${category}&page=${p}`)
      const data = await res.json()
      setThreads(data.threads || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    // Fetch category info
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(d => {
        const cat = (d.categories || []).find(c => c.slug === category)
        setCategoryData(cat || null)
      })
      .catch(() => {})

    fetchThreads(1)
  }, [category, fetchThreads])

  const handlePostThread = async () => {
    if (!newTitle.trim() || !newBody.trim()) { setPostError('Title and body are required.'); return }
    setPosting(true)
    setPostError('')
    try {
      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({
          category_slug: category,
          title: newTitle,
          body: newBody,
          user_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPostError(data.error || 'Failed to post.'); return }
      setShowNewThread(false)
      setNewTitle('')
      setNewBody('')
      fetchThreads(1)
    } catch {
      setPostError('Something went wrong.')
    } finally {
      setPosting(false)
    }
  }

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link href="/community" className="inline-flex items-center gap-1 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors mb-5">
        <ChevronLeft className="w-3.5 h-3.5" />
        Community
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816]">
            {categoryData?.name || category}
          </h1>
          {categoryData?.description && (
            <p className="text-[13px] text-[#737370] mt-0.5">{categoryData.description}</p>
          )}
        </div>
        {user ? (
          <button
            onClick={() => setShowNewThread(true)}
            className="flex items-center gap-1.5 bg-[#D03839] hover:bg-[#E0493B] text-white px-3 py-2 rounded text-[13px] font-semibold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
        ) : (
          <Link
            href="/login"
            className="text-[13px] font-semibold text-[#D03839] hover:underline shrink-0"
          >
            Sign in to post
          </Link>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-[#E8E8E4] shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E4]">
              <h2 className="text-[15px] font-semibold text-[#1A1816]">New Thread</h2>
              <button onClick={() => { setShowNewThread(false); setPostError('') }} className="text-[#A8A8A4] hover:text-[#1A1816]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1816] mb-1.5">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="What's your post about?"
                  className="w-full px-3 py-2 text-[14px] border border-[#E8E8E4] rounded focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] bg-white"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1816] mb-1.5">Body</label>
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={6}
                  className="w-full px-3 py-2 text-[14px] border border-[#E8E8E4] rounded focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] bg-white resize-none"
                />
              </div>
              {postError && <p className="text-[13px] text-[#D03839]">{postError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E8E8E4]">
              <button
                onClick={() => { setShowNewThread(false); setPostError('') }}
                className="px-4 py-2 text-[13px] font-medium text-[#444441] hover:text-[#1A1816] rounded border border-[#E8E8E4] hover:bg-[#FAFAF8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePostThread}
                disabled={posting || !newTitle.trim() || !newBody.trim()}
                className="px-4 py-2 text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : 'Post Thread'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded border border-[#E8E8E4] h-20 animate-pulse" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded border border-[#E8E8E4] px-6 py-12 text-center">
          <MessageSquare className="w-8 h-8 text-[#D4D4CF] mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#1A1816] mb-1">No threads yet</p>
          <p className="text-[13px] text-[#737370]">Be the first to start a discussion in this category.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {threads.map(thread => (
              <Link
                key={thread.id}
                href={`/community/${category}/${thread.id}`}
                className="block bg-white rounded border border-[#E8E8E4] px-4 py-4 hover:bg-[#FAFAF8] hover:border-[#D4D4CF] transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {thread.is_pinned && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#0F6E56] bg-[#E4F5EC] px-1.5 py-0.5 rounded shrink-0">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      <p className="text-[14px] font-semibold text-[#1A1816] group-hover:text-[#D03839] transition-colors truncate">
                        {thread.title}
                      </p>
                    </div>
                    <p className="text-[12px] text-[#737370]">
                      by <span className="font-medium text-[#444441]">{thread.user_name}</span>
                      {' · '}{timeAgo(thread.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[#737370]">
                    <span className="flex items-center gap-1 text-[12px]">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {thread.vote_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-[12px]">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {thread.reply_count || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => { setPage(p => p - 1); fetchThreads(page - 1) }}
                disabled={page === 1}
                className="px-3 py-1.5 text-[13px] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-[13px] text-[#737370]">Page {page} of {totalPages}</span>
              <button
                onClick={() => { setPage(p => p + 1); fetchThreads(page + 1) }}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-[13px] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
