"use client";

import { Check, ChevronRight, RefreshCw, Search, Sparkles } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { LeadCard } from "@/components/lead-card";
import { DataModeBanner, Notice, PageHeader, Spinner } from "@/components/ui";
import { saveLeads } from "@/lib/lead-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { SupabaseSearchRepository } from "@/lib/repositories/supabase-search-repository";
import type { DiscoveryMode, DiscoveryResponse } from "@/lib/discovery-types";

type ErrorState = { message: string; code?: string; retryable?: boolean };
type RequestPayload = Record<string, FormDataEntryValue | number> & { mode: DiscoveryMode; page: number; maxCompanies: number };

export default function DiscoverPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<DiscoveryMode>("real");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [lastPayload, setLastPayload] = useState<RequestPayload | null>(null);

  async function run(payload: RequestPayload, append = false) {
    setLoading(true);
    setError(null);
    if (!append) setResult(null);
    setLastPayload(payload);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw Object.assign(new Error(json.error ?? "Discovery failed"), { code: json.code, retryable: json.retryable });
      const next = json as DiscoveryResponse;
      await saveLeads(next.leads);
      if (isSupabaseConfigured()) {
        await new SupabaseSearchRepository(createClient()).saveDiscovery(next, {
          product: String(payload.product),
          country: String(payload.country),
          city: payload.city ? String(payload.city) : undefined,
          buyerType: payload.buyerType ? String(payload.buyerType) : undefined,
        });
      }
      setResult((current) => append && current ? mergeResults(current, next) : next);
    } catch (caught) {
      const value = caught as Error & { code?: string; retryable?: boolean };
      setError({ message: value.message || "Discovery failed", code: value.code, retryable: value.retryable });
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    void run({ ...data, mode, page: 1, maxCompanies: 20 });
  }

  function retry() {
    if (lastPayload) void run(lastPayload);
  }

  function switchToMock() {
    if (!lastPayload) return;
    setMode("mock");
    void run({ ...lastPayload, mode: "mock", page: 1 });
  }

  function discoverMore() {
    if (!lastPayload || result?.mode !== "real") return;
    void run({ ...lastPayload, mode: "real", page: result.page + 1 }, true);
  }

  return <>
    <PageHeader eyebrow="Core workflow" title="Discover customers" description="Start with a product and market. Atlas plans buyer-oriented searches, discovers companies, researches public websites and creates evidence-backed leads." />
    <DataModeBanner mode={result?.mode ?? mode} />
    <form ref={formRef} className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field"><label htmlFor="product">Product <span>*</span></label><input id="product" name="product" required defaultValue="80T Lowbed Trailer" placeholder="e.g. 80T Lowbed Trailer" /></div>
        <div className="field"><label htmlFor="country">Target country <span>*</span></label><input id="country" name="country" required defaultValue="Kenya" placeholder="e.g. Kenya" /></div>
        <div className="field full"><label htmlFor="description">Product description</label><textarea id="description" name="description" placeholder="Optional specifications, applications and differentiators" defaultValue="Heavy-duty lowbed trailer for transporting excavators, bulldozers and mining equipment." /></div>
        <div className="field"><label htmlFor="city">Target city</label><input id="city" name="city" placeholder="Optional" /></div>
        <div className="field"><label htmlFor="buyerType">Buyer type</label><select id="buyerType" name="buyerType" defaultValue="Auto"><option>Auto</option><option>Distributor</option><option>Dealer</option><option>End User</option><option>Fleet Operator</option></select></div>
        <div className="field full"><label htmlFor="dataMode">Data mode</label><select id="dataMode" value={mode} onChange={(event) => setMode(event.target.value as DiscoveryMode)}><option value="real">REAL DATA — live provider required</option><option value="mock">MOCK DATA — fictional demo</option></select><small>Real mode never falls back to Mock automatically.</small></div>
      </div>
      {error ? <div className="error-panel"><Notice tone="warning"><span><b>{error.code ? `${error.code}: ` : ""}</b>{error.message}</span></Notice><div className="error-actions"><button type="button" className="secondary-button" onClick={retry} disabled={loading}><RefreshCw size={15} /> Retry</button><button type="button" className="secondary-button" onClick={switchToMock} disabled={loading}>Switch to Mock Demo</button></div></div> : null}
      <div className="form-actions"><button className="action-button" disabled={loading}>{loading ? <Spinner label="Running pipeline…" /> : <><Search size={17} /> Discover customers</>}</button></div>
    </form>
    {result ? <section>
      <div className="pipeline">{result.stages.map((stage) => <div className="pipeline-step" key={stage.key}><span><Check size={15} /></span><b>{stage.label}</b><small>{stage.count} items</small></div>)}</div>
      <div className="section-title"><div><h2>Discovery results</h2><p>{result.leads.length} deduplicated companies saved to CRM · {result.dataLabel}</p></div>{result.mode === "real" ? <button className="secondary-button" onClick={discoverMore} disabled={loading}><Search size={15} /> Discover More</button> : null}</div>
      <div className="result-layout">
        <aside className="content-card plan-panel"><h3><Sparkles size={17} /> Search plan</h3><h4>Use cases</h4><div className="tag-list">{result.plan.use_cases.map((item) => <span key={item}>{item}</span>)}</div><h4>Industries</h4><div className="tag-list">{result.plan.industries.map((item) => <span key={item}>{item}</span>)}</div><h4>Generated queries</h4><div className="query-list">{result.plan.search_queries.map((item) => <code key={item.query}>{item.query}<small>{item.buyer_type} · {item.use_case}</small></code>)}</div><h4>Decision makers</h4><div className="tag-list">{result.plan.decision_maker_roles.map((item) => <span key={item}>{item}</span>)}</div></aside>
        <div className="leads-grid">{result.leads.map((lead) => <LeadCard lead={lead} key={lead.id} />)}</div>
      </div>
    </section> : null}
    {!result && !loading ? <div className="empty-state" style={{ marginTop: 22 }}><ChevronRight /><h3>Choose a verified data mode</h3><p>Real mode requires a configured Search API and will stop with a specific error if unavailable. Mock mode uses clearly labelled fictional companies.</p></div> : null}
  </>;
}

function mergeResults(current: DiscoveryResponse, next: DiscoveryResponse): DiscoveryResponse {
  const leads = new Map(current.leads.map((lead) => [lead.id, lead]));
  next.leads.forEach((lead) => leads.set(lead.id, lead));
  const searchResults = new Map(current.searchResults.map((item) => [item.url, item]));
  next.searchResults.forEach((item) => searchResults.set(item.url, item));
  return { ...next, leads: [...leads.values()], searchResults: [...searchResults.values()] };
}
