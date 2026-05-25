import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

const MAX_SIZE = 8 * 1024 * 1024  // 8 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// POST multipart/form-data { file, scope?: 'post'|'avatar'|'verification' }
//   • scope=post|avatar → bucket 'community-uploads' (public-read)
//   • scope=verification → bucket 'community-verifications' (private)
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let form
  try { form = await request.formData() } catch { return badRequest('Expected multipart/form-data.') }

  const file = form.get('file')
  const scope = String(form.get('scope') || 'post')
  if (!file || typeof file === 'string') return badRequest('file is required.')
  if (file.size > MAX_SIZE) return badRequest('File exceeds 8 MB.')
  if (!ALLOWED.has(file.type)) return badRequest('Only JPEG, PNG, WebP, or GIF allowed.')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile && scope !== 'avatar') return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const bucket = scope === 'verification' ? 'community-verifications' : 'community-uploads'
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().slice(0, 8)
  const key = `${profile?.id || userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage.from(bucket).upload(key, buf, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return serverError(error.message)

  if (scope === 'verification') {
    // Private bucket — return signed URL (1 hour) so the uploader can preview
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(key, 3600)
    return NextResponse.json({ key, url: signed?.signedUrl || null, bucket })
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key)
  return NextResponse.json({ key, url: pub.publicUrl, bucket })
}
