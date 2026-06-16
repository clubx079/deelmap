'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Flame, Plus, ShieldCheck, MessageSquare, TrendingUp } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/community/PostCard'
import { LotsSidebar } from '@/components/community/LotsSidebar'
import { RightSidebar } from '@/components/community/RightSidebar'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { VerificationModal } from '@/components/community/VerificationModal'

const SUB_NAV = [
  { label: 'All Lots', value: 'all' },
  { label: 'Real Estate', value: 'real_estate', swatch: '#2563EB' },
  { label: 'Lending & Capital', value: 'lending', swatch: '#0F6E56' },
  { label: 'Finance & Strategy', value: 'finance', swatch: '#D03839' },
  { label: 'Contractors & Trades', value: 'contractors', swatch: '#B5620A' },
  { label: 'Markets', value: 'markets' },
]

const SORT_TABS = [
  { label: 'Hot', value: 'hot', icon: Flame },
  { label: 'New', value: 'new' },
  { label: 'Top', value: 'top' },
  { label: 'Rising', value: 'rising' },
  { label: 'Deal-linked', value: 'deal', special: true },
]

function CommunityInner() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  const lotSlug = params.get('lot')
  const sort = params.get('sort') || 'hot'
  const category = params.get('category') || 'all'

  const [lots, setLots] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [nextTier, setNextTier] = useState(null)
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [trending, setTrending] = useState([])
  const [activeDeals, setActiveDeals] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Load lots once
  useEffect(() => {
    fetch('/api/community/lots').then(r => r.json()).then(d => setLots(d.groups || [])).catch(() => setLots([]))
  }, [])

  // Load sidebar panels (trending + active deal discussions) once
  useEffect(() => {
    fetch('/api/community/sidebar')
      .then(r => r.json())
      .then(d => { setTrending(d.trending || []); setActiveDeals(d.activeDeals || []) })
      .catch(() => {})
  }, [])

  // Load profile when user changes
  useEffect(() => {
    if (!user?.id) { setProfile(null); setProfileLoaded(true); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => { setProfile(d.profile); setNextTier(d.next_tier); setProfileLoaded(true) })
      .catch(() => setProfileLoaded(true))
  }, [user?.id])

  const feedQuery = useCallback((offset = 0) => {
    const q = new URLSearchParams()
    q.set('sort', sort === 'deal' ? 'hot' : sort)
    if (sort === 'deal') q.set('deal', '1')
    if (lotSlug) q.set('lot', lotSlug)
    if (offset) q.set('offset', String(offset))
    return q.toString()
  }, [sort, lotSlug])

  // Load feed when filters change
  useEffect(() => {
    setLoading(true)
    fetch(`/api/community/posts?${feedQuery(0)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setHasMore(!!d.has_more) })
      .catch(() => { setPosts([]); setHasMore(false) })
      .finally(() => setLoading(false))
  }, [feedQuery, authHeaders])

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    fetch(`/api/community/posts?${feedQuery(posts.length)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setPosts(prev => [...prev, ...(d.posts || [])]); setHasMore(!!d.has_more) })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [feedQuery, authHeaders, posts.length])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === undefined || value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    router.push(`/community${next.toString() ? `?${next.toString()}` : ''}`)
  }

  const handleVote = async (postId, value) => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const oldVote = p.user_vote || 0
      const delta = value - oldVote
      return { ...p, user_vote: value, score: (p.score || 0) + delta }
    }))
    const post = posts.find(p => p.id === postId)
    if (!post) return
    await fetch(`/api/community/posts/${post.slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    }).catch(() => { /* keep optimistic */ })
  }

  const handleSave = async (postId, save) => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: save } : p))
    if (save) {
      await fetch('/api/community/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ post_id: postId }),
      }).catch(() => {})
    } else {
      await fetch(`/api/community/saves?post_id=${postId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      }).catch(() => {})
    }
  }

  const onStartPost = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    router.push('/community/new')
  }

  const onStartVerify = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setShowVerification(true)
  }

  // Filter sub-nav: when category chip clicked, also clear lot filter
  const filteredGroups = lots && category !== 'all' ? lots.filter(g => g.category === category) : lots

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Sub-nav — sticks to viewport top when the navbar scrolls away.
          Navbar is position:relative in this app (globals.css), so it scrolls
          out of view and the sub-nav becomes the top affixed bar. */}
      <div className="sticky top-[80px] z-30 bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="h-[52px] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {SUB_NAV.map(chip => {
              const active = chip.value === category
              return (
                <button
                  key={chip.value}
                  onClick={() => updateParam('category', chip.value)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold whitespace-nowrap transition-colors border ${
                    active ? 'bg-[#1A1816] text-white border-[#1A1816]'
                           : 'bg-white text-[#444441] border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816]'
                  }`}
                >
                  {chip.swatch && !active && <span className="w-2 h-2 rounded-[2px]" style={{ background: chip.swatch }} />}
                  {chip.label}
                </button>
              )
            })}
            {profile && (
              <Link
                href="/community/me"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold whitespace-nowrap transition-colors border bg-white text-[#444441] border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816]"
              >
                My Profile
              </Link>
            )}
            {profile && (
              <Link
                href="/community/me/saved"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold whitespace-nowrap transition-colors border bg-white text-[#444441] border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816]"
              >
                My Saved
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero strip — full-width title + tagline + CTA. Anchors the page when feed is empty. */}
      <div className="bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#1A1816] leading-tight">
              {lotSlug ? lots?.flatMap(g => g.lots).find(l => l.slug === lotSlug)?.name || 'Community' : 'Community'}
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-[#737370] mt-1">
              Chosen handles, verified roles, deal-anchored conversations.
            </p>
          </div>
          <button
            onClick={onStartPost}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[13px] rounded transition-colors w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Start a Post
          </button>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-3 md:px-8 py-4 md:py-5 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-[260px_1fr_320px]">
        <LotsSidebar groups={filteredGroups} />

        <main>
          {/* Sort bar */}
          <div className="bg-white border border-[#E8E8E4] rounded p-1.5 flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
            {SORT_TABS.map(tab => {
              const active = tab.value === sort
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => updateParam('sort', tab.value)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-[#1A1816] text-white'
                           : tab.special ? 'text-[#0F6E56] hover:bg-[#ECFDF5]'
                                         : 'text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  {tab.special && !active && <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Feed */}
          {loading ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <EmptyState onStart={onStartPost} />
          ) : (
            <div className="space-y-3">
              {posts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  isSaved={p.is_saved}
                  onVote={handleVote}
                  onSave={handleSave}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full h-11 rounded border border-[#E8E8E4] bg-white text-[13.5px] font-bold text-[#1A1816] hover:border-[#D1D1CE] disabled:opacity-60 transition-colors"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </main>

        <RightSidebar profile={profile} nextTier={nextTier} trending={trending} activeDeals={activeDeals} onStartVerify={onStartVerify} />
      </div>

      <Footer hideCta />

      <HandlePickerModal
        open={showHandlePicker}
        onClose={() => setShowHandlePicker(false)}
        onCreated={(p) => { setProfile(p); setShowHandlePicker(false) }}
      />

      <VerificationModal
        open={showVerification}
        onClose={() => setShowVerification(false)}
        onSubmitted={() => setShowVerification(false)}
      />

      {/* Prompt logged-in users without profile to pick a handle */}
      {profileLoaded && user?.id && !profile && (
        <FirstVisitPrompt onPick={() => setShowHandlePicker(true)} />
      )}
    </div>
  )
}

function FirstVisitPrompt({ onPick }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#1A1816] text-white rounded shadow-xl px-4 py-3 flex items-center gap-3 max-w-[92vw]">
      <span className="text-[13px]">Pick your community handle to start posting, voting, and saving.</span>
      <button onClick={onPick} className="px-3 py-1.5 bg-[#D03839] hover:bg-[#C73022] rounded text-[12px] font-bold">
        Pick handle
      </button>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-[#E8E8E4] rounded grid grid-cols-[52px_1fr] overflow-hidden">
          <div className="bg-[#FAFAF8] border-r border-[#E8E8E4] h-32" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-1/2 bg-[#F3F3EF] rounded" />
            <div className="h-5 w-3/4 bg-[#F3F3EF] rounded" />
            <div className="h-3 w-full bg-[#F3F3EF] rounded" />
            <div className="h-3 w-5/6 bg-[#F3F3EF] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onStart }) {
  const tips = [
    { icon: MessageSquare, color: '#2563EB', bg: '#DBEAFE', title: 'Ask the hard question', body: 'Drop the deal, the comp, the rate. Numbers get numbers back.' },
    { icon: ShieldCheck,   color: '#0F6E56', bg: '#DCFCE7', title: 'Verify your role',      body: 'NMLS, license + COI, closed-assignment proof. The badge does the trust work.' },
    { icon: TrendingUp,    color: '#D03839', bg: '#FEE2E2', title: 'Anchor to a deal',      body: 'Link any active listing or off-market deal. Comments stay attached.' },
  ]
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="p-8 md:p-10 text-center border-b border-[#E8E8E4] bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <MessageSquare className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          The conversation starts with you.
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          This Lot is fresh. Post the underwriting question, the rate quote, the contractor reference — whatever you wish someone else had already asked.
        </p>
        <button
          onClick={onStart}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Start the first post
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F3F3EF]">
        {tips.map((t, i) => {
          const Icon = t.icon
          return (
            <div key={i} className="p-5">
              <div className="w-9 h-9 rounded flex items-center justify-center mb-2.5" style={{ background: t.bg, color: t.color }}>
                <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
              </div>
              <div className="text-[13.5px] font-bold text-[#1A1816] mb-1">{t.title}</div>
              <div className="text-[12.5px] text-[#737370] leading-relaxed">{t.body}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityInner />
    </Suspense>
  )
}
