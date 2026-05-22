'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import Link from 'next/link';
import {
  FileText, Loader2, MapPin, Calendar, User, CreditCard,
  DollarSign, MessageSquare, ChevronDown, ChevronUp, Plus, Trash2
} from 'lucide-react';

function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES = {
  pending:  { label: 'Pending',  bg: 'bg-[#FEF9EC]', text: 'text-[#B5620A]', border: 'border-[#F5D78E]' },
  approved: { label: 'Approved', bg: 'bg-[#E4F5EC]', text: 'text-[#0F6E56]', border: 'border-[#A8DFBA]' },
  rejected: { label: 'Rejected', bg: 'bg-[#FEF0EF]', text: 'text-[#D03839]', border: 'border-[#F5C4C0]' },
};

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function FinanceRequestsPage() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setPageTitle('Financing');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/buyer/financing-requests', {
      headers: { Authorization: `Bearer ${user.id}` }
    })
      .then(r => r.json())
      .then(data => setRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const getStatus = (req) => req.status || 'pending';

  const handleDelete = async (id) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/buyer/financing-requests?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.id}` }
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filter === 'All'
    ? requests
    : requests.filter(r => (STATUS_STYLES[getStatus(r)]?.label || 'Pending') === filter);

  const pendingCount = requests.filter(r => getStatus(r) === 'pending').length;

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">Financing</h1>
          <p className="text-[14px] text-[#737370] mt-1">
            {loading
              ? 'Loading...'
              : `${requests.length} application${requests.length !== 1 ? 's' : ''} · ${pendingCount} pending`}
          </p>
        </div>
        <Link
          href="/financing"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Apply for Financing
        </Link>
      </div>

      {/* Filter tabs */}
      {!loading && requests.length > 0 && (
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 min-h-[44px] rounded text-[13px] font-medium transition-colors ${
                filter === f
                  ? 'bg-[#1A1816] text-white'
                  : 'bg-white border border-[#E8E8E4] text-[#444441] hover:bg-[#F3F3F1]'
              }`}
            >
              {f}
              {f === 'Pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-[#D03839] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 text-[#A8A8A4] animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="w-10 h-10 text-[#D4D4CF] mb-3" />
          <p className="text-[15px] font-semibold text-[#444441]">No applications yet</p>
          <p className="text-[13px] text-[#737370] mt-1 mb-4">
            Submit a financing application and it will appear here.
          </p>
          <Link
            href="/financing"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply for Financing
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-[#737370]">No {filter.toLowerCase()} applications.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((req) => {
            const statusKey = getStatus(req);
            const status = STATUS_STYLES[statusKey] || STATUS_STYLES.pending;
            const isExpanded = expandedId === req.id;
            const name = [req.first_name, req.last_name].filter(Boolean).join(' ');

            return (
              <div key={req.id} className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
                {/* Main card row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(prev => prev === req.id ? null : req.id)}
                  className="w-full text-left flex flex-col sm:flex-row gap-0 focus:outline-none"
                >
                  {/* Left accent */}
                  <div className="hidden sm:block w-1 self-stretch bg-[#D03839] flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row gap-3 min-w-0">
                    {/* Left: address + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${status.bg} ${status.text} ${status.border}`}>
                          {status.label}
                        </span>
                        {req.property_type && (
                          <span className="text-[11px] font-medium text-[#737370] bg-[#F3F3F1] px-2 py-0.5 rounded-full">
                            {req.property_type}
                          </span>
                        )}
                        {req.transaction_type && (
                          <span className="text-[11px] font-medium text-[#737370] bg-[#F3F3F1] px-2 py-0.5 rounded-full">
                            {req.transaction_type}
                          </span>
                        )}
                      </div>

                      {req.property_address ? (
                        <div className="flex items-start gap-1 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-[#737370] flex-shrink-0 mt-0.5" />
                          <p className="text-[14px] font-semibold text-[#1A1816] leading-snug">
                            {req.property_address}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[14px] font-semibold text-[#444441] mb-2">No address provided</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#737370]">
                        {req.credit_score && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            Credit: {req.credit_score}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(req.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Right: loan amount + chevron */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-[#737370]">Loan amount</p>
                        <p className="text-[20px] font-bold text-[#1A1816] leading-tight">
                          {formatCurrency(req.loan_amount)}
                        </p>
                      </div>
                      <div className="text-[#A8A8A4]">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[#E8E8E4] bg-[#FAFAF8] p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                      {/* Contact */}
                      <div className="bg-white border border-[#E8E8E4] rounded p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-[#D03839]" />
                          </div>
                          <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[0.8px]">Contact</p>
                        </div>
                        <dl className="space-y-2">
                          {[
                            ['Name', name || '—'],
                            ['Email', req.email || '—'],
                            ['Phone', req.phone || '—'],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between items-start gap-3">
                              <dt className="text-[11px] text-[#A8A8A4] shrink-0">{label}</dt>
                              <dd className="text-[12px] text-[#1A1816] font-medium text-right break-all">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* Property */}
                      <div className="bg-white border border-[#E8E8E4] rounded p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3 h-3 text-[#D03839]" />
                          </div>
                          <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[0.8px]">Property</p>
                        </div>
                        <dl className="space-y-2">
                          {[
                            ['Type', req.property_type || '—'],
                            ['Address', req.property_address || '—'],
                            ['Transaction', req.transaction_type || '—'],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between items-start gap-3">
                              <dt className="text-[11px] text-[#A8A8A4] shrink-0">{label}</dt>
                              <dd className="text-[12px] text-[#1A1816] font-medium text-right">{val}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* Financing */}
                      <div className="bg-white border border-[#E8E8E4] rounded p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-3 h-3 text-[#D03839]" />
                          </div>
                          <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[0.8px]">Financing</p>
                        </div>
                        <dl className="space-y-2">
                          {[
                            ['Amount', formatCurrency(req.loan_amount)],
                            ['Credit Score', req.credit_score || '—'],
                            ['Submitted', formatDate(req.created_at)],
                            ...(req.updated_at && req.updated_at !== req.created_at
                              ? [['Updated', formatDate(req.updated_at)]]
                              : []),
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between items-start gap-3">
                              <dt className="text-[11px] text-[#A8A8A4] shrink-0">{label}</dt>
                              <dd className={`text-[12px] font-medium text-right ${label === 'Amount' ? 'text-[#D03839] text-[14px] font-bold' : 'text-[#1A1816]'}`}>{val}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* Notes */}
                      {req.comments && (
                        <div className="md:col-span-3 bg-white border border-[#E8E8E4] rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-3 h-3 text-[#D03839]" />
                            </div>
                            <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[0.8px]">Notes</p>
                          </div>
                          <p className="text-[13px] text-[#444441] leading-relaxed">{req.comments}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(req.id)}
                        disabled={deletingId === req.id}
                        className="inline-flex items-center gap-1.5 px-3 min-h-[44px] text-[12px] font-medium text-[#D03839] hover:bg-[#FEF0EF] rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === req.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                        Remove application
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2 text-[12px] text-[#737370] hover:text-[#1A1816] transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded shadow-xl w-full max-w-sm border border-[#E8E8E4]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#FEF0EF] flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-[#D03839]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#1A1816]">Remove application</h3>
                  <p className="text-[12px] text-[#737370]">This cannot be undone.</p>
                </div>
              </div>
              <p className="text-[13px] text-[#444441] mb-5">
                Are you sure you want to remove this financing application? It will be permanently deleted.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 min-h-[44px] text-[13px] font-semibold text-[#444441] bg-[#F3F3F1] hover:bg-[#E8E8E4] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={!!deletingId}
                  className="flex-1 px-4 min-h-[44px] text-[13px] font-semibold text-white bg-[#D03839] hover:bg-[#E0493B] rounded transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
