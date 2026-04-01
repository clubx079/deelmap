'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import Link from 'next/link';
import { FileText, Loader2, MapPin, Calendar, ExternalLink, Home } from 'lucide-react';

function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

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
  countered: { label: 'Countered',    bg: 'bg-[#EBF3FC]', text: 'text-[#4A90E2]' },
  withdrawn: { label: 'Withdrawn',    bg: 'bg-[#F3F3F1]', text: 'text-[#737370]' },
};

export default function MyOffersPage() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle('My Offers');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (!user?.id) return;
    fetch('/api/buyer/offers', { headers: { Authorization: `Bearer ${user.id}` } })
      .then(r => r.json())
      .then(data => setOffers(data.offers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1A1816] tracking-[-0.44px]">My Offers</h1>
        <p className="text-[14px] text-[#737370] mt-1">All offers you have submitted on deals</p>
      </div>

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
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => {
            const status = STATUS_STYLES[offer.status] || STATUS_STYLES.pending;
            const convNumeric = uuidToNumeric(offer.conversation_id);
            const listingHref = offer.property_slug ? `/${offer.property_slug}` : (offer.property_id ? `/${offer.property_id}` : null);
            return (
              <div key={offer.id} className="bg-white border border-[#E8E8E4] rounded overflow-hidden flex flex-col sm:flex-row">
                {/* Property image */}
                <div className="sm:w-[160px] h-[120px] sm:h-auto bg-[#F3F3F1] flex-shrink-0 relative">
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
                <div className="flex-1 p-4 flex flex-col sm:flex-row gap-3">
                  {/* Property info */}
                  <div className="flex-1 min-w-0">
                    {offer.property_address ? (
                      <div className="flex items-start gap-1 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-[#737370] flex-shrink-0 mt-0.5" />
                        <p className="text-[13px] font-semibold text-[#1A1816] leading-snug">{offer.property_address}</p>
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold text-[#1A1816] mb-1">Property Details Unavailable</p>
                    )}

                    {/* Beds / Baths / Sqft */}
                    {(offer.property_bedrooms || offer.property_bathrooms || offer.property_sqft) && (
                      <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-2">
                        {offer.property_bedrooms && <span>{offer.property_bedrooms} bed</span>}
                        {offer.property_bathrooms && <><span className="text-[#D4D4CF]">·</span><span>{offer.property_bathrooms} bath</span></>}
                        {offer.property_sqft && <><span className="text-[#D4D4CF]">·</span><span>{Number(offer.property_sqft).toLocaleString()} sqft</span></>}
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
                      {offer.property_price && offer.property_price !== offer.offer_price && (
                        <p className="text-[12px] text-[#737370]">Asking {formatCurrency(offer.property_price)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {convNumeric && (
                        <Link href={`/buyer/inbox?conversation=${convNumeric}`}
                          className="flex items-center gap-1 text-[12px] text-[#D03839] font-medium hover:underline">
                          View chat <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {listingHref && (
                        <Link href={listingHref}
                          className="flex items-center gap-1 text-[12px] text-[#737370] hover:underline">
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
