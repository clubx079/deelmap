export const getPreferredPhotoUrl = (photo) => {
  if (!photo) return ''
  return photo.optimized_url || photo.photo_url || ''
}

// Next.js image-optimizer allowed widths (deviceSizes ∪ imageSizes from next.config.mjs).
const NEXT_IMAGE_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]
const nearestNextWidth = (w) => NEXT_IMAGE_WIDTHS.find((x) => x >= w) || 3840

/**
 * Returns a display-optimized thumbnail URL for fast loading (client-side only).
 *
 * Photos live in a PRIVATE Backblaze B2 bucket and are served via a signing
 * endpoint at `cloudfare.apps.airosofts.com/api/img/<key>`. That host is NOT
 * reachable directly from public browsers, so we route B2 images through THIS
 * app's own Next.js image optimizer (`/_next/image`) — it runs server-side (which
 * can reach the signing host), resizes, and caches. This is the same path the
 * marketplace cards already use via next/image, which is why cards render while
 * raw <img> tags pointed straight at the signing host do not.
 */
export const getThumbnailUrl = (photo, width = 150) => {
  const url = getPreferredPhotoUrl(photo)
  if (!url) return ''
  // Legacy Supabase storage transform.
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    return url.replace(
      '/storage/v1/object/public/',
      `/storage/v1/render/image/public/`
    ) + `?width=${width}&resize=contain`
  }
  // Private B2 signing endpoint → proxy through our own optimizer so the browser
  // never has to reach the signing host directly.
  if (url.includes('/api/img/')) {
    return `/_next/image?url=${encodeURIComponent(url)}&w=${nearestNextWidth(width)}&q=75`
  }
  return url
}

export const getPrimaryPhotoUrl = (photos) => {
  if (!Array.isArray(photos) || photos.length === 0) return ''
  // Prioritize the featured photo as the thumbnail
  const featured = photos.find(p => p?.is_featured)
  if (featured) {
    const url = getPreferredPhotoUrl(featured)
    if (url) return url
  }
  // Fallback to first photo by display_order
  const sorted = [...photos].sort((a, b) => {
    const aOrder = Number.isFinite(a?.display_order) ? a.display_order : 0
    const bOrder = Number.isFinite(b?.display_order) ? b.display_order : 0
    return aOrder - bOrder
  })
  for (const photo of sorted) {
    const url = getPreferredPhotoUrl(photo)
    if (url) return url
  }
  return ''
}

