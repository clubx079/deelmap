'use client'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

export default function CommunityLayout({ children }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <header className="bg-white border-b border-[#E8E8E4] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/">
              <Image src="/assets/logo.svg" alt="DeelMap" width={110} height={32} priority />
            </Link>
            <span className="text-[#D4D4CF]">/</span>
            <Link href="/community" className="text-[14px] font-semibold text-[#1A1816] hover:text-[#D03839] transition-colors">
              Community
            </Link>
          </div>
          <div>
            {user ? (
              <Link
                href="/buyer/dashboard"
                className="text-[13px] font-medium text-[#444441] hover:text-[#1A1816] transition-colors"
              >
                ← Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-[13px] font-semibold bg-[#D03839] hover:bg-[#E0493B] text-white px-3 py-1.5 rounded transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
