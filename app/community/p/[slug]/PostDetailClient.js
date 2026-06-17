'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MessageSquare, Home as HomeIcon, ArrowRight, Bookmark, Flag,
  Bold, Italic, Quote, Link as LinkIcon, ImageIcon, Loader2, Plus, Flame,
  ArrowBigUp, ArrowBigDown,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { VoteRail } from '@/components/community/VoteRail'
import { VerifyBadge } from '@/components/community/VerifyBadge'
import { UserHoverCard } from '@/components/community/UserHoverCard'
import { LotTag } from '@/components/community/LotTag'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { showToast, showPrompt, showReportDialog } from '@/components/community/Dialogs'
import { ShareMenu } from '@/components/community/ShareMenu'
import { PostDetailSkeleton } from '@/components/community/PostDetailSkeleton'
import { renderRichBody } from '@/lib/community/markdown'

// ── sessionStorage cache (stale-while-revalidate) ────────────────────────
const CACHE_KEY = (slug) => `community-post-${slug}`
function readCache(slug) {
  if (typeof window === 'undefined') return null
  try { const raw = sessionStorage.getItem(CACHE_KEY(slug)); return raw ? JSON.parse(raw) : null }
  catch { return null }
}
function writeCache(slug, data) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(CACHE_KEY(slug), JSON.stringify(data)) } catch {}
}

// ── Constants ────────────────────────────────────────────────────────────

const CATEGORY_ACCENT = {
  real_estate: '#2563EB',
  lending:     '#0F6E56',
  finance:     '#D03839',
  contractors: '#B5620A',
  markets:     '#7C3AED',
}

const CATEGORY_SOFT = {
  real_estate: '#DBEAFE',
  lending:     '#DCFCE7',
  finance:     '#FEE2E2',
  contractors: '#FEF3C7',
  markets:     '#EDE9FE',
}

// Deterministic avatar gradient per handle — keeps the same handle visually consistent
function avatarGradient(handle) {
  const palettes = [
    ['#FB7185', '#D03839'], ['#34D399', '#0F6E56'], ['#FCD34D', '#B5620A'],
    ['#60A5FA', '#1E40AF'], ['#94A3B8', '#475569'], ['#A78BFA', '#5B21B6'],
  ]
  let h = 0
  for (const c of String(handle || '')) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  const p = palettes[Math.abs(h) % palettes.length]
  return `linear-gradient(135deg, ${p[0]}, ${p[1]})`
}

function initials(handle) {
  if (!handle) return '?'
  const parts = String(handle).replace(/^@/, '').split('_').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (handle.replace(/^@/, '')[0] || '?').toUpperCase()
}

