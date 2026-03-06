'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import Link from 'next/link';
import { Users } from 'lucide-react';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    totalConversations: 0,
    unreadMessages: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle('Dashboard');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch financing requests
      const requestsResponse = await fetch('/api/buyer/financing-requests', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      const requestsData = await requestsResponse.json();

      if (requestsData.success) {
        const requests = requestsData.requests || [];
        setRecentApplications(requests.slice(0, 5));
        setStats(prev => ({
          ...prev,
          totalApplications: requests.length,
          pendingApplications: requests.length
        }));
      }

      // Fetch conversations
      const conversationsResponse = await fetch('/api/buyer/chat?action=get_conversations', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      const conversationsData = await conversationsResponse.json();

      if (conversationsData.success) {
        const conversations = conversationsData.conversations || [];
        setStats(prev => ({
          ...prev,
          totalConversations: conversations.length
        }));
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const displayFirstName = () => {
    const raw = user?.first_name || (user?.user_metadata?.name && user.user_metadata.name.split(' ')[0]) || 'User';
    if (!raw || typeof raw !== 'string') return 'User';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Compact header — one line (desktop); mobile title is in layout bar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white/80">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="hidden lg:block text-lg font-semibold text-slate-900">Welcome back, {displayFirstName()}</h1>
            <p className="text-xs text-slate-500">{getCurrentDate()}</p>
          </div>
        </div>
      </div>

      {/* Main Content — tight padding, more density */}
      <div className="px-4 py-4">
        {/* Stats — compact row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Applications</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">{stats.totalApplications}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">{stats.pendingApplications}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Conversations</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">{stats.totalConversations}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Unread</p>
            <p className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">{stats.unreadMessages}</p>
          </div>
        </div>

        {/* Recent Applications + Quick Actions — side by side, compact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Recent Applications</h2>
              <Link href="/buyer/financerequests" className="text-xs font-medium text-slate-600 hover:text-slate-900">View all</Link>
            </div>
            {recentApplications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-600 mb-2">No applications yet</p>
                <Link href="/financing" className="inline-block px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg">Apply for Finance</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <div key={app.id} className="px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{app.property_type || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{app.transaction_type || 'N/A'} · {formatDate(app.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 shrink-0">{formatCurrency(app.loan_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
            </div>
            <div className="p-2 space-y-1">
              <Link href="/buyer/inbox" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm font-medium text-slate-900">Check Messages</Link>
              <Link href="/financing" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm font-medium text-slate-900">New Application</Link>
              <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm font-medium text-slate-900">Settings</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
