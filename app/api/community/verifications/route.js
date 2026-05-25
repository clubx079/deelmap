import { NextResponse } from 'next/server'
import { getServiceClient, getUserIdFromRequest, unauthorized, badRequest, serverError } from '@/lib/community/auth'

const VALID_ROLES = ['lender', 'contractor', 'agent', 'principal', 'wholesaler']

// GET — current user's verification submissions
export async function GET(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  const { data: profile } = await supabase
    .from('community_profiles').select('id, role_badge').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ submissions: [], badge: null })

  const { data, error } = await supabase
    .from('community_verifications')
    .select('id, role, legal_name, credential_type, credential_number, jurisdiction, status, admin_notes, submitted_at, reviewed_at')
    .eq('profile_id', profile.id)
    .order('submitted_at', { ascending: false })
  if (error) return serverError(error.message)

  return NextResponse.json({ submissions: data || [], badge: profile.role_badge || null })
}

// POST — submit a new verification
export async function POST(request) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return unauthorized()
  const supabase = getServiceClient()

  let body
  try { body = await request.json() } catch { return badRequest('Invalid JSON.') }

  const role = String(body.role || '').toLowerCase()
  if (!VALID_ROLES.includes(role)) return badRequest('Invalid role.')
  const legalName = String(body.legal_name || '').trim()
  if (legalName.length < 2 || legalName.length > 120) return badRequest('Legal name required (2–120 chars).')

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'profile_required' }, { status: 409 })

  const { data, error } = await supabase
    .from('community_verifications')
    .insert({
      profile_id: profile.id,
      role,
      legal_name: legalName,
      credential_type: body.credential_type ? String(body.credential_type).slice(0, 60) : null,
      credential_number: body.credential_number ? String(body.credential_number).slice(0, 60) : null,
      jurisdiction: body.jurisdiction ? String(body.jurisdiction).slice(0, 60) : null,
      document_urls: Array.isArray(body.document_urls) ? body.document_urls.slice(0, 10) : null,
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
    })
    .select('id, status, submitted_at')
    .single()

  if (error) return serverError(error.message)
  return NextResponse.json({ submission: data })
}
