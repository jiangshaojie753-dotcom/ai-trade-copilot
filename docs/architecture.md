# Atlas Phase 1 Architecture

## Product architecture

All three entry points converge on one company entity and one lead record:

```text
Discover Customers ─┐
Research Customer  ─┼─> Company + Evidence ─> Lead + Score ─> CRM + Timeline
Analyze Inquiry    ─┘
```

The primary invariant is that observations and model conclusions never share the same storage field. `company_evidence` stores sourced observations. `ai_generations.structured_output` stores model output together with the input snapshot, prompt version and supporting evidence IDs.

## System architecture

```text
Next.js UI
  ├─ Route handlers (validation, auth boundary, rate limits)
  ├─ Domain services
  │   ├─ AIProvider
  │   ├─ SearchProvider
  │   ├─ EnrichmentProvider
  │   └─ EmailVerificationProvider
  ├─ Async jobs (search/research, retry, caching and cost counters)
  └─ Supabase
      ├─ Auth
      ├─ PostgreSQL + RLS
      └─ Storage (future product files)
```

Phase 1 runs its provider layer in Mock mode and keeps CRM records in browser storage. The SQL schema and Supabase clients are prepared, but no cloud project was created. In production, job workers must claim pending jobs server-side; provider secrets must never enter `NEXT_PUBLIC_*` variables.

## Routes

| Route | Purpose | Phase 1 state |
| --- | --- | --- |
| `/` | Dashboard and three primary entry points | Complete |
| `/discover` | Product + market discovery pipeline | Complete with Mock provider |
| `/research` | Known-company research | Complete with Mock research |
| `/inquiries` | Manual inquiry parsing | Complete with Mock AI |
| `/leads` | Unified lead database | Complete with local persistence |
| `/leads/[id]` | Evidence, inference and score detail | Complete |
| `/products` | Product knowledge base | Schema placeholder |
| `/api/discover` | Validated discovery orchestration | Mock implementation |
| `/api/inquiries/analyze` | Validated inquiry extraction | Mock implementation |

## Provider boundaries

- `AIProvider`: structured search planning, company analysis and inquiry analysis. Responses must be schema-validated.
- `SearchProvider`: returns real search-result records only; the model never supplies company names.
- `EnrichmentProvider`: returns public company/contact data with source, provider and verification metadata.
- `EmailVerificationProvider`: independently verifies discovered business emails.

## Structured outputs

Zod schemas in `src/lib/schemas.ts` are the runtime contracts for search planning, evidence, companies, contacts, scores, leads and inquiry extraction. Provider output is rejected if it does not validate.

## Entity resolution

The Phase 1 deterministic resolver normalizes domains and company names and scopes matches by country. Later versions should add verified phone/address matching, redirect history, manual merge/unmerge and an audit trail.

## Lead scoring

The program, not the model, calculates the score: Industry 25, Product/Use Case 25, Buying Signal 20, Authenticity 10, Target Market 10, Decision-Maker Reachability 10. Each component links to relevant evidence IDs and a rules version is persisted.

## Real integrations required

| Capability | Needs real provider | Phase 1 |
| --- | --- | --- |
| Web search results | Yes — recommended first integration: Google Programmable Search JSON API or Bing-compatible licensed API | Mock |
| AI planning/analysis | Yes — server-side structured-output capable model API | Deterministic Mock |
| Company/contact enrichment | Yes — compliant licensed B2B data provider | Interface only |
| Email verification | Yes — verification API | Interface only |
| Supabase Auth/Postgres | Yes for multi-user persistence | SQL and clients prepared, not provisioned |
| Made-in-China inbox | No in Phase 1; manual paste only | Manual paste |

## Delivery phases

### Phase 1 — delivered here

Architecture, secure schema, routes, Provider interfaces, Evidence model, structured outputs, three home entries, local CRM and the complete clickable Mock discovery flow. Quality gates include lint, strict typecheck, tests and production build.

### Phase 2

Create the selected Supabase project, generate and apply a reviewed migration, implement Auth and Postgres repositories, connect the first real Search Provider, connect a real AI Provider, add job processing/rate limits/retries/caching, and build review/approval screens. Do not automate sending.

### Phase 3

Licensed enrichment and email verification, product-file ingestion and matching, timeline analytics, buying-signal monitoring, similar-buyer discovery, team workspaces, deletion/export controls and operational cost dashboards.

## Security and compliance

- All public-schema tables use RLS and ownership predicates.
- Data API privileges are explicit because new Supabase projects no longer auto-expose tables.
- Publishable keys may be client-visible; secret/service-role/provider keys are server-only.
- No private contact guesses, access-control bypass, automated platform login or unauthorized scraping.
- Unknown remains Unknown, Mock is visually labelled, and generated sales messages require user approval.
