'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, MessageCircle, X, ArrowLeft, Heart, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function BuyerSidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();

      // Poll for unread count every 10 seconds
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/buyer/chat?action=get_conversations', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const totalUnread = (data.conversations || []).reduce(
          (sum, conv) => sum + (conv.unread_count || 0),
          0
        );
        setUnreadCount(totalUnread);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const menuItems = [
    {
      href: '/buyer/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard'
    },
    {
      href: '/buyer/inbox',
      icon: MessageCircle,
      label: 'Messages',
      badge: unreadCount
    },
    {
      href: '/buyer/financerequests',
      icon: FileText,
      label: 'My Applications'
    },
    {
      href: '/saved-properties',
      icon: Heart,
      label: 'Saved Properties'
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50
        w-64 bg-white
        border-r border-slate-200
        flex flex-col h-screen
        transform transition-all duration-300 ease-in-out
        shadow-sm
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header: Enterprise professional design */}
        <div className="px-4 pt-6 pb-6 border-b border-slate-200 bg-white">
          {/* Row 1: Back to Marketplace + Close (mobile) */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 min-w-0 rounded-lg py-2 pr-3 pl-2 -ml-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Back to Marketplace</span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Logo + Buyer Label — matching seller dashboard style */}
          <div className="flex items-center gap-3 justify-center">
            <Link href="/" className="block hover:opacity-80 transition-opacity duration-200">
              <Image
                src="/assets/logo copy.png"
                alt="DeelMap"
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap">
              Buyer
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-slate-200 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge > 0 && (
                    <span className={`ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-semibold rounded-full ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-900 text-white'
                    }`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Settings - Bottom */}
        <div className="mt-auto px-3 pb-4 border-t border-slate-100 pt-4">
          <Link
            href="/profile"
            onClick={onClose}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
              transition-all duration-200
              ${pathname === '/profile' || pathname?.startsWith('/profile/')
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }
            `}
          >
            <Settings className={`w-5 h-5 flex-shrink-0 ${pathname === '/profile' || pathname?.startsWith('/profile/') ? 'text-slate-900' : 'text-slate-500'}`} />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
