import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL,
    process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  const userId = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData
  try { formData = await request.formData() } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP and GIF allowed' }, { status: 400 })

  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await sb().storage
    .from('forum-uploads')
    .upload(filename, Buffer.from(bytes), { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = sb().storage.from('forum-uploads').getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl })
}
