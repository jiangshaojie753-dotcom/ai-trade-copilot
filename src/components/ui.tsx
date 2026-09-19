import { AlertTriangle, CheckCircle2, FlaskConical, Info, LoaderCircle } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function MockBanner({ compact = false }: { compact?: boolean }) {
  return <div className={`mock-banner ${compact ? "compact" : ""}`}><FlaskConical size={18} /><div><b>Mock Data</b><span>This demonstration uses fictional companies and simulated provider responses. Nothing shown is a real lead.</span></div></div>;
}

export function EmptyState({ icon, title, description, children }: { icon?: React.ReactNode; title: string; description: string; children?: React.ReactNode }) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{description}</p>{children}</div>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "blue" | "red" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "success" ? CheckCircle2 : Info;
  return <div className={`notice ${tone}`}><Icon size={17} /><span>{children}</span></div>;
}

export function Spinner({ label = "Working…" }: { label?: string }) {
  return <span className="spinner"><LoaderCircle size={18} />{label}</span>;
}
