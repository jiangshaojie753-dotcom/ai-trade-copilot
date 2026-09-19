import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryResponse } from "../discovery-types";
import type { SearchRepository } from "./search-repository";
import { requireUser } from "./supabase-lead-repository";

export class SupabaseSearchRepository implements SearchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveDiscovery(result: DiscoveryResponse, input: { product: string; country: string; city?: string; buyerType?: string }) {
    const user = await requireUser(this.client);
    const now = new Date().toISOString();
    const { data: job, error: jobError } = await this.client.from("search_jobs").insert({
      user_id: user.id,
      product_text: input.product,
      country: input.country,
      city: input.city || null,
      buyer_type: input.buyerType && input.buyerType !== "Auto" ? input.buyerType : null,
      status: "completed",
      provider: result.provider,
      is_mock: result.mode === "mock",
      attempt_count: 1,
      completed_at: now,
      started_at: now,
    }).select("id").single();
    if (jobError) throw jobError;

    for (const planned of result.plan.search_queries) {
      const { data: query, error: queryError } = await this.client.from("search_queries").insert({
        user_id: user.id,
        search_job_id: job.id,
        query: planned.query,
        intent: planned.intent,
        buyer_type: planned.buyer_type,
        use_case: planned.use_case,
        structured_plan: result.plan,
      }).select("id").single();
      if (queryError) throw queryError;
      const rows = result.searchResults
        .filter((item) => item.query === planned.query)
        .map((item) => ({
          user_id: user.id,
          search_query_id: query.id,
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          provider: item.provider,
          retrieved_at: item.retrievedAt,
          is_mock: item.isMock,
        }));
      if (rows.length) {
        const { error } = await this.client.from("search_results").upsert(rows, { onConflict: "search_query_id,url" });
        if (error) throw error;
      }
    }
  }
}
