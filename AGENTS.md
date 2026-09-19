# AI Trade Copilot — Codex Development Guide

## Project goal

AI Trade Copilot is an AI B2B Sales Copilot for Chinese export sales teams.

Core flow:

```text
Product + Country
→ AI Search Planner
→ Search Provider
→ Company Discovery
→ Company Research
→ Evidence
→ Buyer Analysis
→ Lead Score
→ CRM
```

Read this file and `HANDOFF.md` before changing code. Preserve existing user work and keep stages in separate commits.

## Technology stack

- Next.js 16 App Router, React 19 and TypeScript 5
- Zod runtime schemas
- Vitest tests and ESLint
- pnpm with pinned package versions and committed lockfile
- Supabase JS / SSR clients; use only the existing `QingFeng / ai-trade-copilot` project
- Authenticated Supabase CRM behind `LeadRepository`, with a LocalStorage development fallback

## Directory structure

- `src/app/` pages and API route handlers
- `src/components/` UI components
- `src/lib/schemas.ts` runtime domain contracts
- `src/lib/providers.ts` provider interfaces
- `src/lib/search-planner.ts` structured deterministic planner
- `src/lib/real-search-provider.ts` real search abstraction and Google adapter
- `src/lib/company-extraction.ts` result filtering and company candidates
- `src/lib/website-research.ts` public website research
- `src/lib/discovery-service.ts` real/Mock orchestration
- `src/lib/repositories/` persistence boundary
- `supabase/schema.sql` full reference schema
- `supabase/migrations/` incremental migrations
- `docs/` architecture and setup guides

## Database design

Core tables are `users`, `products`, `companies`, `company_evidence`, `contacts`, `leads`, `inquiries`, `search_jobs`, `search_queries`, `search_results`, `research_jobs`, `lead_scores`, `activities`, `buying_signals`, and `ai_generations`.

Every public business table has `user_id`, RLS ownership policies and explicit authenticated Data API grants. `anon` table access is revoked. Never use a service-role/secret key in browser code. Apply migrations only to the selected single Supabase project after review.

## Provider architecture

- `AIProvider`: structured planning, buyer analysis and inquiry analysis. No real AI adapter is connected; current discovery planning and analysis are deterministic and evidence-grounded.
- `SearchProvider`: `MockSearchProvider` and `RealSearchProvider`. The first real backend is Google Programmable Search JSON API, selected with `SEARCH_PROVIDER=google_cse`.
- `EnrichmentProvider`: interface only. Out of Phase 2 scope.
- `EmailVerificationProvider`: interface only. Out of Phase 2 scope.

Provider secrets are server-only. Real mode must return a specific error when configuration or the provider fails. It must never silently fall back to Mock.

## Evidence system

Every observed value stores `field`, `value`, `sourceUrl`, `sourceType`, `retrievedAt`, `confidence`, provider, verification status and `isMock`. Missing public data remains `Unknown`. Buyer analysis is inference and must be visibly separate from facts.

## Lead score

The program calculates a fixed 100-point score; an LLM never outputs the final score:

- Industry Match: 25
- Product / Use Case Match: 25
- Buying Signal: 20
- Company Authenticity: 10
- Target Market Match: 10
- Decision Maker Reachability: 10

Each component links to supporting evidence IDs. Without verified buying evidence, Buying Signal must remain zero.

## Pages and routes

- `/` dashboard
- `/discover` explicit Real/Mock discovery workflow
- `/research` known-company research prototype
- `/inquiries` manual inquiry analysis prototype
- `/leads` CRM list
- `/leads/[id]` company facts, inference, evidence, contacts and score
- `/products` product knowledge placeholder
- `POST /api/discover` mode-aware discovery route
- `POST /api/inquiries/analyze` Mock inquiry analysis

## Current phase

Phase 1 is complete. Phase 2 is in progress. Provider-ready real discovery, Auth UI, complete initial migration and Supabase repository code are implemented. No real Search API call or cloud migration has been verified from this checkout because credentials/project linking are absent.

### Working features

- Complete labelled Mock discovery pipeline
- Structured search plan
- Real search adapter and server-only configuration checks
- Search query and website research TTL caches
- Company filtering, domain normalization and entity resolution
- Public website evidence extraction
- Evidence-based deterministic buyer inference
- Fixed score and Local/Supabase CRM repositories
- Supabase Auth UI, complete initial schema, RLS and persistence repositories

### Still Mock or not connected

- AI model calls
- Inquiry AI analysis
- Known-company `/research` flow
- Contact enrichment
- Email verification
- Cloud migration/advisor verification (implementation exists but this checkout is not linked)

### Real-data functions

- Google search request code when configured
- Filtering and extraction from provider results
- Public official-website fetch and public email/phone/WhatsApp/social extraction
- Evidence ledger and deterministic score over real results

## Environment variables

See `.env.example`. Important variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, compatibility legacy Supabase keys, `AI_PROVIDER`, `AI_PROVIDER_API_KEY`, `SEARCH_PROVIDER`, `SEARCH_API_KEY`, `GOOGLE_CSE_ID`, `ENRICHMENT_PROVIDER`, `ENRICHMENT_API_KEY`, `EMAIL_VERIFICATION_PROVIDER`, and `EMAIL_VERIFICATION_API_KEY`.

Never commit `.env`, `.env.local`, API keys, passwords or secrets.

## Development commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use Node.js 22 or later.

## Development principles

- Preserve provider independence and runtime schema validation.
- Keep facts, inference and Mock data separate in storage and UI.
- Prefer deterministic scoring and auditable evidence.
- Default to at most 20 companies per discovery page and cache paid provider work.
- Access only public company webpages; respect access controls and provider terms.
- Keep LocalStorage and Supabase behind repository boundaries.
- Update `HANDOFF.md` after each phase and commit independent stages separately.

## Known problems

- No Search API credentials, so Real mode stops with `REAL_SEARCH_NOT_CONFIGURED`.
- The intended Supabase project exists as `QingFeng / ai-trade-copilot`, but this checkout has no project ref or environment configuration.
- Google API quota, billing and whole-web Programmable Search configuration must be confirmed by the owner.
- Public websites may block automated requests, redirect, return non-HTML, or omit contact data; preserve `Unknown`.
- AI planning/analysis remains deterministic until a real AI adapter is selected.

## Next phase task

Finish Phase 2 only: configure and live-test the first Search API, validate real Kenyan company results, select the single Supabase project, apply reviewed migrations, implement the Supabase repository and run advisors. Do not enter Phase 3.

## Prohibited actions

- Never display AI guesses as facts.
- Never fabricate customers, contacts, email addresses or phone numbers.
- Mock Data must always be clearly labelled.
- Never bypass platform login, CAPTCHA, robots restrictions or access controls.
- Do not scrape LinkedIn or Facebook.
- Do not automate outbound email or messages.
- Do not create chargeable cloud resources without explicit cost and organization confirmation.
- Do not create a second Supabase project when one already exists.
- Do not commit secrets.
