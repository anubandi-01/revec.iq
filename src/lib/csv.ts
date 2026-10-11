import { validateReviews } from './analysis.ts'
import type { Analysis, Review } from './analysis'

export function parseCSV(text: string): Review[] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false, closed = false
  const input = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') { value += '"'; index++ } else { quoted = false; closed = true }
      } else value += character
    } else if (character === '"' && !value && !closed) quoted = true
    else if (character === ',' || character === '\n' || character === '\r') {
      row.push(value); value = ''; closed = false
      if (character !== ',') { if (row.some(cell => cell.trim())) rows.push(row); row = []; if (character === '\r' && input[index + 1] === '\n') index++ }
    } else {
      if (closed || character === '"') throw new Error('Invalid CSV quoting. Enclose fields containing quotes or commas in double quotes.')
      value += character
    }
  }
  if (quoted) throw new Error('Invalid CSV: an opening quote has no closing quote.')
  row.push(value)
  if (row.some(cell => cell.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one review.')
  const aliases: Record<string, string> = { id: 'review_id', reviewid: 'review_id', review: 'review_text', text: 'review_text', feedback: 'review_text', comment: 'review_text', comments: 'review_text', nps: 'nps_score', score_nps: 'nps_score', stars: 'rating', business: 'product' }
  const headers = rows[0].map(header => { const key = header.trim().toLowerCase().replace(/[\s-]+/g, '_'); return aliases[key] ?? key })
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate or conflicting mapped column names.')
  if (!headers.includes('review_text')) throw new Error('Missing review text column. Use review_text, review, text, feedback, or comment.')
  const reviews = rows.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${cells.length} columns; expected ${headers.length}.`)
    const record = Object.fromEntries(headers.map((header, position) => [header, cells[position]]))
    if (!headers.includes('review_id')) record.review_id = `CSV-${String(index + 1).padStart(3, '0')}`
    return record
  })
  return validateReviews(reviews)
}

export function toCSV(records: Record<string, unknown>[], headers: string[]) {
  const escape = (input: unknown) => {
    let value = String(input ?? '')
    if (/^[\s]*[=+\-@]/.test(value)) value = `'${value}`
    return `"${value.replace(/"/g, '""')}"`
  }
  return [headers.map(escape).join(','), ...records.map(record => headers.map(header => escape(record[header])).join(','))].join('\r\n')
}

export function analyzedCSV(analysis: Analysis) {
  return toCSV(analysis.reviews.map(review => ({ ...review, themes: review.themes.join('; '), keywords: review.keywords.join('; '), analysis_mode: analysis.mode, synthetic_data: analysis.synthetic ? 'Synthetic Demo Data' : 'User-provided data' })), ['review_id', 'product', 'review_text', 'rating', 'satisfaction_score', 'nps_score', 'date', 'sentiment', 'explanation', 'themes', 'keywords', 'analysis_mode', 'synthetic_data'])
}

export function downloadFile(name: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
