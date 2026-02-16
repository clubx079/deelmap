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
    <div className="min-h-full bg-slate-50 pt-12 lg:pt-0">
      {/* Consistent navbar header like other buyer portal pages */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">My Applications</h1>
            <p className="text-xs text-slate-500">View and track your financing applications</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
              />
            </div>
            <Link
              href="/financing"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              New
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600 mb-3">{searchQuery ? 'No applications found' : 'No applications yet'}</p>
          {!searchQuery && (
            <Link href="/financing" className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg">
              <FileText className="w-4 h-4" /> Apply for Financing
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Table header — New order: Property, Loan Amount, Type, Submitted, Status */}
          <div
            className="hidden sm:grid grid-cols-[auto_minmax(180px,2fr)_minmax(140px,1.5fr)_minmax(140px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] gap-4 px-5 py-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide"
          >
            <span className="w-6"></span>
            <span>Property</span>
            <span>Loan Amount</span>
            <span>Type</span>
            <span>Submitted</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((request) => {
              const isExpanded = expandedId === request.id;
              return (
                <div key={request.id} className="border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleExpand(request.id)}
                    className="w-full grid grid-cols-[auto_minmax(180px,2fr)_minmax(140px,1.5fr)_minmax(140px,1.5fr)_minmax(120px,1fr)_minmax(100px,1fr)] gap-4 px-5 py-4 text-left hover:bg-slate-50 focus:outline-none items-center"
                  >
                    {/* Dropdown icon at START */}
                    <span className="text-slate-400 w-6 flex justify-center">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                    {/* Property */}
                    <span className="text-slate-700 text-sm truncate" title={request.property_address}>{request.property_address || 'N/A'}</span>
                    {/* Loan Amount */}
                    <span className="text-slate-900 font-semibold text-sm">{formatCurrency(request.loan_amount)}</span>
                    {/* Type */}
                    <span className="font-medium text-slate-900 text-sm truncate">{request.property_type || '—'}</span>
                    {/* Submitted */}
                    <span className="text-slate-500 text-sm">{formatDate(request.created_at)}</span>
                    {/* Status */}
                    <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 justify-end">Pending</span>
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
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
