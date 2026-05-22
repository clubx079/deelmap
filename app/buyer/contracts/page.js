'use client'
import { useState, useEffect, useContext } from 'react'
import { FileText, CheckCircle, ExternalLink, Plus, X, Download, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'

const STATUS = {
  completed: { label: 'Completed', cls: 'text-[#16A34A] bg-[#DCFCE7]' },
  pending: { label: 'Pending Signature', cls: 'text-[#D97706] bg-[#FEF3C7]' },
  declined: { label: 'Declined', cls: 'text-[#D03839] bg-[#FEF0EF]' },
}

function badge(status) {
  return STATUS[status] || { label: status ?? 'Unknown', cls: 'text-[#737370] bg-[#F5F5F3]' }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function NewContractModal({ buyerEmail, buyerName, onClose, onCreated }) {
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({ sellerName: '', sellerEmail: '', property: '', templateId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/contracts?type=templates')
      .then(r => r.json())
      .then(data => {
        setTemplates(data)
        if (data.length > 0) setForm(f => ({ ...f, templateId: String(data[0].id) }))
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.sellerEmail || !form.templateId) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, buyerEmail, buyerName }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Failed to create contract'); return }
      if (data.assignor_slug) window.open(`https://docuseal.com/s/${data.assignor_slug}`, '_blank')
      onCreated()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded w-full max-w-[480px] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8E4]">
          <h2 className="text-[16px] font-bold text-[#1A1816]">New Contract</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#FAFAF8] text-[#737370] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Contract Template</label>
            <select
              value={form.templateId}
              onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
              className="w-full h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] bg-white focus:outline-none focus:border-[#1A1816]"
              required
            >
              {templates.length === 0 && <option value="">Loading templates...</option>}
              {templates.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Seller Full Name</label>
            <input
              type="text"
              placeholder="John Smith"
              value={form.sellerName}
              onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))}
              className="w-full h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Seller Email <span className="text-[#D03839]">*</span></label>
            <input
              type="email"
              placeholder="seller@example.com"
              value={form.sellerEmail}
              onChange={e => setForm(f => ({ ...f, sellerEmail: e.target.value }))}
              className="w-full h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816]"
              required
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Property Address <span className="text-[#A8A8A4] font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="123 Main St, Dallas, TX"
              value={form.property}
              onChange={e => setForm(f => ({ ...f, property: e.target.value }))}
              className="w-full h-9 px-3 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder:text-[#A8A8A4] focus:outline-none focus:border-[#1A1816]"
            />
          </div>

          {error && <p className="text-[12px] text-[#D03839]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 border border-[#E8E8E4] text-[#444441] text-[13px] font-medium rounded hover:border-[#1A1816] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.sellerEmail || !form.templateId}
              className="flex-1 h-9 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BuyerContractsPage() {
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const { user } = useAuth()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function handleDelete(id) {
    setDeletingId(id)
    await fetch('/api/contracts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setContracts(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  async function handleViewDocument(contractId) {
    setDownloadingId(contractId)
    try {
      const res = await fetch(`/api/contracts?type=document&id=${contractId}`)
      const data = await res.json()
      if (data.url) window.open(data.url, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => { setPageTitle('Contracts') }, [])

  useEffect(() => {
    if (!user?.email) return
    fetchContracts()
  }, [user?.email])

  function fetchContracts() {
    setLoading(true)
    fetch(`/api/contracts?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(setContracts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function signUrl(contract) {
    const sub = contract.submitters?.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())
    if (!sub || sub.status === 'completed' || sub.status === 'declined') return null
    return `https://docuseal.com/s/${sub.slug}`
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-3 animate-pulse">
        <div className="h-7 bg-[#E8E8E4] rounded w-36" />
        <div className="h-4 bg-[#E8E8E4] rounded w-56" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#E8E8E4] rounded" />)}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {showModal && (
        <NewContractModal
          buyerEmail={user?.email}
          buyerName={user?.name || user?.full_name || user?.first_name || ''}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchContracts() }}
        />
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1816] mb-1">Contracts</h1>
          <p className="text-[14px] text-[#737370]">Send and manage e-signature contracts with sellers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="border border-[#E8E8E4] rounded bg-white p-12 text-center">
          <div className="w-12 h-12 bg-[#D03839]/10 rounded flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-[#D03839]" />
          </div>
          <h3 className="text-[15px] font-semibold text-[#1A1816] mb-1">No contracts yet</h3>
          <p className="text-[13px] text-[#737370] max-w-[300px] mx-auto leading-relaxed mb-4">
            Send a contract to a seller or wait for a seller to send one to you.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map(c => {
            const { label, cls } = badge(c.status)
            const url = signUrl(c)
            const others = c.submitters?.filter(s => s.email?.toLowerCase() !== user?.email?.toLowerCase()) ?? []
            const property = c.name

            return (
              <div key={c.id} className="bg-white border border-[#E8E8E4] rounded p-4 flex items-center gap-4">
                <div className="w-9 h-9 bg-[#FAFAF8] border border-[#E8E8E4] rounded flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#737370]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[14px] font-semibold text-[#1A1816] truncate">
                      {property || c.template?.name || `Contract #${c.id}`}
                    </span>
                    <span className={`inline-flex h-5 px-2 rounded text-[11px] font-semibold shrink-0 items-center ${cls}`}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-[#737370] flex-wrap">
                    <span>{fmtDate(c.created_at)}</span>
                    {others.length > 0 && (
                      <span>With: {others.map(s => s.name || s.email).join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {c.status === 'completed' ? (
                    <>
                      <span className="text-[12px] text-[#16A34A] font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Signed
                      </span>
                      <button
                        onClick={() => handleViewDocument(c.id)}
                        disabled={downloadingId === c.id}
                        className="h-8 px-3 border border-[#E8E8E4] hover:bg-[#FAFAF8] text-[#444441] text-[12px] font-semibold rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {downloadingId === c.id
                          ? <span className="w-3.5 h-3.5 border-2 border-[#A8A8A4] border-t-transparent rounded-full animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        Download
                      </button>
                    </>
                  ) : url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors flex items-center gap-1.5"
                    >
                      Sign Now <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="h-8 w-8 flex items-center justify-center border border-[#E8E8E4] hover:border-[#D03839] hover:text-[#D03839] text-[#A8A8A4] rounded transition-colors disabled:opacity-50"
                  >
                    {deletingId === c.id
                      ? <span className="w-3.5 h-3.5 border-2 border-[#A8A8A4] border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
