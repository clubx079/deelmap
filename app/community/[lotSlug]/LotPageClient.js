'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Flame, Layers, Users, MessageSquare, Bell, BellOff,
  TrendingUp, ChevronRight,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/community/PostCard'
import { RightSidebar } from '@/components/community/RightSidebar'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { VerificationModal } from '@/components/community/VerificationModal'
import { VerifyBadge } from '@/components/community/VerifyBadge'
import { showToast } from '@/components/community/Dialogs'

const CATEGORY_LABELS = {
  real_estate: 'Real Estate',
  lending:     'Lending & Capital',
  finance:     'Finance & Strategy',
  contractors: 'Contractors & Trades',
  markets:     'Markets',
}

const SORT_TABS = [
  { label: 'Hot',    value: 'hot', icon: Flame },
  { label: 'New',    value: 'new' },
  { label: 'Top',    value: 'top' },
  { label: 'Rising', value: 'rising' },
]

export function LotPageClient({ lotSlug }) {
  return (
    <Suspense fallback={<LotPageFallback />}>
      <LotPageInner lotSlug={lotSlug} />
    </Suspense>
  )
}

function LotPageFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-10">
        <div className="bg-white border border-[#E8E8E4] rounded h-40 animate-pulse" />
      </div>
    </div>
  )
}

