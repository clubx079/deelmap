'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ShieldCheck, Check, Upload, Loader2, FileText, Trash2,
  Clock, AlertCircle, ChevronRight,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { showToast } from '@/components/community/Dialogs'

const ROLES = [
  {
    value: 'principal',  label: 'Principal',  color: '#1A1816',
    blurb: 'Active investor closing deals on your own account.',
    credLabel: 'Entity / LLC name',
    credPlaceholder: 'Bluegrass Capital LLC',
    needs: 'Proof of recent closing (HUD, settlement statement) or entity formation docs.',
  },
  {
    value: 'lender',     label: 'Lender',     color: '#0F6E56',
    blurb: 'NMLS-licensed lender or capital provider.',
    credLabel: 'NMLS number',
    credPlaceholder: '1234567',
    needs: 'NMLS Consumer Access profile link or screenshot.',
  },
  {
    value: 'contractor', label: 'Contractor', color: '#B5620A',
    blurb: 'Licensed GC or specialty trade.',
    credLabel: 'Contractor license #',
    credPlaceholder: 'KY GC-12345',
    needs: 'Active license document + current Certificate of Insurance (COI).',
  },
  {
    value: 'agent',      label: 'Agent',      color: '#D03839',
    blurb: 'Licensed real-estate agent or broker.',
    credLabel: 'Real-estate license #',
    credPlaceholder: 'TX 0123456',
    needs: 'Active license document; brokerage affiliation appreciated.',
  },
  {
    value: 'wholesaler', label: 'Wholesaler', color: '#5B21B6',
    blurb: 'Assignment-based deal sourcer.',
    credLabel: 'Closed assignment reference',
    credPlaceholder: 'Address or HUD reference',
    needs: 'At least one closed assignment contract (redactions OK).',
  },
]

const STATUS_STYLES = {
  pending:  { label: 'Pending review', bg: '#FEF3C7', border: '#FCD34D', fg: '#92400E', icon: Clock },
  approved: { label: 'Approved',       bg: '#DCFCE7', border: '#86EFAC', fg: '#065F46', icon: Check },
  rejected: { label: 'Rejected',       bg: '#FEE2E2', border: '#FCA5A5', fg: '#991B1B', icon: AlertCircle },
}

