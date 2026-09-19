# Atlas — AI B2B Sales Copilot

Phase 1 evidence-first sales intelligence prototype for export sales teams.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, choose **Discover Customers**, and run the pre-filled `80T Lowbed Trailer + Kenya` example. The app saves fictional Mock leads in browser storage so the CRM and detail pages remain usable after navigation.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Data safety

This build does not call live search, enrichment or AI providers. Every fictional record is labelled **Mock Data**. Facts carry source metadata; AI conclusions are rendered as inference; missing contacts show Unknown.

See [docs/architecture.md](docs/architecture.md) for the system design, routes, provider contracts, integration map and Phase 1–3 plan. The Supabase reference schema is at [supabase/schema.sql](supabase/schema.sql). No Supabase project or GitHub repository is created by this build.
