'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Bookmark, Pin, Home as HomeIcon, ArrowRight, ArrowBigUp, ArrowBigDown, MoreHorizontal, EyeOff, Slash, Flag } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { VoteRail } from './VoteRail'
import { VerifyBadge } from './VerifyBadge'
import { UserHoverCard } from './UserHoverCard'
import { LotTag } from './LotTag'
import { ShareMenu } from './ShareMenu'
import { showToast } from './Dialogs'
import { renderInline } from '@/lib/community/markdown'

function relativeTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PostCard({ post, onVote, onSave, onHide, onBlock, isSaved = false, compact = false }) {
  const router = useRouter()
  const { user } = useAuth()
  const author = post.author || {}
  const lot = post.lot || {}
  const deal = post.deal || null
  const top = post.top_comment || null
  const score = post.score || 0
  const userVote = post.user_vote || 0

  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  // Card-wide click → open the post detail page. Ignored when:
  //  - the user clicked an interactive child (link, button, input, textarea, menu item)
  //  - the user is actively selecting text (so they can copy an excerpt without navigating)
  const onCardClick = (e) => {
    if (e.target.closest('a, button, input, textarea, [role="menuitem"]')) return
    const sel = typeof window !== 'undefined' ? window.getSelection?.()?.toString() : ''
    if (sel) return
    router.push(`/community/p/${post.slug}`)
  }

  const hidePost = async () => {
    setMenuOpen(false)
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    setHidden(true)
    if (onHide) { onHide(post.id); return }
    const res = await fetch('/api/community/hides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ post_id: post.id }),
    }).catch(() => null)
    if (!res?.ok) {
      setHidden(false)
      showToast('Could not hide post.', { variant: 'error' })
    } else {
      showToast('Post hidden from your feed', { variant: 'success' })
    }
  }

  const blockUser = async () => {
    setMenuOpen(false)
    if (!user?.id) { window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } })); return }
    if (!author?.handle) return
    if (onBlock) { onBlock(author.handle); return }
    const res = await fetch('/api/community/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ handle: author.handle }),
    }).catch(() => null)
    if (!res?.ok) {
      showToast('Could not block user.', { variant: 'error' })
    } else {
      showToast(`@${author.handle} blocked`, { variant: 'success' })
      setHidden(true)
    }
  }

  if (hidden) {
    return (
      <article className="bg-white border border-[#E8E8E4] rounded p-4 text-[12.5px] text-[#737370] flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <EyeOff className="w-4 h-4" />
          Hidden from your feed.
        </span>
        <button
          type="button"
          onClick={async () => {
            await fetch(`/api/community/hides?post_id=${post.id}`, {
              method: 'DELETE',
              headers: { 'x-user-id': user.id },
            }).catch(() => {})
            setHidden(false)
          }}
          className="text-[12px] font-bold text-[#D03839] hover:underline"
        >
          Undo
        </button>
      </article>
    )
  }

  return (
    <article
      onClick={onCardClick}
      className={`bg-white border rounded cursor-pointer transition-all hover:border-[#D1D1CE] md:grid md:grid-cols-[52px_1fr] ${
        post.is_pinned
          ? 'border-[#F5C4C0] bg-linear-to-b from-[#FFFBFB] to-white'
          : deal
            ? 'border-[#E8E8E4] border-l-4 border-l-[#0F6E56]'
            : 'border-[#E8E8E4]'
      }`}
    >
      {/* Desktop vote rail — hidden on mobile (vote goes into the action bar) */}
      <div className="hidden md:block rounded-l overflow-hidden">
        <VoteRail score={score} userVote={userVote} onVote={(v) => onVote?.(post.id, v)} />
      </div>

      <div className="p-3.5 md:p-4 min-w-0">
        {/* ── Mobile meta row: handle · lot · time ── */}
        <div className="md:hidden flex items-center gap-1.5 flex-wrap mb-2 text-[11.5px] text-[#737370]">
          <Link href={`/community/u/${author.handle}`} className="text-[#1A1816] font-semibold hover:text-[#D03839]">@{author.handle}</Link>
          {author.role_badge && <VerifyBadge kind={author.role_badge} />}
          {lot.name && (
            <>
              <span className="text-[#D1D1CE]">·</span>
              <Link href={`/community?lot=${lot.slug}`} className="font-semibold text-[#444441] hover:text-[#D03839]">
                {lot.name}
              </Link>
            </>
          )}
          {post.market_tag && (
            <>
              <span className="text-[#D1D1CE]">·</span>
              <span className="text-[#5B21B6] font-semibold">{post.market_tag}</span>
            </>
          )}
          <span className="text-[#D1D1CE]">·</span>
          <span>{relativeTime(post.created_at)}</span>
          {post.is_pinned && (
            <>
              <span className="text-[#D1D1CE]">·</span>
              <Pin className="w-3 h-3 text-[#D03839]" strokeWidth={2.5} />
            </>
          )}
        </div>

        {/* ── Desktop meta row: chips + author + equity + time + pinned ── */}
        <div className="hidden md:flex items-center gap-2 flex-wrap mb-2.5 text-[12px] text-[#737370]">
          {lot.name && <LotTag label={lot.name} category={lot.category} slug={lot.slug} />}
          {post.market_tag && <LotTag label={post.market_tag} category="markets" asLink={false} />}
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#444441]">
            <UserHoverCard handle={author.handle}>
              <Link href={`/community/u/${author.handle}`} className="text-[#1A1816] hover:text-[#D03839] font-bold">@{author.handle}</Link>
            </UserHoverCard>
            {author.role_badge && <VerifyBadge kind={author.role_badge} />}
            {typeof author.equity_score === 'number' && (
              <span className="text-[11px] text-[#737370] font-semibold">
                Equity <strong className="text-[#1A1816]">{formatEquity(author.equity_score)}</strong>
                {author.is_new && <span className="text-[#737370] font-normal"> · new</span>}
              </span>
            )}
          </span>
          <span className="text-[#D1D1CE]">·</span>
          <span className="text-[#737370]">{relativeTime(post.created_at)}</span>
          {post.is_pinned && (
            <>
              <span className="text-[#D1D1CE]">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#D03839]">
                <Pin className="w-3 h-3" strokeWidth={2.5} />
                Pinned by mods
              </span>
            </>
          )}
        </div>

        <h2 className="text-[15.5px] md:text-[17px] font-bold text-[#1A1816] leading-snug tracking-tight mb-2 break-words">
          <Link href={`/community/p/${post.slug}`} className="hover:text-[#D03839] transition-colors">
            {post.title}
          </Link>
        </h2>

        {post.body && !compact && (
          <p className="text-[13px] md:text-[13.5px] text-[#444441] leading-relaxed mb-3 line-clamp-4 break-words">{renderInline(post.body)}</p>
        )}

        {deal && (
          <Link href={dealHref(deal)} className="block mb-3">
            <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded p-2.5 md:p-3 hover:bg-[#DCFCE7] transition-colors">
              <div className="grid grid-cols-[44px_1fr] md:grid-cols-[52px_1fr_auto] items-center gap-2.5 md:gap-3">
                <div className="w-11 h-11 md:w-[52px] md:h-[52px] rounded bg-linear-to-br from-[#94A3B8] to-[#64748B] flex items-center justify-center text-white relative">
                  <HomeIcon className="w-5 h-5" strokeWidth={1.5} />
                  {deal.live && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#4ADE80] border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#0F6E56] mb-0.5">
                    ◆ Linked Deal · {deal.live ? 'Active' : 'Closed'}
                  </div>
                  <div className="text-[13px] md:text-[13.5px] font-bold text-[#1A1816] mb-0.5 truncate">{deal.address}</div>
                  <div className="flex gap-2 md:gap-3 text-[11.5px] md:text-[12px] text-[#444441] flex-wrap">
                    {deal.price && <span><strong className="text-[#1A1816] font-bold">{deal.price}</strong></span>}
                    {deal.beds && <span><strong className="text-[#1A1816] font-bold">{deal.beds}</strong>{deal.sqft && <> · {deal.sqft}</>}</span>}
                    {deal.type && <span className="hidden md:inline">{deal.type}</span>}
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F6E56] hover:bg-[#0A5740] text-white rounded text-[12px] font-bold tracking-wide whitespace-nowrap transition-colors">
                  View Listing <ArrowRight className="w-3 h-3" strokeWidth={3} />
                </span>
              </div>
              <span className="md:hidden mt-2 inline-flex items-center justify-center w-full gap-1 px-3 py-1.5 bg-[#0F6E56] hover:bg-[#0A5740] text-white rounded text-[12px] font-bold tracking-wide transition-colors">
                View Listing <ArrowRight className="w-3 h-3" strokeWidth={3} />
              </span>
            </div>
          </Link>
        )}

        {top && (
          <div className="bg-[#FAFAF8] border-l-[3px] border-[#0F6E56] rounded px-3 md:px-3.5 py-2.5 md:py-3 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[#737370] font-semibold mb-1 flex-wrap">
              <strong className="text-[#1A1816]">@{top.author?.handle}</strong>
              {top.author?.role_badge && <VerifyBadge kind={top.author.role_badge} />}
              <span className="hidden sm:inline">· top reply</span>
            </div>
            <div className="text-[12.5px] md:text-[13px] text-[#444441] leading-relaxed line-clamp-3 md:line-clamp-none break-words">
              {renderInline(top.body)}
            </div>
          </div>
        )}

        {/* ── Action bar with mobile vote pill ── */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {/* Mobile-only horizontal vote pill */}
          <div className="md:hidden inline-flex items-center bg-[#FAFAF8] border border-[#E8E8E4] rounded-full overflow-hidden mr-1">
            <button
              type="button"
              onClick={() => onVote?.(post.id, userVote === 1 ? 0 : 1)}
              className={`w-9 h-9 flex items-center justify-center transition-colors ${
                userVote === 1 ? 'text-[#D03839]' : 'text-[#737370] active:bg-white'
              }`}
              aria-label="Back"
            >
              <ArrowBigUp className="w-4 h-4" strokeWidth={2} fill={userVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <span className="px-1 text-[12.5px] font-extrabold text-[#1A1816] tabular-nums min-w-[18px] text-center">
              {score}
            </span>
            <button
              type="button"
              onClick={() => onVote?.(post.id, userVote === -1 ? 0 : -1)}
              className={`w-9 h-9 flex items-center justify-center transition-colors ${
                userVote === -1 ? 'text-[#444441]' : 'text-[#737370] active:bg-white'
              }`}
              aria-label="Pass"
            >
              <ArrowBigDown className="w-4 h-4" strokeWidth={2} fill={userVote === -1 ? 'currentColor' : 'none'} />
            </button>
          </div>

          <Link href={`/community/p/${post.slug}`} className="inline-flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded text-[13px] font-semibold text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] transition-colors">
            <MessageSquare className="w-[15px] h-[15px]" strokeWidth={2} />
            <strong className="text-[#1A1816] font-bold">{post.comment_count || 0}</strong>
            <span className="hidden sm:inline">{' '}comments</span>
          </Link>
          <ShareMenu
            url={`/community/p/${post.slug}`}
            title={post.title}
            triggerClassName="inline-flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded text-[13px] font-semibold text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] transition-colors"
            iconClassName="w-[15px] h-[15px]"
            label={<span className="hidden sm:inline">Share</span>}
          />
          <button
            type="button"
            onClick={() => onSave?.(post.id, !isSaved)}
            className={`inline-flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded text-[13px] font-semibold transition-colors ${
              isSaved ? 'text-[#D03839]' : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816]'
            }`}
          >
            <Bookmark className="w-[15px] h-[15px]" strokeWidth={2} fill={isSaved ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Overflow menu — Hide / Block / Report. Only render for signed-in viewers
              who aren't the post author. */}
          {user?.id && author?.id !== undefined && (
            <div className="relative ml-auto" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Post actions"
                className="inline-flex items-center justify-center w-8 h-8 rounded text-[#737370] hover:bg-[#FAFAF8] hover:text-[#1A1816] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-52 bg-white rounded shadow-xl border border-[#E8E8E4] py-1 z-50">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={hidePost}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#FAFAF8] text-[#444441]"
                  >
                    <EyeOff className="w-4 h-4 text-[#737370]" />
                    Hide post
                  </button>
                  {author?.handle && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={blockUser}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#FAFAF8] text-[#444441]"
                    >
                      <Slash className="w-4 h-4 text-[#D03839]" />
                      Block @{author.handle}
                    </button>
                  )}
                  <div className="my-1 border-t border-[#F3F3EF]" />
                  <Link
                    href={`/community/p/${post.slug}?report=1`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[#FAFAF8] text-[#444441]"
                  >
                    <Flag className="w-4 h-4 text-[#737370]" />
                    Report post
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function formatEquity(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function dealHref(deal) {
  if (!deal) return '/marketplace'
  // /[slug] route resolves by slug OR uuid — prefer slug for SEO, fall back to id
  const key = deal.slug || deal.id
  return key ? `/${key}` : '/marketplace'
}
