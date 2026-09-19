# Account Handoff

- **Current Phase:** Phase 2 — Real Customer Discovery, in progress
- **Last Completed Task:** Supabase Auth/repository implementation and complete empty-database migration
- **Current Branch:** `main`
- **Latest Commit:** `feat: start phase 2 real customer discovery` (this handoff commit)
- **Working Features:** labelled Mock pipeline; deterministic planner with AIProvider fallback; Google real-search adapter; company research; fixed score; LocalStorage fallback; Supabase Auth and persistence repositories
- **Mock Features:** AI model calls, inquiry analysis, known-company research page, enrichment and email verification
- **Required APIs:** existing `QingFeng / ai-trade-copilot` Supabase project; Google Programmable Search JSON API; AI provider not yet selected
- **Required Environment Variables:** copy `.env.example`; minimum real search values are `SEARCH_PROVIDER=google_cse`, `SEARCH_API_KEY`, and `GOOGLE_CSE_ID`
- **Known Problems:** no Search API key; checkout has no Supabase project ref or `.env.local`; no live cloud persistence or real-search acceptance test; real AI adapter absent
- **Next Recommended Task:** link only the existing Supabase project, apply `20260919000000_initial_schema.sql`, run advisors/RLS smoke tests, then configure Google search and run `80T Lowbed Trailer + Kenya`

Before work: read `AGENTS.md`, run `git status`, inspect the latest commit, install with `pnpm install`, and run lint, typecheck, tests and build.
