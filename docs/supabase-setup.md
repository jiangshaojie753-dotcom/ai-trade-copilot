# Supabase setup

No cloud project is currently linked. Do not create a second project when one already exists.

## Create or select the project

1. The owner creates one Supabase project and grants the next developer access to that same project.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted only for compatibility.
4. Keep `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` server-only. Neither is required by the current local repository.

## Apply and verify the database

Link the CLI to the selected project, review the SQL files, then apply migrations through the normal Supabase migration workflow. `supabase/schema.sql` is the complete reference schema; `supabase/migrations/` contains incremental changes.

After migration, verify:

- every table in `public` has RLS enabled;
- ownership policies use `(select auth.uid()) = user_id`;
- update policies contain both `using` and `with check`;
- authenticated Data API grants exist only for the required CRUD operations;
- `anon` has no table privileges;
- Security Advisor and Performance Advisor have no unreviewed critical findings.

The current app intentionally uses `LocalStorageLeadRepository`. A future `SupabaseLeadRepository` must implement the same `LeadRepository` interface so pages do not change.
