"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Database, MapPin, Plus } from "lucide-react";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { useLeads } from "@/lib/lead-store";

export default function LeadsPage() {
  const leads = useLeads();
  return <>
    <PageHeader eyebrow="Unified CRM" title="Lead Database" description="All companies from discovery, research and inquiry workflows live here." action={<Link className="action-button" href="/discover"><Plus size={16} /> Discover leads</Link>} />
    {!leads.length ? <EmptyState icon={<Database />} title="No leads yet" description="Run Discover Customers to create your first evidence-backed lead records."><Link className="action-button" href="/discover">Start discovery</Link></EmptyState> :
      <div className="table-wrap"><table><thead><tr><th>Company</th><th>Market</th><th>Buyer type</th><th>Source</th><th>Score</th><th>Status</th><th></th></tr></thead><tbody>
        {leads.map((lead) => <tr key={lead.id}>
          <td><div className="company-cell"><span><Building2 size={16} /></span><div><b>{lead.company.name}</b><small>{lead.company.domain}</small></div></div></td>
          <td><MapPin size={13} /> {lead.company.country}</td>
          <td>{lead.company.buyerType}</td>
          <td><StatusPill tone={lead.company.isMock ? "amber" : "green"}>{lead.source} · {lead.company.isMock ? "Mock" : "Real"}</StatusPill></td>
          <td><span className="score-number">{lead.score.total}</span>/100</td>
          <td><StatusPill tone={lead.status === "Qualified" ? "green" : "blue"}>{lead.status}</StatusPill></td>
          <td><Link className="text-button" href={`/leads/${lead.id}`}>Open <ArrowUpRight size={14} /></Link></td>
        </tr>)}
      </tbody></table></div>}
  </>;
}
