import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { demoAnalysis, keywordMetrics, manualReviews, normalizeModelResult, npsMetrics, sentimentTotals, themeMetrics, validateReviews } from '../src/lib/analysis.ts'
import type { AnalyzedReview, Review } from '../src/lib/analysis.ts'
import { analyzedCSV, parseCSV, toCSV } from '../src/lib/csv.ts'
import { summaryReport } from '../src/lib/report.ts'
import { containsSyntheticSamples, samples } from '../src/lib/samples.ts'

const sources: Review[] = [
  { review_id: 'original-1', review_text: 'Great quality and excellent support.', rating: 5, nps_score: 9 },
  { review_id: 'original-2', review_text: 'Delivery was late and support was poor.', rating: 1, nps_score: 6 },
  { review_id: 'original-3', review_text: 'The packaging has one layer.', rating: 3, nps_score: 8 },
]
const analyzed = demoAnalysis(sources, 'Test business', false)

test('sentiment totals cover every review exactly once', () => {
  assert.deepEqual(sentimentTotals(analyzed.reviews), { Positive: 1, Neutral: 1, Negative: 1 })
  const totals = sentimentTotals(analyzed.reviews)
  assert.equal(totals.Positive + totals.Neutral + totals.Negative, sources.length)
})

test('theme frequency counts each source review only once even with duplicate theme tags', () => {
  const reviews: AnalyzedReview[] = analyzed.reviews.map(review => ({ ...review, themes: [...review.themes, ...review.themes] }))
  const theme = themeMetrics(reviews).find(item => item.name === 'Customer support')!
  assert.equal(theme.count, 2)
  assert.equal(theme.percent, 2 / 3 * 100)
  assert.deepEqual(theme.evidence.map(review => review.review_id), ['original-1', 'original-2'])
  assert.deepEqual(theme.sentiments, { Positive: 1, Neutral: 0, Negative: 1 })
})

test('theme evidence uses exact original IDs and text', () => {
  for (const theme of themeMetrics(analyzed.reviews)) for (const evidence of theme.evidence) {
    const source = sources.find(review => review.review_id === evidence.review_id)
    assert.ok(source)
    assert.equal(evidence.review_text, source.review_text)
  }
})

test('all recommendation references exist and carry the relevant theme', () => {
  for (const recommendation of analyzed.recommendations) for (const id of recommendation.review_ids) {
    assert.ok(analyzed.reviews.some(review => review.review_id === id && review.themes.includes(recommendation.theme)))
  }
})

test('NPS uses explicit score boundaries and excludes star ratings', () => {
  const scores = [0, 6, 7, 8, 9, 10]
  const result = npsMetrics(scores.map((nps_score, index) => ({ review_id: `${index}`, review_text: 'Feedback', nps_score })))!
  assert.equal(result.promoters, 2)
  assert.equal(result.passives, 2)
  assert.equal(result.detractors, 2)
  assert.equal(result.score, 0)
  assert.equal(npsMetrics([{ review_id: 'rating-only', review_text: 'Great!', rating: 5 }]), null)
})

test('NPS denominator includes only valid explicit responses', () => {
  const result = npsMetrics([{ ...sources[0], nps_score: 10 }, { ...sources[1], nps_score: 8 }, { ...sources[2], nps_score: undefined }])!
  assert.equal(result.total, 2)
  assert.equal(result.score, 50)
  const invalid = npsMetrics([{ ...sources[0], nps_score: 11 }, { ...sources[1], nps_score: -1 }, { ...sources[2], nps_score: 7.5 }])
  assert.equal(invalid, null)
})

test('invalid NPS values are rejected rather than inferred or coerced from empty strings', () => {
  for (const nps_score of [11, -1, 7.5, 'bad', ' ', true]) assert.throws(() => validateReviews([{ ...sources[0], nps_score }]), /NPS|nps_score/)
})