export default function VerifyPage() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [submissions, setSubmissions] = useState(null)
  const [showHandlePicker, setShowHandlePicker] = useState(false)

  // Form state
  const [role, setRole] = useState(null)
  const [legalName, setLegalName] = useState('')
  const [credentialNumber, setCredentialNumber] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [notes, setNotes] = useState('')
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Load profile
  useEffect(() => {
    if (!user?.id) { setProfile(null); setProfileChecked(true); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => { setProfile(d.profile); setProfileChecked(true) })
      .catch(() => setProfileChecked(true))
  }, [user?.id])

  // Load submissions when profile is ready
  useEffect(() => {
    if (!profileChecked || !user?.id || !profile) {
      setSubmissions(profileChecked ? [] : null)
      return
    }
    fetch('/api/community/verifications', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions || []))
      .catch(() => setSubmissions([]))
  }, [profileChecked, user?.id, profile, authHeaders])

  const hasPending = (submissions || []).some(s => s.status === 'pending')
  const isVerified = !!profile?.role_badge
  const selectedRole = ROLES.find(r => r.value === role)

  const onPickFiles = async (files) => {
    if (!files?.length) return
    setUploading(true); setError(null)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('scope', 'verification')
        const res = await fetch('/api/community/upload', { method: 'POST', headers: authHeaders(), body: fd })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Upload failed.'); break }
        setDocs(prev => [...prev, { key: data.key, name: file.name, url: data.url }])
      }
    } finally { setUploading(false) }
  }

  const removeDoc = (key) => setDocs(prev => prev.filter(d => d.key !== key))

  const resetForm = () => {
    setRole(null); setLegalName(''); setCredentialNumber('')
    setJurisdiction(''); setNotes(''); setDocs([]); setError(null)
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    setError(null)
    if (!role) { setError('Pick a role first.'); return }
    if (legalName.trim().length < 2) { setError('Legal name is required.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/community/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          role,
          legal_name: legalName.trim(),
          credential_type: selectedRole?.credLabel || null,
          credential_number: credentialNumber.trim() || null,
          jurisdiction: jurisdiction.trim() || null,
          notes: notes.trim() || null,
          document_urls: docs.map(d => d.key),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not submit.'); setSubmitting(false); return }
      showToast('Submitted for review', { variant: 'success' })
      resetForm()
      // Reload submissions
      fetch('/api/community/verifications', { headers: authHeaders() })
        .then(r => r.json())
        .then(d => setSubmissions(d.submissions || []))
      setSubmitting(false)
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  const isGuest = profileChecked && !user?.id
  const isMissingProfile = profileChecked && user?.id && !profile

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      {/* Sub-nav */}
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
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded bg-[#0F6E56] text-white text-[13px] font-semibold whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} fill="currentColor" />
              Verification
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-linear-to-br from-[#0F6E56] to-[#065F46] text-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-7 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] md:text-[32px] font-extrabold tracking-tight leading-tight">
                Get verified
              </h1>
              <p className="text-[13px] md:text-[14px] text-white/85 mt-1.5 max-w-2xl leading-relaxed">
                Verify your role — Lender, Contractor, Agent, Principal, or Wholesaler — to earn a public badge,
                unlock restricted Lots, and get 3× Equity on replies. Documents stay private. Only the badge is shown.
              </p>
            </div>
            {isVerified && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-[#0F6E56] rounded font-extrabold text-[13px] tracking-wide whitespace-nowrap">
                <Check className="w-4 h-4" strokeWidth={3} />
                Verified as {cap(profile.role_badge)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-[1100px] mx-auto px-3 md:px-8 py-5 md:py-7">
        {!profileChecked ? (
          <div className="bg-white border border-[#E8E8E4] rounded-xl p-6 animate-pulse h-64" />
        ) : isGuest ? (
          <GuestPrompt />
        ) : isMissingProfile ? (
          <NeedProfilePrompt onPick={() => setShowHandlePicker(true)} />
        ) : (
          <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
            <main className="min-w-0 space-y-5">
              {/* Submission history */}
              {submissions && submissions.length > 0 && (
                <SubmissionsList submissions={submissions} />
              )}

              {/* Form (hide if already verified or pending) */}
              {isVerified ? (
                <div className="bg-white border border-[#E8E8E4] rounded-xl p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#DCFCE7] text-[#0F6E56] mb-4">
                    <Check className="w-7 h-7" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-[19px] font-extrabold text-[#1A1816] tracking-tight">
                    You&apos;re verified as {cap(profile.role_badge)}
                  </h2>
                  <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
                    Your badge is live across the community. Need to change roles or submit additional credentials?
                    Reach out through our <a className="text-[#D03839] font-semibold" href="/contact">Contact page</a>.
                  </p>
                  <Link
                    href="/community/me"
                    className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#1A1816] hover:bg-[#2A2825] text-white font-bold text-[13.5px] rounded transition-colors"
                  >
                    Back to profile <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
                  </Link>
                </div>
              ) : hasPending ? (
                <div className="bg-white border border-[#E8E8E4] rounded-xl p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF3C7] text-[#92400E] mb-4">
                    <Clock className="w-7 h-7" strokeWidth={2.25} />
                  </div>
                  <h2 className="text-[19px] font-extrabold text-[#1A1816] tracking-tight">
                    Your submission is under review
                  </h2>
                  <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
                    A moderator will review your credentials within 48 hours. You&apos;ll see an update here when the review completes.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden">
                  {/* Role picker */}
                  <section className="px-5 md:px-6 py-5 border-b border-[#F3F3EF]">
                    <SectionLabel required>Choose your role</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {ROLES.map(r => {
                        const selected = role === r.value
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setRole(r.value)}
                            className={`text-left p-3.5 rounded border transition-all ${
                              selected
                                ? 'border-[#D03839] bg-[#FEF0EF] shadow-[0_0_0_3px_rgba(208,56,57,0.08)]'
                                : 'border-[#E8E8E4] bg-white hover:border-[#A8A8A4] hover:bg-[#FAFAF8]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-bold tracking-wide text-white"
                                style={{ background: r.color }}
                              >
                                <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2.5} />
                                Verified {r.label}
                              </span>
                              {selected && <Check className="w-4 h-4 text-[#D03839]" strokeWidth={3} />}
                            </div>
                            <div className="text-[12.5px] text-[#444441] leading-snug">{r.blurb}</div>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {selectedRole && (
                    <>
                      <section className="px-5 md:px-6 py-5 border-b border-[#F3F3EF]">
                        <SectionLabel required>Legal name</SectionLabel>
                        <input
                          type="text"
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value.slice(0, 120))}
                          placeholder="Your real legal name (private)"
                          className="w-full h-11 px-3.5 border border-[#E8E8E4] rounded text-[14px] outline-none focus:border-[#A8A8A4]"
                        />
                        <p className="text-[11.5px] text-[#A8A8A4] mt-1.5">Never shown publicly. Used only by mods to cross-check credentials.</p>
                      </section>

                      <section className="px-5 md:px-6 py-5 border-b border-[#F3F3EF]">
                        <SectionLabel>Credential details</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11.5px] text-[#737370] font-semibold mb-1">{selectedRole.credLabel}</label>
                            <input
                              type="text"
                              value={credentialNumber}
                              onChange={(e) => setCredentialNumber(e.target.value.slice(0, 60))}
                              placeholder={selectedRole.credPlaceholder}
                              className="w-full h-11 px-3.5 border border-[#E8E8E4] rounded text-[13.5px] outline-none focus:border-[#A8A8A4]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11.5px] text-[#737370] font-semibold mb-1">Jurisdiction</label>
                            <input
                              type="text"
                              value={jurisdiction}
                              onChange={(e) => setJurisdiction(e.target.value.slice(0, 60))}
                              placeholder="e.g. Kentucky, Texas, Federal"
                              className="w-full h-11 px-3.5 border border-[#E8E8E4] rounded text-[13.5px] outline-none focus:border-[#A8A8A4]"
                            />
                          </div>
                        </div>
                        <p className="text-[11.5px] text-[#A8A8A4] mt-2.5">{selectedRole.needs}</p>
                      </section>

                      <section className="px-5 md:px-6 py-5 border-b border-[#F3F3EF]">
                        <SectionLabel>Supporting documents</SectionLabel>
                        {docs.length > 0 && (
                          <ul className="space-y-1.5 mb-2 mt-1">
                            {docs.map(d => (
                              <li key={d.key} className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF8] border border-[#E8E8E4] rounded">
                                <FileText className="w-4 h-4 text-[#737370] shrink-0" />
                                <span className="flex-1 text-[12.5px] text-[#1A1816] truncate">{d.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDoc(d.key)}
                                  className="p-1 text-[#737370] hover:text-[#D03839]"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading || docs.length >= 10}
                          className="w-full px-3.5 py-3.5 border border-dashed border-[#D1D1CE] rounded text-[13px] font-semibold text-[#444441] hover:border-[#0F6E56] hover:text-[#0F6E56] hover:bg-[#ECFDF5] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploading ? 'Uploading…' : docs.length >= 10 ? 'Max 10 files' : 'Add files (PDF, JPG, PNG)'}
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => { onPickFiles(e.target.files); e.target.value = '' }}
                        />
                        <p className="text-[11.5px] text-[#A8A8A4] mt-2.5">
                          Stored in a private bucket. Only admins can open them, and only signed links (1-hour expiry) are issued.
                        </p>
                      </section>

                      <section className="px-5 md:px-6 py-5 border-b border-[#F3F3EF]">
                        <SectionLabel optional>Notes</SectionLabel>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                          rows={3}
                          placeholder="Anything that would help a moderator verify you faster."
                          className="w-full px-3.5 py-2.5 border border-[#E8E8E4] rounded text-[13px] leading-relaxed outline-none focus:border-[#A8A8A4] resize-y min-h-[88px]"
                        />
                      </section>
                    </>
                  )}

                  {/* Footer */}
                  <div className="bg-[#FAFAF8] px-5 md:px-6 py-4 flex flex-col gap-3">
                    {error && (
                      <div className="text-[13px] text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <Link
                        href="/community"
                        className="h-11 px-4 inline-flex items-center justify-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={submitting || !role || legalName.trim().length < 2}
                        className="h-11 px-5 ml-auto inline-flex items-center justify-center gap-1.5 bg-[#0F6E56] hover:bg-[#0A5740] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[13.5px] rounded transition-colors"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />}
                        {submitting ? 'Submitting…' : selectedRole ? `Submit for ${selectedRole.label}` : 'Submit verification'}
                      </button>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#737370] font-medium">
                      <ShieldCheck className="w-3 h-3 text-[#0F6E56] shrink-0" strokeWidth={2.5} />
                      Submissions reviewed within 48h
                    </div>
                  </div>
                </form>
              )}
            </main>

            {/* Sidebar — process explainer */}
            <aside className="hidden lg:block">
              <div className="bg-white border border-[#E8E8E4] rounded-xl p-5 sticky top-[68px]">
                <h3 className="text-[14px] font-extrabold text-[#1A1816] tracking-tight mb-3">How it works</h3>
                <ol className="space-y-3.5">
                  {[
                    { n: 1, t: 'Pick a role',       b: 'Choose the one that matches your day-to-day. One badge per profile.' },
                    { n: 2, t: 'Submit credentials', b: 'NMLS, license + COI, closed-assignment proof. Stored privately.' },
                    { n: 3, t: 'Mod review',         b: 'A real human cross-checks against public registries within 48h.' },
                    { n: 4, t: 'Badge goes live',    b: 'Your role appears on every post and comment. Documents stay sealed.' },
                  ].map(s => (
                    <li key={s.n} className="grid grid-cols-[28px_1fr] gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-[#0F6E56] text-white text-[12px] font-extrabold flex items-center justify-center">
                        {s.n}
                      </span>
                      <div>
                        <div className="text-[13px] font-bold text-[#1A1816]">{s.t}</div>
                        <div className="text-[12px] text-[#737370] leading-relaxed mt-0.5">{s.b}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4 mt-3 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0F6E56] shrink-0 mt-0.5" strokeWidth={2.25} />
                <div className="text-[12px] text-[#444441] leading-relaxed">
                  <strong className="text-[#1A1816]">Privacy promise.</strong>{' '}
                  Your legal name and documents never appear publicly. Only the role badge shows next to your handle.
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <Footer hideCta />

      <HandlePickerModal
        open={showHandlePicker}
        onClose={() => setShowHandlePicker(false)}
        onCreated={(p) => { setProfile(p); setShowHandlePicker(false) }}
      />
    </div>
  )
}

function SubmissionsList({ submissions }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-xl">
      <div className="px-5 md:px-6 pt-4 pb-3 border-b border-[#F3F3EF]">
        <h3 className="text-[14px] font-extrabold text-[#1A1816] tracking-tight">Your submissions</h3>
        <p className="text-[12px] text-[#737370] mt-0.5">Latest review status for credentials you&apos;ve sent.</p>
      </div>
      <ul>
        {submissions.map((s, i) => {
          const style = STATUS_STYLES[s.status] || STATUS_STYLES.pending
          const Icon = style.icon
          return (
            <li key={s.id} className={`px-5 md:px-6 py-4 ${i > 0 ? 'border-t border-[#F3F3EF]' : ''}`}>
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                  style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
                >
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1A1816]">{cap(s.role)}</span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-extrabold tracking-wide uppercase"
                      style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#737370] mt-0.5">
                    Submitted {relativeTime(s.submitted_at)}
                    {s.reviewed_at && <> · Reviewed {relativeTime(s.reviewed_at)}</>}
                    {s.credential_number && <> · {s.credential_number}</>}
                    {s.jurisdiction && <> · {s.jurisdiction}</>}
                  </div>
                  {s.admin_notes && (
                    <div className="mt-2 text-[12.5px] text-[#444441] bg-[#FAFAF8] border-l-2 border-[#D1D1CE] px-3 py-2 rounded">
                      <strong className="text-[#1A1816] font-semibold">Moderator note: </strong>{s.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SectionLabel({ children, required, optional }) {
  return (
    <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#737370] mb-2 flex items-center gap-1">
      {children}
      {required && <span className="text-[#D03839]">*</span>}
      {optional && <span className="ml-1 text-[#A8A8A4] font-semibold normal-case tracking-normal text-[11px]">optional</span>}
    </div>
  )
}

function GuestPrompt() {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden max-w-2xl mx-auto">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#DCFCE7] text-[#0F6E56] mb-4">
          <ShieldCheck className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Sign in to verify your role
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Verifications are tied to your community profile. Sign in, pick a handle, then submit credentials.
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
    <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden max-w-2xl mx-auto">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#DCFCE7] text-[#0F6E56] mb-4">
          <ShieldCheck className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Pick a handle first
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          You need a community handle before you can submit credentials. Pick one — anonymous or your real name.
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

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }
