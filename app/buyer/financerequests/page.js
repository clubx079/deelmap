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
                    <div className="flex justify-end">
                      <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">Pending</span>
                    </div>
                  </button>

                  {/* Expandable details - Modern enterprise design */}
                  {isExpanded && (
                  <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Contact Information */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">Contact Information</h3>
                        </div>
                        <dl className="space-y-3">
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Name</dt>
                            <dd className="text-sm text-slate-900 font-medium text-right">{[request.first_name, request.last_name].filter(Boolean).join(' ') || '—'}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Email</dt>
                            <dd className="text-sm text-slate-900 text-right break-all">{request.email || '—'}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Phone</dt>
                            <dd className="text-sm text-slate-900 text-right">{request.phone || '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Property Details */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-slate-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">Property Details</h3>
                        </div>
                        <dl className="space-y-3">
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Type</dt>
                            <dd className="text-sm text-slate-900 font-medium text-right">{request.property_type || '—'}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Address</dt>
                            <dd className="text-sm text-slate-900 text-right">{request.property_address || '—'}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Transaction</dt>
                            <dd className="text-sm text-slate-900 text-right">{request.transaction_type || '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Financial Details */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-slate-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">Financial Details</h3>
                        </div>
                        <dl className="space-y-3">
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Loan Amount</dt>
                            <dd className="text-sm text-slate-900 font-semibold text-right">{formatCurrency(request.loan_amount)}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Credit Score</dt>
                            <dd className="text-sm text-slate-900 text-right">{request.credit_score || '—'}</dd>
                          </div>
                          <div className="flex justify-between items-start">
                            <dt className="text-xs font-medium text-slate-500">Submitted</dt>
                            <dd className="text-sm text-slate-900 text-right">{formatDate(request.created_at)}</dd>
                          </div>
                          {request.updated_at && request.updated_at !== request.created_at && (
                            <div className="flex justify-between items-start">
                              <dt className="text-xs font-medium text-slate-500">Updated</dt>
                              <dd className="text-sm text-slate-900 text-right">{formatDate(request.updated_at)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Additional Notes - Full width if present */}
                      {request.comments && (
                        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-slate-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Additional Notes</h3>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{request.comments}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleExpand(request.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                        Close Details
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
