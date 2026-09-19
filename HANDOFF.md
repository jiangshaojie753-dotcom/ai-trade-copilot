# Account Handoff

- **Current Phase:** Phase 2 — Real Customer Discovery, in progress
- **Last Completed Task:** Deployed and live-verified Supabase persistence; restricted Data API privileges
- **Current Branch:** `main`
- **Latest Milestone:** `fix: restrict Supabase data API privileges`
- **Working Features:** labelled Mock pipeline; deterministic planner with AIProvider fallback; Google real-search adapter; company research; fixed score; LocalStorage fallback; Supabase Auth and persistence repositories
- **Mock Features:** AI model calls, inquiry analysis, known-company research page, enrichment and email verification
- **Required APIs:** existing `QingFeng / ai-trade-copilot` Supabase project; Google Programmable Search JSON API; AI provider not yet selected
- **Required Environment Variables:** copy `.env.example`; minimum real search values are `SEARCH_PROVIDER=google_cse`, `SEARCH_API_KEY`, and `GOOGLE_CSE_ID`
- **Known Problems:** no Search API key; no real-search acceptance test; real AI adapter absent
- **Supabase Status:** REAL — initial schema and grant restrictions applied to `QingFeng / ai-trade-copilot`; Auth + RLS Lead create/re-login/read/delete passed; Security Advisor clean
- **Next Recommended Task:** synchronize the local commits to the existing GitHub repository, then configure Google search and run `80T Lowbed Trailer + Kenya`

Before work: read `AGENTS.md`, run `git status`, inspect the latest commit, install with `pnpm install`, and run lint, typecheck, tests and build.
