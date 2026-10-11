# revec.iq project guide

## Architecture

revec.iq is a customer-feedback intelligence prototype, not a chat application. TanStack Start serves a React dashboard and a separate modern Netlify Function performs server-side AI inference. The initial dashboard is an explicitly labeled synthetic, local keyword-based demo; AI is requested only when a user chooses Analyze Feedback without the demo checkbox.

## Key directories

- `src/routes/__root.tsx`: product metadata, document shell, favicon, global stylesheet.
- `src/routes/index.tsx`: dashboard entry route.
- `src/components/Dashboard.tsx`: seven dashboard views, session state, filters, evidence links, exports, responsive sidebar.
- `src/components/InputPanel.tsx`: manual input, CSV upload, sample loaders, validation, source preview.
- `src/lib/analysis.ts`: source validation, sentiment totals, distinct-review theme metrics, NPS, demo engine, AI output validation.
- `src/lib/csv.ts`: RFC-style quoted CSV parsing, aliases, safe exports, browser downloads.
- `src/lib/samples.ts`: 60 unique fictional reviews and dataset metadata.
- `src/lib/report.ts`: full Markdown reports with exact original evidence.
- `public/samples/`: real downloadable sample CSV files. Keep them synchronized with sample fixtures.
- `netlify/functions/analyze.mts`: secure OpenAI SDK integration through Netlify AI Gateway.
- `tests/`: Node built-in tests, including data workflow tests and API validation tests without provider calls.

## Conventions and integrity constraints

Use TypeScript, descriptive variable names, React hooks, reusable components, and CSS design tokens. Maintain the dark navy, restrained mint/cyan visual system. Runtime imports within libraries used by Node tests use explicit .ts extensions; type-only imports are erased. Keep all API credentials on the server. The model is gpt-4.1-mini, supported by the Netlify AI Gateway skill.

Never display model-generated quotations. Original source records must supply every quote and ID. Validate model classifications for every source ID exactly once. Reject recommendations with missing or theme-mismatched references. Count each original review at most once per theme; counts and percentages must be derived from the current dataset. NPS must use only explicit integer nps_score values from 0 to 10, never ratings or sentiment. Do not fabricate confidence estimates or temporal trends. Keep calculated facts distinct from AI-generated or rule-based suggestions. Label synthetic datasets and results.

Session-only React state is intentional: there is no persistent user data, history, authentication, or localStorage. Input edits invalidate analysis immediately. If persistence is later requested, read the general-database and netlify-database skills and use Netlify Database with Drizzle, not local files or browser storage. Public AI use needs authentication and quotas before production hardening.

## Commands and validation

Install with pnpm install. Run locally with netlify dev --port 8889 to include Functions. The UI-only command is pnpm dev. Tests use pnpm test on Node 22.23 or later; the deploy pipeline handles the production build. During the initial implementation session, local validation commands were prohibited, so tests and runtime AI behavior were not executed. Do not represent that status as passing.
