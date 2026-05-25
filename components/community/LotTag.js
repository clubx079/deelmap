import Link from 'next/link'

const STYLES = {
  real_estate: { bg: '#DBEAFE', fg: '#1E40AF' },
  lending:     { bg: '#DCFCE7', fg: '#0F6E56' },
  finance:     { bg: '#FEE2E2', fg: '#991B1B' },
  contractors: { bg: '#FEF3C7', fg: '#92400E' },
  markets:     { bg: '#EDE9FE', fg: '#5B21B6' },
  default:     { bg: '#F3F4F6', fg: '#374151' },
}

export function LotTag({ label, category = 'default', slug, asLink = true }) {
  const s = STYLES[category] || STYLES.default
  const inner = (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-[5px] h-[5px] rounded-full" style={{ background: 'currentColor' }} />
      {label}
    </span>
  )
  if (asLink && slug) {
    return <Link href={`/community?lot=${slug}`}>{inner}</Link>
  }
  return inner
}
