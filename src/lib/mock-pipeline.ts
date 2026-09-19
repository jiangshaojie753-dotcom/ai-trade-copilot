import { deduplicateCompanies, normalizeDomain } from "./entity-resolution";
import { calculateLeadScore } from "./score";
import { createStructuredSearchPlan } from "./search-planner";
import {
  inquiryAnalysisSchema,
  leadSchema,
  searchPlannerOutputSchema,
  type Company,
  type Evidence,
  type InquiryAnalysis,
  type Lead,
  type SearchPlan,
} from "./schemas";
import type { SearchProvider, SearchResult } from "./providers";

const NOW = "2026-09-18T12:00:00.000Z";

function id(prefix: string, seed: string) {
  return `${prefix}-${seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export function createMockSearchPlan(input: { product: string; country: string; city?: string; buyerType?: string }): SearchPlan {
  const plan = createStructuredSearchPlan(input);
  return searchPlannerOutputSchema.parse({ ...plan, search_queries: plan.search_queries.slice(0, 4) });
}

export class MockSearchProvider implements SearchProvider {
  readonly name = "Mock Search Provider";
  readonly isMock = true;

  async search(input: { query: string; country: string }): Promise<SearchResult[]> {
    const slug = input.query.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const rows = [
      ["Apex Heavy Logistics", "https://apex-heavy.example", "Heavy haulage and project cargo transport with low-loader fleet."],
      ["Rift Equipment Solutions", "https://rift-equipment.example", "Construction and mining equipment rental, sales and support."],
      ["Eastland Trailer Centre", "https://eastland-trailers.example", "Commercial trailer dealer serving fleet operators and contractors."],
    ];
    return rows.map(([title, url, snippet], index) => ({
      id: `result-${slug}-${index}`,
      title,
      url,
      snippet,
      query: input.query,
      provider: this.name,
      retrievedAt: NOW,
      isMock: true,
    }));
  }
}

function companiesFromResults(results: SearchResult[], country: string): Company[] {
  const mapping: Record<string, Omit<Company, "id" | "country" | "sourceUrl" | "isMock">> = {
    "apex-heavy.example": { name: "Apex Heavy Logistics", website: "https://apex-heavy.example", domain: "apex-heavy.example", city: "Nairobi", industry: "Heavy haulage", description: "Mock fleet operator focused on oversized and project cargo.", buyerType: "Fleet Operator", products: ["Heavy haulage", "Project logistics"], potentialProducts: ["80T Lowbed Trailer"] },
    "rift-equipment.example": { name: "Rift Equipment Solutions", website: "https://rift-equipment.example", domain: "rift-equipment.example", city: "Nairobi", industry: "Equipment rental", description: "Mock heavy equipment rental and support business.", buyerType: "End User", products: ["Excavator rental", "Mining equipment"], potentialProducts: ["80T Lowbed Trailer", "Detachable gooseneck trailer"] },
    "eastland-trailers.example": { name: "Eastland Trailer Centre", website: "https://eastland-trailers.example", domain: "eastland-trailers.example", city: "Mombasa", industry: "Commercial vehicle distribution", description: "Mock trailer and commercial vehicle dealer.", buyerType: "Dealer", products: ["Truck trailers", "Fleet parts"], potentialProducts: ["80T Lowbed Trailer"] },
  };
  return results.flatMap((result) => {
    const domain = normalizeDomain(result.url);
    const item = mapping[domain];
    return item ? [{ ...item, id: id("company", domain), country, sourceUrl: result.url, isMock: true }] : [];
  });
}

function evidenceFor(company: Company): Evidence[] {
  const items = [
    ["company_name", company.name, "official_website", 0.98],
    ["website", company.website, "search_result", 0.99],
    ["country", company.country, "official_website", 0.9],
    ["city", company.city ?? "Unknown", "official_website", 0.86],
    ["industry", company.industry, "official_website", 0.88],
    ["products_services", company.products.join(", "), "official_website", 0.9],
    ["use_case", company.description, "search_result", 0.82],
  ] as const;
  return items.map(([field, value, sourceType, confidence]) => ({
    id: id("evidence", `${company.domain}-${field}`), field, value, sourceUrl: company.sourceUrl,
    sourceType, retrievedAt: NOW, confidence, verificationStatus: "not_applicable" as const, isMock: true,
  }));
}

function leadFromCompany(company: Company, product: string): Lead {
  const evidence = evidenceFor(company);
  const isDealer = company.buyerType === "Dealer";
  const score = calculateLeadScore({
    industryMatch: isDealer ? 22 : 24,
    useCaseMatch: company.industry === "Heavy haulage" ? 25 : 21,
    buyingSignal: 8,
    authenticity: 9,
    marketMatch: 10,
    reachability: 4,
  }, evidence);
  const contactId = id("contact", company.domain);
  const lead: Lead = {
    id: id("lead", company.domain), company, evidence,
    contacts: [{ id: contactId, name: null, position: isDealer ? "General Manager" : "Fleet Manager", linkedinUrl: null, publicBusinessEmail: null, publicBusinessPhone: null, confidence: 0.45, sourceUrl: company.sourceUrl, isMock: true }],
    score,
    status: score.total >= 75 ? "Qualified" : "Researched",
    source: "AI Discovery",
    lastContact: null,
    nextFollowUp: null,
    notes: "Mock lead generated by the Phase 1 demonstration flow.",
    analysis: {
      summary: `${company.name} appears to be a ${company.buyerType.toLowerCase()} in ${company.industry.toLowerCase()}. This is an AI inference based only on the listed mock evidence.`,
      possibleUseCases: company.products,
      potentialDemand: `May need ${product} for heavy equipment movement or resale. This is an inference, not a verified buying intent.`,
      recommendedProduct: product,
      matchReason: `${company.industry} overlaps with heavy machinery transport use cases.`,
      painPoints: ["Payload flexibility", "Road durability", "After-sales parts availability"],
      recommendedDecisionMaker: isDealer ? "General Manager" : "Fleet Manager",
      recommendedChannel: "Public business email or LinkedIn company page",
      openingAngle: "Lead with payload configuration and local operating-condition fit; verify fleet needs before quoting.",
      risks: ["No verified active procurement signal", "No verified named decision-maker in Mock mode"],
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
  return leadSchema.parse(lead);
}

export type { DiscoveryResponse } from "./discovery-types";

export async function runMockDiscovery(input: { product: string; country: string; city?: string; buyerType?: string }): Promise<import("./discovery-types").DiscoveryResponse> {
  const plan = createMockSearchPlan(input);
  const provider = new MockSearchProvider();
  const nested = await Promise.all(plan.search_queries.map((item) => provider.search({ query: item.query, country: input.country })));
  const searchResults = nested.flat();
  const companies = deduplicateCompanies(companiesFromResults(searchResults, input.country));
  const leads = companies.map((company) => leadFromCompany(company, input.product));
  return {
    mode: "mock",
    dataLabel: "MOCK DATA",
    jobId: `mock-job-${globalThis.crypto.randomUUID()}`,
    provider: provider.name,
    plan,
    searchResults,
    leads,
    stages: [
      { key: "planner", label: "Search Planner", count: plan.search_queries.length },
      { key: "search", label: "Mock Search", count: searchResults.length },
      { key: "extract", label: "Company Extraction", count: searchResults.length },
      { key: "resolve", label: "Entity Resolution", count: companies.length },
      { key: "research", label: "Research", count: leads.length },
      { key: "score", label: "Lead Scoring", count: leads.length },
      { key: "crm", label: "CRM", count: leads.length },
    ],
    page: 1,
    maxCompanies: 20,
  };
}

export function analyzeMockInquiry(text: string): InquiryAnalysis {
  const quantity = text.match(/\b(\d+)\s*(?:units?|pcs?|pieces?|trailers?)\b/i)?.[0] ?? null;
  const destination = text.match(/(?:to|destination[:\s]+)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ?? null;
  const requestedProduct = /lowbed|lowboy/i.test(text) ? "Lowbed trailer" : /trailer/i.test(text) ? "Trailer" : null;
  return inquiryAnalysisSchema.parse({
    requestedProduct, quantity,
    specifications: [...text.matchAll(/\b\d+T\b/gi)].map((match) => match[0].toUpperCase()),
    application: /excavator/i.test(text) ? "Excavator transportation" : null,
    destination,
    purchaseTimeline: /urgent|asap/i.test(text) ? "Urgent (unverified)" : null,
    priceSensitivity: /best price|lowest price|cheap/i.test(text) ? "high" : "unknown",
    missingInformation: [!quantity && "Quantity", !destination && "Destination", "Required delivery date", "Road conditions"].filter(Boolean),
    buyingStage: /quote|quotation|price/i.test(text) ? "Ready to Quote" : "Exploring",
  });
}
