'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Share2, Link2, Mail, ExternalLink } from 'lucide-react'
import { showToast } from './Dialogs'

// Reusable share dropdown. The menu itself is portalled to document.body so
// it escapes overflow-hidden parents (the post card and PostCard both clip
// their internals to rounded corners — without the portal, this menu was
// either invisible or off-screen).
//
// Trigger looks like an inline action button by default. Pass `triggerClassName`
// to override.
export function ShareMenu({ url, title, triggerClassName, iconClassName, label = 'Share', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  const fullUrl = ensureAbsolute(url)

  const MENU_WIDTH = 220

  const updatePosition = () => {
    const tr = triggerRef.current
    if (!tr) return
    const rect = tr.getBoundingClientRect()
    let left = align === 'right' ? rect.right - MENU_WIDTH : rect.left
    // Clamp to viewport with a small margin
    const margin = 12
    if (left + MENU_WIDTH > window.innerWidth - margin) left = window.innerWidth - MENU_WIDTH - margin
    if (left < margin) left = margin
    setPos({ top: rect.bottom + 4, left })
  }

  const toggle = () => {
    if (open) { setOpen(false); return }
    updatePosition()
    setOpen(true)
  }

  // Outside-click / esc / scroll / resize handling while open
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey    = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    const onResize = () => updatePosition()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      showToast('Link copied to clipboard', { variant: 'success' })
    } catch {
      showToast('Could not copy link', { variant: 'error' })
    }
    setOpen(false)
  }
  const openNew = () => {
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }
  const email = () => {
    const subject = encodeURIComponent(title || 'DeelMap Community')
    const body = encodeURIComponent(`${title ? title + '\n\n' : ''}${fullUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setOpen(false)
  }

  const defaultTrigger = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[13px] font-semibold text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] transition-colors`

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={triggerClassName || defaultTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className={iconClassName || 'w-[15px] h-[15px]'} strokeWidth={2} />
        {label}
      </button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH, zIndex: 9000 }}
          className="bg-white border border-[#E8E8E4] rounded-lg shadow-xl overflow-hidden"
        >
          <ShareItem icon={Link2}        label="Copy link"       onClick={copy} />
          <ShareItem icon={ExternalLink} label="Open in new tab" onClick={openNew} />
          <ShareItem icon={Mail}         label="Email this"      onClick={email} />
        </div>,
        document.body
      )}
    </>
  )
}

function ShareItem({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-[#1A1816] hover:bg-[#FAFAF8] text-left"
    >
      <Icon className="w-4 h-4 text-[#737370]" strokeWidth={2} />
      {label}
    </button>
  )
}

function ensureAbsolute(url) {
  if (!url) return typeof location !== 'undefined' ? location.href : ''
  if (url.startsWith('http')) return url
  if (typeof location !== 'undefined') return `${location.origin}${url.startsWith('/') ? '' : '/'}${url}`
  return url
}
