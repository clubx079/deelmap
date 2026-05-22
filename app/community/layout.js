'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ChevronUp, MessageSquare, Menu } from 'lucide-react'

const SECTION_ORDER = ['Deals & Wholesaling', 'Market Talk', 'Getting Started', 'Classifieds']

function CommunitySidebar({ categories, activeCategory }) {
  const [collapsed, setCollapsed] = useState({})

  const sections = categories.reduce((acc, cat) => {
    if (!acc[cat.section]) acc[cat.section] = []
    acc[cat.section].push(cat)
    return acc
  }, {})

  const toggle = (section) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }))

  return (
    <aside className="w-[220px] shrink-0 hidden lg:block">
      <div className="bg-white rounded border border-[#E8E8E4] overflow-hidden sticky top-[96px] max-h-[calc(100vh-112px)] overflow-y-auto">
        <div className="px-4 py-3 border-b border-[#E8E8E4] bg-[#FAFAF8]">
          <p className="text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[1px]">Forum Categories</p>
        </div>
        <nav className="py-1.5">
          {SECTION_ORDER.map(sectionName => {
            const cats = sections[sectionName]
            if (!cats?.length) return null
            const isCollapsed = collapsed[sectionName]
            return (
              <div key={sectionName}>
                <button
                  onClick={() => toggle(sectionName)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[0.8px] hover:text-[#737370] transition-colors"
                >
                  {sectionName}
                  {isCollapsed
                    ? <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
                </button>
                {!isCollapsed && cats.map(cat => {
                  const isActive = activeCategory === cat.slug
                  return (
                    <Link
                      key={cat.id}
                      href={`/community/${cat.slug}`}
                      className={`flex items-center gap-2 pl-4 pr-3 py-2 text-[13px] transition-colors border-r-2 ${
                        isActive
                          ? 'text-[#D03839] font-semibold bg-[#FEF0EF] border-r-[#D03839]'
                          : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816] border-r-transparent'
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#D03839]' : 'text-[#A8A8A4]'}`} />
                      <span className="truncate">{cat.name}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function MobileCategoryNav({ categories, activeCategory }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({})

  const sections = categories.reduce((acc, cat) => {
    if (!acc[cat.section]) acc[cat.section] = []
    acc[cat.section].push(cat)
    return acc
  }, {})

  const activeCat = categories.find(c => c.slug === activeCategory)
  const toggle = (section) => setCollapsed(prev => ({ ...prev, [section]: !prev[section] }))

  return (
    <div className="fixed top-[80px] left-0 right-0 z-[50] lg:hidden bg-white border-b border-[#E8E8E4]">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Menu className="w-4 h-4 text-[#A8A8A4]" />
          <span className="text-[13px] font-semibold text-[#1A1816]">
            {activeCat ? activeCat.name : 'Forum Categories'}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#737370]" /> : <ChevronDown className="w-4 h-4 text-[#737370]" />}
      </button>

      {open && (
        <div className="border-t border-[#E8E8E4] pb-1.5">
          {SECTION_ORDER.map(sectionName => {
            const cats = sections[sectionName]
            if (!cats?.length) return null
            const isCollapsed = collapsed[sectionName]
            return (
              <div key={sectionName}>
                <button
                  onClick={() => toggle(sectionName)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-[#A8A8A4] uppercase tracking-[0.8px] hover:text-[#737370] transition-colors"
                >
                  {sectionName}
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {!isCollapsed && cats.map(cat => {
                  const isActive = activeCategory === cat.slug
                  return (
                    <Link
                      key={cat.id}
                      href={`/community/${cat.slug}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 pl-6 pr-4 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'text-[#D03839] font-semibold bg-[#FEF0EF]'
                          : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816]'
                      }`}
                    >
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#D03839]' : 'text-[#A8A8A4]'}`} />
                      <span className="truncate">{cat.name}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CommunityLayout({ children }) {
  const pathname = usePathname()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  const activeCategory = pathname.startsWith('/community/')
    ? pathname.split('/')[2] || null
    : null

  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <Navbar />
      {/* Mobile: fixed right below navbar */}
      <MobileCategoryNav categories={categories} activeCategory={activeCategory} />

      <div className="pt-[124px] lg:pt-[80px]">
        {/* Two-column layout */}
        <div className="max-w-6xl mx-auto px-4 pt-3 pb-8 flex gap-5 items-start">
          <CommunitySidebar categories={categories} activeCategory={activeCategory} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

