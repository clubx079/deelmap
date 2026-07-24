import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidePerimeter } from '../lib/perimeter.js'

const good = 'valid'   // stand-in: verify fn returns userId for this token

test('gated path, no session -> 401', async () => {
  const r = await decidePerimeter('/api/buyer/offers', null, async () => null)
  assert.equal(r.status, 401)
})

test('gated path, valid session -> allow + inject verified id, strip inbound', async () => {
  const r = await decidePerimeter('/api/buyer/offers', good, async () => ({ userId: 'u1' }), 'attacker-id')
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, 'u1')       // trusted id from cookie
  assert.equal(r.stripInbound, true)       // attacker-supplied header removed
})

test('public path, no session -> allow, no injected id', async () => {
  const r = await decidePerimeter('/api/properties', null, async () => null)
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, null)
})

test('public path, valid session -> allow + inject id (community writes need it)', async () => {
  const r = await decidePerimeter('/api/community/posts', good, async () => ({ userId: 'u9' }))
  assert.equal(r.status, 200)
  assert.equal(r.injectUserId, 'u9')
})
