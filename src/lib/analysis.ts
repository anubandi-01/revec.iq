export type Sentiment = 'Positive' | 'Neutral' | 'Negative'
export type Review = { review_id: string; review_text: string; product?: string; rating?: number; satisfaction_score?: number; nps_score?: number; date?: string }
export type AnalyzedReview = Review & { sentiment: Sentiment; explanation: string; themes: string[]; keywords: string[] }
export type Recommendation = { theme: string; problem: string; action: string; reason: string; priority: 'High' | 'Medium' | 'Low'; justification: string; limitations: string; review_ids: string[] }
export type Analysis = { reviews: AnalyzedReview[]; recommendations: Recommendation[]; mode: 'ai' | 'demo'; synthetic: boolean; name: string; analyzedAt: string }
export const themeRules: Record<string, RegExp> = {
  'Product quality': /quality|durable|broken|material|defect|stitch|finish|fabric/i,
  'Delivery issues': /deliver|shipping|arriv|courier|tracking|late/i,
  'Customer support': /support|service|staff|agent|response|resolved|resolution|communication|representative/i,
  'Pricing & value': /price|pricing|expensive|cost|value|affordable|subscription|refund/i,
  'Packaging': /packag|box|wrapped|wrapping/i,
  'App usability': /usability|interface|navigate|navigation|easy|intuitive|onboarding|dashboard/i,
  'Technical problems': /bug|crash|loading|slow|reliab|outage|freeze|sync|error|speed/i,
  'Features & functionality': /feature|integration|export|search|report|automation|notification/i,
}
export const sentiments: Sentiment[] = ['Positive', 'Neutral', 'Negative']

export function validateReviews(input: unknown): Review[] {
  if (!Array.isArray(input) || !input.length) throw new Error('Add at least one review before analyzing.')
  if (input.length > 100) throw new Error('Please upload a maximum of 100 reviews for this prototype.')
  const ids = new Set<string>()
  let length = 0
  return input.map((row, index) => {
    if (!row || typeof row !== 'object') throw new Error(`Review ${index + 1} is invalid.`)
    if (typeof row.review_id !== 'string' || !row.review_id.trim() || row.review_id.length > 200) throw new Error(`Review ${index + 1} needs an ID of 1–200 characters.`)
    if (ids.has(row.review_id)) throw new Error(`Duplicate review ID: ${row.review_id}. IDs must be unique.`)
    ids.add(row.review_id)
    if (typeof row.review_text !== 'string' || !row.review_text.trim()) throw new Error(`Review ${row.review_id} has no text.`)
    if (row.review_text.length > 3000) throw new Error(`Review ${row.review_id} exceeds 3,000 characters.`)
    length += row.review_text.length
    if (length > 100000) throw new Error('The dataset exceeds 100,000 text characters. Please use a smaller file.')
    const review: Review = { review_id: row.review_id, review_text: row.review_text }
    for (const field of ['product', 'date'] as const) if (typeof row[field] === 'string') review[field] = row[field]
    for (const field of ['rating', 'satisfaction_score', 'nps_score'] as const) {
      if (row[field] !== undefined && row[field] !== '') {
        if (!['string', 'number'].includes(typeof row[field]) || (typeof row[field] === 'string' && !row[field].trim())) throw new Error(`Invalid ${field} for ${row.review_id}.`)
        const value = Number(row[field])
        if (!Number.isFinite(value)) throw new Error(`Invalid ${field} for ${row.review_id}.`)
        if (field === 'nps_score' && (!Number.isInteger(value) || value < 0 || value > 10)) throw new Error(`NPS score for ${row.review_id} must be an integer from 0 to 10.`)
        review[field] = value
      }
    }
    return review
  })
}

export function manualReviews(text: string): Review[] {
  return validateReviews(text.split(/\r?\n/).filter(line => line.trim()).map((line, index) => ({ review_id: `REV-${String(index + 1).padStart(3, '0')}`, review_text: line })))
}

export function sentimentTotals(reviews: AnalyzedReview[]) {
  return sentiments.reduce((counts, sentiment) => ({ ...counts, [sentiment]: reviews.filter(review => review.sentiment === sentiment).length }), { Positive: 0, Neutral: 0, Negative: 0 })
}

export function themeMetrics(reviews: AnalyzedReview[]) {
  const names = [...new Set(reviews.flatMap(review => review.themes))]
  return names.map(name => {
    const evidence = reviews.filter(review => review.themes.includes(name))
    return { name, count: evidence.length, percent: reviews.length ? evidence.length / reviews.length * 100 : 0, evidence, sentiments: sentimentTotals(evidence) }
  }).sort((first, second) => second.count - first.count)
}

export function keywordMetrics(reviews: AnalyzedReview[]) {
  const counts = new Map<string, number>()
  for (const review of reviews) for (const keyword of new Set(review.keywords)) counts.set(keyword, (counts.get(keyword) ?? 0) + 1)
  return [...counts].map(([word, count]) => ({ word, count })).sort((first, second) => second.count - first.count).slice(0, 15)
}

export function npsMetrics(reviews: Review[]) {
  const scores = reviews.flatMap(review => review.nps_score !== undefined && Number.isInteger(review.nps_score) && review.nps_score >= 0 && review.nps_score <= 10 ? [review.nps_score] : [])
  if (!scores.length) return null
  const promoters = scores.filter(score => score >= 9).length
  const passives = scores.filter(score => score >= 7 && score <= 8).length
  const detractors = scores.filter(score => score <= 6).length
  return { promoters, passives, detractors, total: scores.length, score: (promoters - detractors) / scores.length * 100 }
}

