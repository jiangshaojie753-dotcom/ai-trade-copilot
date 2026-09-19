# AI Trade Copilot Phase 2 Architecture

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

Phase 2 keeps the labelled Mock flow and adds a provider-independent real discovery path. CRM records use `SupabaseLeadRepository` when configured and authenticated, with `LocalStorageLeadRepository` as the development fallback. Search and inquiry persistence have their own repository boundaries. Provider secrets must never enter `NEXT_PUBLIC_*` variables.

```text
Product + Country
  -> structured Search Plan
  -> MockSearchProvider OR RealSearchProvider
  -> search-result filtering and official-domain candidates
  -> entity resolution
  -> public homepage/about/products/contact research
  -> evidence ledger
  -> evidence-based buyer inference
  -> deterministic score
  -> LeadRepository -> Supabase (configured production) / LocalStorage (development fallback)
```

## Routes

| Route | Purpose | Phase 1 state |
| --- | --- | --- |
| `/` | Dashboard and three primary entry points | Complete |
| `/discover` | Product + market discovery pipeline | Explicit Real/Mock modes; real adapter needs credentials |
| `/research` | Known-company research | Complete with Mock research |
| `/inquiries` | Manual inquiry parsing | Complete with Mock AI |
| `/leads` | Unified lead database | Complete with local persistence |
| `/leads/[id]` | Evidence, inference and score detail | Complete |
| `/products` | Product knowledge base | Schema placeholder |
| `/api/discover` | Validated discovery orchestration | Real/Mock separation with provider errors |
| `/api/inquiries/analyze` | Validated inquiry extraction | Mock implementation |

## Provider boundaries

- `AIProvider`: structured search planning, company analysis and inquiry analysis. Responses must be schema-validated.
- `SearchProvider`: returns real search-result records only; the model never supplies company names.
- `EnrichmentProvider`: returns public company/contact data with source, provider and verification metadata.
- `EmailVerificationProvider`: independently verifies discovered business emails.

## Structured outputs

Zod schemas in `src/lib/schemas.ts` are the runtime contracts for search planning, evidence, companies, contacts, scores, leads and inquiry extraction. Provider output is rejected if it does not validate.

## Entity resolution

The deterministic resolver matches domain, company name + country, public phone and address. Later versions should add redirect history, manual merge/unmerge and an audit trail.

## Lead scoring

The program, not the model, calculates the score: Industry 25, Product/Use Case 25, Buying Signal 20, Authenticity 10, Target Market 10, Decision-Maker Reachability 10. Each component links to relevant evidence IDs and a rules version is persisted.

## Real integrations required

| Capability | Needs real provider | Phase 1 |
| --- | --- | --- |
| Web search results | Google Programmable Search JSON API | Adapter implemented; key and Search Engine ID absent |
| AI planning/analysis | Yes — server-side structured-output capable model API | Deterministic Mock |
| Company/contact enrichment | Yes — compliant licensed B2B data provider | Interface only |
| Email verification | Yes — verification API | Interface only |
| Supabase Auth/Postgres | Yes for multi-user persistence | SQL and clients prepared, not provisioned |
| Made-in-China inbox | No in Phase 1; manual paste only | Manual paste |

## Delivery phases

### Phase 1 — delivered here

Architecture, secure schema, routes, Provider interfaces, Evidence model, structured outputs, three home entries, local CRM and the complete clickable Mock discovery flow. Quality gates include lint, strict typecheck, tests and production build.

### Phase 2 — in progress

The first real Search Provider adapter, caches, company research, entity resolution, Real/Mock failure handling, Auth UI and Supabase repositories are implemented. Remaining work: link the existing single Supabase project, apply/verify migrations and advisors, configure and live-test search, and select a real AI adapter. Do not automate sending.

### Phase 3

Licensed enrichment and email verification, product-file ingestion and matching, timeline analytics, buying-signal monitoring, similar-buyer discovery, team workspaces, deletion/export controls and operational cost dashboards.

## Security and compliance

- All public-schema tables use RLS and ownership predicates.
- Data API privileges are explicit because new Supabase projects no longer auto-expose tables.
- Publishable keys may be client-visible; secret/service-role/provider keys are server-only.
- No private contact guesses, access-control bypass, automated platform login or unauthorized scraping.
- Unknown remains Unknown, Mock is visually labelled, and generated sales messages require user approval.
