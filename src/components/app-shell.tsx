"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, Compass, Database, DatabaseZap, Menu, MessageSquareText, Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useLeads } from "@/lib/lead-store";

const links = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/discover", label: "Discover Customers", icon: Compass },
  { href: "/research", label: "Research Customer", icon: Search },
  { href: "/inquiries", label: "Analyze Inquiry", icon: MessageSquareText },
  { href: "/leads", label: "Lead Database", icon: Database },
  { href: "/products", label: "Products", icon: Building2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const count = useLeads().length;
  return (
    <div className="app-shell">
      <button className="mobile-menu" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>ATLAS</strong><small>B2B SALES COPILOT</small></span>
        </Link>
        <nav>
          <p className="nav-label">Workspace</p>
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={active ? "active" : ""} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span>{label === "Lead Database" && count > 0 ? <em>{count}</em> : null}</Link>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="mode-card"><DatabaseZap size={17} /><div><b>Provider-ready</b><span>Real and Mock stay separated</span></div></div>
          <div className="profile"><span>JS</span><div><b>Sales workspace</b><small>Phase 2 in progress</small></div></div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
