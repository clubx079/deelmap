'use client'

import { ArrowBigUp, ArrowBigDown } from 'lucide-react'

export function VoteRail({ score, userVote = 0, onVote, orientation = 'vertical', compact = false }) {
  const cls = orientation === 'vertical'
    ? 'flex flex-col items-center py-3 gap-0.5 bg-[#FAFAF8] border-r border-[#E8E8E4]'
    : 'flex items-center gap-1 px-2 py-1 bg-[#FAFAF8] border border-[#E8E8E4] rounded'

  const btn = (active, color) =>
    `w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white ${
      active ? color : `text-[#A8A8A4] hover:${color}`
    }`

  return (
    <div className={cls}>
      <button
        onClick={() => onVote?.(userVote === 1 ? 0 : 1)}
        className={btn(userVote === 1, 'text-[#D03839]')}
        title="Back (upvote)"
        aria-pressed={userVote === 1}
      >
        <ArrowBigUp className="w-5 h-5" strokeWidth={2} fill={userVote === 1 ? 'currentColor' : 'none'} />
      </button>
      <div className={`font-extrabold tabular-nums text-[#1A1816] ${compact ? 'text-[12px]' : 'text-[14px]'}`}>
        {score}
      </div>
      {!compact && (
        <div className="text-[9px] font-bold tracking-widest text-[#A8A8A4] uppercase">net</div>
      )}
      <button
        onClick={() => onVote?.(userVote === -1 ? 0 : -1)}
        className={btn(userVote === -1, 'text-[#444441]')}
        title="Pass (downvote)"
        aria-pressed={userVote === -1}
      >
        <ArrowBigDown className="w-5 h-5" strokeWidth={2} fill={userVote === -1 ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
