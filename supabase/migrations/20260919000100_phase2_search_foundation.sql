-- Generated locally for Phase 2. Review before applying to a selected Supabase project.
-- The local CLI download was unavailable in this environment, so no remote migration was applied.

alter table if exists public.companies
  add column if not exists address text,
  add column if not exists public_business_phone text;

alter table if exists public.contacts
  add column if not exists social_links jsonb not null default '[]'::jsonb;

alter table if exists public.search_queries
  add column if not exists use_case text;

alter table if exists public.search_results
  add column if not exists cache_key text,
  add column if not exists expires_at timestamptz;

alter table if exists public.research_jobs
  add column if not exists cache_key text,
  add column if not exists expires_at timestamptz,
  add column if not exists pages_visited text[] not null default '{}';

create index if not exists search_results_cache_idx
  on public.search_results(user_id, cache_key, expires_at);

create index if not exists research_jobs_cache_idx
  on public.research_jobs(user_id, cache_key, expires_at);
