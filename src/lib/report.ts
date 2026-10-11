import { keywordMetrics, npsMetrics, sentimentTotals, themeMetrics } from './analysis.ts'
import type { Analysis } from './analysis'

export function summaryReport(analysis: Analysis) {
  const totals = sentimentTotals(analysis.reviews)
  const nps = npsMetrics(analysis.reviews)
  return [
    `# revec.iq — Customer Feedback Report — ${analysis.name}`,
    `Don't just read reviews. Know what to improve.`,
    `Data: ${analysis.synthetic ? 'Synthetic Demo Data — fictional; not real customer findings.' : 'User-provided customer feedback'}`,
    `Analysis: ${analysis.mode === 'ai' ? 'Server-side AI (gpt-4.1-mini)' : 'Local keyword-based demo — not AI analysis'}`,
    `Generated: ${analysis.analyzedAt}`,
    '\n## Calculated facts',
    `Total reviews: ${analysis.reviews.length}`,
    ...Object.entries(totals).map(([sentiment, count]) => `${sentiment}: ${count} (${(count / analysis.reviews.length * 100).toFixed(1)}%)`),
    nps ? `NPS: ${nps.score.toFixed(1)}; promoters: ${nps.promoters}; passives: ${nps.passives}; detractors: ${nps.detractors}; valid NPS responses: ${nps.total}${analysis.synthetic ? ' (synthetic NPS responses)' : ''}` : 'NPS data not available.',
    '\n## Themes and verified original evidence',
    ...themeMetrics(analysis.reviews).flatMap(theme => [`\n### ${theme.name}: ${theme.count} (${theme.percent.toFixed(1)}%)`, `Sentiment: ${JSON.stringify(theme.sentiments)}`, ...theme.evidence.map(review => `[${review.review_id}] ${review.sentiment}\nExact original text: ${review.review_text}`)]),
    '\n## Keywords',
    ...keywordMetrics(analysis.reviews).map(keyword => `${keyword.word}: ${keyword.count} reviews`),
    `\n## ${analysis.mode === 'ai' ? 'AI-generated suggestions — not calculated facts' : 'Rule-based demo suggestions — not AI-generated'}`,
    ...analysis.recommendations.flatMap(recommendation => [`\n### ${recommendation.priority}: ${recommendation.theme}`, `Problem: ${recommendation.problem}`, `Action: ${recommendation.action}`, `Reason: ${recommendation.reason}`, `Priority justification: ${recommendation.justification}`, `Supporting review IDs: ${recommendation.review_ids.join(', ')}`, `Limitations: ${recommendation.limitations}`]),
    '\n## Limitations',
    'Themes can overlap. Each review is counted once per theme. Sentiment and theme assignments are inferred, not ground truth. Confidence is not displayed because the model does not provide calibrated probabilities. NPS uses only explicit 0–10 nps_score values, never star ratings. This session is not persisted; download results before leaving.',
  ].join('\n\n')
}
