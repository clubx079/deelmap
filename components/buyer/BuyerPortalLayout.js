'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import BuyerSidebar from '@/components/buyer/BuyerSidebar';
import { Menu } from 'lucide-react';

export default function BuyerPortalLayout({ children, pageTitle = '' }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <BuyerSidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile only: hamburger + page title centered on full screen width */}
        <header className="lg:hidden relative flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-white/95 shrink-0">
          <div className="w-10 shrink-0 flex items-center justify-start">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <h1 className="absolute left-0 right-0 text-base font-semibold text-slate-900 text-center pointer-events-none">
            {pageTitle || 'DeelMap'}
          </h1>
          <div className="w-10 shrink-0" aria-hidden />
        </header>
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
