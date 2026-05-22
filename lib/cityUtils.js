// City slug format: {city-kebab}-{state-lower}  e.g. "lexington-ky", "new-york-ny"

export function toCitySlug(city, state) {
  if (!city || !state) return null
  return `${city.trim().toLowerCase().replace(/\s+/g, '-')}-${state.trim().toLowerCase()}`
}

export function parseCitySlug(slug) {
  if (!slug) return null
  const parts = slug.split('-')
  if (parts.length < 2) return null
  const stateAbbr = parts[parts.length - 1].toUpperCase()
  const cityName = parts
    .slice(0, -1)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return { city: cityName, state: stateAbbr }
}

export const TYPE_MAP = {
  wholesale: {
    label: 'Wholesale',
    description: 'off-market wholesale',
    filter: { listingType: 'wholesale' },
  },
  auction: {
    label: 'Auction',
    description: 'auction',
    filter: { listingType: 'auction' },
  },
  'single-family': {
    label: 'Single Family',
    description: 'single family',
    filter: { propertyTypes: ['Single Family', 'Single-Family'] },
  },
  'multi-family': {
    label: 'Multi-Family',
    description: 'multi-family',
    filter: { propertyTypes: ['Multi-Family', 'Multi Family', 'Multifamily'] },
  },
  land: {
    label: 'Land',
    description: 'land',
    filter: { propertyTypes: ['Land'] },
  },
}
