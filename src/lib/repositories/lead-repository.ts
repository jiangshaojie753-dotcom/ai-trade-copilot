import type { Lead } from "../schemas";

export interface LeadRepository {
  list(): Lead[];
  upsertMany(leads: Lead[]): Lead[];
  update(id: string, patch: Partial<Lead>): Lead | null;
}

export class LocalStorageLeadRepository implements LeadRepository {
  private cachedRaw = "";
  private cachedLeads: Lead[] = [];

  constructor(private readonly storage: Storage, private readonly key = "atlas-leads-v1") {}

  list(): Lead[] {
    const raw = this.storage.getItem(this.key) ?? "[]";
    if (raw === this.cachedRaw) return this.cachedLeads;
    try {
      this.cachedLeads = JSON.parse(raw) as Lead[];
      this.cachedRaw = raw;
      return this.cachedLeads;
    } catch {
      return [];
    }
  }

  upsertMany(incoming: Lead[]): Lead[] {
    const byId = new Map(this.list().map((lead) => [lead.id, lead]));
    incoming.forEach((lead) => byId.set(lead.id, lead));
    return this.persist([...byId.values()]);
  }

  update(id: string, patch: Partial<Lead>): Lead | null {
    const leads = [...this.list()];
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    leads[index] = { ...leads[index], ...patch, updatedAt: new Date().toISOString() };
    this.persist(leads);
    return leads[index];
  }

  private persist(leads: Lead[]) {
    const raw = JSON.stringify(leads);
    this.cachedRaw = raw;
    this.cachedLeads = leads;
    this.storage.setItem(this.key, raw);
    return leads;
  }
}

// A future Supabase repository must implement this same interface, keeping the UI unchanged.
