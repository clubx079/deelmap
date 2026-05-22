'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { use } from 'react'
import { Plus, ThumbsUp, MessageSquare, Pin, X, ImagePlus, Loader2, Send } from 'lucide-react'
import { AuthModal } from '@/components/AuthModal'

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
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [votedMap, setVotedMap] = useState({})
  const [votingId, setVotingId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [repliesCache, setRepliesCache] = useState({})
  const [fetchingReplies, setFetchingReplies] = useState(null)
  const [inlineReply, setInlineReply] = useState({})
  const [inlineSubmitting, setInlineSubmitting] = useState(null)

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
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(d => setCategoryData((d.categories || []).find(c => c.slug === category) || null))
      .catch(() => {})
    fetchThreads(1)
  }, [category, fetchThreads])

  const toggleComments = async (e, threadId) => {
    e.preventDefault()
    if (!user) { setShowAuthModal(true); return }
    if (expandedId === threadId) { setExpandedId(null); return }
    setExpandedId(threadId)
    if (!repliesCache[threadId]) {
      setFetchingReplies(threadId)
      try {
        const res = await fetch(`/api/forum/threads/${threadId}`, {
          headers: { Authorization: `Bearer ${user.id}` },
        })
        const data = await res.json()
        setRepliesCache(prev => ({ ...prev, [threadId]: data.replies || [] }))
      } finally {
        setFetchingReplies(null)
      }
    }
  }

  const handleInlineReply = async (threadId) => {
    const body = inlineReply[threadId]?.trim()
    if (!body) return
    setInlineSubmitting(threadId)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({
          body,
          user_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRepliesCache(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), data.reply] }))
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, reply_count: (t.reply_count || 0) + 1 } : t))
        setInlineReply(prev => ({ ...prev, [threadId]: '' }))
      }
    } finally {
      setInlineSubmitting(null)
    }
  }

  const handleVote = async (e, threadId) => {
    e.preventDefault()
    if (!user) { setShowAuthModal(true); return }
    setVotingId(threadId)
    try {
      const res = await fetch(`/api/forum/threads/${threadId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.id}` },
      })
      const data = await res.json()
      if (res.ok) {
        setVotedMap(prev => ({ ...prev, [threadId]: data.voted }))
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, vote_count: data.vote_count } : t))
      }
    } finally {
      setVotingId(null)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const toAdd = files.slice(0, 4 - imageFiles.length)
    setImageFiles(prev => [...prev, ...toAdd])
    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    if (!imageFiles.length) return []
    setUploadingImages(true)
    const urls = []
    for (const file of imageFiles) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/forum/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.id}` },
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data.url) urls.push(data.url)
    }
    setUploadingImages(false)
    return urls
  }

  const handlePostThread = async () => {
    if (!newTitle.trim() || !newBody.trim()) { setPostError('Title and body are required.'); return }
    setPosting(true)
    setPostError('')
    try {
      const imageUrls = await uploadImages()
      const res = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({
          category_slug: category,
          title: newTitle,
          body: newBody,
          images: imageUrls,
          user_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPostError(data.error || 'Failed to post.'); return }
      closeModal()
      fetchThreads(1)
    } catch {
      setPostError('Something went wrong.')
    } finally {
      setPosting(false)
    }
  }

  const closeModal = () => {
    setShowNewThread(false)
    setPostError('')
    setImageFiles([])
    setImagePreviews([])
    setNewTitle('')
    setNewBody('')
  }

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816] leading-tight">{categoryData?.name || category}</h1>
          {categoryData?.description && (
            <p className="text-[13px] text-[#737370] mt-0.5">{categoryData.description}</p>
          )}
        </div>
        {user ? (
          <button
            onClick={() => setShowNewThread(true)}
            className="flex items-center gap-1.5 bg-[#D03839] hover:bg-[#C02A2B] text-white px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 border border-[#D03839] text-[#D03839] hover:bg-[#FEF0EF] px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-[#E8E8E4] shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E4] shrink-0">
              <h2 className="text-[15px] font-semibold text-[#1A1816]">New Thread</h2>
              <button onClick={closeModal} className="text-[#A8A8A4] hover:text-[#1A1816]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1816] mb-1.5">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="What's your post about?"
                  maxLength={200}
                  className="w-full px-3 py-2 text-[14px] border border-[#E8E8E4] rounded focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1A1816] mb-1.5">Body</label>
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={5}
                  className="w-full px-3 py-2 text-[14px] border border-[#E8E8E4] rounded focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] resize-none"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-[12px] font-semibold text-[#1A1816] mb-1.5">
                  Photos <span className="font-normal text-[#A8A8A4]">(optional, up to 4)</span>
                </label>
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded border border-[#E8E8E4] overflow-hidden group">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageFiles.length < 4 && (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#D4D4CF] rounded cursor-pointer hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors w-fit">
                    <ImagePlus className="w-4 h-4 text-[#737370]" />
                    <span className="text-[13px] text-[#737370]">Add photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  </label>
                )}
              </div>

              {postError && <p className="text-[13px] text-[#D03839]">{postError}</p>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E8E8E4] shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-[13px] font-medium text-[#444441] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePostThread}
                disabled={posting || uploadingImages || !newTitle.trim() || !newBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(posting || uploadingImages) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploadingImages ? 'Uploading...' : posting ? 'Posting...' : 'Post Thread'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start a post bar */}
      <div className="bg-white rounded-lg border border-[#E8E8E4] p-3 mb-4 flex items-center gap-3">
        <Avatar name={user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : ''} size={9} />
        <button
          onClick={() => user ? setShowNewThread(true) : setShowAuthModal(true)}
          className="flex-1 text-left px-4 py-2.5 rounded-full border border-[#E8E8E4] text-[13px] text-[#A8A8A4] hover:bg-[#F5F5F3] hover:border-[#D4D4CF] transition-colors"
        >
          Start a post...
        </button>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="space-y-3 mt-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#E8E8E4] p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E8E8E4]" />
                <div className="h-3 w-28 bg-[#E8E8E4] rounded" />
              </div>
              <div className="h-4 w-3/4 bg-[#E8E8E4] rounded" />
              <div className="space-y-1.5">
                <div className="h-3 bg-[#E8E8E4] rounded" />
                <div className="h-3 w-5/6 bg-[#E8E8E4] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E8E8E4] px-6 py-14 text-center mt-1">
          <div className="w-12 h-12 rounded-full bg-[#F5F5F3] flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-5 h-5 text-[#D4D4CF]" />
          </div>
          <p className="text-[14px] font-semibold text-[#1A1816] mb-1">No threads yet</p>
          <p className="text-[13px] text-[#737370]">Be the first to start a discussion.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mt-1">
            {threads.map(thread => {
              const voted = votedMap[thread.id] || false
              return (
                <div key={thread.id} className="bg-white rounded-lg border border-[#E8E8E4] overflow-hidden transition-shadow hover:shadow-sm">
                  <Link href={`/community/${category}/${thread.id}`} className="block px-4 pt-4 pb-3">
                    {/* Author row */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar name={thread.user_name} size={8} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-[#1A1816]">{thread.user_name}</span>
                          <span className="text-[12px] text-[#A8A8A4]">{timeAgo(thread.created_at)}</span>
                          {thread.is_pinned && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#0F6E56] bg-[#E4F5EC] px-1.5 py-0.5 rounded-full">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Content row — text + optional thumbnail */}
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold text-[#1A1816] mb-2 leading-snug">{thread.title}</p>
                        {thread.body && (
                          <p className={`text-[13px] text-[#555552] leading-[1.6] ${thread.images?.length > 0 ? 'line-clamp-2' : 'line-clamp-3'}`}>{thread.body}</p>
                        )}
                      </div>
                      {thread.images?.length > 0 && (
                        <img
                          src={thread.images[0]}
                          alt=""
                          className="w-[88px] h-[72px] rounded-lg object-cover flex-shrink-0 border border-[#E8E8E4]"
                        />
                      )}
                    </div>
                  </Link>
                  {/* Full-width action bar */}
                  <div className="flex border-t border-[#E8E8E4]">
                    <button
                      onClick={(e) => handleVote(e, thread.id)}
                      disabled={votingId === thread.id}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors border-r border-[#E8E8E4] ${
                        voted ? 'text-[#2563EB] bg-[#F0F6FF]' : 'text-[#737370] hover:bg-[#F5F5F3] hover:text-[#1A1816]'
                      } disabled:opacity-50`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Like{(thread.vote_count || 0) > 0 ? ` · ${thread.vote_count}` : ''}
                    </button>
                    <button
                      onClick={(e) => toggleComments(e, thread.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-colors ${
                        expandedId === thread.id ? 'text-[#D03839] bg-[#FEF0EF]' : 'text-[#737370] hover:bg-[#F5F5F3] hover:text-[#1A1816]'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Comment{(thread.reply_count || 0) > 0 ? ` · ${thread.reply_count}` : ''}
                    </button>
                  </div>

                  {/* Inline comments panel */}
                  {expandedId === thread.id && (
                    <div className="border-t-2 border-[#E8E8E4] bg-[#FAFAF8]">
                      {/* Reply input */}
                      <div className="px-4 pt-3 pb-3 border-b border-[#E8E8E4] bg-white">
                        <div className="flex gap-2.5">
                          <Avatar name={[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'M'} size={7} />
                          <div className="flex-1">
                            <textarea
                              value={inlineReply[thread.id] || ''}
                              onChange={e => setInlineReply(prev => ({ ...prev, [thread.id]: e.target.value }))}
                              placeholder="Write a comment..."
                              rows={2}
                              className="w-full px-3 py-2 text-[13px] border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#D03839] focus:border-[#D03839] resize-none bg-[#FAFAF8]"
                            />
                            {inlineReply[thread.id]?.trim() && (
                              <div className="flex justify-end mt-1.5">
                                <button
                                  onClick={() => handleInlineReply(thread.id)}
                                  disabled={inlineSubmitting === thread.id}
                                  className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white rounded transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-3 h-3" />
                                  {inlineSubmitting === thread.id ? 'Posting...' : 'Post'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Replies list */}
                      {fetchingReplies === thread.id ? (
                        <div className="px-4 py-4 flex items-center gap-2 text-[12px] text-[#A8A8A4]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading comments...
                        </div>
                      ) : (repliesCache[thread.id] || []).length === 0 ? (
                        <p className="px-4 py-4 text-[12px] text-[#A8A8A4]">No comments yet.</p>
                      ) : (
                        (repliesCache[thread.id] || []).map((reply, idx, arr) => (
                          <div key={reply.id} className={`px-4 py-3 flex gap-2.5 bg-white ${idx < arr.length - 1 ? 'border-b border-[#F0F0EC]' : ''}`}>
                            <Avatar name={reply.user_name} size={7} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-[12px] font-semibold text-[#1A1816]">{reply.user_name}</span>
                                <span className="text-[11px] text-[#A8A8A4]">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-[13px] text-[#444441] leading-relaxed">{reply.body}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button onClick={() => { const p = page - 1; setPage(p); fetchThreads(p) }} disabled={page === 1} className="px-3 py-1.5 text-[13px] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-[13px] text-[#737370]">Page {page} of {totalPages}</span>
              <button onClick={() => { const p = page + 1; setPage(p); fetchThreads(p) }} disabled={page === totalPages} className="px-3 py-1.5 text-[13px] border border-[#E8E8E4] rounded hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialStep="login" />
    </div>
  )
}
