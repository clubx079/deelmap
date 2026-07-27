import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emailSignals } from '../lib/starBuyer.js'

// These cover the deterministic pre-filter only (no network / no LLM).

test('custom business domain → strong', () => {
  const s = emailSignals('deals@bludoor.com', 'Rashid Algaradi')
  assert.equal(s.customDomain, true)
  assert.equal(s.signal, 'strong')
})

test('investor-org domain → strong', () => {
  const s = emailSignals('nicolae@ciobanuinvestmentsgroup.org', 'Nicolae Ciobanu')
  assert.equal(s.customDomain, true)
  assert.equal(s.signal, 'strong')
})

test('free domain but business wording in local part → medium', () => {
  const s = emailSignals('wgainvestmentsllc@gmail.com', 'Wilker Henrique')
  assert.equal(s.customDomain, false)
  assert.equal(s.keywordHit, true)
  assert.equal(s.signal, 'medium')
})

test('business wording in display name only → medium', () => {
  const s = emailSignals('john@gmail.com', 'John Doe Capital Group')
  assert.equal(s.signal, 'medium')
})

test('plain personal free-domain emails → none', () => {
  assert.equal(emailSignals('omarsap6@gmail.com', 'Omar SAP').signal, 'none')
  assert.equal(emailSignals('princewillc46@gmail.com', 'Princewill Chinedu').signal, 'none')
})

test('legal-entity suffix in local part → medium', () => {
  assert.equal(emailSignals('summitholdingsllc@gmail.com', 'Sam Summit').signal, 'medium')
})

test('empty / malformed input does not throw and is none', () => {
  assert.equal(emailSignals('', '').signal, 'none')
  assert.equal(emailSignals('notanemail', '').signal, 'none')
})
