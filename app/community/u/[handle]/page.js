import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/community/auth'
import { ProfileClient } from './ProfileClient'

export const revalidate = 300

const SITE = 'https://deelmap.com'

async function getProfileMeta(handle) {
  const h = typeof handle === 'string' ? handle.trim() : ''
  if (!h) return null
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('community_profiles')
    .select('handle, display_name, bio, role_badge, equity_score, is_shadowbanned')
    .ilike('handle', h)
    .maybeSingle()
  if (!data || data.is_shadowbanned) return null
  return data
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : '' }

export async function generateMetadata({ params }) {
  const { handle } = await params
  const profile = await getProfileMeta(handle)
  if (!profile) return { title: 'Member not found | DeelMap Community' }

  const role = profile.role_badge ? `Verified ${cap(profile.role_badge)}` : 'Member'
  const title = `@${profile.handle}${profile.display_name ? ` (${profile.display_name})` : ''} | DeelMap Community`
  const description =
    profile.bio?.trim() ||
    `${role} on the DeelMap wholesale community — see their posts, replies, and Equity.`
  const url = `${SITE}/community/u/${profile.handle}`

  return {
    title,
    description,
    metadataBase: new URL(SITE),
    openGraph: { title, description, url, siteName: 'DeelMap', type: 'profile', locale: 'en_US' },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: url },
  }
}

function buildJsonLd(profile) {
  const url = `${SITE}/community/u/${profile.handle}`
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.display_name || `@${profile.handle}`,
      alternateName: `@${profile.handle}`,
      ...(profile.bio ? { description: profile.bio } : {}),
      url,
    },
  }
}

export default async function ProfilePage({ params }) {
  const { handle } = await params
  const profile = await getProfileMeta(handle)
  if (!profile) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(profile)) }}
      />
      <ProfileClient handle={handle} />
    </>
  )
}
