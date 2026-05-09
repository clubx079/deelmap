'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Search, MessageSquare, Star, FileText,
  DollarSign, TrendingUp, Settings, X, Building2, CreditCard, ScrollText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function BuyerSidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/buyer/chat?action=get_conversations', {
        headers: { 'Authorization': `Bearer ${user.id}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const totalUnread = (data.conversations || []).reduce(
          (sum, conv) => sum + (conv.unread_count || 0), 0
        );
        setUnreadCount(totalUnread);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const sections = [
    {
      label: 'MAIN',
      items: [
        { href: '/buyer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/marketplace', icon: Search, label: 'Browse deals' },
        { href: '/buyer/inbox', icon: MessageSquare, label: 'Messages', badge: unreadCount },
        { href: '/saved-properties', icon: Star, label: 'Saved deals', badge: savedCount || null },
        { href: '/buyer/offers', icon: FileText, label: 'My offers' },
        { href: '/buyer/listings', icon: Building2, label: 'My listings' },
      ]
    },
    {
      label: 'TOOLS',
      items: [
        { href: '/buyer/financerequests', icon: DollarSign, label: 'Financing' },
        { href: '/buyer/insights', icon: TrendingUp, label: 'Market Insights' },
        { href: '/buyer/contracts', icon: ScrollText, label: 'Contracts' },
      ]
    },
    {
      label: 'ACCOUNT',
      items: [
        { href: '/buyer/billing', icon: CreditCard, label: 'Billing' },
        { href: '/profile', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50
          w-[220px] bg-white
          border-r border-[#E8E8E4]
          flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          font-[var(--font-dm-sans)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="block">
              <img src="/assets/logo.svg" alt="DeelMap" className="h-14 w-auto object-contain" />
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-[#FAFAF8] text-[#737370] transition-colors duration-200"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1.1px]">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded
                        transition-all duration-200
                        text-[14px]
                        ${isActive
                          ? 'bg-[#FAFAF8] text-[#1A1816] font-medium'
                          : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816]'
                        }
                      `}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#1A1816]' : 'text-[#737370]'}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold rounded-full bg-[#1A1816] text-white">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
