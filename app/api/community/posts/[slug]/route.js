import { NextResponse } from 'next/server'
import { getUserIdFromRequest, notFound } from '@/lib/community/auth'
import { getPostBySlug } from '@/lib/community/getPost'

// GET — single post with its comment tree (shared fetcher with the SSR page)
export async function GET(request, { params }) {
  const { slug } = await params
  const userId = getUserIdFromRequest(request)
  const result = await getPostBySlug(slug, userId)
  if (!result) return notFound('Post not found.')
  return NextResponse.json(result)
}
