'use client'
import { useState, useEffect, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle, Plus, X, Download, Trash2, ChevronLeft, PenLine } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext'
import { DocusealForm } from '@docuseal/react'

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

export default function BuyerContractsPage() {
  const router = useRouter()
  const { setPageTitle } = useContext(BuyerPageTitleContext)
  const { user } = useAuth()

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  // Signing view
  const [signingEmbedSrc, setSigningEmbedSrc] = useState(null)
  const [signingTitle, setSigningTitle] = useState('')

  // (contract creation lives in /buyer/contracts/new — no inline modal)

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

  function handleSignInline(contract) {
    const sub = contract.submitters?.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())
    if (!sub || sub.status === 'completed' || sub.status === 'declined') return
    setSigningTitle(contract.name || contract.template?.name || `Contract #${contract.id}`)
    setSigningEmbedSrc(`https://docuseal.com/s/${sub.slug}`)
  }

  function handleSigningComplete() {
    setSigningEmbedSrc(null)
    setSigningTitle('')
    fetchContracts()
  }

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

  // ── Inline signing view ─────────────────────────────────────────
  if (signingEmbedSrc) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSigningEmbedSrc(null); fetchContracts() }}
            className="flex items-center gap-1.5 text-[13px] text-[#737370] hover:text-[#1A1816] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Contracts
          </button>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#D03839]/10 rounded flex items-center justify-center shrink-0">
            <PenLine className="w-4 h-4 text-[#D03839]" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1816] leading-tight">{signingTitle}</h1>
            <p className="text-[13px] text-[#737370]">Review and sign below</p>
          </div>
        </div>
        <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
          <DocusealForm
            src={signingEmbedSrc}
            email={user?.email}
            withTitle={false}
            withDownloadButton={false}
            customCss={`
              body { font-family: 'DM Sans', -apple-system, sans-serif !important; }
              .base-button { background: #D03839 !important; border-color: #D03839 !important; border-radius: 4px !important; }
              .base-button:hover { background: #E0493B !important; }
            `}
            onComplete={handleSigningComplete}
          />
        </div>
      </div>
    )
  }

  // ── Main list view ──────────────────────────────────────────────
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1816] mb-1">Contracts</h1>
          <p className="text-[14px] text-[#737370]">Send and manage e-signature contracts with sellers.</p>
        </div>
        <button
          onClick={() => router.push('/buyer/contracts/new')}
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
          <button onClick={() => router.push('/buyer/contracts/new')}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map(c => {
            const { label, cls } = badge(c.status)
            const mySubmitter = c.submitters?.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase())
            const canSign = mySubmitter && mySubmitter.status !== 'completed' && mySubmitter.status !== 'declined'
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
                  ) : canSign ? (
                    <button
                      onClick={() => handleSignInline(c)}
                      className="h-8 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors flex items-center gap-1.5"
                    >
                      <PenLine className="w-3.5 h-3.5" /> Sign Now
                    </button>
                  ) : (
                    <span className="text-[12px] text-[#737370]">Awaiting other party</span>
                  )}
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
