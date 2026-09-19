"use client";

import { Check, ChevronRight, Search, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { LeadCard } from "@/components/lead-card";
import { MockBanner, PageHeader, Spinner } from "@/components/ui";
import { saveLeads } from "@/lib/lead-store";
import type { DiscoveryResponse } from "@/lib/mock-pipeline";

export default function DiscoverPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Discovery failed");
      setResult(json); saveLeads(json.leads);
    } catch (err) { setError(err instanceof Error ? err.message : "Discovery failed"); } finally { setLoading(false); }
  }
  return <>
    <PageHeader eyebrow="Core workflow" title="Discover customers" description="Start with a product and market. Atlas plans the search, processes provider results, resolves companies and adds scored leads to the CRM." />
    <MockBanner />
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field"><label htmlFor="product">Product <span>*</span></label><input id="product" name="product" required defaultValue="80T Lowbed Trailer" placeholder="e.g. 80T Lowbed Trailer" /></div>
        <div className="field"><label htmlFor="country">Target country <span>*</span></label><input id="country" name="country" required defaultValue="Kenya" placeholder="e.g. Kenya" /></div>
        <div className="field full"><label htmlFor="description">Product description</label><textarea id="description" name="description" placeholder="Optional specifications, applications and differentiators" defaultValue="Heavy-duty lowbed trailer for transporting excavators, bulldozers and mining equipment." /></div>
        <div className="field"><label htmlFor="city">Target city</label><input id="city" name="city" placeholder="Optional" /></div>
        <div className="field"><label htmlFor="buyerType">Buyer type</label><select id="buyerType" name="buyerType" defaultValue="Auto"><option>Auto</option><option>Distributor</option><option>Dealer</option><option>End User</option><option>Fleet Operator</option></select></div>
      </div>
      {error ? <p className="notice warning">{error}</p> : null}
      <div className="form-actions"><button className="action-button" disabled={loading}>{loading ? <Spinner label="Running pipeline…" /> : <><Search size={17} /> Discover customers</>}</button></div>
    </form>
    {result ? <section>
      <div className="pipeline">{result.stages.map((stage) => <div className="pipeline-step" key={stage.key}><span><Check size={15} /></span><b>{stage.label}</b><small>{stage.count} items</small></div>)}</div>
      <div className="section-title"><div><h2>Discovery results</h2><p>{result.leads.length} deduplicated companies saved to the local CRM</p></div></div>
      <div className="result-layout">
        <aside className="content-card plan-panel"><h3><Sparkles size={17} /> Search plan</h3><p>{result.plan.productSummary}</p><h4>Use cases</h4><div className="tag-list">{result.plan.useCases.map((item) => <span key={item}>{item}</span>)}</div><h4>Generated queries</h4><div className="query-list">{result.plan.queries.map((item) => <code key={item.query}>{item.query}</code>)}</div><h4>Decision makers</h4><div className="tag-list">{result.plan.decisionMakerRoles.map((item) => <span key={item}>{item}</span>)}</div></aside>
        <div className="leads-grid">{result.leads.map((lead) => <LeadCard lead={lead} key={lead.id} />)}</div>
      </div>
    </section> : null}
    {!result && !loading ? <div className="empty-state" style={{ marginTop: 22 }}><ChevronRight /><h3>Ready to run the full pipeline</h3><p>The default example will generate a structured plan, 12 Mock search results, 3 resolved companies, research evidence, scores and CRM records.</p></div> : null}
  </>;
}
