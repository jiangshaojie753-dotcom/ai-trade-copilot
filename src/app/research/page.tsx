"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { LeadCard } from "@/components/lead-card";
import { MockBanner, Notice, PageHeader, Spinner } from "@/components/ui";
import { runMockDiscovery } from "@/lib/mock-pipeline";
import { saveLeads } from "@/lib/lead-store";
import type { Lead } from "@/lib/schemas";

export default function ResearchPage() {
  const [loading, setLoading] = useState(false); const [lead, setLead] = useState<Lead | null>(null); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.company && !values.country && !values.website) { setError("Provide at least a company name, country or website."); return; }
    setLoading(true); setError("");
    const result = await runMockDiscovery({ product: "80T Lowbed Trailer", country: String(values.country || "Kenya") });
    const selected = result.leads[0];
    selected.company.name = String(values.company || selected.company.name); selected.company.website = String(values.website || selected.company.website); selected.company.domain = selected.company.website.replace(/^https?:\/\//, "").replace(/\/$/, ""); selected.source = "Manual";
    saveLeads([selected]); setLead(selected); setLoading(false);
  }
  return <><PageHeader eyebrow="Known account" title="Research customer" description="Build a sourced company profile from information you already have. Missing data remains Unknown." /><MockBanner /><form className="form-panel" onSubmit={submit}><div className="form-grid"><div className="field"><label htmlFor="company">Company name</label><input id="company" name="company" placeholder="e.g. Acme Logistics" /></div><div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue="Kenya" /></div><div className="field full"><label htmlFor="website">Website</label><input id="website" name="website" type="url" placeholder="https://example.com" /></div></div>{error ? <Notice tone="warning">{error}</Notice> : null}<div className="form-actions"><button className="action-button" disabled={loading}>{loading ? <Spinner label="Researching…" /> : <><Search size={16} /> Research customer</>}</button></div></form>{lead ? <div style={{ marginTop: 22 }}><Notice tone="success">Mock research complete. Verified facts are shown with evidence; purchase need remains clearly labelled as inference.</Notice><div className="leads-grid" style={{ marginTop: 14 }}><LeadCard lead={lead} /></div></div> : null}</>;
}
