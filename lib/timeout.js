/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 25000ms / 25 seconds)
 * @param {string} errorMessage - Custom error message
 * @returns {Promise} Promise that rejects if timeout is reached
 */
export function withTimeout(promise, timeoutMs = 25000, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ])
}

/**
 * Safely executes an async function with error handling
 * Useful for fire-and-forget operations that shouldn't crash the main flow
 * @param {Function} asyncFn - Async function to execute
 * @param {string} context - Context for logging
 */
export async function safeAsync(asyncFn, context = 'Operation') {
  try {
    await asyncFn()
  } catch (error) {
    console.error(`[${context}] Non-critical error:`, error.message)
    // Don't throw - this is intentionally swallowed for fire-and-forget operations
  }
}

/**
 * Executes a fire-and-forget promise without blocking
 * Ensures errors don't crash the process
 * @param {Promise} promise - Promise to execute
 * @param {string} context - Context for logging
 */
export function fireAndForget(promise, context = 'Background task') {
  promise.catch(error => {
    console.error(`[${context}] Background task failed:`, error.message)
  })
}
