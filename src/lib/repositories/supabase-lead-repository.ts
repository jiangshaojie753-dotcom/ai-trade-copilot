import type { SupabaseClient, User } from "@supabase/supabase-js";
import { leadSchema, type Lead } from "../schemas";
import type { LeadRepository } from "./lead-repository";

type DbRow = Record<string, unknown>;

export class SupabaseLeadRepository implements LeadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Lead[]> {
    const user = await requireUser(this.client);
    const { data, error } = await this.client
      .from("leads")
      .select("snapshot")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
      const parsed = leadSchema.safeParse((row as DbRow).snapshot);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async upsertMany(leads: Lead[]): Promise<Lead[]> {
    const user = await requireUser(this.client);
    await ensureProfile(this.client, user);
    const saved: Lead[] = [];
    for (const lead of leads) saved.push(await this.upsertOne(user.id, lead));
    return saved;
  }

  async update(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const user = await requireUser(this.client);
    const { data: existing, error: readError } = await this.client
      .from("leads")
      .select("snapshot")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) return null;
    const current = leadSchema.parse((existing as DbRow).snapshot);
    const next = leadSchema.parse({ ...current, ...patch, id, updatedAt: new Date().toISOString() });
    const { error } = await this.client
      .from("leads")
      .update({
        status: next.status,
        last_contact_at: next.lastContact,
        next_follow_up_at: next.nextFollowUp,
        notes: next.notes,
        snapshot: next,
        updated_at: next.updatedAt,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return next;
  }

  private async upsertOne(userId: string, input: Lead): Promise<Lead> {
    const canonicalKey = input.company.domain.trim().toLowerCase() || input.company.name.trim().toLowerCase();
    const { data: company, error: companyError } = await this.client
      .from("companies")
      .upsert({
        user_id: userId,
        name: input.company.name,
        domain: input.company.domain,
        website: input.company.website,
        country: input.company.country,
        city: input.company.city,
        address: input.company.address ?? null,
        industry: input.company.industry,
        description: input.company.description,
        company_type: input.company.buyerType,
        products_services: input.company.products,
        public_business_phone: input.company.publicBusinessPhone ?? null,
        canonical_key: canonicalKey,
        is_mock: input.company.isMock,
        updated_at: input.updatedAt,
      }, { onConflict: "user_id,canonical_key" })
      .select("id")
      .single();
    if (companyError) throw companyError;

    const { data: leadRow, error: leadError } = await this.client
      .from("leads")
      .upsert({
        user_id: userId,
        company_id: company.id,
        buyer_type: input.company.buyerType,
        potential_products: input.company.potentialProducts,
        source: input.source,
        status: input.status,
        last_contact_at: input.lastContact,
        next_follow_up_at: input.nextFollowUp,
        notes: input.notes,
        analysis: input.analysis,
        snapshot: input,
        is_mock: input.company.isMock,
        updated_at: input.updatedAt,
      }, { onConflict: "user_id,company_id" })
      .select("id")
      .single();
    if (leadError) throw leadError;

    const normalized = leadSchema.parse({
      ...input,
      id: leadRow.id,
      company: { ...input.company, id: company.id },
    });
    const { error: snapshotError } = await this.client
      .from("leads")
      .update({ snapshot: normalized })
      .eq("id", leadRow.id)
      .eq("user_id", userId);
    if (snapshotError) throw snapshotError;

    await Promise.all([
      this.persistEvidence(userId, company.id, normalized),
      this.persistContacts(userId, company.id, normalized),
      this.persistScore(userId, leadRow.id, normalized),
      this.persistActivity(userId, leadRow.id, normalized),
    ]);
    return normalized;
  }

  private async persistEvidence(userId: string, companyId: string, lead: Lead) {
    if (!lead.evidence.length) return;
    const rows = lead.evidence.map((item) => ({
      user_id: userId,
      company_id: companyId,
      field: item.field,
      value: item.value,
      source_url: item.sourceUrl,
      source_type: item.sourceType,
      provider: item.provider ?? null,
      verification_status: item.verificationStatus ?? null,
      confidence: item.confidence,
      retrieved_at: item.retrievedAt,
      is_mock: item.isMock,
      fingerprint: fingerprint([item.field, item.value, item.sourceUrl]),
    }));
    const { error } = await this.client.from("company_evidence").upsert(rows, { onConflict: "user_id,company_id,fingerprint" });
    if (error) throw error;
  }

  private async persistContacts(userId: string, companyId: string, lead: Lead) {
    if (!lead.contacts.length) return;
    const rows = lead.contacts.map((item) => ({
      user_id: userId,
      company_id: companyId,
      name: item.name,
      position: item.position,
      linkedin_url: item.linkedinUrl,
      public_business_email: item.publicBusinessEmail,
      public_business_phone: item.publicBusinessPhone,
      public_whatsapp: item.publicWhatsApp ?? null,
      social_links: item.socialLinks ?? [],
      source_url: item.sourceUrl,
      confidence: item.confidence,
      is_mock: item.isMock,
      source_key: fingerprint([item.name, item.position, item.publicBusinessEmail, item.publicBusinessPhone, item.sourceUrl]),
      updated_at: lead.updatedAt,
    }));
    const { error } = await this.client.from("contacts").upsert(rows, { onConflict: "user_id,company_id,source_key" });
    if (error) throw error;
  }

  private async persistScore(userId: string, leadId: string, lead: Lead) {
    const { error } = await this.client.from("lead_scores").upsert({
      user_id: userId,
      lead_id: leadId,
      total: lead.score.total,
      breakdown: lead.score.breakdown,
      rules_version: "phase2-v1",
      calculated_at: lead.updatedAt,
    }, { onConflict: "lead_id,rules_version" });
    if (error) throw error;
  }

  private async persistActivity(userId: string, leadId: string, lead: Lead) {
    const dedupeKey = fingerprint([leadId, "research", lead.updatedAt]);
    const { error } = await this.client.from("activities").upsert({
      user_id: userId,
      lead_id: leadId,
      activity_type: "research",
      title: lead.company.isMock ? "Mock discovery saved" : "Company research saved",
      body: lead.notes,
      metadata: { source: lead.source, isMock: lead.company.isMock },
      occurred_at: lead.updatedAt,
      dedupe_key: dedupeKey,
    }, { onConflict: "user_id,dedupe_key" });
    if (error) throw error;
  }
}

export async function requireUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to Supabase before using cloud persistence.");
  return data.user;
}

async function ensureProfile(client: SupabaseClient, user: User) {
  const { error } = await client.from("users").upsert({
    id: user.id,
    display_name: user.user_metadata?.display_name ?? user.email ?? "Sales workspace",
  }, { onConflict: "id" });
  if (error) throw error;
}

function fingerprint(parts: Array<string | null | undefined>) {
  const value = parts.map((part) => part ?? "").join("|");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