export function normalizeModelResult(sources: Review[], raw: unknown): { reviews: AnalyzedReview[]; recommendations: Recommendation[] } {
  const data = raw as { reviews?: Array<Record<string, unknown>>; recommendations?: Array<Record<string, unknown>> }
  if (!data || !Array.isArray(data.reviews) || data.reviews.length !== sources.length || !Array.isArray(data.recommendations)) throw new Error('AI returned incomplete results. Please retry.')
  const sourceIds = new Set(sources.map(source => source.review_id))
  const modelIds = data.reviews.map(review => review.review_id)
  if (new Set(modelIds).size !== sources.length || modelIds.some(id => typeof id !== 'string' || !sourceIds.has(id))) throw new Error('AI returned invalid source references. Please retry.')
  const reviews = sources.map(source => {
    const result = data.reviews!.find(review => review.review_id === source.review_id)!
    if (!sentiments.includes(result.sentiment as Sentiment) || typeof result.explanation !== 'string' || !result.explanation.trim() || !Array.isArray(result.themes) || result.themes.some(theme => typeof theme !== 'string' || !Object.hasOwn(themeRules, theme))) throw new Error('AI returned an invalid classification. Please retry.')
    return { ...source, sentiment: result.sentiment as Sentiment, explanation: result.explanation, themes: [...new Set(result.themes as string[])], keywords: Array.isArray(result.keywords) ? [...new Set(result.keywords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0 && word.length <= 50 && source.review_text.toLowerCase().includes(word.toLowerCase())).map(word => word.toLowerCase()))].slice(0, 8) : [] }
  })
  const recommendations = data.recommendations.map(result => {
    if (typeof result.theme !== 'string' || !Object.hasOwn(themeRules, result.theme) || !['High', 'Medium', 'Low'].includes(String(result.priority))) throw new Error('AI returned an invalid recommendation.')
    for (const field of ['problem', 'action', 'reason', 'justification', 'limitations']) if (typeof result[field] !== 'string' || !(result[field] as string).trim()) throw new Error('AI returned an incomplete recommendation.')
    if (!Array.isArray(result.review_ids) || !result.review_ids.length || result.review_ids.some(id => !reviews.some(review => review.review_id === id && review.themes.includes(result.theme as string)))) throw new Error('AI recommendation has unverified evidence. Please retry.')
    return { ...result, review_ids: [...new Set(result.review_ids)] } as Recommendation
  })
  const order = { High: 0, Medium: 1, Low: 2 }
  return { reviews, recommendations: recommendations.sort((first, second) => order[first.priority] - order[second.priority]) }
}

export function demoAnalysis(sources: Review[], name: string, synthetic: boolean): Analysis {
  const positive = /\b(excellent|great|love|helpful|friendly|fast|perfect|good|easy|intuitive|reliable|affordable|impressed|smooth|durable|beautiful|quick|resolved|clear)\b/gi
  const negative = /\b(poor|bad|broken|late|delay|delayed|slow|rude|expensive|disappointed|crash|crashes|bug|bugs|confusing|damaged|unhelpful|failed|frustrating|unreliable|missing|unresolved|terrible|ignored)\b/gi
  const reviews = sources.map(source => {
    const positiveWords = source.review_text.match(positive) ?? []
    const negativeWords = source.review_text.match(negative) ?? []
    const sentiment: Sentiment = positiveWords.length > negativeWords.length ? 'Positive' : negativeWords.length > positiveWords.length ? 'Negative' : 'Neutral'
    const themes = Object.entries(themeRules).filter(([, rule]) => rule.test(source.review_text)).map(([theme]) => theme)
    const keywords = [...new Set([...positiveWords, ...negativeWords, ...source.review_text.match(/\b(quality|delivery|packaging|pricing|support|response time|loading|features|interface|communication|refund|navigation|reliability|integration)\b/gi) ?? []].map(word => word.toLowerCase()))]
    return { ...source, sentiment, themes, keywords, explanation: `Local keyword-based demo: ${positiveWords.length} positive and ${negativeWords.length} negative language matches. ${sentiment === 'Neutral' ? 'Mixed or no clear sentiment signals.' : `${sentiment} signals predominate.`} Not a calibrated AI classification.` }
  })
  const recommendations = themeMetrics(reviews).filter(theme => theme.sentiments.Negative > 0).slice(0, 4).map(theme => ({ theme: theme.name, problem: `Negative feedback mentions ${theme.name.toLowerCase()}.`, action: `Review the cited ${theme.name.toLowerCase()} feedback with the responsible team, select one recurring issue, and measure improvement in the next feedback cycle.`, reason: 'Address the negative experiences documented in the linked source reviews.', priority: theme.sentiments.Negative >= 3 ? 'High' as const : 'Medium' as const, justification: `${theme.sentiments.Negative} of ${theme.count} reviews mentioning this theme are classified negative.`, limitations: 'Rule-based demo suggestion, not AI-generated. Small samples and keyword matching cannot establish causation or business impact.', review_ids: theme.evidence.filter(review => review.sentiment === 'Negative').map(review => review.review_id) }))
  return { reviews, recommendations: recommendations.sort((first, second) => Number(second.priority === 'High') - Number(first.priority === 'High')), mode: 'demo', synthetic, name, analyzedAt: new Date().toISOString() }
}