function LotPageInner({ lotSlug }) {
  const router = useRouter()
  const search = useSearchParams()
  const sort = search.get('sort') || 'hot'

  const { user } = useAuth()

  const [lot, setLot] = useState(null)
  const [contributors, setContributors] = useState([])
  const [lotChecked, setLotChecked] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  const [profile, setProfile] = useState(null)
  const [nextTier, setNextTier] = useState(null)

  const [subBusy, setSubBusy] = useState(false)
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [trending, setTrending] = useState([])
  const [activeDeals, setActiveDeals] = useState([])

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Load sidebar panels (trending + active deal discussions)
  useEffect(() => {
    fetch('/api/community/sidebar')
      .then(r => r.json())
      .then(d => { setTrending(d.trending || []); setActiveDeals(d.activeDeals || []) })
      .catch(() => {})
  }, [])

  // Load lot detail
  useEffect(() => {
    setLotChecked(false); setNotFound(false)
    fetch(`/api/community/lots/${lotSlug}`, { headers: authHeaders() })
      .then(async r => {
        if (r.status === 404) { setNotFound(true); setLotChecked(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setLot(d.lot || null)
        setContributors(d.top_contributors || [])
        setLotChecked(true)
      })
      .catch(() => setLotChecked(true))
  }, [lotSlug, authHeaders])

  // Load profile
  useEffect(() => {
    if (!user?.id) { setProfile(null); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => { setProfile(d.profile); setNextTier(d.next_tier) })
      .catch(() => {})
  }, [user?.id])

  // Load feed
  useEffect(() => {
    if (!lotSlug) return
    setLoadingPosts(true)
    const q = new URLSearchParams()
    q.set('sort', sort)
    q.set('lot', lotSlug)
    fetch(`/api/community/posts?${q.toString()}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoadingPosts(false))
  }, [lotSlug, sort, authHeaders])

  const updateSort = (v) => {
    const next = new URLSearchParams(search.toString())
    if (!v || v === 'hot') next.delete('sort')
    else next.set('sort', v)
    router.push(`/community/${lotSlug}${next.toString() ? `?${next.toString()}` : ''}`)
  }

  const toggleSubscribe = async () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    if (subBusy) return

    const wasSubscribed = !!lot?.is_subscribed
    setSubBusy(true)
    setLot(prev => ({ ...prev, is_subscribed: !wasSubscribed }))
    const res = wasSubscribed
      ? await fetch(`/api/community/subscriptions?lot_slug=${lotSlug}`, { method: 'DELETE', headers: authHeaders() }).catch(() => null)
      : await fetch('/api/community/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ lot_slug: lotSlug }),
        }).catch(() => null)
    setSubBusy(false)
    if (!res?.ok) {
      setLot(prev => ({ ...prev, is_subscribed: wasSubscribed }))
      showToast('Could not update subscription.', { variant: 'error' })
    } else {
      showToast(wasSubscribed ? `Unsubscribed from ${lot.name}` : `Subscribed to ${lot.name}`, { variant: 'success' })
    }
  }

  const onStartPost = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    if (lot?.can_post === false) {
      showToast(`This Lot requires ${lot.min_equity_to_post} Equity to post.`, { variant: 'error' })
      return
    }
    router.push(`/community/new?lot=${lotSlug}`)
  }

  const onStartVerify = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setShowVerification(true)
  }

  const handleVote = async (postId, value) => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const delta = value - (p.user_vote || 0)
      return { ...p, user_vote: value, score: (p.score || 0) + delta }
    }))
    const post = posts.find(p => p.id === postId)
    if (!post) return
    await fetch(`/api/community/posts/${post.slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    }).catch(() => {})
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
      await fetch(`/api/community/saves?post_id=${postId}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {})
    }
  }

  const accent = lot?.accent_color || '#737370'
  const heroStyle = useMemo(() => ({
    background: `linear-gradient(135deg, ${accent}30 0%, #FFFFFF 80%)`,
  }), [accent])

  if (lotChecked && notFound) {
    return <LotNotFound slug={lotSlug} />
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Sub-nav — back link only */}
      <div className="sticky top-[80px] z-30 bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="h-[52px] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold text-[#444441] border border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Community
            </Link>
            {lot && (
              <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold whitespace-nowrap text-[#444441] border border-[#E8E8E4]">
                <span className="w-2 h-2 rounded-[2px]" style={{ background: accent }} />
                {CATEGORY_LABELS[lot.category] || lot.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      {!lotChecked ? (
        <div className="bg-white border-b border-[#E8E8E4]">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-7 animate-pulse">
            <div className="h-6 w-40 bg-[#F3F3EF] rounded mb-3" />
            <div className="h-8 w-72 bg-[#F3F3EF] rounded mb-3" />
            <div className="h-4 w-96 bg-[#F3F3EF] rounded" />
          </div>
        </div>
      ) : lot ? (
        <div className="border-b border-[#E8E8E4]" style={heroStyle}>
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-5 md:py-7">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ background: accent }}
                >
                  <Layers className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#737370] mb-1">
                    {CATEGORY_LABELS[lot.category] || lot.category}
                  </div>
                  <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#1A1816] leading-tight">
                    {lot.name}
                  </h1>
                  {lot.description && (
                    <p className="text-[13px] md:text-[13.5px] text-[#444441] mt-1.5 max-w-2xl leading-relaxed">
                      {lot.description}
                    </p>
                  )}
                  {/* Meta strip */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap text-[12px] text-[#737370] font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.25} />
                      <strong className="text-[#1A1816]">{(lot.post_count || 0).toLocaleString()}</strong> posts
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" strokeWidth={2.25} />
                      <strong className="text-[#1A1816]">{(lot.member_count || 0).toLocaleString()}</strong> members
                    </span>
                    {lot.min_equity_to_post > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[#B5620A]">
                        <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.25} />
                        {lot.min_equity_to_post} Equity to post
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 md:shrink-0">
                <button
                  type="button"
                  onClick={toggleSubscribe}
                  disabled={subBusy}
                  className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 font-bold text-[13px] rounded transition-colors flex-1 md:flex-none ${
                    lot.is_subscribed
                      ? 'bg-white text-[#1A1816] border border-[#D1D1CE] hover:border-[#D03839] hover:text-[#D03839]'
                      : 'bg-[#1A1816] hover:bg-[#2A2825] text-white'
                  }`}
                >
                  {lot.is_subscribed ? (
                    <><BellOff className="w-3.5 h-3.5" strokeWidth={2.5} /> Subscribed</>
                  ) : (
                    <><Bell className="w-3.5 h-3.5" strokeWidth={2.5} /> Subscribe</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onStartPost}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[13px] rounded transition-colors flex-1 md:flex-none"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  Post in {lot.name.length > 18 ? 'Lot' : lot.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main grid */}
      <div className="max-w-[1440px] mx-auto px-3 md:px-8 py-4 md:py-5 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <main className="min-w-0">
          {/* Sort bar */}
          <div className="bg-white border border-[#E8E8E4] rounded p-1.5 flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
            {SORT_TABS.map(tab => {
              const active = tab.value === sort
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  onClick={() => updateSort(tab.value)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#1A1816] text-white'
                      : 'text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8]'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Feed */}
          {loadingPosts ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <EmptyState lot={lot} onStart={onStartPost} />
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
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="hidden lg:block sticky top-[88px] self-start">
          {/* About this Lot */}
          {lot && (
            <div className="bg-white border border-[#E8E8E4] rounded p-4 mb-3.5">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-2">About this Lot</div>
              <div className="text-[13px] text-[#444441] leading-relaxed">
                {lot.description || 'A focused place to discuss this topic with verified pros and serious investors.'}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-2.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#737370]">Posts</div>
                  <div className="text-[18px] font-extrabold text-[#1A1816] leading-none mt-1">{(lot.post_count || 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-2.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#737370]">Members</div>
                  <div className="text-[18px] font-extrabold text-[#1A1816] leading-none mt-1">{(lot.member_count || 0).toLocaleString()}</div>
                </div>
              </div>
              {lot.min_equity_to_post > 0 && (
                <div className="mt-3 text-[12px] text-[#B5620A] bg-[#FFFBEB] border border-[#FDE68A] rounded px-3 py-2 leading-relaxed">
                  <strong className="font-bold">{lot.min_equity_to_post} Equity</strong> required to post here.
                  {profile && (lot.user_equity ?? profile.equity_score ?? 0) < lot.min_equity_to_post && (
                    <> You have <strong className="font-bold">{(lot.user_equity ?? profile.equity_score ?? 0).toLocaleString()}</strong>.</>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Top contributors */}
          {contributors.length > 0 && (
            <div className="bg-white border border-[#E8E8E4] rounded p-4 mb-3.5">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-2.5">
                Top contributors · 90d
              </div>
              <ul className="space-y-2.5">
                {contributors.map(c => (
                  <li key={c.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#94A3B8] to-[#64748B] text-white flex items-center justify-center font-extrabold text-[12px] shrink-0">
                      {(c.handle || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[#1A1816] truncate flex items-center gap-1">
                        @{c.handle}
                        {c.role_badge && <VerifyBadge kind={c.role_badge} />}
                      </div>
                      <div className="text-[11px] text-[#737370] font-semibold">
                        {c.post_count} post{c.post_count === 1 ? '' : 's'} · {(c.equity_score || 0).toLocaleString()} Equity
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <RightSidebar
            profile={profile}
            nextTier={nextTier}
            trending={trending}
            activeDeals={activeDeals}
            onStartVerify={onStartVerify}
          />
        </aside>
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
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-[#E8E8E4] rounded grid grid-cols-[52px_1fr] overflow-hidden">
          <div className="bg-[#FAFAF8] border-r border-[#E8E8E4] h-32 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-1/2 bg-[#F3F3EF] rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-[#F3F3EF] rounded animate-pulse" />
            <div className="h-3 w-full bg-[#F3F3EF] rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-[#F3F3EF] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ lot, onStart }) {
  const lotName = lot?.name || 'this Lot'
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="p-8 md:p-10 text-center border-b border-[#E8E8E4] bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <MessageSquare className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          {lotName} is fresh.
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          No posts yet. Drop the underwriting question, the rate quote, the contractor reference — whatever you wish someone else had already asked here.
        </p>
        <button
          onClick={onStart}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Start the first post
        </button>
      </div>
    </div>
  )
}

function LotNotFound({ slug }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-12">
        <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
          <div className="p-8 md:p-12 text-center bg-linear-to-b from-[#FFFBFB] to-white">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
              <Layers className="w-6 h-6" strokeWidth={2} />
            </div>
            <h2 className="text-[22px] font-extrabold text-[#1A1816] tracking-tight">Lot not found</h2>
            <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find a Lot at <code className="text-[#444441] bg-[#FAFAF8] px-1.5 py-0.5 rounded text-[12px]">/{slug}</code>.
              It may have been retired, renamed, or never existed.
            </p>
            <Link
              href="/community"
              className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
            >
              Browse all Lots <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>
      <Footer hideCta />
    </div>
  )
}
