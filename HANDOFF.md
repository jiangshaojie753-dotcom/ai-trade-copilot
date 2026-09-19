# Account Handoff

- **Current Phase:** Phase 2 — Real Customer Discovery, in progress
- **Last Completed Task:** Provider-ready real discovery foundation plus cross-account project documentation
- **Current Branch:** `main`
- **Latest Commit:** `feat: start phase 2 real customer discovery` (this handoff commit)
- **Working Features:** labelled Mock pipeline; structured planner; Google real-search adapter; query/research cache; company extraction; public website research; evidence; entity resolution; fixed score; LocalStorage CRM
- **Mock Features:** AI model calls, inquiry analysis, known-company research page, enrichment and email verification
- **Required APIs:** Google Programmable Search JSON API first; Supabase project later; AI provider not yet selected
- **Required Environment Variables:** copy `.env.example`; minimum real search values are `SEARCH_PROVIDER=google_cse`, `SEARCH_API_KEY`, and `GOOGLE_CSE_ID`
- **Known Problems:** no Search API key; no Supabase project; no live real-search acceptance test; public websites may block research; real AI adapter absent
- **Next Recommended Task:** configure Google search credentials, run `80T Lowbed Trailer + Kenya`, verify returned companies/evidence, then select the single Supabase project and apply reviewed migrations

Before work: read `AGENTS.md`, run `git status`, inspect the latest commit, install with `pnpm install`, and run lint, typecheck, tests and build.
