'use client'
import { useEffect, useState } from 'react'
import { Users, Eye, X } from 'lucide-react'

function formatDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function displayName(row) {
  if (row.user_first_name || row.user_last_name) {
    return [row.user_first_name, row.user_last_name].filter(Boolean).join(' ').trim()
  }
  return row.user_email || 'Guest'
}

const AVATAR_PAIRS = [
  { bg: '#FEF0EF', text: '#D03839' },
  { bg: '#E4F5EC', text: '#0F6E56' },
  { bg: '#FEF3E2', text: '#B5620A' },
  { bg: '#F3F3F0', text: '#1A1816' },
  { bg: '#F3F3F0', text: '#1A1816' },
]

function getAvatarPair(seed = '') {
  const str = String(seed || 'G')
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return AVATAR_PAIRS[Math.abs(hash) % AVATAR_PAIRS.length]
}

const PERIOD_OPTIONS = [
  { value: 'last7days', label: '7 Days' },
  { value: 'last30days', label: '30 Days' },
  { value: 'all', label: 'All Time' },
]

export default function PropertyAnalyticsSidebar({ propertyId, propertyAddress, userId, onClose }) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  useEffect(() => {
    if (!propertyId || !userId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/buyer/listings/analytics?propertyId=${propertyId}&userId=${userId}&period=${period}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load analytics')
        return res.json()
      })
      .then(json => { if (!cancelled) setData(json) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [propertyId, userId, period])

  const sessions = data?.viewerSessions || []

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-[460px] min-w-[320px] max-w-full z-50 flex flex-col overflow-hidden bg-white transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-12px 0 40px rgba(0,0,0,0.10)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-[#D03839] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-white/70 uppercase tracking-[1.1px] mb-0.5">Property Analytics</p>
              {propertyAddress && (
                <h2 className="text-[15px] font-bold text-white leading-snug truncate" title={propertyAddress}>
                  {propertyAddress}
                </h2>
              )}
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-white/20 hover:bg-white/30 text-white transition-colors mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-5 py-3 bg-white border-b border-[#E8E8E4]">
          <span className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1px] mr-1">Period:</span>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`h-7 px-3 rounded text-[12px] font-semibold transition-colors ${
                period === opt.value
                  ? 'bg-[#1A1816] text-white'
                  : 'bg-[#FAFAF8] text-[#737370] hover:bg-[#F0F0EC] hover:text-[#1A1816] border border-[#E8E8E4]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAF8]">

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-2 border-[#E8E8E4] border-t-[#D03839] rounded-full animate-spin" />
              <p className="text-[13px] font-medium text-[#737370]">Loading analytics…</p>
            </div>
          )}

          {error && (
            <div className="mx-5 mt-5 p-4 rounded bg-[#FEF0EF] border border-[#F5C4C0]">
              <p className="text-[13px] text-[#D03839] font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="p-5 space-y-5">

              {/* Unique Buyers stat */}
              <div className="bg-white border border-[#E8E8E4] rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-[#D03839]" />
                  </div>
                  <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[0.8px]">Unique Buyers</p>
                </div>
                <p className="text-[28px] font-bold text-[#1A1816] leading-none">{data.uniqueViewers ?? 0}</p>
              </div>

              {/* Viewer Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-4 rounded-full bg-[#D03839] flex-shrink-0" />
                  <h3 className="text-[13px] font-bold text-[#1A1816]">Viewer Activity</h3>
                  <span className="text-[11px] font-semibold text-[#737370] bg-[#F0F0EC] px-2 py-0.5 rounded-full">
                    {sessions.length}
                  </span>
                </div>

                {sessions.length === 0 ? (
                  <div className="rounded border border-dashed border-[#E8E8E4] bg-white py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#F0F0EC] flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-5 h-5 text-[#A8A8A4]" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#1A1816] mb-1">No activity yet</p>
                    <p className="text-[12px] text-[#737370] max-w-[200px] mx-auto">
                      When buyers view this listing, they'll appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((row, idx) => {
                      const name = displayName(row)
                      const initial = (name && name !== 'Guest' ? name : (row.user_email || 'G')).charAt(0).toUpperCase()
                      const avatarPair = getAvatarPair(name)
                      const lastSeen = row.view_end_time
                        ? formatDateShort(row.view_end_time)
                        : row.created_at
                        ? formatDateShort(row.created_at)
                        : null
                      return (
                        <div
                          key={(row.user_email || 'guest') + idx}
                          className="bg-white border border-[#E8E8E4] rounded p-3.5 hover:border-[#D03839]/30 transition-colors"
                        >
                          <div className="flex gap-3 items-center">
                            <div
                              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: avatarPair.bg }}
                            >
                              <span className="text-[13px] font-bold" style={{ color: avatarPair.text }}>{initial}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-[#1A1816] capitalize truncate">{name}</p>
                              {lastSeen && (
                                <p className="text-[11px] text-[#A8A8A4] mt-0.5">Last seen: {lastSeen}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </aside>
    </>
  )
}
