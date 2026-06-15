'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { VerifyBadge } from './VerifyBadge'

// Lightweight profile hovercard shown when hovering a member's @handle in posts
// and comments — like Twitter/Reddit. Wraps the username trigger (`children`)
// and pops a small profile card sourced from /api/community/u/<handle>.
// Results are cached per handle for the session so repeat hovers are instant.

const cache = new Map()

function Avatar({ url, handle, size = 40 }) {
  const letter = (handle || '?').charAt(0).toUpperCase()
  if (url) {
    return <img src={url} alt="" width={size} height={size} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className="rounded-full shrink-0 bg-[#D03839] text-white font-bold flex items-center justify-center"
    >{letter}</div>
  )
}

export function UserHoverCard({ handle, authHeaders, children }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(() => (handle ? cache.get(handle) : null) || null)
  const showTimer = useRef(null)
  const hideTimer = useRef(null)

  const load = useCallback(async () => {
    if (!handle || cache.has(handle)) { if (handle) setData(cache.get(handle)); return }
    try {
      const res = await fetch(`/api/community/u/${handle}`, { headers: authHeaders || {} })
      if (res.ok) {
        const j = await res.json()
        cache.set(handle, j)
        setData(j)
      } else {
        cache.set(handle, null)
      }
    } catch { /* ignore — fall back to the plain link */ }
  }, [handle, authHeaders])

  const show = () => {
    clearTimeout(hideTimer.current)
    load()
    showTimer.current = setTimeout(() => setOpen(true), 280)
  }
  const hide = () => {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => setOpen(false), 160)
  }

  if (!handle) return children

  const p = data?.profile
  const tier = data?.tier

  return (
    <span className="relative inline-flex align-baseline" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && p && (
        <div
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={hide}
          className="absolute z-50 top-full left-0 mt-2 w-[296px] bg-white border border-[#E8E8E4] rounded-lg shadow-[0_8px_28px_rgba(26,24,22,0.16)] p-4 cursor-default"
          style={{ textAlign: 'left' }}
        >
          <div className="flex items-start gap-3">
            <Avatar url={p.avatar_url} handle={p.handle} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#1A1816] truncate">@{p.handle}</span>
                {p.role_badge && <VerifyBadge kind={p.role_badge} />}
              </div>
              {p.display_name && <div className="text-[12px] text-[#737370] truncate">{p.display_name}</div>}
              <div className="mt-1 text-[12px] text-[#737370]">
                <strong className="text-[#1A1816] font-semibold">{(p.equity_score || 0).toLocaleString()}</strong> Equity
                {tier?.name && <span> · {tier.name}</span>}
              </div>
            </div>
          </div>

          {p.bio && (
            <p className="mt-2.5 text-[12.5px] leading-snug text-[#444441] line-clamp-3">{p.bio}</p>
          )}

          <div className="mt-2.5 flex items-center gap-4 text-[12px] text-[#737370]">
            <span><strong className="text-[#1A1816] font-semibold">{data?.stats?.post_count ?? 0}</strong> posts</span>
            <span><strong className="text-[#1A1816] font-semibold">{data?.stats?.comment_count ?? 0}</strong> comments</span>
          </div>

          <Link
            href={`/community/u/${p.handle}`}
            className="mt-3 inline-flex w-full items-center justify-center h-9 rounded border border-[#E8E8E4] text-[13px] font-semibold text-[#1A1816] hover:border-[#D03839] hover:text-[#D03839] transition-colors"
          >
            View profile
          </Link>
        </div>
      )}
    </span>
  )
}