function relativeTime(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`
  if (d < 86400 * 30) return `${Math.floor(d / 86400 / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

// Render the post body or a comment using the shared markdown renderer.
// Supports the full toolbar grammar (bold, italic, blockquote, link, image).
function renderBody(text) {
  return renderRichBody(text)
}

function buildTree(flat) {
  const byId = new Map(flat.map(c => [c.id, { ...c, children: [] }]))
  const roots = []
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(c)
    else roots.push(c)
  }
  return roots
}

// ── Page ─────────────────────────────────────────────────────────────────

export function PostDetailClient({ slug }) {
  const { user } = useAuth()
  const router = useRouter()

  // Back: return to wherever the user came from; fall back to the feed if they
  // landed here directly (new tab, shared link).
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/community')
  }, [router])

  // Re-render every 60s so relative timestamps ("just now" → "2m ago") stay fresh.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [profile, setProfile] = useState(null)
  const [replyParent, setReplyParent] = useState(null)
  const [commentSort, setCommentSort] = useState('top')

  const authHeaders = useCallback(() => (user?.id ? { 'x-user-id': user.id } : {}), [user?.id])

  const load = useCallback(async () => {
    // Stale-while-revalidate: paint cache instantly (if any), then refetch in background.
    const cached = readCache(slug)
    if (cached) {
      setData(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    try {
      const res = await fetch(`/api/community/posts/${slug}`, { headers: authHeaders() })
      const d = await res.json()
      setData(d)
      writeCache(slug, d)
    } finally { setLoading(false) }
  }, [slug, authHeaders])

  useEffect(() => { load() }, [load])

  // Keep cache in sync with local optimistic updates (votes, saves, etc.)
  useEffect(() => {
    if (data?.post) writeCache(slug, data)
  }, [data, slug])

  useEffect(() => {
    if (!user?.id) { setProfile(null); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json()).then(d => setProfile(d.profile))
  }, [user?.id])

  const ensureProfile = () => {
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return false }
    if (!profile) { setShowHandlePicker(true); return false }
    return true
  }

  const onPostVote = async (value) => {
    if (!ensureProfile()) return
    setData(prev => prev ? ({ ...prev, post: { ...prev.post, user_vote: value, score: (prev.post.score || 0) + (value - (prev.post.user_vote || 0)) } }) : prev)
    await fetch(`/api/community/posts/${slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    })
  }

  const onCommentVote = async (commentId, value) => {
    if (!ensureProfile()) return
    setData(prev => {
      if (!prev) return prev
      const comments = prev.comments.map(c => {
        if (c.id !== commentId) return c
        const delta = value - (c.user_vote || 0)
        return { ...c, user_vote: value, score: (c.score || 0) + delta }
      })
      return { ...prev, comments }
    })
    await fetch(`/api/community/comments/${commentId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ value }),
    })
  }

  const onSavePost = async () => {
    if (!ensureProfile()) return
    const nextSaved = !data?.post?.is_saved
    setData(prev => prev ? ({ ...prev, post: { ...prev.post, is_saved: nextSaved } }) : prev)
    if (nextSaved) {
      await fetch('/api/community/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ post_id: data.post.id }),
      })
    } else {
      await fetch(`/api/community/saves?post_id=${data.post.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
    }
  }

  const onSubmitComment = async (body, parentId) => {
    if (!ensureProfile()) return false
    const text = (body || '').trim()
    if (!text) return false
    const res = await fetch(`/api/community/posts/${slug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ body: text, parent_id: parentId || null }),
    })
    if (res.ok) {
      setReplyParent(null)
      await load()
      return true
    }
    return false
  }

  // ── Memoized derivations (must run on every render — Rules of Hooks) ──
  const comments = data?.comments || []
  const post = data?.post

  const tree = useMemo(() => {
    const roots = buildTree(comments)
    const sortFn = commentSort === 'new'
      ? (a, b) => new Date(b.created_at) - new Date(a.created_at)
      : commentSort === 'old'
        ? (a, b) => new Date(a.created_at) - new Date(b.created_at)
        : (a, b) => (b.score || 0) - (a.score || 0)
    roots.sort(sortFn)
    // Children inside each root keep chronological order (replies read top→bottom)
    return roots
  }, [comments, commentSort])

  const verifiedInThread = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const c of comments) {
      if (c.is_removed || !c.author?.role_badge) continue
      if (seen.has(c.author.handle)) continue
      seen.add(c.author.handle)
      out.push({ handle: c.author.handle, role: c.author.role_badge })
    }
    return out.slice(0, 6)
  }, [comments])

  // ── Loading / not-found ───────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <PostDetailSkeleton />
      </Shell>
    )
  }
  if (!post) {
    return (
      <Shell>
        <div className="bg-white border border-[#E8E8E4] rounded p-8 text-center">
          <p className="text-[15px] font-semibold text-[#1A1816]">Post not found.</p>
          <Link href="/community" className="inline-block mt-3 text-[13px] text-[#D03839] font-semibold">← Back to Community</Link>
        </div>
      </Shell>
    )
  }

  const related = data?.related_posts || []
  const lot = post.lot || {}
  const lotAccent = lot.accent_color || CATEGORY_ACCENT[lot.category] || '#737370'
  const lotSoft = CATEGORY_SOFT[lot.category] || '#F3F3EF'

  // Mark top reply (highest-scored root with score > 0) — derived from tree, not a hook
  const topReplyId = tree.length && tree[0].score > 0 ? tree[0].id : null

  return (
    <Shell>
      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3 mb-3 -ml-1 rounded text-[13px] font-semibold text-[#444441] hover:text-[#1A1816] hover:bg-[#F3F3EF] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        Back
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-[#737370] font-medium mb-4">
        <Link href="/community" className="hover:text-[#D03839]">Community</Link>
        <span className="text-[#D1D1CE]">/</span>
        {lot.slug && (
          <>
            <Link href={`/community?lot=${lot.slug}`} className="inline-flex items-center gap-1.5 hover:text-[#D03839]">
              <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: lotAccent }} />
              {lot.name}
            </Link>
            <span className="text-[#D1D1CE]">/</span>
          </>
        )}
        <span className="text-[#1A1816] font-semibold truncate max-w-[420px]">{post.title}</span>
      </nav>

      {/* Page grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 items-start">

        <main>
          {/* ── POST CARD ───────────────────────────────────────────── */}
          <article className="bg-white border border-[#E8E8E4] rounded overflow-hidden md:grid md:grid-cols-[64px_1fr]">
            {/* Desktop vote rail — hidden on mobile (vote goes inline in the action bar) */}
            <div className="hidden md:block bg-[#FAFAF8] border-r border-[#E8E8E4]">
              <VoteRail score={post.score || 0} userVote={post.user_vote || 0} onVote={onPostVote} />
            </div>

            <div className="p-4 md:p-7 min-w-0">
              {/* Mobile-only compact author row at top (Reddit-style) */}
              <div className="md:hidden flex items-center gap-2.5 mb-3">
                <div
                  className="w-9 h-9 rounded-full text-white font-extrabold text-[12px] flex items-center justify-center shrink-0"
                  style={{ background: avatarGradient(post.author?.handle) }}
                >
                  {initials(post.author?.handle)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                    <span className="text-[13px] font-bold text-[#1A1816]">@{post.author?.handle}</span>
                    {post.author?.role_badge && <VerifyBadge kind={post.author.role_badge} />}
                  </div>
                  <div className="text-[11.5px] text-[#737370] font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {lot.name && <span className="font-semibold text-[#444441]">{lot.name}</span>}
                    {lot.name && <span className="text-[#D1D1CE]">·</span>}
                    <span>{relativeTime(post.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Desktop-only tag chips (mobile shows lot inline in author row) */}
              <div className="hidden md:flex items-center gap-1.5 flex-wrap mb-3">
                {lot.name && <LotTag label={lot.name} category={lot.category} slug={lot.slug} />}
                {post.market_tag && <LotTag label={post.market_tag} category="markets" asLink={false} />}
              </div>

              {/* Mobile market tag (inline, smaller) */}
              {post.market_tag && (
                <div className="md:hidden mb-2">
                  <LotTag label={post.market_tag} category="markets" asLink={false} />
                </div>
              )}

              <h1 className="text-[19px] md:text-[28px] font-extrabold text-[#1A1816] leading-tight tracking-tight mb-3 md:mb-4 break-words">
                {post.title}
              </h1>

              {/* Author block — desktop only (mobile has the compact row above) */}
              <div className="hidden md:flex items-center gap-3 p-3 bg-[#FAFAF8] border border-[#E8E8E4] rounded mb-5">
                <div
                  className="w-10 h-10 rounded-full text-white font-extrabold text-[13px] flex items-center justify-center shrink-0 tracking-tight"
                  style={{ background: avatarGradient(post.author?.handle) }}
                >
                  {initials(post.author?.handle)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="font-bold text-[14px] text-[#1A1816]">@{post.author?.handle}</span>
                    {post.author?.role_badge && <VerifyBadge kind={post.author.role_badge} />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-[#737370] font-medium">
                    <span className="text-[#444441] font-semibold">Equity <strong className="text-[#1A1816]">{(post.author?.equity_score || 0).toLocaleString()}</strong></span>
                    <span className="text-[#D1D1CE]">·</span>
                    <span>Posted <strong className="text-[#444441]">{relativeTime(post.created_at)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Body */}
              {post.body && (
                <div className="text-[14px] md:text-[15px] text-[#1A1816] leading-[1.65] md:leading-[1.7] max-w-[720px] space-y-3 [&_p]:m-0 [&_strong]:text-[#1A1816] [&_strong]:font-bold break-words">
                  {renderBody(post.body)}
                </div>
              )}

              {/* Linked deal */}
              {post.deal && (
                <Link
                  href={post.deal.slug || post.deal.id ? `/${post.deal.slug || post.deal.id}` : '/marketplace'}
                  className="block mt-4 md:mt-5 max-w-[720px]"
                >
                  <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded p-3 md:p-3.5 hover:bg-[#DCFCE7] transition-colors">
                    <div className="grid grid-cols-[44px_1fr] md:grid-cols-[56px_1fr_auto] items-center gap-2.5 md:gap-3.5">
                      <div className="w-11 h-11 md:w-14 md:h-14 rounded bg-linear-to-br from-[#94A3B8] to-[#64748B] flex items-center justify-center text-white relative">
                        <HomeIcon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                        {post.deal.live && <span className="absolute top-1 right-1 w-2 h-2 bg-[#4ADE80] border-2 border-white rounded-full" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#0F6E56] mb-0.5">
                          ◆ Linked Deal · {post.deal.live ? 'Active' : 'Closed'}
                        </div>
                        <div className="text-[13px] md:text-[14px] font-bold text-[#1A1816] mb-0.5 truncate tracking-tight">{post.deal.address}</div>
                        <div className="flex gap-2 md:gap-3 text-[11.5px] md:text-[12px] text-[#444441] flex-wrap font-medium">
                          {post.deal.price && <span><strong className="text-[#1A1816]">{post.deal.price}</strong></span>}
                          {post.deal.beds && <span><strong className="text-[#1A1816]">{post.deal.beds}</strong>{post.deal.sqft && <> · {post.deal.sqft}</>}</span>}
                          {post.deal.type && <span className="hidden md:inline">{post.deal.type}</span>}
                        </div>
                      </div>
                      <span className="hidden md:inline-flex items-center gap-1 px-3.5 py-2 bg-[#0F6E56] hover:bg-[#0A5740] text-white rounded text-[12.5px] font-bold tracking-wide whitespace-nowrap transition-colors">
                        View Listing <ArrowRight className="w-3 h-3" strokeWidth={3} />
                      </span>
                    </div>
                    <span className="md:hidden mt-2.5 inline-flex items-center justify-center w-full gap-1 px-3 py-2 bg-[#0F6E56] hover:bg-[#0A5740] text-white rounded text-[12px] font-bold tracking-wide transition-colors">
                      View Listing <ArrowRight className="w-3 h-3" strokeWidth={3} />
                    </span>
                  </div>
                </Link>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-1 md:gap-1 mt-4 md:mt-5 pt-3 md:pt-4 border-t border-[#F3F3EF] flex-wrap">
                {/* Mobile-only horizontal vote pill (replaces the vertical rail hidden on mobile) */}
                <div className="md:hidden inline-flex items-center bg-[#FAFAF8] border border-[#E8E8E4] rounded-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onPostVote(post.user_vote === 1 ? 0 : 1)}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${
                      post.user_vote === 1 ? 'text-[#D03839]' : 'text-[#737370] active:bg-white'
                    }`}
                    aria-label="Back"
                  >
                    <ArrowBigUp className="w-4 h-4" strokeWidth={2} fill={post.user_vote === 1 ? 'currentColor' : 'none'} />
                  </button>
                  <span className="px-1 text-[13px] font-extrabold text-[#1A1816] tabular-nums min-w-[20px] text-center">
                    {post.score || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPostVote(post.user_vote === -1 ? 0 : -1)}
                    className={`w-8 h-8 flex items-center justify-center transition-colors ${
                      post.user_vote === -1 ? 'text-[#444441]' : 'text-[#737370] active:bg-white'
                    }`}
                    aria-label="Pass"
                  >
                    <ArrowBigDown className="w-4 h-4" strokeWidth={2} fill={post.user_vote === -1 ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <ActionBtn icon={MessageSquare}>
                  <strong className="text-[#1A1816] font-bold">{post.comment_count || 0}</strong>
                  <span className="hidden sm:inline">{' '}comments</span>
                </ActionBtn>
                <ShareMenu
                  url={`/community/p/${post.slug}`}
                  title={post.title}
                  triggerClassName="inline-flex items-center gap-1.5 px-2 md:px-3 py-2 rounded text-[13px] font-semibold text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8] transition-colors"
                  iconClassName="w-3.5 h-3.5"
                  label={<span className="hidden sm:inline">Share</span>}
                />
                <ActionBtn
                  icon={Bookmark}
                  active={post.is_saved}
                  onClick={onSavePost}
                  iconFilled={post.is_saved}
                >
                  <span className="hidden sm:inline">{post.is_saved ? 'Saved' : 'Save'}</span>
                </ActionBtn>
                <button
                  type="button"
                  onClick={async () => {
                    if (!ensureProfile()) return
                    const result = await showReportDialog({
                      targetType: 'post',
                      targetId: post.id,
                      targetLabel: post.title,
                    })
                    if (result?.ok) showToast('Report submitted. Mods will review within 24h.', { variant: 'success' })
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 px-2 md:px-3 py-2 rounded text-[13px] font-semibold text-[#737370] hover:bg-[#FEF0EF] hover:text-[#D03839] transition-colors"
                  title="Report this post"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </div>
            </div>
          </article>

          {/* ── COMMENTS HEADER ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 mt-7 mb-3">
            <div className="text-[16px] font-extrabold text-[#1A1816] tracking-tight">
              <strong className="text-[#D03839]">{post.comment_count || 0}</strong> {post.comment_count === 1 ? 'comment' : 'comments'}
            </div>
            <div className="ml-auto flex items-center gap-1 p-1 bg-white border border-[#E8E8E4] rounded">
              {['top', 'new', 'old'].map(s => (
                <button
                  key={s}
                  onClick={() => setCommentSort(s)}
                  className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                    commentSort === s ? 'bg-[#1A1816] text-white' : 'text-[#444441] hover:text-[#1A1816]'
                  }`}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── THREAD ──────────────────────────────────────────────── */}
          <div className="space-y-2 mt-4 pb-2">
            {tree.length === 0 ? (
              <div className="bg-white border border-dashed border-[#E8E8E4] rounded p-8 text-center text-[14px] text-[#737370]">
                No comments yet. Drop the first reply — specifics beat sympathy.
              </div>
            ) : tree.map(c => (
              <CommentNode
                key={c.id}
                comment={c}
                opAuthorId={post.author?.id}
                isTopReply={c.id === topReplyId}
                onVote={onCommentVote}
                onReply={(id) => setReplyParent(id)}
                replyParent={replyParent}
                onSubmitReply={(text) => onSubmitComment(text, replyParent)}
                onCancelReply={() => setReplyParent(null)}
                profile={profile}
                ensureProfile={ensureProfile}
                authHeaders={authHeaders}
                depth={0}
              />
            ))}
          </div>

          {/* ── COMMENT COMPOSER (sticky bottom, Facebook-style) ──────── */}
          <div className="sticky bottom-0 z-20 -mx-3 md:-mx-4 mt-4 px-3 md:px-4 pt-3 pb-3 bg-[#FAFAF8]/95 backdrop-blur-sm border-t border-[#E8E8E4] shadow-[0_-4px_16px_rgba(26,24,22,0.06)]">
            {user?.id && profile ? (
              <CommentComposer
                profile={profile}
                authHeaders={authHeaders}
                onSubmit={(text) => onSubmitComment(text, null)}
                isReply={false}
              />
            ) : (
              <SignInToReplyCard
                user={user}
                onSignIn={() => window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))}
                onPickHandle={() => setShowHandlePicker(true)}
              />
            )}
          </div>
        </main>

        {/* ── RIGHT RAIL ───────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-[88px] space-y-3.5">
          <LotCard lot={lot} accent={lotAccent} soft={lotSoft} />
          {verifiedInThread.length > 0 && <VerifiedInThreadCard items={verifiedInThread} />}
          {related.length > 0 && <RelatedCard items={related} lotName={lot.name} lotSlug={lot.slug} />}
          <MiniRulesCard />
        </aside>
      </div>

      <HandlePickerModal
        open={showHandlePicker}
        onClose={() => setShowHandlePicker(false)}
        onCreated={(p) => { setProfile(p); setShowHandlePicker(false) }}
      />
    </Shell>
  )
}

// ── Comment node ─────────────────────────────────────────────────────────

function CommentNode({
  comment, opAuthorId, isTopReply, onVote, onReply, replyParent,
  onSubmitReply, onCancelReply, profile, ensureProfile, authHeaders, depth,
}) {
  const isOP = comment.author?.id && comment.author.id === opAuthorId
  const replyOpen = replyParent === comment.id
  const removed = comment.is_removed
  const cardCls = isTopReply
    ? 'border-[#BBF7D0] border-l-[3px] border-l-[#0F6E56] bg-linear-to-b from-[#ECFDF5] to-white'
    : 'border-[#E8E8E4] bg-white'

  return (
    <div>
      <div className={`relative border ${cardCls} rounded p-3.5`}>
        {isTopReply && (
          <span className="absolute -top-2.5 left-3.5 px-2 py-0.5 bg-[#0F6E56] text-white rounded text-[9px] font-extrabold tracking-[0.1em] uppercase">
            ▲ Top Reply
          </span>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-2">
          {removed ? (
            <em className="text-[12px] text-[#A8A8A4]">[removed by moderator]</em>
          ) : (
            <>
              <div
                className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                style={{ background: avatarGradient(comment.author?.handle) }}
              >
                {initials(comment.author?.handle)}
              </div>
              <UserHoverCard handle={comment.author?.handle}>
                <Link href={`/community/u/${comment.author?.handle}`} className="text-[13px] font-bold text-[#1A1816] hover:text-[#D03839]">@{comment.author?.handle}</Link>
              </UserHoverCard>
              {isOP && (
                <span className="px-1.5 py-0.5 bg-[#FEF0EF] text-[#D03839] rounded text-[9px] font-extrabold tracking-[0.08em]">OP</span>
              )}
              {comment.author?.role_badge && <VerifyBadge kind={comment.author.role_badge} />}
              <span className="text-[11.5px] text-[#737370] font-medium inline-flex items-center gap-1.5">
                <span className="text-[#D1D1CE]">·</span>
                <span>{relativeTime(comment.created_at)}</span>
              </span>
            </>
          )}
        </div>

        {!removed && (
          <div className="text-[13.5px] text-[#1A1816] leading-[1.6] mb-2.5 [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-[#1A1816] [&_strong]:font-bold">
            {renderBody(comment.body)}
          </div>
        )}

        {!removed && (
          <div className="flex items-center gap-0.5">
            <CommentVoteBtn
              dir={1}
              active={comment.user_vote === 1}
              onClick={() => onVote(comment.id, comment.user_vote === 1 ? 0 : 1)}
              score={comment.score || 0}
            />
            <CommentVoteBtn
              dir={-1}
              active={comment.user_vote === -1}
              onClick={() => onVote(comment.id, comment.user_vote === -1 ? 0 : -1)}
            />
            <button
              onClick={() => {
                if (!ensureProfile()) return
                onReply(replyOpen ? null : comment.id)
              }}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] font-semibold transition-colors ${
                replyOpen ? 'text-[#D03839]' : 'text-[#737370] hover:text-[#1A1816] hover:bg-[#FAFAF8]'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              {replyOpen ? 'Cancel' : 'Reply'}
            </button>
            <ShareMenu
              url={`${typeof location !== 'undefined' ? location.pathname : ''}#${comment.id}`}
              title={`Comment by @${comment.author?.handle || ''}`}
              triggerClassName="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] font-semibold text-[#737370] hover:text-[#1A1816] hover:bg-[#FAFAF8] transition-colors"
              iconClassName="w-3 h-3"
            />
            <button
              onClick={async () => {
                if (!ensureProfile()) return
                const result = await showReportDialog({
                  targetType: 'comment',
                  targetId: comment.id,
                  targetLabel: `Comment by @${comment.author?.handle || ''}`,
                })
                if (result?.ok) showToast('Report submitted. Mods will review within 24h.', { variant: 'success' })
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] font-semibold text-[#737370] hover:text-[#D03839] hover:bg-[#FEF0EF] transition-colors"
              title="Report this comment"
            >
              <Flag className="w-3 h-3" strokeWidth={2} />
              Report
            </button>
          </div>
        )}
      </div>

      {/* Inline reply composer when this is the active parent */}
      {replyOpen && (
        <div className={`mt-2 ${depth > 0 ? 'ml-0' : 'ml-3 md:ml-9 pl-3 md:pl-[18px]'}`}>
          <CommentComposer
            profile={profile}
            authHeaders={authHeaders}
            onSubmit={(text) => onSubmitReply(text)}
            onCancel={onCancelReply}
            isReply
            replyingTo={comment.author?.handle}
          />
        </div>
      )}

      {/* Nested children */}
      {comment.children?.length > 0 && (
        <div className="ml-3 md:ml-9 mt-1 pl-3 md:pl-[18px] border-l-2 border-[#F3F3EF] space-y-1">
          {comment.children.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              opAuthorId={opAuthorId}
              isTopReply={false}
              onVote={onVote}
              onReply={onReply}
              replyParent={replyParent}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              profile={profile}
              ensureProfile={ensureProfile}
              authHeaders={authHeaders}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentVoteBtn({ dir, active, onClick, score }) {
  const color = dir === 1 ? '#D03839' : '#444441'
  const hoverBg = dir === 1 ? 'hover:bg-[#FEF0EF]' : 'hover:bg-[#FAFAF8]'
  const Icon = dir === 1 ? ArrowBigUp : ArrowBigDown
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] font-semibold transition-colors ${hoverBg} ${active ? '' : 'text-[#737370]'}`}
      style={active ? { color } : undefined}
    >
      <Icon className="w-4 h-4" strokeWidth={2} fill={active ? 'currentColor' : 'none'} />
      {dir === 1 && (
        <span className="font-bold" style={active ? { color } : { color: '#1A1816' }}>
          {score}
        </span>
      )}
    </button>
  )
}

// ── Sign-in CTA shown in place of the comment composer for guests ─────
function SignInToReplyCard({ user, onSignIn, onPickHandle }) {
  if (!user?.id) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded px-4 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-[#1A1816]">Sign in to reply</div>
          <div className="text-[12.5px] text-[#737370] mt-0.5">
            Vote, comment, and save deal-anchored discussions.
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="h-10 px-4 inline-flex items-center justify-center bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[13px] rounded transition-colors whitespace-nowrap"
        >
          Sign in
        </button>
      </div>
    )
  }
  // Signed in but no community profile yet
  return (
    <div className="bg-white border border-[#E8E8E4] rounded px-4 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#1A1816]">Pick a handle to reply</div>
        <div className="text-[12.5px] text-[#737370] mt-0.5">
          Anonymous or your real name — your call. Takes 5 seconds.
        </div>
      </div>
      <button
        type="button"
        onClick={onPickHandle}
        className="h-10 px-4 inline-flex items-center justify-center bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[13px] rounded transition-colors whitespace-nowrap"
      >
        Pick handle
      </button>
    </div>
  )
}

// ── Comment composer ─────────────────────────────────────────────────────

function CommentComposer({ profile, onSubmit, onCancel, onFocus, isReply, replyingTo, authHeaders }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textRef = useRef(null)
  const fileRef = useRef(null)

  const submit = async (e) => {
    e?.preventDefault?.()
    const t = text.trim()
    if (!t) return
    setBusy(true)
    try {
      const ok = await onSubmit(t)
      if (ok) setText('')
    } finally { setBusy(false) }
  }

  // Captures selection at mousedown so toolbar clicks don't lose it
  const selRef = useRef({ s: 0, e: 0 })
  const captureSel = () => {
    const ta = textRef.current
    if (ta) selRef.current = { s: ta.selectionStart, e: ta.selectionEnd }
  }

  const wrap = (before, after = before) => {
    const { s, e } = selRef.current
    const sel = text.slice(s, e)
    setText(text.slice(0, s) + before + sel + after + text.slice(e))
    requestAnimationFrame(() => {
      const ta = textRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }
  const linePrefix = (prefix) => {
    const { s } = selRef.current
    const lineStart = text.lastIndexOf('\n', s - 1) + 1
    setText(text.slice(0, lineStart) + prefix + text.slice(lineStart))
    requestAnimationFrame(() => textRef.current?.focus())
  }
  const insertLink = async () => {
    const url = await showPrompt({
      title: 'Add a link',
      label: 'URL',
      placeholder: 'https://example.com',
      validate: (v) => v ? (v.startsWith('http') ? null : 'URL must start with http or https.') : 'URL required.',
    })
    if (!url) return
    const { s, e } = selRef.current
    const sel = text.slice(s, e) || 'link text'
    setText(text.slice(0, s) + `[${sel}](${url})` + text.slice(e))
  }
  const onImagePicked = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('scope', 'post')
      const res = await fetch('/api/community/upload', { method: 'POST', headers: authHeaders ? authHeaders() : {}, body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        showToast(data.error || 'Image upload failed.', { variant: 'error' })
        return
      }
      setText(prev => prev + `\n\n![](${data.url})\n\n`)
      showToast('Image added', { variant: 'success' })
    } catch {
      showToast('Image upload failed.', { variant: 'error' })
    } finally { setUploading(false) }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 bg-[#FAFAF8] border-b border-[#E8E8E4]">
        <div
          className="w-7 h-7 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0"
          style={{ background: profile ? avatarGradient(profile.handle) : '#A8A8A4' }}
        >
          {profile ? initials(profile.handle) : '?'}
        </div>
        <span className="text-[12px] md:text-[12.5px] text-[#444441] font-medium min-w-0 truncate">
          Replying as{' '}
          <strong className="text-[#1A1816] font-bold">@{profile?.handle || 'guest'}</strong>
          {isReply && replyingTo && <span className="text-[#737370]"> to @{replyingTo}</span>}
        </span>
        {profile && (
          <span className="hidden sm:inline-flex ml-auto text-[11px] text-[#737370] font-semibold shrink-0">
            Equity <strong className="text-[#1A1816] ml-1">{(profile.equity_score || 0).toLocaleString()}</strong>
          </span>
        )}
      </div>
      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSelect={captureSel}
        onKeyUp={captureSel}
        onClick={captureSel}
        onFocus={onFocus}
        placeholder={isReply ? 'Drop your reply — specifics beat sympathy.' : 'Add your take. Specifics beat sympathy — what would you actually do here?'}
        rows={3}
        className="w-full px-4 py-3.5 text-[14px] text-[#1A1816] leading-relaxed outline-none resize-y min-h-[90px] placeholder:text-[#A8A8A4]"
      />
      <div className="flex items-center gap-0.5 px-3 py-2 bg-[#FAFAF8] border-t border-[#E8E8E4]">
        <ToolBtn title="Bold"   onClick={() => wrap('**')}><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Italic" onClick={() => wrap('_')}><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <span className="w-px h-4 bg-[#D1D1CE] mx-1" />
        <ToolBtn title="Quote"  onClick={() => linePrefix('> ')}><Quote className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Link"   onClick={insertLink}><LinkIcon className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Image"  onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </ToolBtn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { onImagePicked(e.target.files?.[0]); e.target.value = '' }}
        />
        <div className="ml-auto flex items-center gap-2">
          {(isReply || text) && (
            <button
              type="button"
              onClick={() => { setText(''); onCancel?.() }}
              className="h-8 px-3 inline-flex items-center text-[12.5px] font-semibold text-[#444441] hover:text-[#1A1816]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="h-8 px-3.5 inline-flex items-center gap-1 bg-[#D03839] hover:bg-[#C73022] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[12.5px] rounded transition-colors"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {isReply ? 'Post reply' : 'Reply'}
          </button>
        </div>
      </div>
    </form>
  )
}

function ToolBtn({ children, onClick, title, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded flex items-center justify-center text-[#737370] hover:bg-white hover:text-[#1A1816] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function ActionBtn({ icon: Icon, children, onClick, active, iconFilled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-[13px] font-semibold transition-colors ${
        active ? 'text-[#D03839] bg-[#FEF0EF]' : 'text-[#444441] hover:text-[#1A1816] hover:bg-[#FAFAF8]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} fill={iconFilled ? 'currentColor' : 'none'} />
      {children}
    </button>
  )
}

// ── Right rail cards ─────────────────────────────────────────────────────

function LotCard({ lot, accent, soft }) {
  if (!lot?.slug) return null
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#737370]">About this Lot</div>
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2.5 py-2">
          <div
            className="w-9 h-9 rounded flex items-center justify-center font-extrabold text-[14px] shrink-0"
            style={{ background: soft, color: accent }}
          >
            {(lot.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-[#1A1816] tracking-tight">{lot.name}</div>
            {lot.description && <div className="text-[11.5px] text-[#737370] truncate">{lot.description}</div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
          <Stat label="Posts" value={formatCount(lot.post_count)} />
          <Stat label="Members" value={formatCount(lot.member_count)} />
        </div>
        <Link
          href={`/community?lot=${lot.slug}`}
          className="w-full h-9 inline-flex items-center justify-center bg-[#1A1816] hover:bg-[#2A2825] text-white font-bold text-[13px] rounded transition-colors"
        >
          Open Lot
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-2.5">
      <div className="text-[14px] font-extrabold text-[#1A1816] tracking-tight leading-tight">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#737370] mt-0.5">{label}</div>
    </div>
  )
}

function VerifiedInThreadCard({ items }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#737370]">Verified in this thread</div>
      <div className="px-4 pb-3 space-y-2">
        {items.map((p) => (
          <div key={p.handle} className="flex items-center gap-2.5 py-1">
            <div
              className="w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0"
              style={{ background: avatarGradient(p.handle) }}
            >
              {initials(p.handle)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-[#1A1816] leading-tight truncate">@{p.handle}</div>
              <div className="text-[10.5px] font-semibold capitalize" style={{ color: roleColor(p.role) }}>
                {p.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function roleColor(role) {
  return ({ lender: '#0F6E56', contractor: '#B5620A', agent: '#D03839', principal: '#1A1816', wholesaler: '#5B21B6' })[role] || '#737370'
}

function RelatedCard({ items, lotName, lotSlug }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="px-4 pt-3.5 pb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#737370]">More in {lotName || 'Lot'}</div>
        {lotSlug && (
          <Link href={`/community?lot=${lotSlug}`} className="text-[11px] text-[#D03839] font-bold">See all →</Link>
        )}
      </div>
      <div className="px-4 pb-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/community/p/${p.slug}`}
            className="block py-2.5 border-b border-[#F3F3EF] last:border-b-0 hover:bg-[#FAFAF8] -mx-2 px-2 rounded transition-colors"
          >
            <div className="text-[12.5px] font-semibold text-[#1A1816] leading-snug mb-1 line-clamp-2">{p.title}</div>
            <div className="text-[11px] text-[#737370] font-medium">
              <strong className="text-[#444441] font-bold">{p.score}</strong> votes ·{' '}
              <strong className="text-[#444441] font-bold">{p.comment_count}</strong> replies · {relativeTime(p.created_at)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MiniRulesCard() {
  const rules = [
    { strong: 'Numbers or it didn\'t happen.', rest: '' },
    { strong: 'Verify to pitch.',              rest: ' Capital / trades need a badge.' },
    { strong: '9-to-1 rule.',                  rest: ' Nine community for every self-promo.' },
    { strong: 'No off-platform routing.',      rest: '' },
  ]
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="px-4 pt-3.5 pb-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#737370]">Lot Rules</div>
      <ul className="px-4 pb-3 space-y-2">
        {rules.map((r, i) => (
          <li key={i} className="grid grid-cols-[16px_1fr] gap-1.5 text-[12px] text-[#444441] leading-snug">
            <span className="font-extrabold text-[#D03839] text-[11.5px]">{i + 1}.</span>
            <span><strong className="text-[#1A1816] font-bold">{r.strong}</strong>{r.rest}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Page shell ───────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <main className="max-w-[1180px] mx-auto px-4 md:px-8 py-5 pb-16">{children}</main>
      <Footer hideCta />
    </div>
  )
}
