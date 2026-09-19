-- Restrict Data API roles to the CRUD operations used by the application.
revoke all on all tables in schema public from anon, authenticated;

grant select, insert, update, delete on public.users, public.products, public.companies, public.company_evidence,
  public.contacts, public.leads, public.inquiries, public.search_jobs, public.search_queries, public.search_results,
  public.research_jobs, public.lead_scores, public.activities, public.buying_signals, public.ai_generations to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
