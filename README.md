# LedgerVoid

A financial intelligence dashboard for exploring annual-report data. PDF text
is extracted in the browser. Relevant excerpts are sent to OpenRouter only
after the user explicitly requests analysis. The API key stays server-side.

Financial amounts are shown only when a report line includes a recognizable
financial label and an explicit currency or unit. Growth and margin
calculations are deterministic and are produced only when comparable report
figures are available. AI findings must cite exact report excerpts and are
validated before they are displayed.

## Requirements

- Node.js 20.9 or newer
- npm

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configure OpenRouter

1. Create or sign in to an account at [OpenRouter](https://openrouter.ai/), then
   create an API key in the account's key settings. See the
   [OpenRouter API reference](https://openrouter.ai/docs/api-reference/overview)
   for the chat completions API details.
2. Copy `.env.example` to `.env.local` and set `OPENROUTER_API_KEY` to your key.
   Keep `.env.local` private; it is ignored by Git. Never use a `NEXT_PUBLIC_`
   prefix for the API key.
3. `OPENROUTER_MODEL` defaults to `openrouter/free`, which routes to an
   available free model. You can set it to another model identifier, but that
   model must be available to your OpenRouter account. Not all models are free;
   provider pricing and rate limits apply. LedgerVoid does not fall back to a
   paid model.
4. Restart the development server after changing environment variables.

The API request is made only from `app/api/analysis/route.ts`. PDF text is
extracted locally, and no report excerpt is sent to OpenRouter until you click
**Analyse report**. The endpoint sends a limited set of relevant page excerpts,
not the original PDF.

## Deploy on Vercel

In the Vercel project, open **Settings → Environment Variables** and add
`OPENROUTER_API_KEY` and, optionally, `OPENROUTER_MODEL` for each environment
(Preview, Development, and Production) where analysis should be available.
Use `openrouter/free` as the model value to use the free-model router. Add
secrets as server-side environment variables only; do not prefix them with
`NEXT_PUBLIC_`. Redeploy after changing environment variables.

## Troubleshooting

- **OpenRouter setup needed:** add `OPENROUTER_API_KEY` to `.env.local` locally
  or to Vercel's server environment, then restart or redeploy.
- **401/403:** verify the API key is current and the account can use the
  configured model.
- **Model unavailable:** check `OPENROUTER_MODEL` and whether that model is
  available to your account.
- **Rate limited / no free endpoint available:** wait and retry later. Free
  model availability is not guaranteed. No paid-model fallback or automatic
  retry is performed.
- **Timed out:** retry the analysis later; requests are not retried
  automatically.
- **Unreadable or scanned PDF:** this stage extracts selectable text only.
  Image-only/scanned PDFs need OCR, which is not included.
- **Unsupported evidence or malformed model response:** the response is
  rejected rather than displayed. Retry later or use another model available
  to your account.

## Available checks

```bash
npm run lint
npm run typecheck
npm run build
```

Analysis is explicitly user-triggered. The request path has input-size limits,
timeouts, per-instance rate limiting, schema checks, exact page-quote
verification, and numeric-source validation.
