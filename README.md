# AI Trade Copilot

AI Trade Copilot is an evidence-first AI B2B Sales Copilot for Chinese export sales teams. A user enters a product and target country; the application plans buyer-oriented searches, discovers companies, researches public websites, separates facts from inference, calculates a deterministic lead score, and saves leads to a CRM workspace.

## Current status

Phase 1 is complete. Phase 2 real customer discovery is provider-ready, and Supabase persistence is deployed and live-verified on the existing cloud project. Real search still needs provider credentials and live verification.

| Capability | Status |
| --- | --- |
| Mock end-to-end discovery | Working; all fictional data is labelled `MOCK DATA` |
| Structured Search Planner | Working; deterministic output with use case, intent and buyer type |
| Real Search Provider | Brave Search adapter implemented; needs `BRAVE_SEARCH_API_KEY` for live verification |
| Company extraction and filtering | Working for provider results |
| Public website research | Working for public HTML pages; missing values stay `Unknown` |
| Buyer analysis | Evidence-based deterministic inference; a real AI provider is not connected |
| Lead score | Working; fixed 100-point programmatic rubric |
| CRM | LocalStorage fallback plus authenticated Supabase repository |
| Supabase | Deployed to `QingFeng / ai-trade-copilot`; Auth, RLS and cross-session Lead persistence live-verified |
| Enrichment / email verification | Interfaces only; no provider connected |

Real mode never silently falls back to Mock mode.

## Install and run

Requirements: Node.js 22 or later and pnpm. Supabase client libraries dropped Node.js 20 support in 2026.

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. When Supabase variables are configured, sign in at `/auth`; otherwise the CRM uses the local repository. Choose **Discover Customers**, select `REAL DATA` or `MOCK DATA`, and submit the form.

## Environment variables

Copy `.env.example` to `.env.local`. Keep `.env` and `.env.local` out of Git; both are covered by `.gitignore`.

For the first real search adapter:

```dotenv
SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=
BRAVE_SEARCH_PROXY_URL=
```

Create a Brave Search API subscription and key in the [Brave Search API dashboard](https://api.search.brave.com/app/keys), then place the key only in `.env.local`. Never prefix it with `NEXT_PUBLIC_` or commit it. The older `google_cse` adapter remains available for compatibility but is not the recommended production configuration.

If the Node.js server must use an HTTP proxy to reach Brave, set `BRAVE_SEARCH_PROXY_URL` in `.env.local` and restart the development server. Standard `HTTPS_PROXY` and `HTTP_PROXY` are also supported when the Brave-specific variable is absent. Do not put proxy URLs in source code.

For Supabase, prefer the current publishable/secret key model:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names remain documented for compatibility. Never expose a secret or service-role key to browser code.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Project map

- `src/app/` — Next.js pages and route handlers
- `src/lib/` — schemas, providers, search planning, discovery, research, scoring and repositories
- `src/components/` — reusable UI
- `supabase/schema.sql` — complete reference schema
- `supabase/migrations/` — incremental database migrations
- `docs/architecture.md` — technical architecture
- `docs/supabase-setup.md` — one-project setup and verification guide
- `AGENTS.md` — rules and context for any new Codex session
- `HANDOFF.md` — concise account-switch handoff

## Continue development

Read `AGENTS.md` first, then `HANDOFF.md`, then run all four quality checks. Do not create a second Supabase project when one already exists. Do not present AI inference as fact or generate missing customer/contact data.

The next recommended task is to configure `BRAVE_SEARCH_API_KEY` and live-test `80T Lowbed Trailer + Kenya` with the Brave search adapter. Stop before Phase 3 enrichment or automated outreach.
