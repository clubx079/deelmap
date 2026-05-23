'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'
import { MessageSquare, TrendingUp, HelpCircle, Trophy, BookOpen, Newspaper, Wrench, Users2 } from 'lucide-react'

const CHANNEL_ICONS = {
  deals: MessageSquare,
  analysis: TrendingUp,
  questions: HelpCircle,
  wins: Trophy,
  learn: BookOpen,
  news: Newspaper,
  tools: Wrench,
  intros: Users2,
}

function ChannelSidebar({ channels, activeChannel }) {
  const totalPosts = channels.reduce((s, c) => s + (c.post_count || 0), 0)

  return (
    <aside className="w-[220px] shrink-0 hidden lg:block sticky top-[92px] self-start">
      <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-[#E8E8E4]">
          <p className="text-[13px] font-bold text-[#1A1816]">Community</p>
          <p className="text-[11px] text-[#A8A8A4] mt-0.5">Real estate investors</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[13px] font-semibold text-[#1A1816]">{totalPosts.toLocaleString()} posts</p>
          <p className="text-[11px] text-[#A8A8A4]">{channels.length} channels</p>
        </div>
      </div>

      <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#E8E8E4] bg-[#FAFAF8]">
          <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1px]">Channels</p>
        </div>
        <nav className="py-1">
          <Link
            href="/community"
            className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors border-l-2 ${
              activeChannel === null
                ? 'text-[#D03839] font-semibold bg-[#FEF0EF] border-l-[#D03839]'
                : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] border-l-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0 text-[#A8A8A4]" />
            <span>All Posts</span>
          </Link>
          {channels.map(ch => {
            const Icon = CHANNEL_ICONS[ch.slug] || MessageSquare
            const isActive = activeChannel === ch.slug
            return (
              <Link
                key={ch.id}
                href={`/community/${ch.slug}`}
                className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors border-l-2 ${
                  isActive
                    ? 'text-[#D03839] font-semibold bg-[#FEF0EF] border-l-[#D03839]'
                    : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] border-l-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#D03839]' : 'text-[#A8A8A4]'}`} />
                <span className="truncate">{ch.name}</span>
                {ch.post_count > 0 && (
                  <span className="ml-auto text-[11px] text-[#A8A8A4] shrink-0">{ch.post_count}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

export default function CommunityLayout({ children }) {
  const pathname = usePathname()
  const [channels, setChannels] = useState([])

  useEffect(() => {
    fetch('/api/community/channels').then(r => r.json()).then(setChannels).catch(() => {})
  }, [])

  const parts = pathname.split('/').filter(Boolean)
  const activeChannel = parts[0] === 'community' && parts[1] ? parts[1] : null

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <Navbar />
      <div className="pt-[80px]">
        <div className="max-w-5xl mx-auto px-4 py-6 flex gap-5 items-start">
          <ChannelSidebar channels={channels} activeChannel={activeChannel} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
