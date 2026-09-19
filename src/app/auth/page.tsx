"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Notice, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resetLeadRepository } from "@/lib/lead-store";

export default function AuthPage() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(formElement: HTMLFormElement, mode: "sign-in" | "sign-up") {
    if (!configured) return;
    setLoading(true); setError(""); setMessage("");
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const client = createClient();
    const result = mode === "sign-in"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data.session) {
      setMessage("Account created. Check the confirmation email, then sign in.");
      return;
    }
    resetLeadRepository();
    router.push("/leads");
  }

  return <>
    <PageHeader eyebrow="Cloud workspace" title="Supabase sign in" description="Sign in to use the same CRM data after refreshing or changing devices." />
    {!configured ? <Notice tone="warning">Supabase is not configured in this deployment. Add the public project URL and publishable key to enable cloud persistence.</Notice> : null}
    <form className="form-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(event.currentTarget, "sign-in"); }}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div className="field full"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /></div>
      </div>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      {message ? <Notice tone="info">{message}</Notice> : null}
      <div className="form-actions">
        <button className="action-button" disabled={!configured || loading}>{loading ? <Spinner label="Signing in…" /> : "Sign in"}</button>
        <button type="button" className="secondary-button" disabled={!configured || loading} onClick={(event) => void submit(event.currentTarget.form!, "sign-up")}>Create personal account</button>
      </div>
    </form>
  </>;
}
