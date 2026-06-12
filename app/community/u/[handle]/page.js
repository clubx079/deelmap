'use client'

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ShieldCheck, MessageSquare, User as UserIcon, Calendar,
  Slash, MoreHorizontal, Loader2, AlertCircle,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/community/PostCard'
import { showToast } from '@/components/community/Dialogs'

export default function PublicProfilePage({ params }) {
  const { handle } = use(params)
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [tier, setTier] = useState(null)
  const [stats, setStats] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [posts, setPosts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [blockBusy, setBlockBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  useEffect(() => {
    setLoaded(false); setNotFound(false)
    fetch(`/api/community/u/${handle}`, { headers: authHeaders() })
      .then(async r => {
        if (r.status === 404) { setNotFound(true); setLoaded(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setProfile(d.profile)
        setTier(d.tier)
        setStats(d.stats)
        setViewer(d.viewer)
        setPosts(d.recent_posts || [])
        setLoaded(true)
      })
      .catch(() => { setLoaded(true) })
  }, [handle, authHeaders])

  const refresh = () => {
    fetch(`/api/community/u/${handle}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setViewer(d.viewer); setPosts(d.recent_posts || []) })
      .catch(() => {})
  }

  const toggleBlock = async () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    setBlockBusy(true)
    const wasBlocked = viewer?.is_blocked
    const res = wasBlocked
      ? await fetch(`/api/community/blocks?handle=${handle}`, { method: 'DELETE', headers: authHeaders() }).catch(() => null)
      : await fetch('/api/community/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ handle }),
        }).catch(() => null)
    setBlockBusy(false)
    setMenuOpen(false)
    if (!res?.ok) {
      showToast('Could not update block.', { variant: 'error' })
      return
    }
    showToast(wasBlocked ? `@${handle} unblocked` : `@${handle} blocked`, { variant: 'success' })
    refresh()
  }

  if (loaded && notFound) {
    return <ProfileNotFound handle={handle} />
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <Navbar />
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10">
          <div className="bg-white border border-[#E8E8E4] rounded p-6 animate-pulse h-48" />
        </div>
        <Footer hideCta />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Sub-nav */}
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
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded bg-[#1A1816] text-white text-[13px] font-semibold whitespace-nowrap">
              <UserIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              @{profile?.handle}
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-linear-to-br from-[#0F172A] to-[#1E293B] text-white">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
            <div className="shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-br from-[#D03839] to-[#FB7185] flex items-center justify-center text-white text-[28px] md:text-[32px] font-extrabold border-[3px] border-white/10 shadow-xl">
                {(profile?.handle || '?').slice(0, 1).toUpperCase()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight leading-none">
                  @{profile?.handle}
                </h1>
                {profile?.role_badge && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#0F6E56]">
                    <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                    Verified {cap(profile.role_badge)}
                  </span>
                )}
                {profile?.is_moderator && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#D03839]">
                    Moderator
                  </span>
                )}
              </div>
              {profile?.display_name && (
                <div className="text-[14px] text-white/70">{profile.display_name}</div>
              )}
              {profile?.bio && (
                <p className="text-[13px] text-white/85 mt-2 leading-relaxed max-w-2xl">{profile.bio}</p>
              )}

              {/* Stat strip */}
              <div className="mt-3.5 flex items-center gap-4 text-[12px] text-white/70 flex-wrap">
                <span className="inline-flex items-baseline gap-1.5">
                  <strong className="text-white text-[15px] font-extrabold leading-none">
                    {(profile?.equity_score || 0).toLocaleString()}
                  </strong>
                  Equity
                </span>
                {tier && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="text-white/80 font-semibold">{tier.name} tier</span>
                  </>
                )}
                <span className="text-white/30">·</span>
                <span>
                  <strong className="text-white font-extrabold">{stats?.post_count ?? 0}</strong> posts
                </span>
                <span className="text-white/30">·</span>
                <span>
                  <strong className="text-white font-extrabold">{stats?.comment_count ?? 0}</strong> comments
                </span>
                {profile?.created_at && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {formatJoined(profile.created_at)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            {viewer && !viewer.is_self && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen(o => !o)}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-[13px] rounded border border-white/20 transition-colors w-full md:w-auto"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  Actions
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-[#1A1816] rounded shadow-xl border border-[#E8E8E4] py-1 z-50">
                    <button
                      type="button"
                      disabled={blockBusy}
                      onClick={toggleBlock}
                      className="w-full text-left px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#FAFAF8] disabled:opacity-50"
                    >
                      {blockBusy ? <Loader2 className="w-4 h-4 animate-spin text-[#737370]" /> : <Slash className="w-4 h-4 text-[#D03839]" />}
                      {viewer.is_blocked ? `Unblock @${profile?.handle}` : `Block @${profile?.handle}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-3 md:px-8 py-4 md:py-5">
        {viewer?.is_blocked_by ? (
          <BlockedByBanner handle={profile?.handle} />
        ) : viewer?.is_blocked ? (
          <YouBlockedBanner handle={profile?.handle} onUnblock={toggleBlock} busy={blockBusy} />
        ) : posts.length === 0 ? (
          <EmptyPosts handle={profile?.handle} />
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#737370]" />
              <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-[#1A1816]">
                Recent posts <span className="text-[#737370] font-bold">· {posts.length}</span>
              </h2>
            </div>
            <div className="space-y-3">
              {posts.map(p => (
                <PostCard key={p.id} post={p} isSaved={false} />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer hideCta />
    </div>
  )
}

function EmptyPosts({ handle }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded p-8 md:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
        <MessageSquare className="w-6 h-6" strokeWidth={2} />
      </div>
      <h3 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">
        @{handle} hasn&apos;t posted yet.
      </h3>
      <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
        Check back later, or browse the community feed for active threads.
      </p>
    </div>
  )
}

function BlockedByBanner({ handle }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded p-8 md:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEE2E2] text-[#991B1B] mb-4">
        <AlertCircle className="w-6 h-6" strokeWidth={2} />
      </div>
      <h3 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">
        You can&apos;t view @{handle}&apos;s posts.
      </h3>
      <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
        This user has restricted who can see their content.
      </p>
    </div>
  )
}

function YouBlockedBanner({ handle, onUnblock, busy }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded p-8 md:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF3C7] text-[#92400E] mb-4">
        <Slash className="w-6 h-6" strokeWidth={2} />
      </div>
      <h3 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">
        You blocked @{handle}.
      </h3>
      <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
        Their posts and comments are hidden from your feed. Unblock to see them again.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onUnblock}
        className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#1A1816] hover:bg-[#2A2825] text-white font-bold text-[14px] rounded transition-colors disabled:opacity-50"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Unblock
      </button>
    </div>
  )
}

function ProfileNotFound({ handle }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-12">
        <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
          <div className="p-8 md:p-12 text-center bg-linear-to-b from-[#FFFBFB] to-white">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
              <UserIcon className="w-6 h-6" strokeWidth={2} />
            </div>
            <h2 className="text-[22px] font-extrabold text-[#1A1816] tracking-tight">Profile not found</h2>
            <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find a community profile for <code className="text-[#444441] bg-[#FAFAF8] px-1.5 py-0.5 rounded text-[12px]">@{handle}</code>.
              The handle may have been changed, the account removed, or it never existed.
            </p>
            <Link
              href="/community"
              className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
            >
              Back to community
            </Link>
          </div>
        </div>
      </div>
      <Footer hideCta />
    </div>
  )
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }
function formatJoined(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
