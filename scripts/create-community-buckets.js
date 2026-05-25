// One-shot script: creates the two Supabase Storage buckets the community
// feature depends on. Idempotent — safe to re-run.
//
// Run from the deelmap/ project root:
//   node scripts/create-community-buckets.js
//
// Requires in .env.local (already used by API routes):
//   NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
//   MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY

const fs = require('fs')
const path = require('path')

// Minimal .env.local loader (avoids adding dotenv as a dep)
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  })
}

const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL
const key = process.env.MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('✗ Missing env: NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL or MARKETPLACE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const BUCKETS = [
  {
    name: 'community-uploads',
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    purpose: 'In-post image attachments + community avatars',
  },
  {
    name: 'community-verifications',
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    purpose: 'NMLS / license / COI / closed-assignment docs (signed URLs only)',
  },
]

async function ensureBucket(spec) {
  const { name, public: isPublic, fileSizeLimit, allowedMimeTypes, purpose } = spec
  const { data: existing } = await supabase.storage.getBucket(name)
  if (existing) {
    const tag = existing.public ? 'public' : 'private'
    console.log(`✓ ${name} already exists (${tag}) — leaving as-is`)
    return
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit,
    allowedMimeTypes,
  })
  if (error) {
    console.error(`✗ ${name}: ${error.message}`)
    process.exit(1)
  }
  console.log(`✓ ${name} created — ${isPublic ? 'PUBLIC' : 'PRIVATE'} · ${purpose}`)
}

;(async () => {
  console.log(`Connecting to ${url}…\n`)
  for (const b of BUCKETS) await ensureBucket(b)
  console.log('\nDone. Composer image uploads + verification doc uploads should now work.')
})().catch(err => {
  console.error(err)
  process.exit(1)
})