test('manual input preserves original lines and creates unique stable source IDs', () => {
  const reviews = manualReviews('  Great quality.  \n\nSupport was slow.\r\nThe price is listed.')
  assert.equal(reviews.length, 3)
  assert.equal(reviews[0].review_text, '  Great quality.  ')
  assert.deepEqual(reviews.map(review => review.review_id), ['REV-001', 'REV-002', 'REV-003'])
  const result = demoAnalysis(reviews, 'Manual business', false)
  assert.equal(result.reviews.length, 3)
  assert.ok(summaryReport(result).includes('REV-001'))
  assert.ok(analyzedCSV(result).includes('Great quality.'))
})

test('empty feedback, duplicate IDs, and excessive review limits are rejected', () => {
  assert.throws(() => manualReviews(' \n '), /at least one/)
  assert.throws(() => validateReviews([sources[0], sources[0]]), /Duplicate review ID/)
  assert.throws(() => validateReviews([{ ...sources[0], review_text: '' }]), /no text/)
  assert.throws(() => validateReviews(Array.from({ length: 101 }, (_, index) => ({ review_id: `${index}`, review_text: 'Feedback' }))), /maximum of 100/)
})

test('CSV maps aliases and preserves quoted commas, escaped quotes, multiline text, and original IDs', () => {
  const reviews = parseCSV('\uFEFFID,Feedback,NPS\r\ncustom-42,"The agent said ""hello"",\nand resolved it.",9\r\ncustom-43,"The service is standard.",7')
  assert.equal(reviews[0].review_id, 'custom-42')
  assert.equal(reviews[0].review_text, 'The agent said "hello",\nand resolved it.')
  assert.equal(reviews[0].nps_score, 9)
  assert.equal(reviews.length, 2)
})

test('CSV without IDs creates distinct source IDs', () => {
  const reviews = parseCSV('text\nGreat quality\nPoor service')
  assert.deepEqual(reviews.map(review => review.review_id), ['CSV-001', 'CSV-002'])
})

test('CSV rejects missing text, duplicate mapped headers, duplicate IDs, malformed rows, and invalid quoting', () => {
  assert.throws(() => parseCSV('id,rating\n1,5'), /Missing review text/)
  assert.throws(() => parseCSV('text,review\nA,B'), /duplicate or conflicting/)
  assert.throws(() => parseCSV('id,text\n1,A\n1,B'), /Duplicate review ID/)
  assert.throws(() => parseCSV('id,text\n1,A,extra'), /columns/)
  assert.throws(() => parseCSV('id,text\n1,"Unclosed'), /closing quote/)
  assert.throws(() => parseCSV('id,text\n1,"Quoted"invalid'), /Invalid CSV quoting/)
})

test('CSV export escapes commas and neutralizes spreadsheet formula injection', () => {
  const csv = toCSV([{ text: '=SUM(1,2)' }, { text: 'Normal, "quote"' }], ['text'])
  assert.ok(csv.includes('"\'=SUM(1,2)"'))
  assert.ok(csv.includes('"Normal, ""quote"""'))
})

test('keyword counts are distinct reviews and grounded in original source text', () => {
  const reviews = analyzed.reviews.map(review => ({ ...review, keywords: [...review.keywords, ...review.keywords] }))
  assert.equal(keywordMetrics(reviews).find(keyword => keyword.word === 'support')!.count, 2)
  for (const review of reviews) for (const keyword of review.keywords) assert.ok(review.review_text.toLowerCase().includes(keyword))
})

function modelResult() {
  return { reviews: analyzed.reviews.map(review => ({ ...review })), recommendations: analyzed.recommendations.map(recommendation => ({ ...recommendation, review_ids: [...recommendation.review_ids] })) }
}

test('AI normalization ignores generated text and restores original source text', () => {
  const raw = modelResult()
  raw.reviews[0].review_text = 'Invented quotation'
  raw.reviews[0].keywords = ['fabricated keyword', 'support']
  const result = normalizeModelResult(sources, raw)
  assert.equal(result.reviews[0].review_text, sources[0].review_text)
  assert.deepEqual(result.reviews[0].keywords, ['support'])
})

