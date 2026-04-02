'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, MessageSquare, FileText, AlertCircle, Bell, Search,
  ChevronLeft, ChevronRight, MapPin, Share2, Heart,
  TrendingUp, Lock, ArrowUpRight, Bookmark
} from 'lucide-react';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [stats, setStats] = useState({
    savedDeals: 0,
    activeConversations: 0,
    offersMade: 0,
    dealsUnderReview: 0,
    savedThisWeek: 0,
    unreadMessages: 0,
    pendingResponses: 0,
    newUpdates: 0
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [recentDeals, setRecentDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    setPageTitle('Dashboard');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (user?.id) fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/buyer/notifications', { headers: { Authorization: `Bearer ${user.id}` } });
        if (res.ok) {
          const data = await res.json();
          setNotifUnread(data.unreadCount || 0);
          setNotifications(data.notifications || []);
        }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!notifOpen) return;
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [notifOpen]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${user.id}` };

      const [conversationsRes, favoritesRes, dealsRes, offersRes] = await Promise.allSettled([
        fetch('/api/buyer/chat?action=get_conversations', { headers }),
        fetch('/api/favorites/list', { headers }),
        fetch('/api/deals?limit=10&sortBy=newest'),
        fetch('/api/buyer/offers', { headers })
      ]);

      // Conversations
      if (conversationsRes.status === 'fulfilled' && conversationsRes.value.ok) {
        const data = await conversationsRes.value.json();
        if (data.success) {
          const conversations = data.conversations || [];
          const unread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
          setStats(prev => ({
            ...prev,
            activeConversations: conversations.length,
            unreadMessages: unread
          }));
          // Build recent messages from conversations
          const msgs = conversations.slice(0, 3).map(c => ({
            id: c.id,
            name: c.other_user_name || c.property_address || 'Unknown',
            initials: getInitials(c.other_user_name || c.property_address || 'U'),
            message: c.last_message || 'No messages yet',
            time: formatTimeAgo(c.last_message_at || c.updated_at),
            unread: (c.unread_count || 0) > 0
          }));
          setRecentMessages(msgs);
        }
      }

      // Favorites / Saved deals
      if (favoritesRes.status === 'fulfilled' && favoritesRes.value.ok) {
        const data = await favoritesRes.value.json();
        if (data.success) {
          setStats(prev => ({ ...prev, savedDeals: (data.favorites || []).length }));
        }
      }

      // Offers made
      if (offersRes.status === 'fulfilled' && offersRes.value.ok) {
        const data = await offersRes.value.json();
        const offers = data.offers || [];
        const pending = offers.filter(o => o.status === 'pending').length;
        const underReview = offers.filter(o => o.status === 'accepted' || o.status === 'countered').length;
        setStats(prev => ({
          ...prev,
          offersMade: offers.length,
          dealsUnderReview: underReview,
          pendingResponses: pending,
        }));
      }

      // Recent deals for carousel
      if (dealsRes.status === 'fulfilled' && dealsRes.value.ok) {
        const data = await dealsRes.value.json();
        if (data.success) {
          setRecentDeals((data.properties || []).slice(0, 8));
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const AVATAR_PAIRS = [
    { bg: '#FEF0EF', text: '#D03839' },
    { bg: '#E4F5EC', text: '#0F6E56' },
    { bg: '#FEF3E2', text: '#B5620A' },
    { bg: '#EBF3FC', text: '#4A90E2' },
    { bg: '#F3EEFF', text: '#7C3AED' },
  ];
  const getAvatarPair = (seed = '') => {
    const str = String(seed || 'u');
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
    return AVATAR_PAIRS[Math.abs(hash) % AVATAR_PAIRS.length];
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  };

  const displayFirstName = () => {
    const raw = user?.first_name || (user?.user_metadata?.name && user.user_metadata.name.split(' ')[0]) || 'User';
    if (!raw || typeof raw !== 'string') return 'User';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  const scrollDeals = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getFeatureImage = (property) => {
    const photos = property?.property_photos || [];
    const featured = photos.find(p => p?.is_featured) || photos[0];
    const url = featured?.optimized_url || featured?.photo_url || '';
    if (url && url.includes('supabase.co/storage/v1/object/public/')) {
      return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=400&resize=contain';
    }
    return url;
  };

  // Market insights (static for now — can be made dynamic later)
  const marketData = [
    { city: 'Phoenix, AZ', avgRoi: '22.4%', deals: 48, trend: 'Trending', trendUp: true },
    { city: 'Tampa, FL', avgRoi: '18.1%', deals: 31, trend: 'Trending', trendUp: true },
    { city: 'Memphis, TN', avgRoi: '16.8%', deals: 22, trend: 'Stable', trendUp: false },
    { city: 'Atlanta, GA', avgRoi: '19.6%', deals: 37, trend: 'Rising', trendUp: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8E8E4] border-t-[#1A1816] mx-auto mb-4"></div>
          <p className="text-[#737370] text-[14px]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-normal text-[#1A1816] tracking-[-0.56px] leading-[33.6px]">
              Welcome Back, {displayFirstName()}
            </h1>
            <p className="text-[14px] text-[#737370] mt-0.5">{getCurrentDate()}</p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(prev => !prev)}
                className="relative p-2.5 rounded border border-[#E8E8E4] hover:bg-[#FAFAF8] transition-colors duration-200"
              >
                <Bell className="w-5 h-5 text-[#444441]" />
                {notifUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#D03839] rounded-full leading-none">
                    {notifUnread > 99 ? '99+' : notifUnread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-[#E8E8E4] rounded-xl shadow-xl z-[99999] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4]">
                    <span className="text-[14px] font-semibold text-[#1A1816]">Notifications</span>
                    {notifUnread > 0 && (
                      <button
                        onClick={async () => {
                          await fetch('/api/buyer/notifications', { method: 'POST', headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) });
                          setNotifUnread(0);
                          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                        }}
                        className="text-[12px] text-[#D03839] font-medium hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex items-center justify-center h-16 text-[13px] text-[#737370]">No notifications yet</div>
                    ) : notifications.map(n => (
                      <Link
                        key={n.id}
                        href={n.related_conversation_id ? `/buyer/inbox?conversation=${n.related_conversation_id}` : '/buyer/inbox'}
                        onClick={async () => {
                          setNotifOpen(false);
                          if (!n.is_read) {
                            await fetch('/api/buyer/notifications', { method: 'POST', headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', notification_id: n.id }) });
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                            setNotifUnread(prev => Math.max(0, prev - 1));
                          }
                        }}
                        className={`flex items-start gap-3 px-4 py-3 border-l-2 transition-colors hover:bg-[#FAFAF8] ${n.is_read ? 'border-l-transparent' : 'border-l-[#D03839] bg-[#FAFAF8]'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] truncate ${n.is_read ? 'text-[#444441]' : 'font-semibold text-[#1A1816]'}`}>{n.title}</p>
                          <p className="text-[12px] text-[#737370] truncate mt-0.5">{n.body}</p>
                          <p className="text-[11px] text-[#A8A8A4] mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1A1816] text-white text-[14px] font-semibold rounded hover:bg-[#2a2826] transition-colors duration-200"
            >
              <Search className="w-4 h-4" />
              Search deals
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-8 pb-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Saved deals"
            value={stats.savedDeals}
            subtitle={stats.savedThisWeek > 0 ? `+${stats.savedThisWeek} this week` : null}
            subtitleColor="#0F6E56"
            icon={<Star className="w-4 h-4 text-[#0F6E56]" />}
            iconBg="#E4F5EC"
          />
          <StatCard
            title="Active conversations"
            value={stats.activeConversations}
            subtitle={stats.unreadMessages > 0 ? `${stats.unreadMessages} unread` : null}
            subtitleColor="#444441"
            icon={<MessageSquare className="w-4 h-4 text-[#4A90E2]" />}
            iconBg="#EBF3FC"
          />
          <StatCard
            title="Offers made"
            value={stats.offersMade}
            subtitle={stats.pendingResponses > 0 ? `${stats.pendingResponses} pending response` : null}
            subtitleColor="#444441"
            icon={<FileText className="w-4 h-4 text-[#B5620A]" />}
            iconBg="#FEF3E2"
          />
          <StatCard
            title="Deals under review"
            value={stats.dealsUnderReview}
            subtitle={stats.newUpdates > 0 ? `${stats.newUpdates} new update` : null}
            subtitleColor="#D03839"
            icon={<AlertCircle className="w-4 h-4 text-[#D03839]" />}
            iconBg="#FEF0EF"
          />
        </div>

        {/* Middle Section — 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Recent Messages */}
          <div className="bg-white rounded border border-[#E8E8E4] overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#E8E8E4]">
              <h2 className="text-[14px] font-semibold text-[#1A1816]">Recent messages</h2>
              <Link href="/buyer/inbox" className="text-[13px] font-medium text-[#737370] hover:text-[#1A1816] transition-colors duration-200">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#E8E8E4]">
              {recentMessages.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[13px] text-[#737370]">No messages yet</p>
                </div>
              ) : (
                recentMessages.map((msg) => (
                  <Link key={msg.id} href="/buyer/inbox" className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAFAF8] transition-colors duration-200">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: getAvatarPair(msg.name).bg }}>
                      <span className="text-[12px] font-semibold" style={{ color: getAvatarPair(msg.name).text }}>{msg.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#1A1816] truncate">{msg.name}</p>
                        <span className="text-[11px] text-[#A8A8A4] flex-shrink-0">{msg.time}</span>
                      </div>
                      <p className="text-[12px] text-[#737370] truncate mt-0.5">{msg.message}</p>
                    </div>
                    {msg.unread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D03839] flex-shrink-0 mt-1.5"></span>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Market Insights */}
          <div className="bg-white rounded border border-[#E8E8E4] overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#E8E8E4]">
              <h2 className="text-[14px] font-semibold text-[#1A1816]">Market insights</h2>
              <Link href="/buyer/insights" className="text-[13px] font-medium text-[#737370] hover:text-[#1A1816] transition-colors duration-200">
                View all
              </Link>
            </div>
            {/* Table header */}
            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1.1px] border-b border-[#E8E8E4]">
              <span>City</span>
              <span>AVG ROI · Deals</span>
            </div>
            <div className="divide-y divide-[#E8E8E4]">
              {marketData.map((item, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1816]">{item.city}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.trendUp && <TrendingUp className="w-3 h-3 text-[#0F6E56]" />}
                      <span className={`text-[11px] font-medium ${item.trendUp ? 'text-[#0F6E56]' : 'text-[#737370]'}`}>
                        {item.trend}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-[#0F6E56]">{item.avgRoi}</p>
                    <p className="text-[11px] text-[#A8A8A4]">{item.deals} active deals</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded border border-[#E8E8E4] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8E8E4]">
              <h2 className="text-[14px] font-semibold text-[#1A1816]">Quick actions</h2>
            </div>
            <div className="divide-y divide-[#E8E8E4]">
              <QuickAction
                href="/marketplace"
                icon={<Search className="w-4 h-4 text-[#737370]" />}
                title="Continue browse deals"
                subtitle="148 new since last visit"
              />
              <QuickAction
                href="/financing"
                icon={<Lock className="w-4 h-4 text-[#737370]" />}
                title="Apply for financing"
                subtitle="Lenders respond in 24h"
              />
              <QuickAction
                href="/saved-properties"
                icon={<Star className="w-4 h-4 text-[#737370]" />}
                title="View saved deals"
                subtitle={`${stats.savedDeals} saved`}
              />
              <QuickAction
                href="/buyer/offers"
                icon={<FileText className="w-4 h-4 text-[#737370]" />}
                title="Submit an offer"
                subtitle={`${stats.offersMade} offers pending now`}
              />
            </div>
          </div>
        </div>

        {/* Recently Viewed Deals */}
        {recentDeals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-bold text-[#1A1816] tracking-[-0.66px]">Recently viewed deals</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollDeals('left')}
                  className="w-9 h-9 rounded-full border border-[#E8E8E4] flex items-center justify-center hover:bg-[#FAFAF8] transition-colors duration-200"
                >
                  <ChevronLeft className="w-4 h-4 text-[#444441]" />
                </button>
                <button
                  onClick={() => scrollDeals('right')}
                  className="w-9 h-9 rounded-full border border-[#E8E8E4] flex items-center justify-center hover:bg-[#FAFAF8] transition-colors duration-200"
                >
                  <ChevronRight className="w-4 h-4 text-[#444441]" />
                </button>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {recentDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} getFeatureImage={getFeatureImage} formatCurrency={formatCurrency} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, subtitleColor, icon, iconBg }) {
  return (
    <div className="bg-white rounded border border-[#E8E8E4] px-4 py-5 flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <p className="text-[13px] font-medium text-[#737370]">{title}</p>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
      </div>
      <p className="text-[36px] font-bold text-[#1A1816] leading-none tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[12px] font-medium mt-2 flex items-center gap-1" style={{ color: subtitleColor }}>
          <TrendingUp className="w-3 h-3" /> {subtitle}
        </p>
      )}
    </div>
  );
}

function QuickAction({ href, icon, title, subtitle }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8] transition-colors duration-200 group">
      <div className="w-9 h-9 rounded border border-[#E8E8E4] flex items-center justify-center flex-shrink-0 group-hover:border-[#D4D4CF]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1A1816]">{title}</p>
        <p className="text-[11px] text-[#A8A8A4]">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#A8A8A4] flex-shrink-0" />
    </Link>
  );
}

function DealCard({ deal, getFeatureImage, formatCurrency }) {
  const image = getFeatureImage(deal);
  const arv = deal.purchase_price || (deal.price ? Math.round(deal.price * 1.8) : null);
  const spread = arv && deal.price ? arv - deal.price : null;
  const roi = arv && deal.price ? Math.round(((arv - deal.price) / deal.price) * 100) : null;

  return (
    <div className="flex-shrink-0 w-[280px] bg-white rounded border border-[#E8E8E4] overflow-hidden group">
      {/* Image */}
      <div className="relative h-[170px] bg-[#FAFAF8] overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={deal.address || 'Property'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="280px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-[#A8A8A4]" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {deal.gross_yield && deal.gross_yield > 15 && (
            <span className="px-2 py-0.5 bg-[#0F6E56] text-white text-[11px] font-semibold rounded-full">
              High ROI
            </span>
          )}
        </div>
        {roi && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-[#1A1816]/70 text-white text-[11px] font-semibold rounded-full">
            +{roi}% ROI
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-[11px] text-[#737370]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{deal.city}{deal.state ? `, ${deal.state}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-1 hover:bg-[#FAFAF8] rounded transition-colors duration-200">
              <Share2 className="w-3.5 h-3.5 text-[#A8A8A4]" />
            </button>
            <button className="p-1 hover:bg-[#FAFAF8] rounded transition-colors duration-200">
              <Heart className="w-3.5 h-3.5 text-[#A8A8A4]" />
            </button>
          </div>
        </div>

        <p className="text-[14px] font-semibold text-[#1A1816] truncate mb-1">
          {deal.bedrooms ? `${deal.bedrooms}BR` : ''} {deal.address || 'Property'}
        </p>

        <div className="flex items-center gap-2 text-[12px] text-[#737370] mb-2">
          {deal.sqft && <span>{deal.sqft.toLocaleString()} sq ft</span>}
          {deal.bedrooms && <><span className="text-[#D4D4CF]">·</span><span>{deal.bedrooms} bed</span></>}
          {deal.bathrooms && <><span className="text-[#D4D4CF]">·</span><span>{deal.bathrooms} bath</span></>}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[18px] font-bold text-[#1A1816]">{formatCurrency(deal.price)}</span>
            {arv && (
              <span className="ml-2 text-[12px] text-[#0F6E56] font-medium">ARV {formatCurrency(arv)}</span>
            )}
          </div>
        </div>

        {spread && (
          <p className="text-[11px] text-[#0F6E56] font-medium mt-1 flex items-center gap-0.5">
            <span>&#8593;</span> {formatCurrency(spread)} spread potential
          </p>
        )}

        <Link
          href={`/marketplace/${deal.slug || deal.id}`}
          className="mt-2.5 w-full flex items-center justify-center px-3 py-2 border border-[#D03839] text-[#D03839] text-[14px] font-semibold rounded hover:bg-[#FEF0EF] transition-colors duration-200"
        >
          View Listing
        </Link>
      </div>
    </div>
  );
}
