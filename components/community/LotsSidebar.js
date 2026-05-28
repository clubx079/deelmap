'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const CATEGORY_LABELS = {
  real_estate: 'Real Estate',
  lending:     'Lending & Capital',
  finance:     'Finance & Strategy',
  contractors: 'Contractors & Trades',
  markets:     'Markets',
}

export function LotsSidebar({ groups }) {
  const params = useSearchParams()
  const activeLot = params.get('lot')

  if (!groups?.length) {
    return (
      <aside className="hidden lg:block">
        <div className="bg-white border border-[#E8E8E4] rounded-lg p-4 text-[13px] text-[#737370]">
          Loading lots…
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden lg:block">
      {groups.map(group => (
        <div key={group.category} className="bg-white border border-[#E8E8E4] rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-3 text-[12px] font-bold text-[#1A1816] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: group.accent || '#737370' }} />
            {CATEGORY_LABELS[group.category] || group.category}
          </div>
          <ul>
            {group.lots.map(lot => {
              const active = activeLot === lot.slug
              return (
                <li key={lot.slug}>
                  <Link
                    href={`/community?lot=${lot.slug}`}
                    className={`flex justify-between items-center py-1.5 text-[13px] cursor-pointer border-b border-[#F3F3EF] last:border-b-0 transition-colors ${
                      active ? 'text-[#D03839] font-semibold' : 'text-[#444441] hover:text-[#D03839]'
                    }`}
                  >
                    <span>{lot.name}</span>
                    <span className="text-[11px] text-[#A8A8A4] font-semibold">{formatCount(lot.post_count)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}
