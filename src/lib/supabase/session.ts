import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

export async function getSupabaseClientForCurrentSession(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const client = createClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  // This only selects local or cloud persistence in the browser. Cloud repositories
  // still call getUser(), and RLS remains the authorization boundary for every query.
  return data.session?.user ? client : null;
}
