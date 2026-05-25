import { ShieldCheck } from 'lucide-react'

const ROLE_STYLES = {
  principal:  { bg: '#1A1816', label: 'Principal' },
  lender:     { bg: '#0F6E56', label: 'Lender · NMLS' },
  contractor: { bg: '#B5620A', label: 'Contractor · Licensed' },
  agent:      { bg: '#D03839', label: 'Agent · Licensed' },
  wholesaler: { bg: '#5B21B6', label: 'Wholesaler' },
}

export function VerifyBadge({ kind, size = 'sm' }) {
  const r = ROLE_STYLES[kind]
  if (!r) return null
  const iconSize = size === 'lg' ? 12 : 10
  const padding = size === 'lg' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-[2px] text-[10px]'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold tracking-wide text-white ${padding}`}
      style={{ background: r.bg }}
      title={`Verified ${r.label} — credentials reviewed by DeelMap`}
    >
      <ShieldCheck width={iconSize} height={iconSize} strokeWidth={2.5} />
      Verified {r.label}
    </span>
  )
}
