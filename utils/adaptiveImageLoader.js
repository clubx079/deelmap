// Adaptive image loading - skips quality tiers on fast connections
// Measures real throughput from image loads + uses navigator.connection as hint

let estimatedMbps = null
let sampleCount = 0

function getConnectionHint() {
  if (typeof navigator === 'undefined') return null
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return null
  // conn.downlink is in Mbps
  return conn.downlink || null
}

// Record an image load to refine our speed estimate
export function recordImageLoad(bytes, durationMs) {
  if (durationMs < 10 || bytes < 1000) return // ignore trivially small/fast loads
  const mbps = (bytes * 8) / (durationMs / 1000) / 1_000_000
  if (estimatedMbps === null) {
    estimatedMbps = mbps
  } else {
    // Weighted moving average (recent loads matter more)
    estimatedMbps = estimatedMbps * 0.4 + mbps * 0.6
  }
  sampleCount++
}

// Get estimated speed in Mbps
export function getEstimatedSpeed() {
  if (estimatedMbps !== null && sampleCount >= 1) return estimatedMbps
  const hint = getConnectionHint()
  if (hint) return hint
  return null // unknown
}

// Determine the starting tier index given a tiers array
// Fast connections skip low-res tiers, slow connections start from the beginning
export function getStartingTier(tiers) {
  const speed = getEstimatedSpeed()
  if (speed === null) return 0 // unknown speed, start from lowest

  // speed is in Mbps
  if (speed >= 15) {
    // Fast: skip to highest non-original tier
    // Find the index of the last numeric tier (before null/original)
    const lastNumeric = tiers.reduce((acc, t, i) => (t !== null ? i : acc), 0)
    return lastNumeric
  }
  if (speed >= 5) {
    // Medium: skip first 1-2 tiny tiers
    if (tiers.length <= 3) return 1
    return Math.min(2, tiers.length - 1)
  }
  // Slow: full progressive
  return 0
}
