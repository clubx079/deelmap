import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/community/getPost'
import { PostDetailClient } from './PostDetailClient'

export const revalidate = 60

const SITE = 'https://deelmap.com'

function excerpt(text, n = 155) {
  if (!text) return ''
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1).trimEnd()}…` : clean
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const result = await getPostBySlug(slug)
  if (!result) return { title: 'Discussion not found | DeelMap Community' }
  const post = result.post

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

function buildBreadcrumb(post) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Community', item: `${SITE}/community` },
  ]
  if (post.lot?.slug) items.push({ '@type': 'ListItem', position: 2, name: post.lot.name, item: `${SITE}/community/${post.lot.slug}` })
  items.push({ '@type': 'ListItem', position: items.length + 1, name: post.title, item: `${SITE}/community/p/${post.slug}` })
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }
}

export default async function PostPage({ params }) {
  const { slug } = await params
  const result = await getPostBySlug(slug)
  if (!result) notFound()

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(result.post)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumb(result.post)) }} />
      <PostDetailClient slug={slug} initialData={result} />
    </>
  )
}
