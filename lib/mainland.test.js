import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OFF_MAINLAND, excludeOffMainland } from './mainland.js'

test('OFF_MAINLAND is exactly HI, AK, PR', () => {
  assert.deepEqual([...OFF_MAINLAND].sort(), ['AK', 'HI', 'PR'])
})

test('excludeOffMainland applies a not-in filter on state with quoted codes, chainably', () => {
  const calls = []
  const fakeQ = { not: (col, op, val) => { calls.push({ col, op, val }); return fakeQ } }
  const out = excludeOffMainland(fakeQ)
  assert.equal(out, fakeQ, 'must return the same query for chaining')
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { col: 'state', op: 'in', val: '("HI","AK","PR")' })
})
