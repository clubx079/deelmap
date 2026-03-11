/**
 * Canonical Property Shape Mappers
 * 
 * These functions normalize properties from different sources
 * (wholesale_deals and manual properties) into a single canonical shape
 * that can be used consistently throughout the buyer portal.
 */

/**
 * Normalize a wholesale deal (scraped) into canonical shape
 * @param {Object} deal - Row from wholesale_deals table
 * @returns {Object} Canonical property shape
 */
export function normalizeWholesaleDeal(deal) {
  if (!deal) return null;

  return {
    id: deal.id,
    slug: deal.slug || null,
    source: 'scraped',
    
    // Address fields
    address: deal.address || '',
    full_address: deal.full_address || deal.address || '',
    city: deal.city || '',
    state: deal.state || '',
    zip_code: deal.zip_code || '',
    
    // Coordinates for map
    address_google_lat: deal.address_google_lat || null,
    address_google_lng: deal.address_google_lng || null,
    latitude: deal.address_google_lat || null,
    longitude: deal.address_google_lng || null,
    
    // Core property details
    price: deal.price || 0,
    bedrooms: deal.bedrooms || 0,
    bathrooms: deal.bathrooms || 0,
    sqft: deal.sqft || 0,
    floor_area: deal.sqft || 0,
    property_type: deal.property_type || 'Unknown',
    status: deal.status || 'available',
    
    // Investment metrics (scraped deals often have these)
    gross_yield: deal.gross_yield || null,
    cap_rate: deal.cap_rate || null,
    cash_on_cash: deal.cash_on_cash || null,
    price_per_square_foot: deal.price_per_square_foot || null,
    year_built: deal.year_built || null,
    
    // Additional fields
    description: deal.description || null,
    lot_size: deal.lot_size || null,
    
    // Timestamps
    created_at: deal.created_at,
    updated_at: deal.updated_at,
    
    // Photos - already in correct format
    property_photos: Array.isArray(deal.property_photos) 
      ? deal.property_photos.map(photo => ({
          id: photo.id,
          photo_url: photo.photo_url || photo.original_url,
          optimized_url: photo.optimized_url || null,
          original_url: photo.original_url || photo.photo_url,
          display_order: photo.display_order || 0,
          is_featured: photo.is_featured || false
        }))
      : [],
    
    // Contact/seller info
    temp_seller_id: deal.temp_seller_id || null,
    seller_id: null,
    
    // Estimated rent for calculations
    estimated_rent: deal.estimated_rent || null,
    purchase_price: deal.purchase_price || deal.price || null
  };
}

/**
 * Normalize a manual property (seller-created) into canonical shape
 * @param {Object} property - Row from properties table
 * @param {Array} property_images - Array from property_images table
 * @returns {Object} Canonical property shape
 */
export function normalizeManualProperty(property, property_images = []) {
  if (!property) return null;

  return {
    id: property.id,
    slug: property.slug || null,
    source: 'manual',
    
    // Address fields - manual properties use 'address' for full address
    address: property.address || '',
    full_address: property.address || '',
    city: property.city || '',
    state: property.state || '',
    zip_code: property.zip_code || property.postal_code || '',
    
    // Coordinates for map - manual uses latitude/longitude
    address_google_lat: property.latitude || null,
    address_google_lng: property.longitude || null,
    latitude: property.latitude || null,
    longitude: property.longitude || null,
    
    // Core property details - map floor_area to sqft
    price: property.price || 0,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    sqft: property.floor_area || 0,
    floor_area: property.floor_area || 0,
    property_type: property.property_type || 'Unknown',
    status: property.status || property.property_status || 'available',
    
    // Investment metrics - manual properties may not have these
    gross_yield: property.gross_yield || null,
    cap_rate: property.cap_rate || null,
    cash_on_cash: property.cash_on_cash || null,
    price_per_square_foot: property.price_per_square_foot || 
      (property.price && property.floor_area ? property.price / property.floor_area : null),
    year_built: property.year_built || null,
    
    // Additional fields
    description: property.description || null,
    lot_size: property.lot_size || null,
    
    // Timestamps
    created_at: property.created_at,
    updated_at: property.updated_at,
    
    // Photos - map property_images to property_photos format
    property_photos: Array.isArray(property_images)
      ? property_images
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(img => ({
            id: img.id,
            photo_url: img.image_url,
            optimized_url: null,
            original_url: img.image_url,
            display_order: img.sort_order || 0,
            image_key: img.image_key
          }))
      : [],
    
    // Contact/seller info - manual has seller_id
    temp_seller_id: null,
    seller_id: property.seller_id || null,
    
    // Estimated rent
    estimated_rent: property.estimated_rent || property.monthly_rent || null,
    purchase_price: property.purchase_price || property.price || null
  };
}

/**
 * Merge and sort properties from both sources
 * @param {Array} wholesaleDeals - Normalized wholesale deals
 * @param {Array} manualProperties - Normalized manual properties
 * @param {String} sortBy - Sort order: 'newest', 'price-low', 'price-high'
 * @returns {Array} Merged and sorted properties
 */
export function mergeAndSortProperties(wholesaleDeals = [], manualProperties = [], sortBy = 'newest') {
  const allProperties = [...wholesaleDeals, ...manualProperties];
  
  // Sort based on sortBy parameter
  switch (sortBy) {
    case 'price-low':
      return allProperties.sort((a, b) => (a.price || 0) - (b.price || 0));
    
    case 'price-high':
      return allProperties.sort((a, b) => (b.price || 0) - (a.price || 0));
    
    case 'newest':
    default:
      return allProperties.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA; // Newest first
      });
  }
}

/**
 * Check if a property matches search query
 * @param {Object} property - Canonical property object
 * @param {String} searchQuery - Search term
 * @returns {Boolean} Whether property matches search
 */
export function matchesSearch(property, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return true;
  
  const query = searchQuery.toLowerCase().trim();
  const searchableFields = [
    property.address,
    property.full_address,
    property.city,
    property.state,
    property.zip_code
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Handle comma-separated searches (e.g., "Lexington, KY")
  if (query.includes(',')) {
    const parts = query.split(',').map(p => p.trim()).filter(p => p);
    return parts.every(part => searchableFields.includes(part));
  }
  
  return searchableFields.includes(query);
}
