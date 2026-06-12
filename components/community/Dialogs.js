'use client'

import { useEffect, useState, useRef } from 'react'
import { X, AlertTriangle, CheckCircle2, Flag, Loader2, ShieldAlert } from 'lucide-react'

// ─── Helpers — call from anywhere in community code ───────────────────────────

export function showToast(message, opts = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('community-dialog', {
    detail: { type: 'toast', message, variant: opts.variant || 'info', duration: opts.duration ?? 3200 },
  }))
}

function emitPromised(detail) {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null)
    const id = Math.random().toString(36).slice(2)
    const handler = (e) => {
      if (e.detail?.id !== id) return
      window.removeEventListener('community-dialog-response', handler)
      resolve(e.detail.value)
    }
    window.addEventListener('community-dialog-response', handler)
    window.dispatchEvent(new CustomEvent('community-dialog', { detail: { ...detail, id } }))
  })
}

export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return emitPromised({ type: 'confirm', title, message, confirmLabel, cancelLabel, danger })
}

export function showPrompt({ title, label, placeholder, defaultValue = '', confirmLabel = 'OK', cancelLabel = 'Cancel', validate } = {}) {
  return emitPromised({ type: 'prompt', title, label, placeholder, defaultValue, confirmLabel, cancelLabel, validate })
}

export function showReportDialog({ targetType, targetId, targetLabel } = {}) {
  return emitPromised({ type: 'report', targetType, targetId, targetLabel })
}

// ─── Host — mount once via the community layout ──────────────────────────────

