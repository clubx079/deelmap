// lib/specialLink.js
// Utility functions for handling special UTM links (u=sl)

/**
 * Check if the current URL has a special link parameter
 * @returns {boolean} True if u=sl parameter is present
 */
export function isSpecialLink() {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('u') === 'sl'
}

/**
 * Get the UTM code from URL parameters
 * @returns {string|null} The UTM code or null
 */
export function getUTMCode() {
  if (typeof window === 'undefined') return null
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('u') || null
}

/**
 * Check if user should have limited access
 * Special link users (non-logged-in with u=sl) get:
 * - Access to the property page
 * - No marketplace access
 * - No inspection report requests
 * - Only first 10 photos
 * - "Join DeelMap" prompts for restricted features
 *
 * @param {boolean} isLoggedIn - Whether user is authenticated
 * @param {boolean} isSpecialLink - Whether viewing via special link
 * @returns {object} Access permissions
 */
export function getUserAccessLevel(isLoggedIn, isSpecialLinkParam = null) {
  const specialLink = isSpecialLinkParam !== null ? isSpecialLinkParam : isSpecialLink()

  return {
    // Basic property viewing
    canViewProperty: isLoggedIn || specialLink,
    canViewMarketplace: isLoggedIn,

    // Interactive features
    canRequestInspection: isLoggedIn,
    canSubmitInquiry: isLoggedIn,
    canViewAllPhotos: isLoggedIn,

    // Limits for special link users
    photoLimit: specialLink && !isLoggedIn ? 10 : null,

    // Auth prompts
    showJoinPrompt: !isLoggedIn,
    isSpecialLinkUser: specialLink && !isLoggedIn
  }
}

/**
 * Get the appropriate message for restricted features
 * @param {string} feature - The feature being restricted
 * @returns {object} Message configuration
 */
export function getRestrictedFeatureMessage(feature) {
  const messages = {
    inspection: {
      title: 'Join DeelMap to Request Inspection Reports',
      description: 'Create a free account to request and access detailed inspection reports for properties.',
      ctaText: 'Join DeelMap For Free'
    },
    morePhotos: {
      title: 'Join DeelMap to View All Photos',
      description: 'Sign up for free to access the complete photo gallery and additional property images.',
      ctaText: 'Join DeelMap For Free'
    },
    marketplace: {
      title: 'Join DeelMap to Browse All Properties',
      description: 'Create a free account to explore our full marketplace of investment properties.',
      ctaText: 'Join DeelMap For Free'
    },
    inquiry: {
      title: 'Join DeelMap to Inquire About Properties',
      description: 'Sign up for free to send inquiries and connect with our team about properties.',
      ctaText: 'Join DeelMap For Free'
    }
  }

  return messages[feature] || {
    title: 'Join DeelMap For Full Access',
    description: 'Create a free account to unlock all features.',
    ctaText: 'Join DeelMap For Free'
  }
}
