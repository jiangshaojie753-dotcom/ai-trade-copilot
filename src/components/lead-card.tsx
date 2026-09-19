import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import type { Lead } from "@/lib/schemas";
import { StatusPill } from "./ui";

export function LeadCard({ lead }: { lead: Lead }) {
  const tone = lead.score.total >= 75 ? "green" : lead.score.total >= 60 ? "amber" : "neutral";
  return <article className="lead-card">
    <div className="lead-card-top"><span className="company-icon"><Building2 size={20} /></span><div><h3>{lead.company.name}</h3><p><MapPin size={14} />{lead.company.city ?? "Unknown city"}, {lead.company.country}</p></div><div className={`score-ring ${tone}`}><b>{lead.score.total}</b><span>/100</span></div></div>
    <div className="pill-row"><StatusPill tone="blue">{lead.company.buyerType}</StatusPill><StatusPill>{lead.company.industry}</StatusPill><StatusPill tone="amber">Mock</StatusPill></div>
    <p className="lead-summary">{lead.analysis.potentialDemand}</p>
    <div className="lead-card-foot"><span>{lead.evidence.length} evidence items</span><Link href={`/leads/${lead.id}`}>View intelligence <ArrowUpRight size={15} /></Link></div>
  </article>;
}
