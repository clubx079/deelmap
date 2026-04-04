// Shared Google Maps API loader to prevent multiple loads
let mapsApiLoaded = false
let mapsApiLoading = false
let mapsApiLoadPromise = null

export const loadGoogleMapsAPI = () => {
  // If already loaded and Map constructor available, return resolved promise
  if (window.google?.maps?.Map) {
    return Promise.resolve()
  }

  // If currently loading, return the existing promise
  if (mapsApiLoading && mapsApiLoadPromise) {
    return mapsApiLoadPromise
  }

  // If already loaded but Map constructor not available yet, wait a bit
  if (mapsApiLoaded) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve()
      }, 5000)
    })
  }

  // Start loading
  mapsApiLoading = true
  mapsApiLoadPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Script exists, wait for it to load
      existingScript.addEventListener('load', () => {
        mapsApiLoaded = true
        mapsApiLoading = false
        resolve()
      })
      existingScript.addEventListener('error', () => {
        mapsApiLoading = false
        reject(new Error('Failed to load Google Maps API'))
      })
      return
    }

    // Create new script with callback for async loading
    const callbackName = '__googleMapsCallback_' + Date.now()
    window[callbackName] = () => {
      delete window[callbackName]
      mapsApiLoaded = true
      mapsApiLoading = false
      resolve()
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places&loading=async&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      delete window[callbackName]
      mapsApiLoading = false
      reject(new Error('Failed to load Google Maps API'))
    }
    document.head.appendChild(script)
  })

  return mapsApiLoadPromise
}
