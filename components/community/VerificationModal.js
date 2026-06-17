'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, ShieldCheck, Upload, Loader2, Check, FileText, Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { lockBodyScroll, ModalBody, ModalFooter } from './Dialogs'

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

export function VerificationModal({ open, onClose, onSubmitted }) {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [legalName, setLegalName] = useState('')
  const [credentialNumber, setCredentialNumber] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [notes, setNotes] = useState('')
  const [docs, setDocs] = useState([]) // [{key, name, url}]
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

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

  // Reset state when closing
  useEffect(() => {
    if (open) return
    setRole(null); setLegalName(''); setCredentialNumber('')
    setJurisdiction(''); setNotes(''); setDocs([])
    setError(null); setSubmitting(false); setUploading(false)
  }, [open])

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

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

  const selectedRole = ROLES.find(r => r.value === role)

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
      onSubmitted?.(data.submission)
      onClose?.()
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] sm:flex sm:items-center sm:justify-center overscroll-contain bg-black/30 backdrop-blur-[2px] sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="relative bg-white w-full max-w-[820px] h-full sm:h-auto sm:shadow-2xl sm:border sm:border-[#E8E8E4] sm:rounded sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">

        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-5 pt-5 pb-4 border-b border-[#F3F3EF]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#0F6E56] rounded flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight leading-tight">Get Verified</h2>
              <p className="text-[12.5px] text-[#737370] mt-0.5 leading-relaxed">
                Submit credentials privately. Only your role badge becomes public — never the documents.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#737370] hover:text-[#1A1816]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          <ModalBody>

          {/* Role picker */}
          <section className="px-5 py-4 border-b border-[#F3F3EF]">
            <SectionLabel required>Role</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ROLES.map(r => {
                const selected = role === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`text-left p-3 rounded border transition-all ${
                      selected
                        ? 'border-[#D03839] bg-[#FEF0EF] shadow-[0_0_0_3px_rgba(208,56,57,0.08)]'
                        : 'border-[#E8E8E4] bg-white hover:border-[#A8A8A4] hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-bold tracking-wide text-white"
                        style={{ background: r.color }}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2.5} />
                        Verified {r.label}
                      </span>
                      {selected && <Check className="w-3.5 h-3.5 text-[#D03839]" strokeWidth={3} />}
                    </div>
                    <div className="text-[12px] text-[#444441] leading-snug">{r.blurb}</div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedRole && (
            <>
              {/* Legal name */}
              <section className="px-5 py-4 border-b border-[#F3F3EF]">
                <SectionLabel required>Legal name</SectionLabel>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value.slice(0, 120))}
                  placeholder="Your real legal name (private)"
                  className="w-full h-10 px-3.5 border border-[#E8E8E4] rounded text-[14px] outline-none focus:border-[#A8A8A4]"
                />
                <p className="text-[11.5px] text-[#A8A8A4] mt-1.5">Never shown publicly. Used only by mods to cross-check your credentials.</p>
              </section>

              {/* Credential */}
              <section className="px-5 py-4 border-b border-[#F3F3EF]">
                <SectionLabel>Credential details</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11.5px] text-[#737370] font-semibold mb-1">{selectedRole.credLabel}</label>
                    <input
                      type="text"
                      value={credentialNumber}
                      onChange={(e) => setCredentialNumber(e.target.value.slice(0, 60))}
                      placeholder={selectedRole.credPlaceholder}
                      className="w-full h-10 px-3.5 border border-[#E8E8E4] rounded text-[13px] outline-none focus:border-[#A8A8A4]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] text-[#737370] font-semibold mb-1">Jurisdiction</label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value.slice(0, 60))}
                      placeholder="e.g. Kentucky, Texas, Federal"
                      className="w-full h-10 px-3.5 border border-[#E8E8E4] rounded text-[13px] outline-none focus:border-[#A8A8A4]"
                    />
                  </div>
                </div>
                <p className="text-[11.5px] text-[#A8A8A4] mt-2">{selectedRole.needs}</p>
              </section>

              {/* Documents */}
              <section className="px-5 py-4 border-b border-[#F3F3EF]">
                <SectionLabel>Supporting documents</SectionLabel>

                {docs.length > 0 && (
                  <ul className="space-y-1.5 mb-2">
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
                  className="w-full px-3.5 py-3 border border-dashed border-[#D1D1CE] rounded text-[12.5px] font-semibold text-[#444441] hover:border-[#0F6E56] hover:text-[#0F6E56] hover:bg-[#ECFDF5] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-[11.5px] text-[#A8A8A4] mt-2">
                  Stored in a private bucket. Only admins can open them, and only signed links (1-hour expiry) are issued.
                </p>
              </section>

              {/* Notes */}
              <section className="px-5 py-4 border-b border-[#F3F3EF]">
                <SectionLabel optional>Notes</SectionLabel>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 2000))}
                  rows={3}
                  placeholder="Anything that would help a moderator verify you faster."
                  className="w-full px-3.5 py-2.5 border border-[#E8E8E4] rounded text-[13px] leading-relaxed outline-none focus:border-[#A8A8A4] resize-y min-h-[80px]"
                />
              </section>
            </>
          )}
          </ModalBody>

          {/* Action bar — buttons FIRST so they remain visible even if the very
              bottom edge is clipped by the visible area. */}
          <ModalFooter className="bg-[#FAFAF8] border-t border-[#E8E8E4]">
            <div className="px-5 pt-3 pb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 inline-flex items-center justify-center text-[13px] font-semibold text-[#444441] border border-[#D1D1CE] rounded hover:bg-white flex-1 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !role || legalName.trim().length < 2}
                className="h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#0F6E56] hover:bg-[#0A5740] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[13px] rounded transition-colors flex-1 sm:flex-none sm:ml-auto"
              >
                {submitting ? 'Submitting…' : selectedRole ? `Submit for ${selectedRole.label}` : 'Submit verification'}
              </button>
            </div>
            <div className="px-5 pb-3 pt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[#737370] font-medium">
              <ShieldCheck className="w-3 h-3 text-[#0F6E56] shrink-0" strokeWidth={2.5} />
              Submissions reviewed within 48h
            </div>
            {error && (
              <div className="px-5 pb-3 text-[13px] text-[#991B1B]">
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>
              </div>
            )}
          </ModalFooter>
        </form>
      </div>
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
