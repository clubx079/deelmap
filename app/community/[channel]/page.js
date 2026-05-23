'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { ChevronUp, MessageSquare, Plus, X, ChevronDown, Flame, Clock, TrendingUp, Home } from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────
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

// ── Post Card ────────────────────────────────────────────────────
function PostCard({ post, onVote, userId }) {
  const [votes, setVotes] = useState(post.upvote_count || 0)
  const [voted, setVoted] = useState(false)
  const [voting, setVoting] = useState(false)

  const badge = POST_TYPE_BADGE[post.post_type] || { label: post.post_type, cls: 'bg-[#F5F5F3] text-[#737370]' }
  const channelSlug = post.channel?.slug
  const href = `/community/${channelSlug || 'deals'}/${post.id}`

  async function handleVote(e) {
    e.preventDefault()
    if (!userId || voting) return
    setVoting(true)
    const res = await fetch(`/api/community/posts/${post.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!data.error) { setVotes(data.upvote_count); setVoted(data.voted) }
    setVoting(false)
  }

  return (
    <div className="bg-white border border-[#E8E8E4] rounded flex gap-0 hover:border-[#D0D0CC] transition-colors">
      {/* Vote column */}
      <div className="flex flex-col items-center px-3 py-4 gap-1 shrink-0 bg-[#FAFAF8] rounded-l border-r border-[#E8E8E4]">
        <button
          onClick={handleVote}
          className={`p-1 rounded transition-colors ${voted ? 'text-[#D03839]' : 'text-[#A8A8A4] hover:text-[#D03839]'}`}
        >
          <ChevronUp className="w-4 h-4" strokeWidth={voted ? 2.5 : 2} />
        </button>
        <span className={`text-[12px] font-bold leading-none ${voted ? 'text-[#D03839]' : 'text-[#444441]'}`}>{votes}</span>
      </div>

      {/* Content */}
      <Link href={href} className="flex-1 min-w-0 px-4 py-3 block">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`inline-flex items-center h-4.5 px-2 rounded text-[10px] font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
          {post.channel && (
            <span className="text-[11px] text-[#A8A8A4]">in {post.channel.name}</span>
          )}
        </div>

        <h3 className="text-[14px] font-semibold text-[#1A1816] leading-snug mb-1 line-clamp-2">
          {post.title}
        </h3>

        {post.post_type === 'deal' && (post.asking_price || post.address) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5">
            {post.address && (
              <span className="text-[12px] text-[#737370] truncate max-w-[240px]">{post.address}</span>
            )}
            {post.asking_price && (
              <span className="text-[12px] font-semibold text-[#1A1816]">Ask: {fmt(post.asking_price)}</span>
            )}
            {post.arv && (
              <span className="text-[12px] text-[#737370]">ARV: {fmt(post.arv)}</span>
            )}
            {post.spread > 0 && (
              <span className="text-[12px] font-semibold text-[#16A34A]">Spread: {fmt(post.spread)}</span>
            )}
            {(post.beds || post.baths) && (
              <span className="text-[12px] text-[#737370]">
                {post.beds ? `${post.beds}bd` : ''}{post.beds && post.baths ? ' · ' : ''}{post.baths ? `${post.baths}ba` : ''}
                {post.sqft ? ` · ${post.sqft.toLocaleString()} sqft` : ''}
              </span>
            )}
          </div>
        )}

        {post.post_type !== 'deal' && post.body && (
          <p className="text-[12px] text-[#737370] line-clamp-2 mb-1.5">{post.body}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-[#A8A8A4]">
          <span>by {post.user_name}</span>
          <span>{timeAgo(post.created_at)}</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {post.comment_count || 0}
          </span>
        </div>
      </Link>
    </div>
  )
}

// ── New Post Modal ───────────────────────────────────────────────
function NewPostModal({ channels, defaultChannel, userId, userName, onClose, onCreated }) {
  const [step, setStep] = useState(1) // 1 = type, 2 = form
  const [postType, setPostType] = useState('discussion')
  const [channelSlug, setChannelSlug] = useState(defaultChannel || channels[0]?.slug || '')
  const [form, setForm] = useState({
    title: '', body: '', address: '', propertyType: '', dealType: '',
    askingPrice: '', arv: '', estRepairs: '', beds: '', baths: '', sqft: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelSlug,
          postType,
          title: form.title.trim(),
          body: form.body.trim() || null,
          userId,
          userName,
          address: form.address || null,
          propertyType: form.propertyType || null,
          dealType: form.dealType || null,
          askingPrice: form.askingPrice ? Number(form.askingPrice) : null,
          arv: form.arv ? Number(form.arv) : null,
          estRepairs: form.estRepairs ? Number(form.estRepairs) : null,
          beds: form.beds ? Number(form.beds) : null,
          baths: form.baths ? Number(form.baths) : null,
          sqft: form.sqft ? Number(form.sqft) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Failed'); return }
      onCreated(data)
    } catch {
      setError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816]'
  const lbl = 'block text-[12px] font-semibold text-[#444441] mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded w-full max-w-[560px] shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4] shrink-0">
          <h2 className="text-[16px] font-bold text-[#1A1816]">New Post</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#FAFAF8] text-[#737370]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="px-6 py-5">
            <p className="text-[13px] font-semibold text-[#444441] mb-3">What are you posting?</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'deal', label: 'Deal', desc: 'Share a wholesale deal' },
                { type: 'discussion', label: 'Discussion', desc: 'Start a conversation' },
                { type: 'question', label: 'Question', desc: 'Ask the community' },
                { type: 'wins', label: 'Win', desc: 'Share a success story' },
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => { setPostType(opt.type); setStep(2) }}
                  className="p-4 border border-[#E8E8E4] rounded text-left hover:border-[#D03839] hover:bg-[#FEF0EF] transition-colors group"
                >
                  <p className="text-[13px] font-semibold text-[#1A1816] mb-0.5">{opt.label}</p>
                  <p className="text-[11px] text-[#737370]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={lbl}>Channel</label>
                <select value={channelSlug} onChange={e => setChannelSlug(e.target.value)}
                  className={inp + ' appearance-none'}>
                  {channels.map(ch => <option key={ch.id} value={ch.slug}>{ch.name}</option>)}
                </select>
              </div>
              <div className="w-28">
                <label className={lbl}>Post Type</label>
                <div className="h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#737370] flex items-center capitalize bg-[#FAFAF8]">
                  {postType}
                </div>
              </div>
            </div>

            <div>
              <label className={lbl}>Title <span className="text-[#D03839]">*</span></label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={postType === 'deal' ? '123 Main St, Dallas TX — Wholesale Deal' : 'What\'s on your mind?'}
                className={inp} required />
            </div>

            {postType === 'deal' && (
              <>
                <div>
                  <label className={lbl}>Property Address</label>
                  <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, Dallas, TX 75001" className={inp} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Asking Price</label>
                    <input type="number" value={form.askingPrice} onChange={e => setForm(f => ({ ...f, askingPrice: e.target.value }))}
                      placeholder="85000" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>ARV</label>
                    <input type="number" value={form.arv} onChange={e => setForm(f => ({ ...f, arv: e.target.value }))}
                      placeholder="150000" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Est. Repairs</label>
                    <input type="number" value={form.estRepairs} onChange={e => setForm(f => ({ ...f, estRepairs: e.target.value }))}
                      placeholder="25000" className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className={lbl}>Beds</label>
                    <input type="number" value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))}
                      placeholder="3" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Baths</label>
                    <input type="number" value={form.baths} onChange={e => setForm(f => ({ ...f, baths: e.target.value }))}
                      placeholder="2" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Sqft</label>
                    <input type="number" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))}
                      placeholder="1450" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Deal Type</label>
                    <select value={form.dealType} onChange={e => setForm(f => ({ ...f, dealType: e.target.value }))}
                      className={inp + ' appearance-none'}>
                      <option value="">—</option>
                      <option>Wholesale</option>
                      <option>Wholetail</option>
                      <option>Subject-To</option>
                      <option>Novation</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={lbl}>{postType === 'deal' ? 'Description' : 'Body'} <span className="text-[#A8A8A4] font-normal">(optional)</span></label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={postType === 'deal' ? 'Details about the deal, rehab scope, seller situation...' : 'Share your thoughts...'}
                rows={4}
                className="w-full px-3 py-2.5 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816] resize-none"
              />
            </div>

            {error && <p className="text-[12px] text-[#D03839]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)}
                className="h-9 px-4 border border-[#E8E8E4] text-[#444441] text-[13px] font-medium rounded hover:border-[#1A1816] transition-colors">
                Back
              </button>
              <button type="submit" disabled={submitting || !form.title.trim()}
                className="flex-1 h-9 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50">
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Feed Page ───────────────────────────────────────────────
const SORT_TABS = [
  { key: 'hot',  label: 'Hot',  Icon: Flame },
  { key: 'new',  label: 'New',  Icon: Clock },
  { key: 'top',  label: 'Top',  Icon: TrendingUp },
]

export default function CommunityFeed({ params, channel: channelProp }) {
  const channelSlug = channelProp !== undefined ? channelProp : params?.channel || null
  const { user } = useAuth()
  const [channels, setChannels] = useState([])
  const [posts, setPosts] = useState([])
  const [sort, setSort] = useState('hot')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [channelInfo, setChannelInfo] = useState(null)

  useEffect(() => {
    fetch('/api/community/channels').then(r => r.json()).then(setChannels).catch(() => {})
  }, [])

  useEffect(() => {
    if (channelSlug && channels.length > 0) {
      setChannelInfo(channels.find(c => c.slug === channelSlug) || null)
    }
  }, [channelSlug, channels])

  const fetchPosts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, limit: '30' })
    if (channelSlug) params.set('channel', channelSlug)
    fetch(`/api/community/posts?${params}`)
      .then(r => r.json())
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelSlug, sort])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  function handleCreated(post) {
    setShowModal(false)
    setPosts(prev => [post, ...prev])
  }

  const canPost = !!user

  return (
    <div>
      {showModal && (
        <NewPostModal
          channels={channels}
          defaultChannel={channelSlug}
          userId={user?.id}
          userName={user?.name || user?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Anonymous'}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Header */}
      <div className="bg-white border border-[#E8E8E4] rounded px-5 py-4 mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#1A1816]">
            {channelInfo ? channelInfo.name : 'All Posts'}
          </h1>
          {channelInfo?.description && (
            <p className="text-[13px] text-[#737370] mt-0.5">{channelInfo.description}</p>
          )}
          {!channelInfo && (
            <p className="text-[13px] text-[#737370] mt-0.5">The DeelMap investor community</p>
          )}
        </div>
        {canPost ? (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors shrink-0">
            <Plus className="w-4 h-4" /> New Post
          </button>
        ) : (
          <Link href="/login"
            className="flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors">
            <Plus className="w-4 h-4" /> New Post
          </Link>
        )}
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-1 mb-3">
        {SORT_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded text-[13px] font-medium transition-colors ${
              sort === key
                ? 'bg-[#1A1816] text-white'
                : 'bg-white border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] hover:text-[#1A1816]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white border border-[#E8E8E4] rounded" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-[#E8E8E4] rounded p-12 text-center">
          <MessageSquare className="w-8 h-8 text-[#A8A8A4] mx-auto mb-3" />
          <h3 className="text-[14px] font-semibold text-[#1A1816] mb-1">No posts yet</h3>
          <p className="text-[13px] text-[#737370] mb-4">Be the first to post in this channel.</p>
          {canPost && (
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors">
              <Plus className="w-4 h-4" /> New Post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(p => (
            <PostCard key={p.id} post={p} userId={user?.id} />
          ))}
        </div>
      )}
    </div>
  )
}