export function DialogHost() {
  const [items, setItems] = useState([])
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const onDialog = (e) => {
      const d = e.detail
      if (!d) return
      if (d.type === 'toast') {
        const id = Math.random().toString(36).slice(2)
        setToasts(prev => [...prev, { ...d, id }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), d.duration)
        return
      }
      setItems(prev => [...prev, d])
    }
    window.addEventListener('community-dialog', onDialog)
    return () => window.removeEventListener('community-dialog', onDialog)
  }, [])

  const closeItem = (id, value) => {
    setItems(prev => prev.filter(i => i.id !== id))
    window.dispatchEvent(new CustomEvent('community-dialog-response', { detail: { id, value } }))
  }

  return (
    <>
      {items.map(item => {
        const onClose = (v) => closeItem(item.id, v)
        if (item.type === 'confirm') return <ConfirmDialog key={item.id} {...item} onClose={onClose} />
        if (item.type === 'prompt')  return <PromptDialog  key={item.id} {...item} onClose={onClose} />
        if (item.type === 'report')  return <ReportDialog  key={item.id} {...item} onClose={onClose} />
        return null
      })}
      <ToastStack items={toasts} />
    </>
  )
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function ModalShell({ children, onClose, maxWidth = 'max-w-md', tall = false }) {
  useEffect(() => {
    const cleanup = lockBodyScroll()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(null) }
    document.addEventListener('keydown', onKey)
    return () => { cleanup(); document.removeEventListener('keydown', onKey) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Full-screen modal on mobile, centered card on desktop.
  //  - Mobile: outer is plain `fixed inset-0`, panel uses `w-full h-full` to
  //    fill the full viewport. No flex centering on mobile.
  //  - Desktop: outer is flex-centered with padding, panel sizes to content
  //    with a max-h cap.
  //  - Panel is itself the scroll container (overflow-y-auto).
  //  - ModalFooter uses `sticky bottom-0` to stay pinned at the visible bottom
  //    of the scrolling area at all times. Buttons-first ordering inside the
  //    footer means Submit is always the first thing visible at the bottom.
  return (
    <div
      className="fixed inset-0 z-[9999] sm:flex sm:items-center sm:justify-center overscroll-contain bg-black/30 backdrop-blur-[2px] sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(null) }}
    >
      <div
        className={`relative bg-white w-full ${maxWidth} h-full sm:h-auto sm:shadow-2xl sm:border sm:border-[#E8E8E4] sm:rounded sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain`}
      >
        {children}
      </div>
    </div>
  )
}

// Helpers — kept for API compat with existing dialogs.
//   <ModalShell>
//     <DialogHeader />
//     <ModalBody>{content}</ModalBody>     // just a wrapper div
//     <ModalFooter>{Cancel + Submit}</ModalFooter>  // sticky bottom-0
//   </ModalShell>
// The modal is the scroll container; ModalFooter's `sticky bottom-0` pins it to
// the visible bottom of the scroll area at all times.
export function ModalBody({ children, className = '' }) {
  return <div className={className}>{children}</div>
}

export function ModalFooter({ children, className = '' }) {
  return <div className={`sticky bottom-0 z-10 ${className}`}>{children}</div>
}

// iOS-safe body scroll lock. Using overflow:hidden alone breaks scroll inside
// fixed children on iOS Safari, so we use position:fixed with a negative top
// offset that preserves the user's scroll position. Restored on unlock.
export function lockBodyScroll() {
  if (typeof window === 'undefined') return () => {}
  const body = document.body
  const html = document.documentElement
  const scrollY = window.scrollY || html.scrollTop || 0

  const prev = {
    position:    body.style.position,
    top:         body.style.top,
    left:        body.style.left,
    right:       body.style.right,
    width:       body.style.width,
    overflow:    body.style.overflow,
    paddingRight: body.style.paddingRight,
  }

  const scrollbarWidth = window.innerWidth - html.clientWidth
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
  body.style.position = 'fixed'
  body.style.top      = `-${scrollY}px`
  body.style.left     = '0'
  body.style.right    = '0'
  body.style.width    = '100%'
  body.style.overflow = 'hidden'

  return () => {
    body.style.position    = prev.position
    body.style.top         = prev.top
    body.style.left        = prev.left
    body.style.right       = prev.right
    body.style.width       = prev.width
    body.style.overflow    = prev.overflow
    body.style.paddingRight = prev.paddingRight
    window.scrollTo(0, scrollY)
  }
}

function DialogHeader({ icon: Icon, iconColor = '#737370', iconBg = '#FAFAF8', title, subtitle, onClose }) {
  return (
    <div className="shrink-0 px-5 pt-5 pb-3 border-b border-[#F3F3EF] flex items-start gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
          <Icon className="w-5 h-5" strokeWidth={2.25} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[16px] font-extrabold text-[#1A1816] tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-[#737370] mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
      <button onClick={() => onClose(null)} className="p-1 text-[#737370] hover:text-[#1A1816] shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <DialogHeader
        icon={danger ? AlertTriangle : CheckCircle2}
        iconColor={danger ? '#D03839' : '#0F6E56'}
        iconBg={danger ? '#FEF0EF' : '#ECFDF5'}
        title={title || 'Are you sure?'}
        onClose={onClose}
      />
      <div className="px-5 py-4 text-[14px] text-[#444441] leading-relaxed">
        {message}
      </div>
      <div className="px-5 py-3 bg-[#FAFAF8] border-t border-[#E8E8E4] flex justify-end gap-2">
        <button onClick={() => onClose(false)} className="h-9 px-3.5 inline-flex items-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white">
          {cancelLabel}
        </button>
        <button
          onClick={() => onClose(true)}
          className={`h-9 px-4 inline-flex items-center text-[13px] font-bold text-white rounded transition-colors ${
            danger ? 'bg-[#D03839] hover:bg-[#C73022]' : 'bg-[#0F6E56] hover:bg-[#0A5740]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Prompt dialog ───────────────────────────────────────────────────────────

function PromptDialog({ title, label, placeholder, defaultValue, confirmLabel, cancelLabel, validate, onClose }) {
  const [value, setValue] = useState(defaultValue || '')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const submit = (e) => {
    e?.preventDefault?.()
    const v = value.trim()
    if (validate) {
      const err = validate(v)
      if (err) { setError(err); return }
    }
    onClose(v)
  }

  return (
    <ModalShell onClose={onClose}>
      <DialogHeader title={title || 'Enter a value'} onClose={onClose} />
      <form onSubmit={submit}>
        <div className="px-5 py-4">
          {label && <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#737370] mb-1.5">{label}</label>}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null) }}
            placeholder={placeholder}
            className="w-full h-10 px-3.5 border border-[#D1D1CE] rounded text-[14px] outline-none focus:border-[#D03839]"
          />
          {error && <div className="text-[12.5px] text-[#991B1B] mt-2">{error}</div>}
        </div>
        <div className="px-5 py-3 bg-[#FAFAF8] border-t border-[#E8E8E4] flex justify-end gap-2">
          <button type="button" onClick={() => onClose(null)} className="h-9 px-3.5 inline-flex items-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white">
            {cancelLabel}
          </button>
          <button type="submit" className="h-9 px-4 inline-flex items-center text-[13px] font-bold text-white bg-[#D03839] hover:bg-[#C73022] rounded transition-colors">
            {confirmLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ─── Report dialog ───────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam or self-promotion',  desc: 'Repeated promo, off-platform links, undisclosed seller relationship.' },
  { value: 'harassment',     label: 'Harassment or doxxing',   desc: 'Personal attacks, threats, or sharing real identity.' },
  { value: 'off_topic',      label: 'Off-topic',               desc: 'Content unrelated to real estate or the Lot it was posted in.' },
  { value: 'misinformation', label: 'Misleading or false',     desc: 'Bad numbers, fake comps, fabricated track record.' },
  { value: 'duplicate',      label: 'Duplicate / reposted',    desc: 'Same content already posted in this Lot.' },
  { value: 'other',          label: 'Other',                   desc: 'Tell us why in the details below.' },
]

function ReportDialog({ targetType, targetId, targetLabel, onClose }) {
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e?.preventDefault?.()
    setError(null)
    if (!reason) { setError('Pick a reason.'); return }
    if (reason === 'other' && details.trim().length < 10) { setError('Please add 10+ characters of context for "Other".'); return }
    setSubmitting(true)
    try {
      const userId = (() => { try { return JSON.parse(localStorage.getItem('ableman_user') || 'null')?.id } catch { return null } })()
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: REPORT_REASONS.find(r => r.value === reason)?.label || reason,
          details: details.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'profile_required') {
          setError('Pick a community handle first, then report.')
        } else {
          setError(data.error || 'Could not file report.')
        }
        setSubmitting(false); return
      }
      onClose({ ok: true })
    } catch {
      setError('Network error.')
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl" tall>
      <DialogHeader
        icon={Flag}
        iconColor="#D03839"
        iconBg="#FEF0EF"
        title="Report this content"
        subtitle={targetLabel ? `Reporting: ${targetLabel}` : 'Mods review reports within 24h.'}
        onClose={onClose}
      />
      <form onSubmit={submit}>
        <ModalBody>
        <div className="px-5 py-4 space-y-3">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#737370] mb-2">Reason</div>
            <div className="space-y-1.5">
              {REPORT_REASONS.map(r => {
                const selected = reason === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={`w-full text-left px-3 py-2.5 rounded border transition-all ${
                      selected
                        ? 'border-[#D03839] bg-[#FEF0EF] shadow-[0_0_0_2px_rgba(208,56,57,0.08)]'
                        : 'border-[#E8E8E4] bg-white hover:border-[#A8A8A4]'
                    }`}
                  >
                    <div className={`text-[13.5px] font-bold leading-tight ${selected ? 'text-[#D03839]' : 'text-[#1A1816]'}`}>{r.label}</div>
                    <div className="text-[11.5px] text-[#737370] mt-0.5">{r.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#737370] mb-1.5">
              Details {reason === 'other' && <span className="text-[#D03839]">*</span>}
              <span className="ml-2 text-[#A8A8A4] font-semibold normal-case tracking-normal text-[11px]">optional</span>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="What should the mod know? Numbers, links, context."
              className="w-full px-3.5 py-2.5 border border-[#D1D1CE] rounded text-[13.5px] leading-relaxed outline-none focus:border-[#D03839] resize-y min-h-[80px]"
            />
            <div className="text-right text-[11px] text-[#A8A8A4] mt-1">{details.length}/1000</div>
          </div>
          {error && <div className="text-[12.5px] text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>}
        </div>
        </ModalBody>
        <ModalFooter className="bg-[#FAFAF8] border-t border-[#E8E8E4]">
          {/* Buttons FIRST (above privacy text) so they remain visible even if the
              very bottom of the modal is clipped by the visible area. */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose(null)}
              className="h-10 px-4 inline-flex items-center justify-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white whitespace-nowrap flex-1 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason}
              className="h-10 px-4 inline-flex items-center justify-center gap-1 bg-[#D03839] hover:bg-[#C73022] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[13px] rounded transition-colors whitespace-nowrap flex-1 sm:flex-none sm:ml-auto"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit report
            </button>
          </div>
          <div className="px-5 pb-3 pt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#737370] font-medium">
            <ShieldAlert className="w-3 h-3 text-[#737370] shrink-0" />
            <span>Your handle is the only identifier sent to mods.</span>
          </div>
        </ModalFooter>
      </form>
    </ModalShell>
  )
}

// ─── Toast stack ─────────────────────────────────────────────────────────────

function ToastStack({ items }) {
  if (!items.length) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-2.5 rounded shadow-lg text-[13px] font-semibold flex items-center gap-2 max-w-[480px] animate-[toastIn_0.18s_ease-out] ${
            t.variant === 'success' ? 'bg-[#0F6E56] text-white'
            : t.variant === 'error' ? 'bg-[#D03839] text-white'
            : t.variant === 'warn'  ? 'bg-[#B5620A] text-white'
            : 'bg-[#1A1816] text-white'
          }`}
        >
          {t.variant === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
          {t.variant === 'error'   && <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} />}
          <span>{t.message}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
