'use client'

import Link from 'next/link'
import { ArrowLeft, User, Bookmark, Bell } from 'lucide-react'

// Shared sub-nav for the community profile "hub" — used on /community/me,
// /community/me/saved and /community/notifications so all three facets of a
// member's identity share one consistent, properly-sized nav.
export function ProfileSubNav({ active }) {
  const item = (href, label, Icon, key) =>
    key === active ? (
      <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded bg-[#1A1816] text-white text-[13px] font-semibold whitespace-nowrap">
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        {label}
      </span>
    ) : (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold text-[#444441] border border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816] transition-colors whitespace-nowrap"
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Link>
    )

  return (
    <div className="sticky top-[80px] z-30 bg-white border-b border-[#E8E8E4]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="h-[52px] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded text-[13px] font-semibold text-[#444441] border border-[#E8E8E4] hover:border-[#D1D1CE] hover:text-[#1A1816] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Community
          </Link>
          {item('/community/me', 'My Profile', User, 'profile')}
          {item('/community/me/saved', 'Saved', Bookmark, 'saved')}
          {item('/community/notifications', 'Notifications', Bell, 'notifications')}
        </div>
      </div>
    </div>
  )
}
