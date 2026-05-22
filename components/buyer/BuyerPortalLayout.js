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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#E8E8E4] border-t-[#1A1816] mx-auto mb-4"></div>
          <p className="text-[#737370] text-[14px]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF8]">
      <BuyerSidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile only: hamburger + page title */}
        <header className="lg:hidden relative flex items-center justify-between px-3 py-2.5 border-b border-[#E8E8E4] bg-white shrink-0">
          <div className="w-11 shrink-0 flex items-center justify-start">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-[#FAFAF8] text-[#444441] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <h1 className="absolute left-0 right-0 text-[15px] font-semibold text-[#1A1816] text-center pointer-events-none">
            {pageTitle || 'DeelMap'}
          </h1>
          <div className="w-11 shrink-0" aria-hidden />
        </header>
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
