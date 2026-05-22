'use client'
import { Navbar } from '@/components/layout/Navbar'

export default function CommunityLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <Navbar />
      <main className="pt-[80px]">{children}</main>
    </div>
  )
}
