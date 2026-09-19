import type { SearchResult } from "./providers";
import type { Lead, SearchPlan } from "./schemas";

export type DiscoveryMode = "mock" | "real";

export type DiscoveryResponse = {
  mode: DiscoveryMode;
  dataLabel: "MOCK DATA" | "REAL DATA";
  jobId: string;
  provider: string;
  plan: SearchPlan;
  searchResults: SearchResult[];
  leads: Lead[];
  stages: { key: string; label: string; count: number }[];
  page: number;
  maxCompanies: number;
};
