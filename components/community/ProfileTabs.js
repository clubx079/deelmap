'use client'

import Link from 'next/link'
import {
  ArrowLeft, User as UserIcon, MessageSquare, Bookmark, Layers, Bell, Settings,
} from 'lucide-react'

// One unified profile tab bar (Reddit-style) — replaces the old two-row setup
// (ProfileSubNav + in-page tabs). The four profile facets live on /community/me
// as in-page tabs; Saved and Notifications are their own routes. On /community/me
// the local tabs switch state instantly (onSelect); everywhere else they're plain
// links back into the profile.
const TABS = [
  { key: 'overview',      label: 'Overview',      icon: UserIcon,      href: '/community/me?tab=overview',      local: true },
  { key: 'posts',         label: 'My Posts',      icon: MessageSquare, href: '/community/me?tab=posts',         local: true },
  { key: 'saved',         label: 'Saved',         icon: Bookmark,      href: '/community/me/saved' },
  { key: 'subscriptions', label: 'Subscriptions', icon: Layers,        href: '/community/me?tab=subscriptions', local: true },
  { key: 'notifications', label: 'Notifications', icon: Bell,          href: '/community/notifications' },
  { key: 'settings',      label: 'Settings',      icon: Settings,      href: '/community/me?tab=settings',      local: true },
]

export function ProfileTabs({ active, onSelect, unread = 0 }) {
  return (
    <div className="bg-white border-b border-[#E8E8E4]">
      <div className="max-w-[1440px] mx-auto px-2 md:px-6">
        <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 px-3 md:px-4 h-12 text-[13px] font-semibold text-[#737370] hover:text-[#1A1816] whitespace-nowrap transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
            <span className="hidden sm:inline">Community</span>
          </Link>
          <span className="w-px h-5 bg-[#E8E8E4] mx-1 shrink-0" />

          {TABS.map(t => {
            const isActive = t.key === active
            const Icon = t.icon
            const cls = `inline-flex items-center gap-2 px-3.5 md:px-5 h-12 text-[13.5px] font-bold whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'text-[#D03839] border-[#D03839]'
                : 'text-[#737370] border-transparent hover:text-[#1A1816]'
            }`
            const inner = (
              <>
                <Icon className="w-4 h-4" strokeWidth={2.25} />
                {t.label}
                {t.key === 'notifications' && unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#D03839] text-white text-[10px] font-extrabold">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </>
            )

            if (onSelect && t.local) {
              return (
                <button key={t.key} onClick={() => onSelect(t.key)} className={cls}>
                  {inner}
                </button>
              )
            }
            return (
              <Link key={t.key} href={t.href} className={cls}>
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
