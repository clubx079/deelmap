'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import Link from 'next/link';
import { FileText, Loader2, MapPin, Calendar, ExternalLink, Home, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { resolveInboxConversationId } from '@/lib/conversationId';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Convert UUID conversation_id back to numeric for inbox link
function uuidToNumeric(uuid) {
  if (!uuid) return null;
  const match = String(uuid).match(/00000000-0000-0000-0000-([0-9a-f]{12})$/i);
  if (match) return parseInt(match[1], 16);
  return null;
}

const STATUS_STYLES = {
  pending:   { label: 'Pending',      bg: 'bg-[#FEF3E2]', text: 'text-[#B5620A]' },
  accepted:  { label: 'Accepted',     bg: 'bg-[#E4F5EC]', text: 'text-[#0F6E56]' },
  rejected:  { label: 'Rejected',     bg: 'bg-[#FEF0EF]', text: 'text-[#D03839]' },
  countered: { label: 'Countered',    bg: 'bg-[#F3F3F0]', text: 'text-[#1A1816]' },
  withdrawn: { label: 'Withdrawn',    bg: 'bg-[#F3F3F1]', text: 'text-[#737370]' },
};

const FILTERS = ['All', 'Pending', 'Accepted', 'Rejected', 'Countered', 'Withdrawn'];

export default function MyOffersPage() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    setPageTitle('My Offers');
    return () => setPageTitle('');
  }, [setPageTitle]);

  const loadOffers = () => {
    if (!user?.id) return;
    fetch('/api/buyer/offers', { headers: { Authorization: `Bearer ${user.id}` } })
      .then(r => r.json())
      .then(data => setOffers(data.offers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOffers();
  }, [user?.id]);

  const handleOfferAction = async (offerId, action) => {
    if (!user?.id) return;
    const optimisticStatus = action === 'accept_counter' ? 'accepted'
      : action === 'reject_counter' ? 'rejected' : 'withdrawn';
    const prevOffers = offers;
    setActingId(offerId);
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: optimisticStatus } : o));
    try {
      const res = await fetch('/api/buyer/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({ offer_id: offerId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      loadOffers();
    } catch {
      setOffers(prevOffers);
    } finally {
      setActingId(null);
    }
  };

  const filtered = filter === 'All'
    ? offers
    : offers.filter(o => (STATUS_STYLES[o.status]?.label || 'Pending') === filter);

  const pendingCount = offers.filter(o => o.status === 'pending').length;

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">My Offers</h1>
        <p className="text-[14px] text-[#737370] mt-1">
          {loading ? 'Loading...' : `${offers.length} offer${offers.length !== 1 ? 's' : ''} submitted · ${pendingCount} pending`}
        </p>
      </div>

      {/* Filter tabs */}
      {!loading && offers.length > 0 && (
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
                filter === f
                  ? 'bg-[#1A1816] text-white'
                  : 'bg-white border border-[#E8E8E4] text-[#444441] hover:bg-[#F3F3F1]'
              }`}
            >
              {f}
              {f === 'Pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-[#D03839] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 text-[#A8A8A4] animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <FileText className="w-10 h-10 text-[#D4D4CF] mb-3" />
          <p className="text-[15px] font-semibold text-[#444441]">No offers yet</p>
          <p className="text-[13px] text-[#737370] mt-1 mb-4">When you submit an offer on a deal it will appear here.</p>
          <Link href="/marketplace" className="px-5 py-2.5 bg-[#D03839] text-white text-[14px] font-semibold rounded hover:bg-[#E0493B] transition-colors">
            Browse Deals
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-[#737370]">No {filter.toLowerCase()} offers.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((offer) => {
            const status = STATUS_STYLES[offer.status] || STATUS_STYLES.pending;
            const convId = resolveInboxConversationId(offer.conversation_id);
            const listingHref = offer.property_slug ? `/${offer.property_slug}` : (offer.property_id ? `/${offer.property_id}` : null);
            const priceDiff = offer.property_price && offer.offer_price
              ? offer.offer_price - offer.property_price : null;
            const isCounter = !!offer.parent_offer_id;
            const canWithdraw = !isCounter && offer.status === 'pending';
            const canRespondCounter = isCounter && offer.status === 'pending';
            const acting = actingId === offer.id;
            return (
              <div key={offer.id} className="bg-white border border-[#E8E8E4] rounded overflow-hidden flex flex-col sm:flex-row">
                {/* Property image */}
                <div className="sm:w-[140px] h-[110px] sm:h-auto bg-[#F3F3F1] flex-shrink-0 relative">
                  {offer.property_thumbnail_url ? (
                    <img src={offer.property_thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-8 h-8 text-[#D4D4CF]" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 p-4 flex flex-col sm:flex-row gap-3 min-w-0">
                  {/* Property info */}
                  <div className="flex-1 min-w-0">
                    {offer.property_address ? (
                      <div className="flex items-start gap-1 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-[#737370] flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] font-semibold text-[#1A1816] leading-snug truncate">{offer.property_address}</p>
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold text-[#444441] mb-1">Property details unavailable</p>
                    )}

                    {/* Beds / Baths / Sqft */}
                    {(offer.property_bedrooms || offer.property_bathrooms || offer.property_sqft) && (
                      <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-1.5">
                        {offer.property_bedrooms && <span>{offer.property_bedrooms} bed</span>}
                        {offer.property_bedrooms && offer.property_bathrooms && <span className="text-[#D4D4CF]">·</span>}
                        {offer.property_bathrooms && <span>{offer.property_bathrooms} bath</span>}
                        {offer.property_sqft && (offer.property_bedrooms || offer.property_bathrooms) && <span className="text-[#D4D4CF]">·</span>}
                        {offer.property_sqft && <span>{Number(offer.property_sqft).toLocaleString()} sqft</span>}
                      </div>
                    )}

                    {/* Terms */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#737370]">
                      {offer.financing_type && <span>{offer.financing_type}</span>}
                      {offer.closing_timeline && <><span className="text-[#D4D4CF]">·</span><span>Close in {offer.closing_timeline}</span></>}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(offer.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prices + actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-[#737370]">Your offer</p>
                      <p className="text-[20px] font-bold text-[#1A1816]">{formatCurrency(offer.offer_price)}</p>
                      {offer.property_price ? (
                        <p className="text-[11px] text-[#737370]">Asking {formatCurrency(offer.property_price)}</p>
                      ) : null}
                      {priceDiff != null && (
                        <p className={`text-[11px] font-medium ${priceDiff >= 0 ? 'text-[#0F6E56]' : 'text-[#D03839]'}`}>
                          {priceDiff >= 0 ? `+${formatCurrency(priceDiff)}` : formatCurrency(priceDiff)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {convId && (
                        <Link href={`/buyer/inbox?conversation=${convId}`}
                          className="flex items-center gap-1.5 px-3 min-h-[44px] bg-[#D03839] hover:bg-[#E0493B] text-white text-[12px] font-semibold rounded transition-colors whitespace-nowrap">
                          <MessageCircle className="w-3.5 h-3.5" />
                          View chat
                        </Link>
                      )}
                      {canRespondCounter && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOfferAction(offer.id, 'accept_counter')}
                            disabled={acting}
                            className="px-3 min-h-[44px] bg-[#0F6E56] hover:bg-[#0D5E49] text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50 whitespace-nowrap">
                            {acting ? '…' : 'Accept'}
                          </button>
                          <button
                            onClick={() => handleOfferAction(offer.id, 'reject_counter')}
                            disabled={acting}
                            className="px-3 min-h-[44px] border border-[#E8E8E4] text-[#737370] hover:text-[#D03839] text-[12px] font-semibold rounded transition-colors disabled:opacity-50 whitespace-nowrap">
                            Decline
                          </button>
                        </div>
                      )}
                      {canWithdraw && (
                        <button
                          onClick={() => handleOfferAction(offer.id, 'withdraw')}
                          disabled={acting}
                          className="px-3 min-h-[44px] border border-[#D03839] text-[#D03839] hover:bg-[#FEF0EF] text-[12px] font-semibold rounded transition-colors disabled:opacity-50 whitespace-nowrap">
                          {acting ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      )}
                      {listingHref && (
                        <Link href={listingHref}
                          className="flex items-center gap-1 text-[12px] text-[#737370] hover:text-[#1A1816] transition-colors">
                          View listing <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
