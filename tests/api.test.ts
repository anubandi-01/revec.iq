import test from 'node:test'
import assert from 'node:assert/strict'
import analyze from '../netlify/functions/analyze.mts'

test('analysis endpoint rejects non-POST requests without invoking the provider', async () => {
  const response = await analyze(new Request('https://revec.example/.netlify/functions/analyze'))
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('Allow'), 'POST')
})

test('analysis endpoint validates empty feedback before invoking the provider', async () => {
  const response = await analyze(new Request('https://revec.example/.netlify/functions/analyze', { method: 'POST', body: JSON.stringify({ reviews: [], name: 'Test', synthetic: false }) }))
  assert.equal(response.status, 400)
  const data = await response.json()
  assert.match(data.error, /at least one review/)
})

test('analysis endpoint returns a safe validation error for malformed JSON', async () => {
  const response = await analyze(new Request('https://revec.example/.netlify/functions/analyze', { method: 'POST', body: 'not json' }))
  assert.equal(response.status, 400)
})

test('analysis endpoint requires an explicit provenance flag', async () => {
  const response = await analyze(new Request('https://revec.example/.netlify/functions/analyze', { method: 'POST', body: JSON.stringify({ reviews: [{ review_id: '1', review_text: 'Great product' }], name: 'Test' }) }))
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /provenance/)
})
