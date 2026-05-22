'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { MessageSquare, ChevronRight, TrendingUp, Home, Tag, BarChart3 } from 'lucide-react'

const SECTION_CONFIG = {
  'Deals & Wholesaling': { icon: TrendingUp, bg: 'bg-[#EBF3FC]', text: 'text-[#2563EB]', border: 'border-[#BFDBFE]' },
  'Market Talk':         { icon: BarChart3,  bg: 'bg-[#FEF3E2]', text: 'text-[#B5620A]', border: 'border-[#FDE68A]' },
  'Getting Started':     { icon: Home,       bg: 'bg-[#E4F5EC]', text: 'text-[#0F6E56]', border: 'border-[#A7F3D0]' },
  'Classifieds':         { icon: Tag,        bg: 'bg-[#F3E8FF]', text: 'text-[#7C3AED]', border: 'border-[#DDD6FE]' },
}

const SECTION_ORDER = ['Deals & Wholesaling', 'Market Talk', 'Getting Started', 'Classifieds']

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function CommunityPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(d => { setCategories(d.categories || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sections = categories.reduce((acc, cat) => {
    if (!acc[cat.section]) acc[cat.section] = []
    acc[cat.section].push(cat)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-[#1A1816] mb-1">Community Forum</h1>
        <p className="text-[14px] text-[#737370]">
          Connect with real estate investors. Ask questions, share deals, discuss markets.
        </p>
        {!user && (
          <p className="mt-3 text-[13px] text-[#737370]">
            <Link href="/login" className="text-[#D03839] font-semibold hover:underline">Sign in</Link>
            {' '}or{' '}
            <Link href="/signup" className="text-[#D03839] font-semibold hover:underline">create a free account</Link>
            {' '}to post and reply.
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded border border-[#E8E8E4] overflow-hidden animate-pulse">
              <div className="h-10 bg-[#F5F5F3] border-b border-[#E8E8E4]" />
              {[1, 2, 3].map(j => <div key={j} className="h-16 border-b border-[#E8E8E4] last:border-0" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {SECTION_ORDER.map(sectionName => {
            const cats = sections[sectionName]
            if (!cats?.length) return null
            const cfg = SECTION_CONFIG[sectionName] || { icon: MessageSquare, bg: 'bg-[#F5F5F3]', text: 'text-[#444441]', border: 'border-[#E8E8E4]' }
            const Icon = cfg.icon
            return (
              <div key={sectionName} className="bg-white rounded border border-[#E8E8E4] overflow-hidden">
                <div className={`px-4 py-2.5 border-b border-[#E8E8E4] bg-[#FAFAF8] flex items-center gap-2`}>
                  <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                  </div>
                  <span className="text-[12px] font-semibold text-[#444441] uppercase tracking-wide">{sectionName}</span>
                </div>
                {cats.map((cat, i) => (
                  <Link
                    key={cat.id}
                    href={`/community/${cat.slug}`}
                    className={`flex items-center justify-between px-4 py-4 hover:bg-[#FAFAF8] transition-colors group ${i < cats.length - 1 ? 'border-b border-[#E8E8E4]' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <MessageSquare className={`w-3.5 h-3.5 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A1816] group-hover:text-[#D03839] transition-colors truncate">
                          {cat.name}
                        </p>
                        <p className="text-[12px] text-[#737370] truncate">{cat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[13px] font-semibold text-[#1A1816]">{cat.thread_count || 0}</p>
                        <p className="text-[11px] text-[#A8A8A4]">threads</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#D4D4CF] group-hover:text-[#D03839] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
