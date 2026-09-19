import type { Company, Evidence, SearchPlan } from "./schemas";

export type SearchInput = { query: string; country: string; limit?: number; page?: number };
export type SearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  query: string;
  provider: string;
  retrievedAt: string;
  isMock: boolean;
};

export interface AIProvider {
  planSearch(input: { product: string; description?: string; country: string; city?: string; buyerType?: string }): Promise<SearchPlan>;
  analyzeCompany(company: Company, evidence: Evidence[], product: string): Promise<Record<string, unknown>>;
  analyzeInquiry(text: string): Promise<Record<string, unknown>>;
}

export interface SearchProvider {
  readonly name: string;
  readonly isMock: boolean;
  search(input: SearchInput): Promise<SearchResult[]>;
}

export type EnrichmentContact = {
  name: string | null;
  position: string;
  linkedinUrl: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  sourceUrl: string | null;
  confidence: number;
  verificationStatus: "verified" | "unverified" | "not_applicable";
};

export interface EnrichmentProvider {
  readonly name: string;
  enrichCompany(input: { domain: string; country: string }): Promise<{ contacts: EnrichmentContact[]; evidence: Evidence[] }>;
}

export interface EmailVerificationProvider {
  readonly name: string;
  verify(email: string): Promise<{ status: "valid" | "invalid" | "risky" | "unknown"; provider: string; checkedAt: string }>;
}
