'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, User as UserIcon, ShieldCheck, Bookmark, Compass, Pencil, Check, X,
  MessageSquare, Layers, Loader2, Settings, ChevronRight,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { PostCard } from '@/components/community/PostCard'
import { RightSidebar } from '@/components/community/RightSidebar'
import { ProfileSubNav } from '@/components/community/ProfileSubNav'
import { HandlePickerModal } from '@/components/community/HandlePickerModal'
import { VerificationModal } from '@/components/community/VerificationModal'
import { showToast } from '@/components/community/Dialogs'

const HANDLE_COOLDOWN_DAYS = 90

const TABS = [
  { value: 'overview',      label: 'Overview',       icon: UserIcon },
  { value: 'posts',         label: 'My Posts',       icon: MessageSquare },
  { value: 'subscriptions', label: 'Subscriptions',  icon: Layers },
  { value: 'settings',      label: 'Settings',       icon: Settings },
]

export default function MyProfilePage() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [tier, setTier] = useState(null)
  const [nextTier, setNextTier] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [tab, setTab] = useState('overview')
  const [showHandlePicker, setShowHandlePicker] = useState(false)
  const [showVerification, setShowVerification] = useState(false)

  const authHeaders = useCallback(
    () => (user?.id ? { 'x-user-id': user.id } : {}),
    [user?.id]
  )

  // Load profile + tier
  useEffect(() => {
    if (!user?.id) { setProfile(null); setProfileChecked(true); return }
    fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        setTier(d.tier)
        setNextTier(d.next_tier)
        setProfileChecked(true)
      })
      .catch(() => setProfileChecked(true))
  }, [user?.id])

  const refreshProfile = async () => {
    if (!user?.id) return
    const r = await fetch('/api/community/profile', { headers: { 'x-user-id': user.id } })
    const d = await r.json()
    setProfile(d.profile)
    setTier(d.tier)
    setNextTier(d.next_tier)
  }

  const onStartVerify = () => setShowVerification(true)

  const isGuest = profileChecked && !user?.id
  const isMissingProfile = profileChecked && user?.id && !profile

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />

      <ProfileSubNav active="profile" />

      {!profileChecked ? (
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-10">
          <div className="bg-white border border-[#E8E8E4] rounded-xl p-6 animate-pulse">
            <div className="h-20 w-20 rounded-full bg-[#F3F3EF] mb-4" />
            <div className="h-6 w-40 bg-[#F3F3EF] rounded mb-2" />
            <div className="h-4 w-72 bg-[#F3F3EF] rounded" />
          </div>
        </div>
      ) : isGuest ? (
        <GuestPrompt />
      ) : isMissingProfile ? (
        <NeedProfilePrompt onPick={() => setShowHandlePicker(true)} />
      ) : (
        <>
          {/* Hero */}
          <ProfileHero
            profile={profile}
            tier={tier}
            nextTier={nextTier}
            onEdit={() => setTab('settings')}
            onStartVerify={onStartVerify}
          />

          {/* Tabs */}
          <div className="bg-white border-b border-[#E8E8E4]">
            <div className="max-w-[1440px] mx-auto px-2 md:px-6">
              <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
                {TABS.map(t => {
                  const active = t.value === tab
                  const Icon = t.icon
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTab(t.value)}
                      className={`inline-flex items-center gap-2 px-4 md:px-5 h-12 text-[13.5px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                        active
                          ? 'text-[#D03839] border-[#D03839]'
                          : 'text-[#737370] border-transparent hover:text-[#1A1816]'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.25} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-3 md:px-8 py-4 md:py-5 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
            <main className="min-w-0">
              {tab === 'overview' && (
                <OverviewTab profile={profile} tier={tier} nextTier={nextTier} authHeaders={authHeaders} onStartVerify={onStartVerify} />
              )}
              {tab === 'posts' && <PostsTab authHeaders={authHeaders} />}
              {tab === 'subscriptions' && <SubscriptionsTab authHeaders={authHeaders} />}
              {tab === 'settings' && (
                <SettingsTab profile={profile} authHeaders={authHeaders} onUpdated={refreshProfile} />
              )}
            </main>

            <RightSidebar
              profile={profile}
              nextTier={nextTier}
              trending={[]}
              activeDeals={[]}
              onStartVerify={onStartVerify}
              hideEquity
            />
          </div>
        </>
      )}

      <Footer hideCta />

      <HandlePickerModal
        open={showHandlePicker}
        onClose={() => setShowHandlePicker(false)}
        onCreated={(p) => { setProfile(p); setShowHandlePicker(false); refreshProfile() }}
      />
      <VerificationModal
        open={showVerification}
        onClose={() => setShowVerification(false)}
        onSubmitted={() => { setShowVerification(false); refreshProfile() }}
      />
    </div>
  )
}

// ──────────────────────────── Hero ────────────────────────────

function ProfileHero({ profile, tier, nextTier, onEdit, onStartVerify }) {
  const equity = profile.equity_score || 0
  const pct = nextTier && nextTier.min_equity > 0
    ? Math.min(100, Math.round((equity / nextTier.min_equity) * 100))
    : 100
  const togo = nextTier ? Math.max(0, nextTier.min_equity - equity) : 0

  return (
    <div className="bg-[#1A1816] text-white">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-br from-[#D03839] to-[#FB7185] flex items-center justify-center text-white text-[28px] md:text-[32px] font-extrabold border-[3px] border-white/10 shadow-xl">
              {(profile.handle || '?').slice(0, 1).toUpperCase()}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-[22px] md:text-[30px] font-extrabold tracking-tight leading-none">
                @{profile.handle}
              </h1>
              {profile.role_badge && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#0F6E56]">
                  <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                  Verified {cap(profile.role_badge)}
                </span>
              )}
              {profile.is_moderator && (
                <span className="inline-flex items-center px-2 py-1 rounded text-[10.5px] font-extrabold tracking-wide text-white bg-[#D03839]">
                  Moderator
                </span>
              )}
            </div>
            <div className="text-[13.5px] text-white/70">
              {profile.display_name || 'No display name set'}
            </div>
            {profile.bio && (
              <p className="text-[13px] text-white/80 mt-2 leading-relaxed max-w-2xl">{profile.bio}</p>
            )}

            {/* Equity strip */}
            <div className="mt-4 max-w-md">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Equity</span>
                <span className="text-[18px] font-extrabold leading-none">{equity.toLocaleString()}</span>
                {tier && (
                  <span className="text-[11.5px] text-white/60 font-semibold">· {tier.name} tier</span>
                )}
              </div>
              <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-linear-to-r from-[#D03839] to-[#FB7185]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 text-[11.5px] text-white/60">
                {nextTier
                  ? <>{togo.toLocaleString()} Equity to <strong className="text-white font-bold">{nextTier.name}</strong></>
                  : 'Top tier reached.'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 md:items-end">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-white text-[#1A1816] font-bold text-[13px] rounded hover:bg-white/90 transition-colors w-full md:w-[150px]"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
              Edit profile
            </button>
            {!profile.role_badge && (
              <button
                type="button"
                onClick={onStartVerify}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#0F6E56] hover:bg-[#0A5740] text-white font-bold text-[13px] rounded transition-colors w-full md:w-[150px]"
              >
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                Get verified
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────── Tabs ────────────────────────────

function OverviewTab({ profile, tier, nextTier, authHeaders, onStartVerify }) {
  const [stats, setStats] = useState(null)
  const [subs, setSubs] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/community/profile/posts', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ posts: [] })),
      fetch('/api/community/subscriptions', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ subscriptions: [] })),
      fetch('/api/community/saves', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ posts: [] })),
    ]).then(([p, s, sv]) => {
      setStats({
        post_count: (p.posts || []).length,
        comment_count: (p.posts || []).reduce((a, b) => a + (b.comment_count || 0), 0),
        saved_count: (sv.posts || []).length,
      })
      setSubs(s.subscriptions || [])
    })
  }, [authHeaders])

  return (
    <div className="space-y-3.5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Equity" value={(profile.equity_score || 0).toLocaleString()} tone="red" />
        <StatCard label="Posts"     value={stats?.post_count ?? '—'}      tone="dark" />
        <StatCard label="Saved"     value={stats?.saved_count ?? '—'}     tone="dark" />
        <StatCard label="Subscribed" value={subs?.length ?? '—'}          tone="dark" />
      </div>

      {/* Equity / tier */}
      <div className="bg-white border border-[#E8E8E4] rounded-xl p-5">
        <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-3">Tier progress</div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-[26px] font-extrabold text-[#1A1816] leading-none tracking-tight">
              {(profile.equity_score || 0).toLocaleString()} <span className="text-[14px] font-bold text-[#737370]">Equity</span>
            </div>
            {tier && <div className="text-[12.5px] text-[#737370] mt-1">Current tier: <strong className="text-[#1A1816] font-bold">{tier.name}</strong></div>}
          </div>
          {nextTier && (
            <div className="text-right">
              <div className="text-[12px] font-bold text-[#1A1816]">{nextTier.name}</div>
              <div className="text-[11.5px] text-[#737370]">{Math.max(0, nextTier.min_equity - (profile.equity_score || 0)).toLocaleString()} to go</div>
            </div>
          )}
        </div>
        <div className="h-2 bg-[#F3F3EF] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#D03839] to-[#FB7185]"
            style={{
              width: `${nextTier && nextTier.min_equity > 0
                ? Math.min(100, Math.round(((profile.equity_score || 0) / nextTier.min_equity) * 100))
                : 100}%`,
            }}
          />
        </div>
      </div>

      {/* Verify CTA if not verified */}
      {!profile.role_badge && (
        <div className="bg-linear-to-br from-[#ECFDF5] to-white border border-[#BBF7D0] rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 bg-[#0F6E56] rounded-lg flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-5.5 h-5.5" strokeWidth={2.25} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-extrabold text-[#1A1816] mb-0.5">Get a verification badge</div>
            <div className="text-[13px] text-[#444441] leading-relaxed">
              Verify your role (Lender, Contractor, Agent, Principal, or Wholesaler) to earn 3× Equity on replies and post in restricted Lots.
            </div>
          </div>
          <Link
            href="/community/verify"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#0F6E56] hover:bg-[#0A5740] text-white font-bold text-[13px] rounded transition-colors whitespace-nowrap"
          >
            Start verification <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
          </Link>
        </div>
      )}

      {/* Subscriptions preview */}
      <div className="bg-white border border-[#E8E8E4] rounded-xl">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#737370]">Your Lots</div>
          <span className="text-[11.5px] text-[#737370]">{subs?.length || 0} subscribed</span>
        </div>
        {subs === null ? (
          <div className="px-5 pb-5 text-[13px] text-[#737370]">Loading…</div>
        ) : !subs.length ? (
          <div className="px-5 pb-5">
            <div className="text-[13px] text-[#737370] leading-relaxed mb-3">
              You haven&apos;t subscribed to any Lots yet. Subscribe to keep your feed focused.
            </div>
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1816] hover:bg-[#2A2825] text-white font-bold text-[12.5px] rounded transition-colors"
            >
              <Compass className="w-3.5 h-3.5" /> Browse Lots
            </Link>
          </div>
        ) : (
          <ul className="px-2 pb-3">
            {subs.slice(0, 6).map(lot => (
              <li key={lot.id}>
                <Link
                  href={`/community/${lot.slug}`}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#FAFAF8] transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: lot.accent_color || '#737370' }} />
                    <span className="text-[13.5px] font-semibold text-[#1A1816] truncate">{lot.name}</span>
                  </span>
                  <span className="text-[11.5px] text-[#A8A8A4] font-semibold ml-2">{lot.post_count || 0} posts</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, tone = 'dark' }) {
  const styles = tone === 'red'
    ? 'bg-linear-to-br from-[#FEF0EF] to-white border-[#F5C4C0] text-[#D03839]'
    : 'bg-white border-[#E8E8E4] text-[#1A1816]'
  return (
    <div className={`border rounded-xl p-3.5 md:p-4 ${styles}`}>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#737370] mb-1">{label}</div>
      <div className="text-[22px] md:text-[24px] font-extrabold leading-none tracking-tight">{value}</div>
    </div>
  )
}

function PostsTab({ authHeaders }) {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    fetch('/api/community/profile/posts', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(() => setPosts([]))
  }, [authHeaders])

  if (posts === null) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E8E8E4] rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!posts.length) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded-xl p-8 md:p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <MessageSquare className="w-6 h-6" strokeWidth={2} />
        </div>
        <h3 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">You haven&apos;t posted yet.</h3>
        <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Drop the deal, the comp, the rate. Numbers get numbers back.
        </p>
        <Link
          href="/community/new"
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          Start a post <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map(p => (
        <PostCard key={p.id} post={p} isSaved={p.is_saved} />
      ))}
    </div>
  )
}

function SubscriptionsTab({ authHeaders }) {
  const [subs, setSubs] = useState(null)
  const [busy, setBusy] = useState(null) // lot slug being toggled

  useEffect(() => {
    fetch('/api/community/subscriptions', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setSubs(d.subscriptions || []))
      .catch(() => setSubs([]))
  }, [authHeaders])

  const unsubscribe = async (lot) => {
    setBusy(lot.slug)
    const prev = subs
    setSubs(prev.filter(s => s.slug !== lot.slug))
    const res = await fetch(`/api/community/subscriptions?lot_slug=${lot.slug}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => null)
    setBusy(null)
    if (!res?.ok) {
      setSubs(prev)
      showToast('Could not unsubscribe.', { variant: 'error' })
    } else {
      showToast(`Unsubscribed from ${lot.name}`, { variant: 'success' })
    }
  }

  if (subs === null) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[#E8E8E4] rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!subs.length) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded-xl p-8 md:p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
          <Layers className="w-6 h-6" strokeWidth={2} />
        </div>
        <h3 className="text-[18px] font-extrabold text-[#1A1816] tracking-tight">No subscriptions yet.</h3>
        <p className="text-[13px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
          Subscribe to Lots you care about — rates, comps, contractors, off-market deals — and they&apos;ll filter your feed.
        </p>
        <Link
          href="/community"
          className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 bg-[#D03839] hover:bg-[#C73022] text-white font-bold text-[14px] rounded transition-colors"
        >
          <Compass className="w-4 h-4" strokeWidth={2.5} /> Browse Lots
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {subs.map(lot => (
        <div
          key={lot.id}
          className="bg-white border border-[#E8E8E4] rounded-lg p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-white"
               style={{ background: lot.accent_color || '#737370' }}>
            <Layers className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/community/${lot.slug}`}
              className="text-[14.5px] font-bold text-[#1A1816] hover:text-[#D03839] truncate inline-block max-w-full"
            >
              {lot.name}
            </Link>
            <div className="text-[11.5px] text-[#737370] font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{(lot.post_count || 0).toLocaleString()} posts</span>
              <span className="text-[#D1D1CE]">·</span>
              <span>{(lot.member_count || 0).toLocaleString()} members</span>
            </div>
          </div>
          <button
            type="button"
            disabled={busy === lot.slug}
            onClick={() => unsubscribe(lot)}
            className="shrink-0 h-9 px-3 inline-flex items-center gap-1.5 border border-[#E8E8E4] rounded text-[12.5px] font-bold text-[#444441] hover:border-[#D03839] hover:text-[#D03839] disabled:opacity-50"
          >
            {busy === lot.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Unsubscribe
          </button>
        </div>
      ))}
    </div>
  )
}

function SettingsTab({ profile, authHeaders, onUpdated }) {
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [handle, setHandle] = useState(profile.handle || '')
  const [emailReplies, setEmailReplies] = useState(profile.email_replies !== false)
  const [emailMentions, setEmailMentions] = useState(profile.email_mentions !== false)
  const [emailVerificationStatus, setEmailVerificationStatus] = useState(profile.email_verification_status !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Days until handle can be changed
  const daysUntilHandleChange = (() => {
    if (!profile.handle_changed_at) return 0
    const days = (Date.now() - new Date(profile.handle_changed_at).getTime()) / 86_400_000
    return Math.max(0, Math.ceil(HANDLE_COOLDOWN_DAYS - days))
  })()
  const handleEditable = daysUntilHandleChange <= 0

  const dirty =
    displayName !== (profile.display_name || '') ||
    bio !== (profile.bio || '') ||
    (handleEditable && handle !== profile.handle) ||
    emailReplies !== (profile.email_replies !== false) ||
    emailMentions !== (profile.email_mentions !== false) ||
    emailVerificationStatus !== (profile.email_verification_status !== false)

  const save = async () => {
    setSaving(true); setError(null)
    const patch = {}
    if (displayName !== (profile.display_name || '')) patch.display_name = displayName
    if (bio !== (profile.bio || '')) patch.bio = bio
    if (handleEditable && handle !== profile.handle) patch.handle = handle
    if (emailReplies !== (profile.email_replies !== false)) patch.email_replies = emailReplies
    if (emailMentions !== (profile.email_mentions !== false)) patch.email_mentions = emailMentions
    if (emailVerificationStatus !== (profile.email_verification_status !== false)) patch.email_verification_status = emailVerificationStatus

    if (!Object.keys(patch).length) { setSaving(false); return }

    const res = await fetch('/api/community/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || 'Could not save.')
      showToast(data.error || 'Could not save.', { variant: 'error' })
      return
    }
    showToast('Profile updated', { variant: 'success' })
    onUpdated?.()
  }

  return (
    <div className="space-y-3.5">
      <div className="bg-white border border-[#E8E8E4] rounded-xl p-5">
        <h3 className="text-[15px] font-extrabold text-[#1A1816] tracking-tight">Public profile</h3>
        <p className="text-[12.5px] text-[#737370] mt-1">These are visible to other community members.</p>

        <div className="mt-4 space-y-4">
          {/* Handle */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-1.5">Handle</label>
            <div className={`flex items-center border rounded ${handleEditable ? 'border-[#D1D1CE] focus-within:border-[#D03839]' : 'border-[#E8E8E4] bg-[#FAFAF8]'}`}>
              <span className="pl-3 text-[15px] text-[#A8A8A4]">@</span>
              <input
                type="text"
                value={handle}
                disabled={!handleEditable}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))}
                className="flex-1 px-2 py-2.5 text-[15px] outline-none bg-transparent disabled:text-[#A8A8A4]"
              />
            </div>
            <p className="text-[11.5px] text-[#A8A8A4] mt-1.5">
              {handleEditable
                ? '3–24 chars · lowercase letters, numbers, underscore. Changeable once every 90 days.'
                : `Handle can be changed again in ${daysUntilHandleChange} day${daysUntilHandleChange === 1 ? '' : 's'}.`}
            </p>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              placeholder="Optional — shown next to your handle"
              className="w-full px-3 py-2.5 text-[15px] border border-[#D1D1CE] rounded outline-none focus:border-[#D03839]"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[#737370] mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="A few sentences about what you do. Markets, deal types, what you're looking for."
              className="w-full px-3 py-2.5 text-[14px] border border-[#D1D1CE] rounded outline-none focus:border-[#D03839] resize-y min-h-[88px] leading-relaxed"
            />
            <p className="text-[11.5px] text-[#A8A8A4] mt-1.5 text-right">{bio.length}/500</p>
          </div>

          {error && (
            <div className="text-[13px] text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#D03839] hover:bg-[#C73022] disabled:bg-[#A8A8A4] disabled:cursor-not-allowed text-white font-bold text-[13px] rounded transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Email preferences */}
      <div className="bg-white border border-[#E8E8E4] rounded-xl p-5">
        <h3 className="text-[15px] font-extrabold text-[#1A1816] tracking-tight">Email notifications</h3>
        <p className="text-[12.5px] text-[#737370] mt-1">Decide which community events also send you an email. In-app notifications stay on regardless.</p>

        <div className="mt-4 space-y-2.5">
          <EmailToggle
            label="Replies"
            blurb="Someone replies to your post or comment."
            checked={emailReplies}
            onChange={setEmailReplies}
          />
          <EmailToggle
            label="@mentions"
            blurb="Someone tags your handle in a comment."
            checked={emailMentions}
            onChange={setEmailMentions}
          />
          <EmailToggle
            label="Verification updates"
            blurb="A moderator approves or rejects your verification."
            checked={emailVerificationStatus}
            onChange={setEmailVerificationStatus}
          />
        </div>
      </div>

      {/* Privacy callout */}
      <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-[#0F6E56] shrink-0 mt-0.5" strokeWidth={2.25} />
        <div className="text-[12.5px] text-[#444441] leading-relaxed">
          <strong className="text-[#1A1816]">Your account and community profile are kept separate.</strong>{' '}
          We never expose the link between your DeelMap login and your community handle in any public response.
        </div>
      </div>

      {/* Verification link */}
      <Link
        href="/community/verify"
        className="bg-white border border-[#E8E8E4] rounded-xl p-4 flex items-center gap-3 hover:border-[#D1D1CE] transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-[#0F6E56] text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-[#1A1816]">Verification</div>
          <div className="text-[12.5px] text-[#737370]">
            {profile.role_badge ? `Verified as ${cap(profile.role_badge)}` : 'Submit credentials to earn a role badge'}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#A8A8A4]" />
      </Link>
    </div>
  )
}

// ──────────────────────────── Guest/Empty ────────────────────────────

function GuestPrompt() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
      <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden max-w-2xl mx-auto">
        <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
            <UserIcon className="w-6 h-6" strokeWidth={2} />
          </div>
          <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
            Sign in to view your profile
          </h2>
          <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
            Your community handle, equity, post history, and subscriptions live here.
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
    </div>
  )
}

function NeedProfilePrompt({ onPick }) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
      <div className="bg-white border border-[#E8E8E4] rounded-xl overflow-hidden max-w-2xl mx-auto">
        <div className="p-8 md:p-10 text-center bg-linear-to-b from-[#FFFBFB] to-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#FEF0EF] text-[#D03839] mb-4">
            <UserIcon className="w-6 h-6" strokeWidth={2} />
          </div>
          <h2 className="text-[20px] md:text-[22px] font-extrabold text-[#1A1816] tracking-tight">
            Pick a handle to get started
          </h2>
          <p className="text-[13.5px] text-[#737370] mt-2 max-w-md mx-auto leading-relaxed">
            Anonymous or your real name — your call. Your community handle is separate from your DeelMap account.
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
    </div>
  )
}

function EmailToggle({ label, blurb, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E8E4] hover:border-[#D1D1CE] cursor-pointer transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-[#1A1816]">{label}</div>
        <div className="text-[12px] text-[#737370] leading-snug mt-0.5">{blurb}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-[#D03839]' : 'bg-[#D1D1CE]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }
