// Conversations use numeric IDs, but the offers and notifications tables store
// the conversation as a synthetic UUID ("00000000-0000-0000-0000-<hex>").
// The inbox matches the ?conversation= URL param against the numeric id, so any
// link coming from an offer or a notification must convert the UUID back to the
// numeric id first. Recent-messages already uses the numeric id, which is why it
// worked while offers/notifications did not.
export function resolveInboxConversationId(value) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  const m = s.match(/^0{8}-0{4}-0{4}-0{4}-([0-9a-f]{12})$/i)
  if (m) return String(parseInt(m[1], 16)) // synthetic UUID -> numeric
  return s // already numeric (or some other id) -> pass through
}
