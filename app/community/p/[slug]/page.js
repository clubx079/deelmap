import { notFound } from 'next/navigation'
import { getServiceClient } from '@/lib/community/auth'
import { PostDetailClient } from './PostDetailClient'

export const revalidate = 60

const SITE = 'https://deelmap.com'

// Light server fetch — just what metadata + JSON-LD need (not the full comment tree).
async function getPostMeta(slug) {
  const s = typeof slug === 'string' ? slug.trim() : ''
  if (!s) return null
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('community_posts')
    .select(`
      id, slug, title, body, score, comment_count, created_at, updated_at, is_removed,
      author:community_profiles!community_posts_author_id_fkey(handle, display_name, role_badge),
      lot:community_lots!community_posts_lot_id_fkey(slug, name)
    `)
    .eq('slug', s)
    .maybeSingle()
  if (!data || data.is_removed) return null
  return data
}

function excerpt(text, n = 155) {
  if (!text) return ''
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1).trimEnd()}…` : clean
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPostMeta(slug)
  if (!post) return { title: 'Discussion not found | DeelMap Community' }

  const title = `${post.title} | DeelMap Community`
  const description =
    excerpt(post.body) ||
    `${post.lot?.name ? `${post.lot.name} — ` : ''}A wholesale real-estate discussion on the DeelMap community. Join the conversation.`
  const url = `${SITE}/community/p/${post.slug}`

  return {
    title,
    description,
    metadataBase: new URL(SITE),
    openGraph: { title, description, url, siteName: 'DeelMap', type: 'article', locale: 'en_US' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  }
}

function buildJsonLd(post) {
  const url = `${SITE}/community/p/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title,
    articleBody: post.body || '',
    url,
    mainEntityOfPage: url,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: { '@type': 'Person', name: `@${post.author?.handle || 'member'}` },
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: Math.max(0, post.score || 0) },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.comment_count || 0 },
    ],
    ...(post.lot?.name ? { articleSection: post.lot.name } : {}),
  }
}

export default async function PostPage({ params }) {
  const { slug } = await params
  const post = await getPostMeta(slug)
  if (!post) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)) }}
      />
      <PostDetailClient slug={slug} />
    </>
  )
}
