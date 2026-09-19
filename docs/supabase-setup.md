# Supabase setup

The cloud project is `QingFeng / ai-trade-copilot` (`lpurhtfaqfpzaykoedew`). It is deployed and live-verified. Never create or link a second project.

## Create or select the project

1. Select the existing `QingFeng / ai-trade-copilot` project and copy its project ref. Do not create a project.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted only for compatibility.
4. Keep `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` server-only. Neither is required by browser repositories.

## Apply and verify the database

Link the CLI to the selected project, review the SQL files, then apply migrations through the normal Supabase migration workflow. `supabase/schema.sql` is the reference schema. `20260919000000_initial_schema.sql` creates the complete Phase 2 schema from an empty database; later files are incremental.

After migration, verify:

- every table in `public` has RLS enabled;
- ownership policies use `(select auth.uid()) = user_id`;
- update policies contain both `using` and `with check`;
- authenticated Data API grants exist only for the required CRUD operations;
- `anon` has no table privileges;
- Security Advisor and Performance Advisor have no unreviewed critical findings.

The app selects `SupabaseLeadRepository` when the public project URL/key are configured and otherwise uses `LocalStorageLeadRepository`. Cloud mode requires an authenticated user. Auth + RLS Lead create, new-client login/read, and cleanup were live-verified. Discovery also persists search jobs/queries/results, and inquiry analysis persists inquiry records.
