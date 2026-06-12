'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Bell, BellOff, Check, MessageSquare, AtSign, ShieldCheck, Gavel, Inbox, Layers,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { ProfileSubNav } from '@/components/community/ProfileSubNav'
import { showToast } from '@/components/community/Dialogs'

const FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'unread',  label: 'Unread' },
]

const TYPE_ICONS = {
  comment_reply:        { icon: MessageSquare, bg: '#DBEAFE', fg: '#2563EB' },
  post_reply:           { icon: MessageSquare, bg: '#DBEAFE', fg: '#2563EB' },
  mention:              { icon: AtSign,        bg: '#FEF0EF', fg: '#D03839' },
  verification_status:  { icon: ShieldCheck,   bg: '#DCFCE7', fg: '#0F6E56' },
  mod_action:           { icon: Gavel,         bg: '#FEF3C7', fg: '#92400E' },
  lot_post:             { icon: Layers,        bg: '#FAFAF8', fg: '#1A1816' },
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [unread, setUnread] = useState(0)
  const [filter, setFilter] = useState('all')
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [showHandlePicker, setShowHandlePicker] = useState(false)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Profile
  useEffect(() => {
    if (!user?.id) { setProfile(null); setProfileChecked(true); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => { setProfile(d.profile); setProfileChecked(true) })
      .catch(() => setProfileChecked(true))
  }, [user?.id])

  const load = useCallback(async () => {
    if (!user?.id || !profile) { setItems([]); return }
    const url = new URL('/api/community/notifications', window.location.origin)
    if (filter === 'unread') url.searchParams.set('unread', '1')
    url.searchParams.set('limit', '50')
    const r = await fetch(url.toString(), { headers: authHeaders() })
    const d = await r.json()
    setItems(d.notifications || [])
    setUnread(d.unread_count || 0)
  }, [user?.id, profile, filter, authHeaders])

  useEffect(() => { load() }, [load])

  const markAllRead = async () => {
    if (!unread) return
    setItems(prev => (prev || []).map(n => ({ ...n, is_read: true })))
    setUnread(0)
    await fetch('/api/community/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action: 'mark_all_read' }),
    }).catch(() => {})
    showToast('All marked as read', { variant: 'success' })
  }

  const markRead = async (id) => {
    setItems(prev => (prev || []).map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(u => Math.max(0, u - 1))
    await fetch('/api/community/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action: 'mark_read', notification_id: id }),
    }).catch(() => {})
  }

  const isGuest = profileChecked && !user?.id
  const isMissingProfile = profileChecked && user?.id && !profile

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      <ProfileSubNav active="notifications" />

      {/* Hero strip */}
      <div className="bg-white border-b border-[#E8E8E4]">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight text-[#1A1816] leading-tight">
              Notifications
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-[#737370] mt-1">
              {unread > 0
                ? `${unread} unread · replies, mentions, and verification updates.`
                : 'You\'re all caught up.'}
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unread}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#1A1816] hover:bg-[#2A2825] disabled:bg-[#D1D1CE] disabled:cursor-not-allowed text-white font-bold text-[13px] rounded transition-colors w-full sm:w-auto"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Mark all read
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-3 md:px-8 py-4 md:py-5 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <main className="min-w-0">
          {/* Filter pills */}
          <div className="bg-white border border-[#E8E8E4] rounded p-1.5 flex items-center gap-1 mb-4">
            {FILTERS.map(f => {
              const active = f.value === filter
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-[13px] font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-[#1A1816] text-white' : 'text-[#444441] hover:bg-[#FAFAF8] hover:text-[#1A1816]'
                  }`}
                >
                  {f.label}
                  {f.value === 'unread' && unread > 0 && !active && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#D03839] text-white text-[10px] font-extrabold">
                      {unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {!profileChecked ? (
            <ListSkeleton />
          ) : isGuest ? (
            <GuestPrompt />
          ) : isMissingProfile ? (
            <NeedProfilePrompt onPick={() => setShowHandlePicker(true)} />
          ) : items === null ? (
            <ListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <ul className="space-y-2">
              {items.map(n => (
                <NotificationRow key={n.id} n={n} onMarkRead={markRead} />
              ))}
            </ul>
          )}
        </main>

        {/* Right rail — explainer */}
        <aside className="hidden lg:block">
          <div className="bg-white border border-[#E8E8E4] rounded p-4 sticky top-[68px]">
            <h3 className="text-[13.5px] font-extrabold text-[#1A1816] tracking-tight mb-2">What lands here</h3>
            <ul className="space-y-2.5 text-[12.5px] text-[#444441]">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <span><strong className="text-[#1A1816] font-bold">Replies</strong> to your posts and comments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D03839] mt-1.5 shrink-0" />
                <span><strong className="text-[#1A1816] font-bold">@mentions</strong> when someone tags your handle.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] mt-1.5 shrink-0" />
                <span><strong className="text-[#1A1816] font-bold">Verification updates</strong> when a mod reviews your submission.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#92400E] mt-1.5 shrink-0" />
                <span><strong className="text-[#1A1816] font-bold">Mod actions</strong> on your content.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1A1816] mt-1.5 shrink-0" />
                <span><strong className="text-[#1A1816] font-bold">New posts</strong> in Lots you follow.</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-[#F3F3EF]">
              <Link href="/community/me" className="text-[12.5px] text-[#D03839] font-semibold hover:underline">
                Email preferences →
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <Footer hideCta />

      <HandlePickerModal
        open={showHandlePicker}
        onClose={() => setShowHandlePicker(false)}
        onCreated={(p) => { setProfile(p); setShowHandlePicker(false) }}
      />
    </div>
  )
}

function NotificationRow({ n, onMarkRead }) {
  const style = TYPE_ICONS[n.type] || TYPE_ICONS.mention
  const Icon = style.icon
  const unread = !n.is_read

  return (
    <li>
      <Link
        href={n.href}
        onClick={() => unread && onMarkRead(n.id)}
        className={`flex items-start gap-3 p-3.5 rounded border transition-colors ${
          unread
            ? 'bg-white border-[#E8E8E4] border-l-4 border-l-[#D03839]'
            : 'bg-white border-[#E8E8E4] hover:border-[#D1D1CE]'
        }`}
      >
        <div
          className="w-9 h-9 rounded flex items-center justify-center shrink-0"
          style={{ background: style.bg, color: style.fg }}
        >
          <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[13.5px] leading-snug mb-0.5 ${unread ? 'font-bold text-[#1A1816]' : 'font-semibold text-[#444441]'}`}>
            {n.title}
          </div>
          {n.body && (
            <div className="text-[12.5px] text-[#737370] leading-relaxed line-clamp-2 mb-1">
              {n.body}
            </div>
          )}
          <div className="text-[11px] text-[#A8A8A4] font-semibold">
            {relativeTime(n.created_at)}
          </div>
        </div>
        {unread && (
          <span className="w-2 h-2 rounded-full bg-[#D03839] shrink-0 mt-2" aria-label="Unread" />
        )}
      </Link>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <li key={i} className="bg-white border border-[#E8E8E4] rounded p-3.5 flex items-start gap-3 animate-pulse">
          <div className="w-9 h-9 rounded bg-[#F3F3EF] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-[#F3F3EF] rounded" />
            <div className="h-3 w-full bg-[#F3F3EF] rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ filter }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Inbox className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          {filter === 'unread'
            ? 'When somebody replies, mentions you, or a mod updates your verification, you\'ll see it here first.'
            : 'Post a deal-anchored thread or reply to one. Notifications start once you\'re in the conversation.'}
        </p>
        <Link
          href="/community"
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Browse community
        </Link>
      </div>
    </div>
  )
}

function GuestPrompt() {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Bell className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Sign in to see notifications
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Replies, mentions, and verification updates land here.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('showAuth', { detail: { step: 'login' } }))}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}

function NeedProfilePrompt({ onPick }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded overflow-hidden">
      <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <BellOff className="w-6 h-6" strokeWidth={2} />
        </div>
        <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
          Pick a handle first
        </h2>
        <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Notifications are tied to your community profile. Pick a handle — anonymous or your real name — and you&apos;re in.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Pick handle
        </button>
      </div>
    </div>
  )
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
