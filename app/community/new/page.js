'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, Loader2, Home as HomeIcon, ArrowRight,
  Bold, Italic, Heading2, Quote, Code, List, ListOrdered, Link as LinkIcon, ImageIcon,
  Check,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { showPrompt, showToast } from '@/components/community/Dialogs'

const CATEGORY_TABS = [
  { value: 'real_estate', label: 'Real Estate', swatch: '#2563EB' },
  { value: 'lending',     label: 'Lending',     swatch: '#0F6E56' },
  { value: 'finance',     label: 'Finance',     swatch: '#D03839' },
  { value: 'contractors', label: 'Contractors', swatch: '#B5620A' },
  { value: 'markets',     label: 'Markets',     swatch: '#7C3AED' },
]

const DRAFT_KEY = 'community-draft-v1'

export default function NewPostPage() {
  const { user } = useAuth()
  const router = useRouter()
  const editorRef = useRef(null)
  const imageInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  const [groups, setGroups] = useState([])
  const [activeCat, setActiveCat] = useState('real_estate')
  const [lotSlug, setLotSlug] = useState('')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [marketTag, setMarketTag] = useState('')

  const [dealQuery, setDealQuery] = useState('')
  const [dealResults, setDealResults] = useState([])
  const [linkedDeal, setLinkedDeal] = useState(null)
  const [searching, setSearching] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState(null)

  const authHeaders = useCallback(() => (user?.id ? { 'x-user-id': user.id } : {}), [user?.id])

  // Profile check
  useEffect(() => {
    if (!user?.id) {
      window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))
      setProfileChecked(true)
      return
    }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        if (!d.profile) setShowHandlePicker(true)
        setProfileChecked(true)
      })
  }, [user?.id])

  // Load lots
  useEffect(() => {
    fetch('/api/community/lots').then(r => r.json()).then(d => setGroups(d.groups || []))
  }, [])

  // Restore draft once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.title) setTitle(d.title)
      if (d.body) setBody(d.body)
      if (d.lotSlug) setLotSlug(d.lotSlug)
      if (d.activeCat) setActiveCat(d.activeCat)
      if (d.marketTag) setMarketTag(d.marketTag)
      if (d.linkedDeal) setLinkedDeal(d.linkedDeal)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, lotSlug, activeCat, marketTag, linkedDeal }))
        setDraftSavedAt(Date.now())
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [title, body, lotSlug, activeCat, marketTag, linkedDeal])

  // Deal search
  useEffect(() => {
    const q = dealQuery.trim()
    if (q.length < 3) { setDealResults([]); return }
    const ctrl = new AbortController()
    setSearching(true)
    fetch(`/api/community/deal-search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setDealResults(d.results || []))
      .catch(() => setDealResults([]))
      .finally(() => setSearching(false))
    return () => ctrl.abort()
  }, [dealQuery])

  // ── Markdown insertion helpers ──────────────────────────────────────
  // Captures selection at mousedown so toolbar clicks don't lose it
  const selRef = useRef({ s: 0, e: 0 })
  const captureSel = () => {
    const ta = editorRef.current
    if (ta) selRef.current = { s: ta.selectionStart, e: ta.selectionEnd }
  }

  const wrap = (before, after = before) => {
    const { s, e } = selRef.current
    const sel = body.slice(s, e)
    const next = body.slice(0, s) + before + sel + after + body.slice(e)
    setBody(next)
    requestAnimationFrame(() => {
      const ta = editorRef.current
      if (!ta) return
      ta.focus()
      ta.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }
  const linePrefix = (prefix) => {
    const { s, e } = selRef.current
    const lineStart = body.lastIndexOf('\n', s - 1) + 1
    const lineEnd = body.indexOf('\n', e); const endIdx = lineEnd === -1 ? body.length : lineEnd
    const lines = body.slice(lineStart, endIdx).split('\n').map(l => prefix + l).join('\n')
    setBody(body.slice(0, lineStart) + lines + body.slice(endIdx))
    requestAnimationFrame(() => editorRef.current?.focus())
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
    const sel = body.slice(s, e) || 'link text'
    setBody(body.slice(0, s) + `[${sel}](${url})` + body.slice(e))
  }
  const onImagePicked = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('scope', 'post')
      const res = await fetch('/api/community/upload', { method: 'POST', headers: authHeaders(), body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        showToast(data.error || 'Image upload failed.', { variant: 'error' })
        return
      }
      setBody(prev => prev + `\n\n![](${data.url})\n\n`)
      showToast('Image added', { variant: 'success' })
    } catch {
      showToast('Image upload failed.', { variant: 'error' })
    } finally { setUploading(false) }
  }

  // ── Submit ──────────────────────────────────────────────────────────
  const submit = async (e) => {
    e?.preventDefault?.()
    setError(null)
    if (!profile) { setShowHandlePicker(true); return }
    if (title.trim().length < 8) { setError('Title must be at least 8 characters.'); return }
    if (!lotSlug) { setError('Pick a Lot.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          lot_slug: lotSlug,
          market_tag: marketTag.trim() || null,
          property_id: linkedDeal?.kind === 'property' ? linkedDeal.id : null,
          wholesale_deal_id: linkedDeal?.kind === 'wholesale_deal' ? linkedDeal.id : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not create post.'); setSubmitting(false); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      router.push(`/community/p/${data.post.slug}`)
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  if (!profileChecked) {
    return (
      <Shell>
        <div className="bg-white border border-[#E8E8E4] rounded-lg p-8 text-[14px] text-[#737370]">Loading…</div>
      </Shell>
    )
  }

  const currentGroup = groups.find(g => g.category === activeCat)
  const lotsInCategory = currentGroup?.lots || []
  const selectedLot = groups.flatMap(g => g.lots).find(l => l.slug === lotSlug)

  return (
    <Shell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[#737370] font-medium mb-4">
        <Link href="/community" className="hover:text-[#D03839]">Community</Link>
        <span className="text-[#D1D1CE]">/</span>
        <span className="text-[#1A1816] font-semibold">Start a post</span>
      </div>

      {/* Header */}
      <header className="mb-4">
        <h1 className="text-[26px] md:text-[28px] font-extrabold tracking-tight text-[#1A1816] leading-tight mb-1.5">
          Start a post
        </h1>
        <div className="flex items-center gap-2 flex-wrap text-[13px] text-[#737370]">
          {profile && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F3F3EF] rounded text-[12.5px] font-semibold text-[#444441]">
              Posting as <span className="text-[#A8A8A4] font-bold">@</span><strong className="text-[#1A1816]">{profile.handle}</strong>
            </span>
          )}
          {profile && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1816] text-white rounded text-[11.5px] font-bold">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[9px]">Equity</span>
              {(profile.equity_score || 0).toLocaleString()}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-7 items-start">

        {/* ── COMPOSER CARD ───────────────────────────────────────── */}
        <form onSubmit={submit}>
          <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">

            {/* Lot picker */}
            <section className="px-5 py-4 border-b border-[#F3F3EF]">
              <SectionLabel required>Lot</SectionLabel>

              <div className="flex gap-1 flex-wrap mb-3">
                {CATEGORY_TABS.map(c => {
                  const active = c.value === activeCat
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setActiveCat(c.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold border transition-colors ${
                        active
                          ? 'bg-[#1A1816] text-white border-[#1A1816]'
                          : 'bg-white text-[#444441] border-[#E8E8E4] hover:border-[#A8A8A4]'
                      }`}
                    >
                      {!active && <span className="w-1.5 h-1.5 rounded-[2px]" style={{ background: c.swatch }} />}
                      {c.label}
                    </button>
                  )
                })}
              </div>

              {lotsInCategory.length === 0 ? (
                <div className="text-[12.5px] text-[#A8A8A4]">Loading lots…</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {lotsInCategory.map(lot => {
                    const selected = lotSlug === lot.slug
                    return (
                      <button
                        key={lot.slug}
                        type="button"
                        onClick={() => setLotSlug(lot.slug)}
                        className={`text-left px-3 py-2 rounded border transition-all ${
                          selected
                            ? 'border-[#D03839] bg-[#FEF0EF] shadow-[0_0_0_3px_rgba(208,56,57,0.08)]'
                            : 'border-[#E8E8E4] bg-white hover:border-[#A8A8A4] hover:bg-[#FAFAF8]'
                        }`}
                      >
                        <div className="text-[13px] font-bold text-[#1A1816] leading-tight">{lot.name}</div>
                        <div className={`text-[11px] mt-0.5 font-medium ${selected ? 'text-[#D03839]' : 'text-[#737370]'}`}>
                          {formatCount(lot.post_count)} {lot.post_count === 1 ? 'post' : 'posts'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Title */}
            <section className="px-5 py-4 border-b border-[#F3F3EF]">
              <SectionLabel required>Title</SectionLabel>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  placeholder="A specific, numerate question beats a vague one"
                  className="w-full bg-transparent border-0 outline-0 text-[19px] md:text-[20px] font-bold text-[#1A1816] tracking-tight leading-snug placeholder:text-[#A8A8A4] placeholder:font-semibold pr-16 py-2"
                />
                <span className="absolute right-0 top-3 text-[11px] text-[#A8A8A4] font-semibold tabular-nums">
                  {title.length} / 200
                </span>
              </div>
            </section>

            {/* Body / Editor */}
            <section className="px-5 py-4 border-b border-[#F3F3EF]">
              <SectionLabel>Details</SectionLabel>

              <div className="flex items-center gap-0.5 p-1 bg-[#FAFAF8] border border-[#E8E8E4] border-b-0 rounded-t">
                <ToolBtn title="Bold"          onClick={() => wrap('**')}><Bold className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn title="Italic"        onClick={() => wrap('_')}><Italic className="w-3.5 h-3.5" /></ToolBtn>
                <ToolDivider />
                <ToolBtn title="Heading"       onClick={() => linePrefix('## ')}><Heading2 className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn title="Quote"         onClick={() => linePrefix('> ')}><Quote className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn title="Code"          onClick={() => wrap('`')}><Code className="w-3.5 h-3.5" /></ToolBtn>
                <ToolDivider />
                <ToolBtn title="Bullet list"   onClick={() => linePrefix('- ')}><List className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn title="Numbered list" onClick={() => linePrefix('1. ')}><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
                <ToolDivider />
                <ToolBtn title="Link"          onClick={insertLink}><LinkIcon className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn title="Image" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                </ToolBtn>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { onImagePicked(e.target.files?.[0]); e.target.value = '' }}
                />
              </div>
              <textarea
                ref={editorRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onSelect={captureSel}
                onKeyUp={captureSel}
                onClick={captureSel}
                placeholder="Give people enough to answer well — the numbers, what you've tried, and the decision you need help with."
                rows={9}
                className="w-full border border-[#E8E8E4] rounded-b border-t-0 px-4 py-3.5 text-[14px] text-[#1A1816] leading-relaxed outline-none focus:border-[#A8A8A4] resize-y min-h-[200px] placeholder:text-[#A8A8A4]"
              />
            </section>

            {/* Link a deal */}
            <section className="px-5 py-4 border-b border-[#F3F3EF]">
              <SectionLabel>Link a Deal</SectionLabel>

              {linkedDeal ? (
                <div className="bg-[#ECFDF5] border border-[#BBF7D0] rounded-lg p-3 grid grid-cols-[44px_1fr_auto] items-center gap-3">
                  <div className="w-11 h-11 rounded bg-linear-to-br from-[#94A3B8] to-[#64748B] flex items-center justify-center text-white">
                    <HomeIcon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-bold text-[#1A1816] truncate">{linkedDeal.address}</div>
                    <div className="text-[12px] text-[#444441] mt-0.5">
                      {linkedDeal.price && <strong className="text-[#1A1816]">{linkedDeal.price}</strong>}
                      {linkedDeal.beds && <> · {linkedDeal.beds}</>}
                      {linkedDeal.kind === 'wholesale_deal' && <> · off-market</>}
                    </div>
                  </div>
                  <button type="button" onClick={() => setLinkedDeal(null)} className="p-2 text-[#737370] hover:text-[#D03839]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-linear-to-br from-[#ECFDF5] to-white border border-dashed border-[#86EFAC] rounded-lg p-3.5">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-7 h-7 rounded bg-[#0F6E56] flex items-center justify-center text-white shrink-0">
                      <HomeIcon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[#1A1816] leading-tight">Anchor this discussion to a real listing</div>
                      <div className="text-[11.5px] text-[#444441] font-medium mt-0.5">Optional — linked posts get more replies</div>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A8A4]" />
                    <input
                      type="text"
                      value={dealQuery}
                      onChange={(e) => setDealQuery(e.target.value)}
                      placeholder="Search by address, city, or zip…"
                      className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E4] rounded text-[13px] outline-none focus:border-[#0F6E56]"
                    />
                    {searching && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A8A4] animate-spin" />}
                    {dealResults.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E8E8E4] rounded shadow-lg max-h-[280px] overflow-y-auto">
                        {dealResults.map(r => (
                          <button
                            key={`${r.kind}-${r.id}`}
                            type="button"
                            onClick={() => { setLinkedDeal(r); setDealQuery(''); setDealResults([]) }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#FAFAF8] border-b border-[#F3F3EF] last:border-b-0"
                          >
                            <div className="text-[13px] font-semibold text-[#1A1816] truncate">{r.address}</div>
                            <div className="text-[11.5px] text-[#737370]">
                              {r.price && <strong className="text-[#444441]">{r.price}</strong>}
                              {r.beds && <> · {r.beds}</>}
                              {r.kind === 'wholesale_deal' && <> · off-market</>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Market */}
            <section className="px-5 py-4">
              <SectionLabel optional>Market</SectionLabel>
              <input
                type="text"
                value={marketTag}
                onChange={(e) => setMarketTag(e.target.value.slice(0, 80))}
                placeholder="e.g. Lexington, KY"
                className="w-full h-10 px-3.5 border border-[#E8E8E4] rounded text-[13px] outline-none focus:border-[#A8A8A4]"
              />
            </section>

            {/* Action bar */}
            <div className="bg-[#FAFAF8] px-5 py-3 border-t border-[#E8E8E4] flex items-center gap-3 flex-wrap">
              <DraftStatus savedAt={draftSavedAt} />
              {(() => {
                const reason = !profile ? 'Pick a handle to post'
                  : !lotSlug ? 'Pick a Lot above'
                  : title.trim().length < 8 ? `Title needs ${8 - title.trim().length} more character${8 - title.trim().length === 1 ? '' : 's'}`
                  : null
                return reason ? (
                  <span className="text-[12px] text-[#A06000] font-medium">{reason}</span>
                ) : null
              })()}
              <div className="ml-auto flex items-center gap-2">
                <Link href="/community" className="h-9 px-3.5 inline-flex items-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting || title.trim().length < 8 || !lotSlug}
                  title={
                    submitting ? 'Posting…'
                    : !lotSlug ? 'Pick a Lot first'
                    : title.trim().length < 8 ? `Title must be at least 8 characters (currently ${title.trim().length})`
                    : 'Post'
                  }
                  className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#D03839] hover:bg-[#C73022] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[13px] rounded transition-colors"
                >
                  {submitting
                    ? 'Posting…'
                    : selectedLot ? <>Post to {selectedLot.name}<ArrowRight className="w-3.5 h-3.5" strokeWidth={3} /></> : 'Post'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-[13px] text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>
          )}
        </form>

        {/* ── RIGHT RAIL — POSTING GUIDE ───────────────────────────── */}
        <aside className="lg:sticky lg:top-[24px]">
          <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 text-[11px] font-extrabold tracking-wider uppercase text-[#737370]">
              Post like an operator
            </div>
            <ul className="px-4 pb-4 space-y-2.5">
              <GuideItem good><strong>Numbers or it didn&apos;t happen.</strong> Comps, rates, contracts.</GuideItem>
              <GuideItem good><strong>Specific over broad.</strong> &quot;DSCR at 8.75% on DFW SFR&quot; beats &quot;is DSCR good.&quot;</GuideItem>
              <GuideItem good><strong>State the decision.</strong> What are you choosing between?</GuideItem>
              <GuideItem bad><strong>No off-platform routing.</strong> Don&apos;t redirect to your CRM or DMs.</GuideItem>
              <GuideItem bad><strong>9-to-1 rule.</strong> Nine community posts for every one self-promo.</GuideItem>
            </ul>
          </div>
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

// ── small pieces ───────────────────────────────────────────────────────

function SectionLabel({ children, required, optional }) {
  return (
    <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#737370] mb-2 flex items-center gap-1">
      {children}
      {required && <span className="text-[#D03839]">*</span>}
      {optional && <span className="ml-1 text-[#A8A8A4] font-semibold normal-case tracking-normal text-[11px]">optional</span>}
    </div>
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
      className="w-7 h-7 rounded flex items-center justify-center text-[#737370] hover:bg-white hover:text-[#1A1816] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function ToolDivider() {
  return <span className="w-px h-4 bg-[#D1D1CE] mx-1" />
}

function GuideItem({ good, bad, children }) {
  return (
    <li className="grid grid-cols-[18px_1fr] gap-2 text-[12.5px] text-[#444441] leading-snug">
      <span
        className={`w-[18px] h-[18px] rounded flex items-center justify-center font-extrabold text-[11px] shrink-0 ${
          good ? 'bg-[#ECFDF5] text-[#0F6E56]' : 'bg-[#FEE2E2] text-[#D03839]'
        }`}
      >
        {good ? '✓' : '✕'}
      </span>
      <span>{children}</span>
    </li>
  )
}

function DraftStatus({ savedAt }) {
  if (!savedAt) {
    return <span className="text-[12px] text-[#A8A8A4] font-medium">Drafts save locally</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#737370] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
      Draft saved
    </span>
  )
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <main className="max-w-[1080px] mx-auto px-4 md:px-8 py-5 pb-16">{children}</main>
      <Footer hideCta />
    </div>
  )
}
