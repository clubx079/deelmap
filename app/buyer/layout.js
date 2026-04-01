'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import BuyerSidebar from '@/components/buyer/BuyerSidebar';
import { BuyerPageTitleContext } from '@/context/BuyerPageTitleContext';
import { Menu } from 'lucide-react';

export default function BuyerLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8E8E4] border-t-[#1A1816] mx-auto mb-4"></div>
          <p className="text-[#737370] text-[14px]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <BuyerPageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      <div className="flex h-screen overflow-hidden bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        {/* Sidebar */}
        <BuyerSidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile header */}
          <header className="lg:hidden relative flex items-center justify-between px-4 py-3 border-b border-[#E8E8E4] bg-white shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded hover:bg-[#FAFAF8] text-[#444441] transition-colors duration-200"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="absolute left-0 right-0 text-[14px] font-semibold text-[#1A1816] text-center pointer-events-none">
              {pageTitle || 'DeelMap'}
            </h1>
            <div className="w-9" aria-hidden />
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto min-h-0 bg-[#FAFAF8]">
            {children}
          </main>
        </div>
      </div>
    </BuyerPageTitleContext.Provider>
  );
}
