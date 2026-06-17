'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, X, Shuffle, UserCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { lockBodyScroll } from './Dialogs'

const ADJ = [
  'brick','gulf','gold','iron','copper','ridge','pine','oak','river','anchor',
  'north','south','lone','prime','peak','cash','deal','blue','green','frontier',
  'harbor','valley','summit','basin','delta','cape','point','sage','flint','rust',
  'silver','stone','ember','dusk','rapid','plain','grit','solid','open','off',
]

const NOUN = [
  'baron','scout','hunter','mason','deeds','brrrr','capital','doorways','kraftsmen',
  'shark','equity','escrow','broker','builder','flipper','lender','closer','principal',
  'holder','dealer','stash','vault','spread','margin','tape','draw','spread','wire',
  'note','title','keys','rehab','wholesale','runner','pivot','metric','sourcer','quote',
]

function suggestHandle() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n = NOUN[Math.floor(Math.random() * NOUN.length)]
  // 25% of the time add a 2-digit suffix to reduce collision odds
  return Math.random() < 0.25 ? `${a}_${n}_${Math.floor(Math.random() * 89) + 10}` : `${a}_${n}`
}

// Derive a handle-safe slug from a real first/last name
function handleFromName(first, last) {
  const raw = `${first || ''}_${last || ''}`
  return raw
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9_]/g, '')                          // keep only handle-legal chars
    .replace(/^_+|_+$/g, '')                             // trim leading/trailing _
    .slice(0, 24)
}

export function HandlePickerModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [edited, setEdited] = useState(false)

  // Seed a suggestion when the modal first opens
  useEffect(() => {
    if (!open) { setEdited(false); setError(null); return }
    if (!edited) setHandle(suggestHandle())
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // iOS-safe body scroll lock + scrollbar-jump compensation
  useEffect(() => {
    if (!open) return
    return lockBodyScroll()
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onChange = (v) => {
    setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))
    setEdited(true)
    setError(null)
  }

  const shuffle = () => {
    setHandle(suggestHandle())
    setEdited(false)
    setError(null)
  }

  // Available if the DeelMap account has a real first/last name on it
  const hasAccountName = !!(user?.first_name || user?.last_name)
  const useAccountName = () => {
    const derived = handleFromName(user?.first_name, user?.last_name)
    if (derived.length < 3) {
      setError('Your account name is too short to make a handle. Type your own.')
      return
    }
    setHandle(derived)
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').slice(0, 60)
    if (fullName) setDisplayName(fullName)
    setEdited(true)
    setError(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!user?.id) { setError('Please sign in first.'); return }
    if (handle.length < 3) { setError('Handle must be at least 3 characters.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/community/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ handle, display_name: displayName || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        // If taken, shuffle a new suggestion automatically when user hasn't manually edited
        if ((data.error || '').toLowerCase().includes('taken') && !edited) {
          setHandle(suggestHandle())
        }
        setError(data.error || 'Could not create profile.')
        setBusy(false); return
      }
      onCreated?.(data.profile)
    } catch {
      setError('Network error. Try again.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-black/30 backdrop-blur-[2px]"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className="min-h-full flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      >
      <div className="bg-white rounded shadow-2xl w-full max-w-md border border-[#E8E8E4]">
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-[#E8E8E4]">
          <div>
            <h2 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">Pick your community handle</h2>
            <p className="text-[12.5px] text-[#737370] mt-1">
              Anonymous or your real name — your call. The system doesn&apos;t know which is which.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#737370] hover:text-[#1A1816]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[#737370]">Handle</label>
              <div className="flex items-center gap-3">
                {hasAccountName && (
                  <button
                    type="button"
                    onClick={useAccountName}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1A1816] hover:text-[#D03839]"
                    title="Fill from your DeelMap account name"
                  >
                    <UserCircle className="w-3 h-3" strokeWidth={2.5} />
                    Use my account name
                  </button>
                )}
                <button
                  type="button"
                  onClick={shuffle}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#D03839] hover:text-[#C73022]"
                >
                  <Shuffle className="w-3 h-3" strokeWidth={2.5} />
                  Shuffle suggestion
                </button>
              </div>
            </div>
            <div className="flex items-center border border-[#D1D1CE] rounded focus-within:border-[#D03839]">
              <span className="pl-3 text-[15px] text-[#A8A8A4]">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
                onFocus={(e) => { if (!edited) e.target.select() }}
                placeholder="bluegrass_brrrr"
                className="flex-1 px-2 py-2.5 text-[15px] outline-none bg-transparent"
              />
            </div>
            <p className="text-[11.5px] text-[#A8A8A4] mt-1.5">
              {edited
                ? '3–24 chars · lowercase letters, numbers, underscore. Changeable once every 90 days.'
                : 'We seeded a random suggestion. Tap Shuffle for another, or type your own.'}
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#737370] mb-1.5">Display name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              placeholder="Bluegrass BRRRR LLC"
              className="w-full px-3 py-2.5 text-[15px] border border-[#D1D1CE] rounded outline-none focus:border-[#D03839]"
            />
            <p className="text-[11.5px] text-[#A8A8A4] mt-1.5">Shown next to your handle. Leave blank to use just the handle.</p>
          </div>

          <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-3 flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[12px] text-[#444441] leading-relaxed">
              Your DeelMap account and your community profile are kept separate. We don&apos;t expose the link in any public response.
            </p>
          </div>

          {error && <div className="text-[13px] text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={busy || handle.length < 3}
            className="w-full h-11 bg-[#D03839] hover:bg-[#C73022] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[14px] rounded transition-colors"
          >
            {busy ? 'Creating…' : 'Create profile'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
