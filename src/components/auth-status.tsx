"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resetLeadRepository } from "@/lib/lead-store";

export function AuthStatus() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const client = createClient();
    void client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      resetLeadRepository();
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);

  if (!configured) return <small>Local repository · Supabase not configured</small>;
  if (!email) return <Link href="/auth" className="text-button">Sign in for cloud CRM</Link>;
  return <div><small>{email}</small><br /><button className="text-button" onClick={async () => { await createClient().auth.signOut(); }}>Sign out</button></div>;
}
