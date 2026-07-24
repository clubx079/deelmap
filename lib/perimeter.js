import { isPublicApiPath } from './apiPublicPaths.js'

// Pure perimeter decision. `verify` is an async fn(token)->{userId}|null so this
// stays testable without Edge crypto. Returns what the middleware should do.
export async function decidePerimeter(pathname, token, verify, inboundUserId = null) {
  const isPublic = isPublicApiPath(pathname)
  const session = token ? await verify(token) : null

  if (!isPublic && !session) {
    return { status: 401, injectUserId: null, stripInbound: !!inboundUserId }
  }
  return {
    status: 200,
    injectUserId: session?.userId || null,
    stripInbound: !!inboundUserId,
  }
}
