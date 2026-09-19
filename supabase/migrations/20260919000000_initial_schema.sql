-- Complete Phase 2 bootstrap migration for an empty Supabase database.
-- This migration intentionally sorts before later Phase 2 incremental migrations.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  description text,
  specifications jsonb not null default '{}'::jsonb,
  applications text[] not null default '{}',
  moq text,
  price_range text,
  lead_time text,
  certifications text[] not null default '{}',
  options jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  selling_points text[] not null default '{}',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  legal_name text,
  domain text,
  website text,
  country text,
  city text,
  address text,
  industry text,
  description text,
  company_type text,
  products_services text[] not null default '{}',
  public_business_phone text,
  canonical_key text not null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, canonical_key)
);

create table if not exists public.company_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  field text not null,
  value text not null,
  source_url text not null,
  source_type text not null,
  provider text,
  verification_status text,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  retrieved_at timestamptz not null,
  fingerprint text not null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, company_id, fingerprint)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text,
  position text,
  linkedin_url text,
  public_business_email text,
  public_business_phone text,
  public_whatsapp text,
  social_links jsonb not null default '[]'::jsonb,
  source_url text,
  source_provider text,
  verification_status text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  retrieved_at timestamptz,
  source_key text not null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id, source_key)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  buyer_type text,
  potential_products text[] not null default '{}',
  source text not null,
  status text not null default 'New Lead' check (status in ('New Lead','Researched','Qualified','Contacted','Replied','Requirement Confirmed','Quoted','Negotiating','Won','Lost','Follow-up Later')),
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  analysis jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  inquiry_text text not null,
  buyer_name text,
  company_name text,
  country text,
  email text,
  phone text,
  product text,
  website text,
  other_information text,
  extracted_data jsonb not null default '{}'::jsonb,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_text text not null,
  country text not null,
  city text,
  buyer_type text,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  provider text,
  is_mock boolean not null default false,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  cache_key text,
  cost_units numeric(12,4),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.search_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  search_job_id uuid not null references public.search_jobs(id) on delete cascade,
  query text not null,
  intent text,
  buyer_type text,
  use_case text,
  structured_plan jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.search_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  search_query_id uuid not null references public.search_queries(id) on delete cascade,
  title text not null,
  url text not null,
  snippet text,
  provider text not null,
  retrieved_at timestamptz not null,
  is_mock boolean not null default false,
  raw_payload jsonb,
  cache_key text,
  expires_at timestamptz,
  unique (search_query_id, url)
);

create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  provider text,
  is_mock boolean not null default false,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  cache_key text,
  expires_at timestamptz,
  pages_visited text[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  total smallint not null check (total between 0 and 100),
  breakdown jsonb not null,
  rules_version text not null,
  calculated_at timestamptz not null default now(),
  unique (lead_id, rules_version)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null check (activity_type in ('research','contact','reply','quote','follow_up','negotiation','status_change','note')),
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  occurred_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create table if not exists public.buying_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  signal_type text not null,
  summary text not null,
  source_url text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  detected_at timestamptz not null,
  recommended_action text,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  generation_type text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_snapshot jsonb not null,
  structured_output jsonb not null,
  evidence_ids uuid[] not null default '{}',
  approved_by_user boolean not null default false,
  is_mock boolean not null default false,
  token_usage jsonb,
  estimated_cost numeric(12,6),
  created_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists companies_domain_idx on public.companies(user_id, domain);
create index if not exists company_evidence_user_id_idx on public.company_evidence(user_id);
create index if not exists evidence_company_idx on public.company_evidence(company_id, field);
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_company_idx on public.contacts(company_id);
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists leads_product_id_idx on public.leads(product_id);
create index if not exists leads_pipeline_idx on public.leads(user_id, status, updated_at desc);
create index if not exists inquiries_user_id_idx on public.inquiries(user_id);
create index if not exists inquiries_lead_id_idx on public.inquiries(lead_id);
create index if not exists search_jobs_user_id_idx on public.search_jobs(user_id);
create index if not exists search_jobs_product_id_idx on public.search_jobs(product_id);
create index if not exists jobs_status_idx on public.search_jobs(user_id, status, created_at);
create index if not exists search_queries_user_id_idx on public.search_queries(user_id);
create index if not exists search_queries_job_id_idx on public.search_queries(search_job_id);
create index if not exists search_results_user_id_idx on public.search_results(user_id);
create index if not exists search_results_query_id_idx on public.search_results(search_query_id);
create index if not exists search_results_cache_idx on public.search_results(user_id, cache_key, expires_at);
create index if not exists research_jobs_user_id_idx on public.research_jobs(user_id);
create index if not exists research_jobs_company_id_idx on public.research_jobs(company_id);
create index if not exists research_jobs_cache_idx on public.research_jobs(user_id, cache_key, expires_at);
create index if not exists lead_scores_user_id_idx on public.lead_scores(user_id);
create index if not exists lead_scores_lead_id_idx on public.lead_scores(lead_id);
create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists activities_lead_idx on public.activities(lead_id, occurred_at desc);
create index if not exists buying_signals_user_id_idx on public.buying_signals(user_id);
create index if not exists buying_signals_company_id_idx on public.buying_signals(company_id);
create index if not exists ai_generations_user_id_idx on public.ai_generations(user_id);
create index if not exists ai_generations_lead_id_idx on public.ai_generations(lead_id);

alter table public.users enable row level security;
drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;
drop policy if exists users_delete_own on public.users;
create policy users_select_own on public.users for select to authenticated using ((select auth.uid()) = id);
create policy users_insert_own on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy users_delete_own on public.users for delete to authenticated using ((select auth.uid()) = id);

do $$
declare table_name text;
begin
  foreach table_name in array array['products','companies','company_evidence','contacts','leads','inquiries','search_jobs','search_queries','search_results','research_jobs','lead_scores','activities','buying_signals','ai_generations']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email, 'Sales workspace'))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

insert into public.users (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', email, 'Sales workspace') from auth.users
on conflict (id) do nothing;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.users, public.products, public.companies, public.company_evidence,
  public.contacts, public.leads, public.inquiries, public.search_jobs, public.search_queries, public.search_results,
  public.research_jobs, public.lead_scores, public.activities, public.buying_signals, public.ai_generations to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
