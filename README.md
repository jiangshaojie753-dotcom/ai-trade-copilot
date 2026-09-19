# AI Trade Copilot

AI Trade Copilot is an evidence-first AI B2B Sales Copilot for Chinese export sales teams. A user enters a product and target country; the application plans buyer-oriented searches, discovers companies, researches public websites, separates facts from inference, calculates a deterministic lead score, and saves leads to a CRM workspace.

## Current status

Phase 1 is complete. Phase 2 real customer discovery and Supabase persistence code are provider-ready. This checkout still needs the existing cloud project URL/key and live migration/search verification.

| Capability | Status |
| --- | --- |
| Mock end-to-end discovery | Working; all fictional data is labelled `MOCK DATA` |
| Structured Search Planner | Working; deterministic output with use case, intent and buyer type |
| Real Search Provider | Google Programmable Search adapter implemented; needs API key and Search Engine ID |
| Company extraction and filtering | Working for provider results |
| Public website research | Working for public HTML pages; missing values stay `Unknown` |
| Buyer analysis | Evidence-based deterministic inference; a real AI provider is not connected |
| Lead score | Working; fixed 100-point programmatic rubric |
| CRM | LocalStorage fallback plus authenticated Supabase repository |
| Supabase | Complete empty-database migration, email/password Auth UI and RLS repositories; cloud project not linked in this checkout |
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
SEARCH_PROVIDER=google_cse
SEARCH_API_KEY=
GOOGLE_CSE_ID=
```

`SEARCH_API_KEY` is a Google API key with Custom Search JSON API access. `GOOGLE_CSE_ID` is the Programmable Search Engine ID. Confirm current quotas and billing in Google Cloud before enabling the API.

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

The next recommended task is to link only the existing `QingFeng / ai-trade-copilot` Supabase project, apply and verify the reviewed migrations, then live-test `80T Lowbed Trailer + Kenya` with the Google search adapter. Stop before Phase 3 enrichment or automated outreach.
