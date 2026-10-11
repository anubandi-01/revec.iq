import { useRef, useState } from 'react'
import { ArrowRight, Check, Download, FileSpreadsheet, Headphones, Layers3, ShoppingBag, Upload, X } from 'lucide-react'
import { manualReviews } from '../lib/analysis'
import type { Review } from '../lib/analysis'
import { parseCSV } from '../lib/csv'
import { containsSyntheticSamples, samples } from '../lib/samples'

export type Draft = { name: string; type: string; text: string; reviews: Review[]; synthetic: boolean; source: string }
export function InputPanel({ draft, setDraft, busy, error, setError, onAnalyze }: { draft: Draft; setDraft: (draft: Draft) => void; busy: boolean; error: string; setError: (error: string) => void; onAnalyze: (demo: boolean) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [demo, setDemo] = useState(false)
  const containsSample = containsSyntheticSamples(draft.reviews)
  const change = (next: Draft) => { setError(''); setDraft(next) }
  async function upload(file?: File) {
    if (!file) return
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Please choose a .csv file, not a spreadsheet or other file type.')
      if (file.size > 500000) throw new Error('CSV files must be smaller than 500 KB.')
      const reviews = parseCSV(await file.text())
      const knownSample = containsSyntheticSamples(reviews)
      change({ ...draft, reviews, text: reviews.map(review => review.review_text).join('\n'), synthetic: knownSample, source: file.name })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to read CSV file.') }
    if (fileInput.current) fileInput.current.value = ''
  }
  return <div className="input-layout">
    <section className="panel input-panel">
      <div className="panel-heading"><div><h2>Your customers have something to say.</h2><p>Add feedback to find out what matters most.</p></div><span className="icon-tile"><FileSpreadsheet size={21} /></span></div>
      <div className="form-pair"><label>Product or business name<input maxLength={120} value={draft.name} placeholder="e.g. Northstar Shopping" disabled={busy} onChange={event => change({ ...draft, name: event.target.value })} /></label><label>Dataset type<select value={draft.type} disabled={busy} onChange={event => change({ ...draft, type: event.target.value })}><option>E-commerce</option><option>Customer service</option><option>SaaS application</option><option>Other</option></select></label></div>
      <label className="text-label">Customer feedback <span>One review per line</span><textarea value={draft.text} disabled={busy} placeholder={'Paste your customer reviews here…\n\nThe delivery was fast and the quality was excellent.\nCustomer support took too long to respond.'} onChange={event => {
        const text = event.target.value
        let reviews: Review[] = []
        setError('')
        try { if (text.trim()) reviews = manualReviews(text) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Invalid reviews.') }
        const synthetic = samples.some(sample => sample.reviews.some(source => text.includes(source.review_text)))
        setDraft({ ...draft, text, reviews, synthetic, source: 'Manual input' })
      }} /></label>
      <div className="textarea-meta"><span>{draft.reviews.length} reviews detected</span><span>Up to 100 reviews · original text preserved</span></div>
      <button className="upload-zone" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={24} /><span><strong>Or upload a CSV file</strong><small>Click to choose a file · .csv up to 500 KB</small></span><span className="file-tag">CSV</span></button>
      <input aria-label="Upload customer feedback CSV" className="visually-hidden" ref={fileInput} type="file" accept=".csv,text/csv" onChange={event => void upload(event.target.files?.[0])} />
      <p className="helper">Columns: <code>review_id</code>, <code>review_text</code>, optional <code>rating</code>, <code>nps_score</code>, <code>date</code>. Common aliases are mapped automatically. Existing IDs and quoted multiline text are preserved. Editing the text area converts the dataset to manual reviews with new IDs.</p>
      <label className="check-label"><input type="checkbox" checked={draft.synthetic || containsSample} disabled={busy || containsSample} onChange={event => change({ ...draft, synthetic: event.target.checked })} /> This is synthetic or demonstration data{containsSample && ' (sample detected)'}</label>
      <label className="check-label"><input type="checkbox" checked={demo} disabled={busy} onChange={event => setDemo(event.target.checked)} /> Use local keyword-based demo instead of server-side AI</label>
      <p className="helper">AI mode sends review text to the configured AI provider. Avoid sensitive personal information. Local demo mode makes no AI requests; it does not understand context or negation.</p>
      {error && <div className="error-box" role="alert"><X size={16} /><span>{error}</span></div>}
      <div className="form-actions"><button className="primary" disabled={busy} onClick={() => onAnalyze(demo)}>{busy ? <span className="spinner" /> : <Layers3 size={17} />}{busy ? 'Analyzing feedback…' : 'Analyze Feedback'}{!busy && <ArrowRight size={16} />}</button><button className="secondary" disabled={busy} onClick={() => change({ name: '', type: 'E-commerce', text: '', reviews: [], synthetic: false, source: 'Manual input' })}>Clear input</button></div>
      {busy && <div className="analysis-loading" role="status"><div className="skeleton" /><p>Reading sentiment, detecting themes, and verifying source evidence…</p></div>}
    </section>
    <div className="input-aside"><section className="panel"><div className="panel-heading"><div><h2>Start with a sample</h2><p>No data handy? Try a sample dataset.</p></div></div><span className="badge amber">Synthetic Demo Data</span><div className="sample-list">{samples.map(sample => {
      const Icon = sample.id === 'ecommerce' ? ShoppingBag : sample.id === 'service' ? Headphones : Layers3
      return <div className={`sample-card ${draft.source === sample.name ? 'selected' : ''}`} key={sample.id}><div className="sample-title"><span className="icon-tile"><Icon size={20} /></span><div><strong>{sample.name}</strong><small>20 fictional reviews</small></div></div><p>{sample.description}</p><div className="sample-actions"><button disabled={busy} className="text-button" onClick={() => change({ name: sample.business, type: sample.type, reviews: sample.reviews, text: sample.reviews.map(review => review.review_text).join('\n'), synthetic: true, source: sample.name })}>{draft.source === sample.name ? <Check size={14} /> : <ArrowRight size={14} />}{draft.source === sample.name ? 'Loaded' : 'Load dataset'}</button><a href={sample.file} download aria-label={`Download ${sample.name} CSV`}><Download size={16} /> CSV</a></div></div>
    })}</div></section><div className="privacy-note"><span className="privacy-dot" /><div><strong>Your evidence stays intact.</strong><p>No rewritten quotes. No invented IDs. Your original feedback is the source of truth. Data stays in this session; export before leaving.</p></div></div></div>
    {draft.reviews.length > 0 && <section className="panel full-span"><div className="panel-heading"><div><h2>Source preview <span className="count-badge">{draft.reviews.length}</span></h2><p>{draft.source} {draft.synthetic && '· Synthetic Demo Data'}</p></div><span className="badge green"><Check size={12} /> Source IDs preserved</span></div><div className="table-scroll"><table><thead><tr><th>Review ID</th><th>Original customer feedback</th><th>Rating</th><th>NPS</th></tr></thead><tbody>{draft.reviews.map(review => <tr key={review.review_id}><td><code>{review.review_id}</code></td><td>{review.review_text}</td><td>{review.rating ?? '—'}</td><td>{review.nps_score ?? '—'}</td></tr>)}</tbody></table></div></section>}
  </div>
}
