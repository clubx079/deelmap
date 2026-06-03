import crypto from 'crypto'

// Signed, DeelMap-branded download links for executed contracts. The token makes
// the link unguessable so a bare submission id can't be enumerated.
const SECRET = process.env.CONTRACT_DOWNLOAD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'deelmap-download'

export function signDownload(id) {
  return crypto.createHmac('sha256', SECRET).update(`contract:${id}`).digest('hex').slice(0, 32)
}

export function contractDownloadUrl(appUrl, id) {
  const base = (appUrl || 'https://deelmap.com').replace(/\/+$/, '')
  return `${base}/api/contracts/download?id=${encodeURIComponent(id)}&t=${signDownload(id)}`
}