test('AI normalization rejects invented or duplicate source IDs and missing classifications', () => {
  const invented = modelResult(); invented.reviews[0].review_id = 'invented'
  assert.throws(() => normalizeModelResult(sources, invented), /source references/)
  const duplicate = modelResult(); duplicate.reviews[1].review_id = duplicate.reviews[0].review_id
  assert.throws(() => normalizeModelResult(sources, duplicate), /source references/)
  const incomplete = modelResult(); incomplete.reviews.pop()
  assert.throws(() => normalizeModelResult(sources, incomplete), /incomplete results/)
})

test('AI normalization rejects unsupported themes and recommendation references', () => {
  const raw = modelResult(); raw.reviews[0].themes = ['constructor']
  assert.throws(() => normalizeModelResult(sources, raw), /invalid classification/)
  const invented = modelResult(); invented.recommendations[0].review_ids = ['fake']
  assert.throws(() => normalizeModelResult(sources, invented), /unverified evidence/)
  const mismatched = modelResult(); mismatched.recommendations[0].review_ids = ['original-3']
  assert.throws(() => normalizeModelResult(sources, mismatched), /unverified evidence/)
})

for (const sample of samples) test(`${sample.name}: CSV → preview → local analysis → source evidence → recommendations → report`, () => {
  const text = readFileSync(new URL(`../public${sample.file}`, import.meta.url), 'utf8')
  const uploaded = parseCSV(text)
  assert.deepEqual(uploaded, sample.reviews)
  assert.equal(uploaded.length, 20)
  const result = demoAnalysis(uploaded, sample.business, true)
  assert.equal(Object.values(sentimentTotals(result.reviews)).reduce((total, count) => total + count, 0), 20)
  for (const sentiment of ['Positive', 'Neutral', 'Negative'] as const) assert.ok(sentimentTotals(result.reviews)[sentiment] > 0)
  for (const theme of themeMetrics(result.reviews)) {
    assert.equal(theme.count, new Set(theme.evidence.map(review => review.review_id)).size)
    for (const review of theme.evidence) assert.equal(review.review_text, uploaded.find(source => source.review_id === review.review_id)!.review_text)
  }
  const report = summaryReport(result)
  assert.ok(report.includes('Synthetic Demo Data'))
  assert.ok(report.includes('Local keyword-based demo'))
  for (const source of uploaded) { assert.ok(report.includes(source.review_id)); assert.ok(report.includes(source.review_text)) }
  const exported = analyzedCSV(result)
  assert.ok(exported.includes('synthetic_data'))
  assert.ok(exported.includes('Synthetic Demo Data'))
  assert.equal(npsMetrics(result.reviews) !== null, sample.id === 'service')
})

test('sample datasets contain 60 unique fictional texts and source IDs', () => {
  const reviews = samples.flatMap(sample => sample.reviews)
  assert.equal(new Set(reviews.map(review => review.review_id)).size, 60)
  assert.equal(new Set(reviews.map(review => review.review_text)).size, 60)
})

test('synthetic sample provenance is retained even when IDs change', () => {
  assert.equal(containsSyntheticSamples([{ ...samples[0].reviews[0], review_id: 'renamed' }]), true)
  assert.equal(containsSyntheticSamples(sources), false)
})

test('reports distinguish calculated facts from suggestions and show NPS unavailability', () => {
  const result = demoAnalysis([{ review_id: 'test', review_text: 'Delivery was poor and late.' }], 'Test', false)
  const report = summaryReport(result)
  assert.ok(report.startsWith('# revec.iq — Customer Feedback Report — Test'))
  assert.doesNotMatch(report, /revec\.ai/i)
  assert.ok(report.includes('Calculated facts'))
  assert.ok(report.includes('Rule-based demo suggestions'))
  assert.ok(report.includes('NPS data not available.'))
  assert.ok(report.includes('test'))
})
