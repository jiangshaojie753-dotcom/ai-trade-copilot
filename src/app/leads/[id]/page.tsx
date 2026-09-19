"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, SearchX } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DataModeBanner, EmptyState, Notice, PageHeader, StatusPill } from "@/components/ui";
import { updateLead, useLeads } from "@/lib/lead-store";
import type { Lead } from "@/lib/schemas";

const statuses: Lead["status"][] = ["New Lead", "Researched", "Qualified", "Contacted", "Replied", "Requirement Confirmed", "Quoted", "Negotiating", "Won", "Lost", "Follow-up Later"];

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leads = useLeads();
  const [localLead, setLocalLead] = useState<Lead | null>(null);
  const lead = localLead ?? leads.find((item) => item.id === params.id) ?? null;
  if (!lead) return <EmptyState icon={<SearchX />} title="Lead not found" description="This lead may only exist in another browser session."><Link className="action-button" href="/leads">Back to Lead Database</Link></EmptyState>;
  function changeStatus(status: Lead["status"]) { const next = updateLead(lead!.id, { status }); if (next) setLocalLead(next); }
  return <>
    <Link className="text-button" href="/leads"><ArrowLeft size={15} /> Back to Lead Database</Link>
    <PageHeader eyebrow={`${lead.company.buyerType} · ${lead.company.country}`} title={lead.company.name} description={lead.company.description} action={<select aria-label="Lead status" value={lead.status} onChange={(e) => changeStatus(e.target.value as Lead["status"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>} />
    <DataModeBanner mode={lead.company.isMock ? "mock" : "real"} />
    <div className="detail-grid">
      <section className="content-card">
        <div className="card-section"><h2>Company facts</h2><div className="fact-grid"><div className="fact"><label>Official website</label><p><a className="text-button" href={lead.company.website} target="_blank" rel="noreferrer">{lead.company.domain} <ExternalLink size={13} /></a></p></div><div className="fact"><label>Location</label><p>{lead.company.city ?? "Unknown"}, {lead.company.country}</p></div><div className="fact"><label>Industry</label><p>{lead.company.industry}</p></div><div className="fact"><label>Buyer type</label><p>{lead.company.buyerType}</p></div><div className="fact"><label>Products / services</label><p>{lead.company.products.length ? lead.company.products.join(", ") : "Unknown"}</p></div><div className="fact"><label>Address</label><p>{lead.company.address ?? "Unknown"}</p></div></div></div>
        <div className="card-section"><h2>AI buyer analysis</h2><Notice tone="info">The section below contains inferences. It is not presented as verified company fact.</Notice><div className="inference-box" style={{ marginTop: 14 }}><b>Inference</b><p>{lead.analysis.summary}</p></div><div className="analysis-grid" style={{ marginTop: 14 }}><div className="analysis-item"><label>Potential demand</label><p>{lead.analysis.potentialDemand}</p></div><div className="analysis-item"><label>Recommended product</label><p>{lead.analysis.recommendedProduct}</p></div><div className="analysis-item"><label>Decision maker</label><p>{lead.analysis.recommendedDecisionMaker}</p></div><div className="analysis-item"><label>Opening angle</label><p>{lead.analysis.openingAngle}</p></div></div></div>
        <div className="card-section"><h2>Evidence ledger</h2>{lead.evidence.map((item) => <div className="evidence-row" key={item.id}><div><b>{item.field.replaceAll("_", " ")}</b><small> · {Math.round(item.confidence * 100)}%</small></div><span>{item.value}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={11} /></a></div>)}</div>
      </section>
      <aside>
        <section className="content-card"><div className="card-section"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><p className="eyebrow">Lead score</p><strong style={{ font: "500 42px Georgia" }}>{lead.score.total}</strong><span>/100</span></div><StatusPill tone={lead.score.total >= 75 ? "green" : "amber"}>{lead.status}</StatusPill></div></div><div className="card-section score-breakdown">{lead.score.breakdown.map((item) => <div className="score-line" key={item.key}><span>{item.label}</span><b>{item.points}/{item.maxPoints}</b><div><i style={{ width: `${item.points / item.maxPoints * 100}%` }} /></div></div>)}</div></section>
        <section className="content-card" style={{ marginTop: 16 }}><div className="card-section"><h2>Public contacts</h2>{lead.contacts.length ? lead.contacts.map((contact) => <div key={contact.id}><StatusPill tone={contact.isMock ? "amber" : "green"}>{contact.isMock ? "MOCK DATA" : "REAL PUBLIC DATA"}</StatusPill><p><b>{contact.name ?? "Name not found"}</b><br />{contact.position}</p><p style={{ color: "var(--muted)", fontSize: 12 }}>Email: {contact.publicBusinessEmail ?? "Unknown"}<br />Phone: {contact.publicBusinessPhone ?? "Unknown"}<br />WhatsApp: {contact.publicWhatsApp ?? "Unknown"}</p></div>) : <p style={{ color: "var(--muted)" }}>Unknown — no public business contact was found.</p>}</div></section>
      </aside>
    </div>
  </>;
}
