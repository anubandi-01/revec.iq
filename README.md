# revec.iq

**Don't just read reviews. Know what to improve.**

revec.iq is a responsive customer-feedback intelligence prototype with review-level sentiment analysis, recurring themes, searchable original-source evidence, evidence-linked recommendations, explicit-score NPS analysis, and downloadable reports.

## Technologies

- React 19, TypeScript, TanStack Start and TanStack Router
- Vite 7, custom responsive CSS, and Lucide icons
- Netlify Functions and Netlify AI Gateway using the official OpenAI SDK with `gpt-4.1-mini`
- Node's built-in test runner for calculation, CSV, evidence integrity, sample workflows, and API validation tests

## Local development

Use Node.js 22.23 or later and pnpm.

```sh
pnpm install
netlify dev --port 8889
```

Netlify Dev provides both the application and the `/.netlify/functions/analyze` endpoint. For UI-only development, `pnpm dev` is also available, but does not independently emulate the analysis function. Netlify runs the production build using the configuration in `netlify.toml`.

AI credentials are server-side only. Netlify AI Gateway injects provider environment variables into the modern function runtime; no browser credential configuration is needed. Gateway activation requires a production deployment. When running outside that environment, configure `OPENAI_API_KEY` and optionally `OPENAI_BASE_URL` in your local environment, never in browser-prefixed variables or committed files. Provider requests have a 45-second timeout and no automatic retries.

## Demonstration workflow

1. The home page opens with an explicitly labeled **Synthetic Demo Data** preview, calculated using a local keyword-based demonstration engine. This preview is not an AI result.
2. Open **Input Data**, load one of the three sample datasets, and inspect the original source preview.
3. Click **Analyze Feedback** to run server-side AI. Alternatively, explicitly select local demo analysis to demonstrate the workflow without a provider request.
4. Inspect **Sentiment Analysis** and **Keywords & Themes**. View **Evidence Explorer** to search exact original text and source IDs and filter by theme or sentiment.
5. Follow source links in **Recommendations**. Proposals are labeled separately from calculated facts.
6. Open **Reports** to download the summary as Markdown, analyzed reviews as CSV, or any original sample CSV.

Manual input supports one review per line. CSV uploads support BOM, quoted commas, escaped quotes, CRLF, multiline quoted text, and common column aliases. Original review IDs and text are retained. If the ID column is absent, unique IDs are generated. Empty reviews, duplicate IDs, invalid columns, malformed CSV, and invalid NPS scores are rejected. This prototype accepts up to 100 reviews, 3,000 characters per review, 100,000 total text characters, and CSV files under 500 KB.

## Data integrity and limitations

- The three actual downloadable sample files in `public/samples/` contain 20 unique fictional reviews each and are labeled **Synthetic Demo Data**. Customer-service samples include synthetic explicit NPS responses; their NPS is not a real customer metric.
- Theme frequency counts each source review once per theme. Themes can overlap, so their percentages need not sum to 100%.
- AI responses must contain exactly the original IDs. Recommendations with nonexistent or mismatched evidence IDs are rejected. Displayed quotes are always supplied from original records, never from generated text. Unsupported keywords are filtered out.
- Confidence is intentionally omitted: the model does not supply calibrated probabilities. AI classifications and recommendations require human review. Local demo sentiment uses word matching and cannot understand contextual negation, sarcasm, or causation.
- NPS uses only explicit integer `nps_score` values from 0 to 10. Ratings and sentiment never substitute for NPS.
- CSV exports neutralize formula-like cells with a leading apostrophe. Original text remains unmodified in the app and Markdown report.
- Data exists only in the active browser session. No account, saved history, database, or browser persistence is implemented; export results before refreshing.
- The unauthenticated prototype analysis endpoint is intended for controlled demonstrations. Add authentication, per-user quotas, and abuse controls before unrestricted production use.

## Tests

```sh
pnpm test
```

The suite covers sentiment totals, distinct-review theme frequency, exact evidence traceability, recommendation references, NPS boundaries and denominators, CSV parsing and exports, manual input, all sample-data workflows, AI output validation, and API input validation without making live AI requests.

**Validation status:** all 27 automated tests passed during the revec.iq branding update, including the report branding check. Browser workflows and live AI requests were not executed; no end-to-end browser or live AI success is claimed.
