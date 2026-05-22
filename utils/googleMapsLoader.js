// Shared Google Maps API loader to prevent multiple loads
let mapsApiLoadPromise = null

export const loadGoogleMapsAPI = () => {
  if (typeof window === 'undefined') return Promise.resolve()

  // Already loaded
  if (window.google?.maps?.places) return Promise.resolve()

  // Already loading — return the same promise
  if (mapsApiLoadPromise) return mapsApiLoadPromise

  mapsApiLoadPromise = new Promise((resolve, reject) => {
    // Script already in DOM (e.g. another component added it)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      if (window.google?.maps?.places) {
        resolve()
        return
      }
      existingScript.addEventListener('load', resolve)
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps API')))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Google Maps API'))
    document.head.appendChild(script)
  })

  return mapsApiLoadPromise
}
