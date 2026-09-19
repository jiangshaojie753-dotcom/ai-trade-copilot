import { extractCompaniesFromSearchResults, type CompanyCandidate } from "./company-extraction";
import { deduplicateCompanies, normalizeDomain } from "./entity-resolution";
import { runMockDiscovery } from "./mock-pipeline";
import { createRealSearchProvider } from "./real-search-provider";
import { calculateLeadScore } from "./score";
import { planSearchWithFallback, type SearchPlannerInput } from "./search-planner";
import { leadSchema, type Company, type Evidence, type Lead } from "./schemas";
import { researchPublicWebsite } from "./website-research";
import type { DiscoveryMode, DiscoveryResponse } from "./discovery-types";

export type DiscoveryInput = SearchPlannerInput & {
  mode: DiscoveryMode;
  page?: number;
  maxCompanies?: number;
};

export async function runDiscovery(input: DiscoveryInput): Promise<DiscoveryResponse> {
  if (input.mode === "mock") return runMockDiscovery(input);
  return runRealDiscovery(input);
}

export async function runRealDiscovery(input: DiscoveryInput): Promise<DiscoveryResponse> {
  const maxCompanies = Math.max(1, Math.min(input.maxCompanies ?? 20, 20));
  const page = Math.max(1, input.page ?? 1);
  const plan = await planSearchWithFallback(input);
  const provider = createRealSearchProvider();
  const perQueryLimit = Math.max(3, Math.min(10, Math.ceil(maxCompanies / plan.search_queries.length) + 1));
  const nested = await Promise.all(plan.search_queries.map((item) => provider.search({
    query: item.query,
    country: input.country,
    limit: perQueryLimit,
    page,
  })));
  const searchResults = nested.flat();
  const extracted = extractCompaniesFromSearchResults(searchResults, input.country, maxCompanies * 2);
  const companies = deduplicateCompanies(extracted.map((candidate) => candidate.company)).slice(0, maxCompanies);
  const candidates = companies.map((company) => findCandidate(company, extracted));
  const researched = await mapWithConcurrency(candidates, 3, async (candidate) => {
    try {
      const website = await researchPublicWebsite(candidate.company);
      return {
        company: { ...website.company, potentialProducts: [input.product] },
        evidence: mergeEvidence(candidate.evidence, website.evidence),
        contacts: website.contacts,
      };
    } catch {
      return { company: { ...candidate.company, potentialProducts: [input.product] }, evidence: candidate.evidence, contacts: [] };
    }
  });
  const leads = researched.map((item) => createRealLead(item.company, item.evidence, item.contacts, input.product));
  return {
    mode: "real",
    dataLabel: "REAL DATA",
    jobId: `real-job-${globalThis.crypto.randomUUID()}`,
    provider: provider.name,
    plan,
    searchResults,
    leads,
    stages: [
      { key: "planner", label: "Search Planner", count: plan.search_queries.length },
      { key: "search", label: "Real Web Search", count: searchResults.length },
      { key: "extract", label: "Company Extraction", count: extracted.length },
      { key: "resolve", label: "Entity Resolution", count: companies.length },
      { key: "research", label: "Website Research", count: researched.length },
      { key: "score", label: "Lead Scoring", count: leads.length },
      { key: "crm", label: "CRM", count: leads.length },
    ],
    page,
    maxCompanies,
  };
}

function createRealLead(company: Company, evidence: Evidence[], contacts: Lead["contacts"], product: string): Lead {
  const text = `${company.industry} ${company.description} ${company.products.join(" ")}`.toLowerCase();
  const relevant = /haulage|logistics|transport|mining|construction|equipment|trailer|commercial vehicle/.test(text);
  const hasEmail = evidence.some((item) => item.field === "business_email" && item.value !== "Unknown" && item.confidence > 0);
  const hasPhone = evidence.some((item) => item.field === "phone" && item.value !== "Unknown" && item.confidence > 0);
  const hasWhatsApp = evidence.some((item) => item.field === "whatsapp" && item.value !== "Unknown" && item.confidence > 0);
  const score = calculateLeadScore({
    industryMatch: company.industry === "Unknown" ? 0 : relevant ? 24 : 12,
    useCaseMatch: relevant ? 22 : 8,
    buyingSignal: 0,
    authenticity: evidence.some((item) => item.sourceType === "official_website" && item.confidence > 0) ? 10 : 6,
    marketMatch: 7,
    reachability: Math.min(10, (hasEmail ? 5 : 0) + (hasPhone ? 3 : 0) + (hasWhatsApp ? 2 : 0)),
  }, evidence);
  const decisionMaker = /distribution|dealer/i.test(company.industry) ? "Managing Director / Procurement Manager" : "Fleet / Operations Manager";
  return leadSchema.parse({
    id: `lead-${stableId(company.domain)}`,
    company,
    contacts,
    evidence,
    score,
    status: score.total >= 75 ? "Qualified" : "Researched",
    source: "Google",
    lastContact: null,
    nextFollowUp: null,
    notes: "Discovered from real public web search. Missing fields remain Unknown; no contact data was invented.",
    analysis: {
      summary: `INFERENCE: ${company.name} may fit the ${company.buyerType.toLowerCase()} profile based on the public evidence listed below.`,
      possibleUseCases: company.products.length ? company.products : ["Verify use case with the company"],
      potentialDemand: `INFERENCE: The company may have a use case for ${product}; no active purchase intent has been verified.`,
      recommendedProduct: product,
      matchReason: relevant
        ? `Public company descriptions overlap with transport, heavy-equipment, construction, mining or channel use cases relevant to ${product}.`
        : `The company matched a buyer-oriented search query, but product relevance needs manual verification.`,
      painPoints: ["Payload and configuration fit must be verified", "Local road and compliance requirements are unknown"],
      recommendedDecisionMaker: decisionMaker,
      recommendedChannel: hasEmail ? "Public business email" : hasPhone ? "Public business phone" : "Official website contact page",
      openingAngle: "Reference only verified public services and ask a qualification question before presenting a solution.",
      risks: ["No verified active procurement signal", "Buyer fit is an inference, not a company-stated fact"],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function findCandidate(company: Company, candidates: CompanyCandidate[]) {
  return candidates.find((candidate) => normalizeDomain(candidate.company.website) === normalizeDomain(company.website))
    ?? { company, evidence: [] };
}

function mergeEvidence(left: Evidence[], right: Evidence[]) {
  const byKey = new Map<string, Evidence>();
  for (const item of [...left, ...right]) {
    const key = `${item.field}|${item.value}|${item.sourceUrl}`;
    byKey.set(key, item);
  }
  return [...byKey.values()];
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
