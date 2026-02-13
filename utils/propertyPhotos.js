export const getPreferredPhotoUrl = (photo) => {
  if (!photo) return ''
  return photo.optimized_url || photo.photo_url || photo.original_url || ''
}

export const getPrimaryPhotoUrl = (photos) => {
  if (!Array.isArray(photos) || photos.length === 0) return ''
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

