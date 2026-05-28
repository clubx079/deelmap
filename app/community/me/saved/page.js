'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, ArrowLeft, Plus, Compass } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/community/PostCard'
import { RightSidebar } from '@/components/community/RightSidebar'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { VerificationModal } from '@/components/community/VerificationModal'
import { showToast } from '@/components/community/Dialogs'

export default function MySavedPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [nextTier, setNextTier] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [showVerification, setShowVerification] = useState(false)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Load profile
  useEffect(() => {
    if (!user?.id) { setProfile(null); setProfileChecked(true); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        setNextTier(d.next_tier)
        setProfileChecked(true)
      })
      .catch(() => setProfileChecked(true))
  }, [user?.id])

  // Load saved posts (only after profile is known)
  useEffect(() => {
    if (!profileChecked) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch('/api/community/saves', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [profileChecked, user?.id, authHeaders])

  const onVote = async (postId, value) => {
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
    }).catch(() => {})
  }

  // Unsave: remove from list immediately
  const onSave = async (postId, save) => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    if (!save) {
      // Optimistically remove from this list
      const removed = posts.find(p => p.id === postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      const res = await fetch(`/api/community/saves?post_id=${postId}`, { method: 'DELETE', headers: authHeaders() }).catch(() => null)
      if (!res?.ok && removed) {
        // Restore on failure
        setPosts(prev => [removed, ...prev])
        showToast('Could not remove from saved.', { variant: 'error' })
      } else {
        showToast('Removed from saved', { variant: 'success' })
      }
    } else {
      // Saving from this view shouldn't happen (it's already saved), but handle gracefully
      await fetch('/api/community/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ post_id: postId }),
      }).catch(() => {})
    }
  }

  const onStartVerify = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!profile) { setShowHandlePicker(true); return }
    setShowVerification(true)
  }

  // Guest state — render sign-in CTA in place of the feed
  const isGuest = profileChecked && !user?.id
  const isMissingProfile = profileChecked && user?.id && !profile

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Sub-nav — minimal, just a back link */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">
          <div className="h-[52px] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold text-[#444441] border border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Community
            </Link>
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded bg-[#1A1816] text-white text-[13px] font-semibold whitespace-nowrap">
              <Bookmark className="w-3.5 h-3.5" strokeWidth={2.5} fill="currentColor" />
              My Saved
            </span>
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#1A1816] leading-tight">
              My Saved
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-[#737370] mt-1">
              {posts.length === 0
                ? 'Threads you bookmark for later show up here.'
                : `${posts.length} thread${posts.length === 1 ? '' : 's'} saved.`}
            </p>
          </div>
          <Link
            href="/community"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#1A1816] hover:bg-[#2A2825] text-white font-bold text-[13px] rounded transition-colors w-full sm:w-auto"
          >
            <Compass className="w-4 h-4" strokeWidth={2.5} />
            Browse Community
          </Link>
        </div>
      </div>

      {/* Grid: feed + right rail (no left sidebar — not relevant here) */}
      <div className="max-w-[1440px] mx-auto px-3 md:px-8 py-4 md:py-5 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <main>
          {!profileChecked || (user?.id && loading) ? (
            <FeedSkeleton />
          ) : isGuest ? (
            <GuestPrompt />
          ) : isMissingProfile ? (
            <NeedProfilePrompt onPick={() => setShowHandlePicker(true)} />
          ) : posts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {posts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  isSaved={true}
                  onVote={onVote}
                  onSave={onSave}
                />
              ))}
            </div>
          )}
        </main>

        <RightSidebar
          profile={profile}
          nextTier={nextTier}
          trending={[]}
          activeDeals={[]}
          onStartVerify={onStartVerify}
        />
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
        <div key={i} className="bg-white border border-[#E8E8E4] rounded-lg grid grid-cols-[52px_1fr] overflow-hidden">
          <div className="bg-[#FAFAF8] border-r border-[#E8E8E4] h-32" />
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

function GuestPrompt() {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white border-b border-[#E8E8E4]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Bookmark className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Sign in to see your saved threads
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Save deal-anchored discussions, comp debates, and lender quotes so you can come back to them later.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}

function NeedProfilePrompt({ onPick }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Bookmark className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Pick a handle first
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Saves are tied to your community profile. Pick a handle — anonymous or your real name — and you're in.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Pick handle
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  const tips = [
    { title: 'Hit the bookmark icon', body: 'Tap Save on any post in the feed to come back to it later.' },
    { title: 'Track underwriting threads', body: 'Save comp debates so you can revisit the math when you\'re ready to bid.' },
    { title: 'Build a reference library', body: 'Save lender rate quotes and contractor recommendations for when you need them.' },
  ]
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white border-b border-[#E8E8E4]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Bookmark className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          You haven&apos;t saved anything yet.
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          When you find a thread worth coming back to, tap the bookmark icon and it&apos;ll land here.
        </p>
        <Link
          href="/community"
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Browse Community
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F3F3EF]">
        {tips.map((t, i) => (
          <div key={i} className="p-5">
            <div className="w-9 h-9 rounded flex items-center justify-center mb-2.5 bg-[#FEF0EF] text-[#D03839]">
              <Bookmark className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <div className="text-[13.5px] font-bold text-[#1A1816] mb-1">{t.title}</div>
            <div className="text-[12.5px] text-[#737370] leading-relaxed">{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
