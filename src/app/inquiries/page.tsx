"use client";

import { FormEvent, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { MockBanner, Notice, PageHeader, Spinner, StatusPill } from "@/components/ui";
import type { InquiryAnalysis } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { SupabaseInquiryRepository } from "@/lib/repositories/supabase-inquiry-repository";

export default function InquiryPage() {
  const [analysis, setAnalysis] = useState<InquiryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const text = String(form.get("text"));
      const response = await fetch("/api/inquiries/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      const next = json.analysis as InquiryAnalysis;
      setAnalysis(next);
      if (isSupabaseConfigured()) {
        await new SupabaseInquiryRepository(createClient()).save({
          inquiryText: text,
          buyerName: String(form.get("buyerName") ?? ""),
          companyName: String(form.get("companyName") ?? ""),
          country: String(form.get("country") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          website: String(form.get("website") ?? ""),
          product: String(form.get("product") ?? ""),
        }, next, true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inquiry analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <PageHeader eyebrow="Inbound qualification" title="Analyze inquiry" description="Paste an inquiry to extract requirements, buying stage and the questions your salesperson should ask next." />
    <MockBanner />
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="text">Inquiry text <span>*</span></label><textarea id="text" name="text" required style={{ minHeight: 180 }} defaultValue="Hello, please quote your best price for 2 units of 80T lowbed trailers to transport excavators to Nairobi. We need the quotation urgently." /></div>
        <div className="field"><label>Buyer name</label><input name="buyerName" placeholder="Optional" /></div>
        <div className="field"><label>Company name</label><input name="companyName" placeholder="Optional" /></div>
        <div className="field"><label>Country</label><input name="country" placeholder="Optional" /></div>
        <div className="field"><label>Email</label><input name="email" type="email" placeholder="Optional" /></div>
        <div className="field"><label>Phone</label><input name="phone" placeholder="Optional" /></div>
        <div className="field"><label>Website</label><input name="website" type="url" placeholder="Optional" /></div>
        <div className="field"><label>Product</label><input name="product" placeholder="Optional" /></div>
      </div>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      <div className="form-actions"><button className="action-button" disabled={loading}>{loading ? <Spinner label="Analyzing…" /> : <><MessageSquareText size={16} /> Analyze inquiry</>}</button></div>
    </form>
    {analysis ? <section className="content-card" style={{ marginTop: 22 }}>
      <div className="card-section"><div className="section-title" style={{ margin: 0 }}><div><h2>Structured analysis</h2><p>AI-extracted fields — salesperson review required</p></div><StatusPill tone="amber">Mock AI</StatusPill></div></div>
      <div className="card-section inquiry-result">{[["Requested product", analysis.requestedProduct ?? "Unknown"], ["Quantity", analysis.quantity ?? "Unknown"], ["Application", analysis.application ?? "Unknown"], ["Destination", analysis.destination ?? "Unknown"], ["Timeline", analysis.purchaseTimeline ?? "Unknown"], ["Buying stage", analysis.buyingStage]].map(([label, value]) => <div className="fact" key={label}><label>{label}</label><p>{value}</p></div>)}</div>
      <div className="card-section"><h2>Missing information</h2><div className="tag-list">{analysis.missingInformation.map((item) => <span key={item}>{item}</span>)}</div></div>
    </section> : null}
  </>;
}
