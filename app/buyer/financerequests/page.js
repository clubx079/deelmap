'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Search, ChevronDown, ChevronUp, MapPin, User, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function FinanceRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = requests.filter(req => {
        const propertyType = req.property_type?.toLowerCase() || '';
        const transactionType = req.transaction_type?.toLowerCase() || '';
        const loanAmount = req.loan_amount?.toString() || '';
        const address = (req.property_address || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return propertyType.includes(query) ||
               transactionType.includes(query) ||
               loanAmount.includes(query) ||
               address.includes(query);
      });
      setFilteredRequests(filtered);
    } else {
      setFilteredRequests(requests);
    }
  }, [searchQuery, requests]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/buyer/financing-requests', {
        headers: { 'Authorization': `Bearer ${user.id}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch financing requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="px-4 py-4 pt-12 lg:pt-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and track your finance applications</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by type, address, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-shadow"
            />
          </div>
          <Link
            href="/financing"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            New application
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-slate-200 border-t-slate-700" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium mb-1">{searchQuery ? 'No applications found' : 'No applications yet'}</p>
          <p className="text-sm text-slate-500 mb-5">
            {searchQuery ? 'Try a different search.' : 'Submit your first finance request to get started.'}
          </p>
          {!searchQuery && (
            <Link
              href="/financing"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4" /> Apply for finance
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredRequests.map((request) => {
            const isExpanded = expandedId === request.id;
            return (
              <li
                key={request.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Summary row – clickable */}
                <button
                  type="button"
                  onClick={() => toggleExpand(request.id)}
                  className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:ring-inset rounded-2xl"
                >
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Type</p>
                      <p className="font-medium text-slate-900 truncate">{request.property_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Loan amount</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(request.loan_amount)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Property</p>
                      <p className="text-slate-600 truncate" title={request.property_address}>{request.property_address || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Submitted</p>
                      <p className="text-slate-600">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200/60">
                      Pending
                    </span>
                    <span className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </div>
                </button>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-5 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact */}
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <User className="w-3.5 h-3.5" /> Contact
                        </h3>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-400">Name</dt>
                            <dd className="text-slate-900 font-medium">{[request.first_name, request.last_name].filter(Boolean).join(' ') || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Email</dt>
                            <dd className="text-slate-900">{request.email || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Phone</dt>
                            <dd className="text-slate-900">{request.phone || '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Property & transaction */}
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5" /> Property & transaction
                        </h3>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-400">Property type</dt>
                            <dd className="text-slate-900">{request.property_type || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Address</dt>
                            <dd className="text-slate-900">{request.property_address || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Transaction type</dt>
                            <dd className="text-slate-900">{request.transaction_type || '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Financial */}
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <DollarSign className="w-3.5 h-3.5" /> Financial
                        </h3>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-400">Loan amount</dt>
                            <dd className="text-slate-900 font-semibold">{formatCurrency(request.loan_amount)}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Credit score</dt>
                            <dd className="text-slate-900">{request.credit_score || '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Date & notes */}
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <Calendar className="w-3.5 h-3.5" /> Dates
                        </h3>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-slate-400">Submitted</dt>
                            <dd className="text-slate-900">{formatDate(request.created_at)}</dd>
                          </div>
                          {request.updated_at && request.updated_at !== request.created_at && (
                            <div>
                              <dt className="text-slate-400">Last updated</dt>
                              <dd className="text-slate-900">{formatDate(request.updated_at)}</dd>
                            </div>
                          )}
                        </dl>
                        {request.comments && (
                          <>
                            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">
                              <MessageSquare className="w-3.5 h-3.5" /> Notes
                            </h3>
                            <p className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-100">{request.comments}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpand(request.id)}
                        className="text-sm font-medium text-slate-500 hover:text-slate-700"
                      >
                        Close details
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
