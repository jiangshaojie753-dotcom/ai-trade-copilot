"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Database, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useLeads } from "@/lib/lead-store";

const entries = [
  { href: "/discover", icon: Compass, title: "Discover Customers", description: "Turn a product and target market into evidence-backed company candidates." },
  { href: "/research", icon: Search, title: "Research Customer", description: "Investigate a known company and keep sourced facts separate from AI inference." },
  { href: "/inquiries", icon: MessageSquareText, title: "Analyze Inquiry", description: "Extract purchase intent, missing details and next actions from a pasted inquiry." },
];

export default function DashboardPage() {
  const leads = useLeads();
  const stats = useMemo(() => [
    ["Total leads", leads.length],
    ["Qualified", leads.filter((lead) => lead.status === "Qualified").length],
    ["Contacted", leads.filter((lead) => ["Contacted", "Replied", "Quoted", "Negotiating", "Won"].includes(lead.status)).length],
    ["Won", leads.filter((lead) => lead.status === "Won").length],
  ], [leads]);
  return <>
    <section className="hero">
      <p className="eyebrow">Evidence-first prospecting</p>
      <h1>Find the right buyers.<br />Know why they fit.</h1>
      <p>Atlas helps export sales teams discover, research and qualify B2B customers without presenting AI guesses as facts.</p>
      <div className="hero-meta"><span><ShieldCheck size={17} /> Source-aware intelligence</span><span><CheckCircle2 size={17} /> Deterministic lead scoring</span><span><Database size={17} /> One shared CRM</span></div>
    </section>
    <section className="entry-grid">
      {entries.map(({ href, icon: Icon, title, description }) => <article className="entry-card" key={href}><span className="entry-icon"><Icon size={21} /></span><h2>{title}</h2><p>{description}</p><Link href={href}>Open workflow <ArrowRight size={17} /></Link></article>)}
    </section>
    <div className="section-title"><div><h2>Pipeline snapshot</h2><p>Local Mock workspace activity</p></div><Link className="text-button" href="/leads">Open Lead Database <ArrowRight size={15} /></Link></div>
    <section className="stats-grid">{stats.map(([label, value]) => <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{leads.length ? "Updated from local CRM" : "Run a discovery to begin"}</small></article>)}</section>
  </>;
}
