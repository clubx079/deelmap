'use client'

import Link from 'next/link'
import { ShieldCheck, ArrowRight, TrendingUp, Home as HomeIcon } from 'lucide-react'

const RULES = [
  { strong: 'Chosen handles.',          rest: ' Anonymous or real — your call. No doxxing, ever.' },
  { strong: 'Verify to pitch.',         rest: ' Offering capital, trades, or services? Get the badge first.' },
  { strong: '9-to-1 rule.',             rest: ' Nine community posts for every one self-promo. Mods enforce.' },
  { strong: 'Numbers or it didn\'t happen.', rest: ' Share comps, rates, contracts — vague flexes get removed.' },
  { strong: 'No off-platform routing.', rest: ' Deal-linked discussions stay on DeelMap.' },
]

export function RightSidebar({ profile, trending = [], activeDeals = [], nextTier = null, onStartVerify }) {
  return (
    <aside className="hidden lg:block sticky top-[68px] self-start">
      {profile ? <EquityCard profile={profile} nextTier={nextTier} /> : <JoinCard />}
      <VerifyCTA profile={profile} onStartVerify={onStartVerify} />
      <TrendingPanel items={trending} />
      <ActiveDealsPanel items={activeDeals} />
      <RulesPanel />
    </aside>
  )
}

function EquityCard({ profile, nextTier }) {
  const pct = nextTier && nextTier.min_equity > 0
    ? Math.min(100, Math.round((profile.equity_score / nextTier.min_equity) * 100))
    : 100
  const togo = nextTier ? Math.max(0, nextTier.min_equity - profile.equity_score) : 0
  return (
    <div className="bg-linear-to-br from-[#0F172A] to-[#1E293B] text-white border border-[#0F172A] rounded-lg p-4 mb-3.5">
      <div className="text-[12px] font-bold uppercase tracking-wider text-white/60 mb-3">Your Equity</div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[34px] font-extrabold leading-none tracking-tight">{(profile.equity_score || 0).toLocaleString()}</span>
      </div>
      <div className="text-[12.5px] text-white/60">
        @{profile.handle}{profile.role_badge ? ` · ${cap(profile.role_badge)}` : ''}
      </div>
      <div className="mt-3.5 h-[5px] bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-linear-to-r from-[#D03839] to-[#FB7185]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-[11.5px] text-white/60 flex justify-between">
        {nextTier
          ? <><span>Next tier: <strong className="text-white font-bold">{nextTier.name}</strong></span><span>{togo.toLocaleString()} to go</span></>
          : <span>Top tier reached.</span>
        }
      </div>
    </div>
  )
}

function JoinCard() {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg p-4 mb-3.5">
      <div className="text-[14px] font-bold text-[#1A1816] mb-1">Join the conversation</div>
      <div className="text-[12.5px] text-[#444441] leading-relaxed mb-3">
        Pick a handle to start posting, voting, and saving deal discussions.
      </div>
      <Link href="/community/new" className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#D03839] hover:bg-[#C73022] text-white rounded text-[12.5px] font-bold transition-colors">
        Get started <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>
    </div>
  )
}

function VerifyCTA({ profile }) {
  if (profile?.role_badge) return null
  return (
    <div className="bg-linear-to-br from-[#ECFDF5] to-white border border-[#BBF7D0] rounded-lg p-4 mb-3.5">
      <div className="w-9 h-9 bg-[#0F6E56] rounded flex items-center justify-center text-white mb-2.5">
        <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
      </div>
      <div className="text-[14px] font-bold text-[#1A1816] mb-1">Get a Verification Badge</div>
      <div className="text-[12.5px] text-[#444441] leading-relaxed mb-3">
        Verify your role (Lender, Contractor, Agent, or Principal) to unlock DMs, post in restricted Lots, and earn 3× Equity on replies.
      </div>
      <Link
        href="/community/verify"
        className="inline-flex items-center gap-1 px-3.5 py-2 bg-[#0F6E56] hover:bg-[#0A5740] text-white rounded text-[12.5px] font-bold transition-colors"
      >
        Start Verification <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>
    </div>
  )
}

function TrendingPanel({ items }) {
  if (!items.length) return null
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg mb-3.5">
      <div className="px-4 pt-3.5 pb-2.5 flex justify-between items-center">
        <div className="text-[12px] font-bold uppercase tracking-wider text-[#1A1816] flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          Trending in Lots
        </div>
      </div>
      <div className="px-4 pb-3">
        {items.map((item, i) => (
          <Link
            key={item.slug}
            href={`/community/p/${item.slug}`}
            className="flex gap-2.5 py-2.5 border-b border-[#F3F3EF] last:border-b-0 hover:bg-[#FAFAF8] -mx-2 px-2 rounded transition-colors"
          >
            <span className="font-extrabold text-[17px] text-[#D03839] leading-tight min-w-[20px]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[#A8A8A4] font-bold mb-0.5">{item.lot_name}</div>
              <div className="text-[13px] font-semibold text-[#1A1816] leading-snug mb-1">{item.title}</div>
              <div className="text-[11px] text-[#737370] font-medium">{item.comment_count} comments</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ActiveDealsPanel({ items }) {
  if (!items.length) return null
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg mb-3.5">
      <div className="px-4 pt-3.5 pb-2.5 flex justify-between items-center">
        <div className="text-[12px] font-bold uppercase tracking-wider text-[#1A1816]">◆ Active Deal Discussions</div>
      </div>
      <div className="px-4 pb-3">
        {items.map((d) => (
          <Link
            key={d.post_slug}
            href={`/community/p/${d.post_slug}`}
            className="py-3 border-b border-[#F3F3EF] last:border-b-0 flex gap-2.5 hover:bg-[#FAFAF8] -mx-2 px-2 rounded transition-colors"
          >
            <div className="w-11 h-11 rounded bg-[#FAFAF8] border border-[#E8E8E4] flex items-center justify-center text-[#A8A8A4] flex-shrink-0">
              <HomeIcon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#1A1816] truncate">{d.address}</div>
              <div className="text-[11.5px] text-[#737370] font-medium mt-0.5">{d.stats}</div>
              <div className="inline-flex items-center gap-1 text-[11px] text-[#0F6E56] font-bold mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
                {d.live} in thread
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RulesPanel() {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded-lg">
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-[#1A1816]">Community Rules</div>
      </div>
      <ul className="px-4 pb-3">
        {RULES.map((rule, i) => (
          <li key={i} className="py-2.5 text-[13px] text-[#444441] leading-snug grid grid-cols-[20px_1fr] gap-1.5 border-b border-[#F3F3EF] last:border-b-0">
            <span className="font-extrabold text-[#D03839]">{i + 1}.</span>
            <span>
              <strong className="text-[#1A1816] font-bold">{rule.strong}</strong>
              {rule.rest}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }
