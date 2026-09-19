import type { Lead } from "../schemas";

export interface LeadRepository {
  list(): Promise<Lead[]>;
  upsertMany(leads: Lead[]): Promise<Lead[]>;
  update(id: string, patch: Partial<Lead>): Promise<Lead | null>;
}

export class LocalStorageLeadRepository implements LeadRepository {
  private cachedRaw = "";
  private cachedLeads: Lead[] = [];

  constructor(private readonly storage: Storage, private readonly key = "atlas-leads-v1") {}

  async list(): Promise<Lead[]> {
    return this.read();
  }

  private read(): Lead[] {
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

  async upsertMany(incoming: Lead[]): Promise<Lead[]> {
    const byId = new Map(this.read().map((lead) => [lead.id, lead]));
    incoming.forEach((lead) => byId.set(lead.id, lead));
    return this.persist([...byId.values()]);
  }

  async update(id: string, patch: Partial<Lead>): Promise<Lead | null> {
    const leads = [...this.read()];
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

// Both browser-local and Supabase implementations use this boundary so pages stay provider-independent.
