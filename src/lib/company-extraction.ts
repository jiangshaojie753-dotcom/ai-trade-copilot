import { normalizeDomain } from "./entity-resolution";
import type { SearchResult } from "./providers";
import type { Company, Evidence } from "./schemas";

export type CompanyCandidate = { company: Company; evidence: Evidence[] };

const blockedHosts = [
  "wikipedia.org", "linkedin.com", "facebook.com", "instagram.com", "youtube.com", "x.com", "twitter.com",
  "amazon.com", "alibaba.com", "made-in-china.com", "ebay.com", "reddit.com",
];
const blockedText = /\b(news|article|blog|forum|directory|yellow pages|wikipedia|government|ministry|marketplace|product listing|jobs?|careers?)\b/i;

export function isLikelyCompanyResult(result: SearchResult): boolean {
  let url: URL;
  try { url = new URL(result.url); } catch { return false; }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const host = normalizeDomain(url.hostname);
  if (blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return false;
  if (/\.(gov|go\.[a-z]{2}|ac\.[a-z]{2})$/.test(host)) return false;
  if (blockedText.test(`${result.title} ${url.pathname}`)) return false;
  return result.title.trim().length >= 2;
}

export function extractCompaniesFromSearchResults(
  results: SearchResult[],
  country: string,
  maxCompanies = 20,
): CompanyCandidate[] {
  const candidates: CompanyCandidate[] = [];
  const seenDomains = new Set<string>();
  for (const result of results) {
    if (!isLikelyCompanyResult(result)) continue;
    const domain = normalizeDomain(result.url);
    if (!domain || seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    const origin = new URL(result.url).origin;
    const name = cleanCompanyName(result.title, domain);
    const industry = inferIndustry(`${result.title} ${result.snippet}`);
    const company: Company = {
      id: `company-${stableId(domain)}`,
      name,
      website: origin,
      domain,
      country,
      city: null,
      industry,
      description: result.snippet || "Unknown",
      buyerType: inferBuyerType(industry),
      products: [],
      potentialProducts: [],
      sourceUrl: result.url,
      isMock: false,
      address: null,
      publicBusinessPhone: null,
    };
    const evidence = [
      evidenceItem(company, "company_name", name, result, 0.72),
      evidenceItem(company, "website", origin, result, 0.9),
      evidenceItem(company, "domain", domain, result, 0.95),
      evidenceItem(company, "country", country, result, 0.55),
      evidenceItem(company, "city", "Unknown", result, 0),
      evidenceItem(company, "description", company.description, result, result.snippet ? 0.65 : 0),
      evidenceItem(company, "use_case", company.description, result, result.snippet ? 0.55 : 0),
      evidenceItem(company, "industry", industry, result, industry === "Unknown" ? 0 : 0.58),
    ];
    candidates.push({ company, evidence });
    if (candidates.length >= maxCompanies) break;
  }
  return candidates;
}

function cleanCompanyName(title: string, domain: string) {
  const primary = title.split(/\s+[|–—-]\s+/)[0].replace(/\s+(home|official site)$/i, "").trim();
  return primary || domain.split(".")[0].replace(/[-_]/g, " ");
}

function inferIndustry(text: string) {
  if (/haulage|logistics|transport|freight/i.test(text)) return "Heavy haulage / logistics";
  if (/mining|quarry/i.test(text)) return "Mining";
  if (/construction|civil engineering/i.test(text)) return "Construction";
  if (/rental|equipment hire/i.test(text)) return "Equipment rental";
  if (/dealer|distributor|commercial vehicle/i.test(text)) return "Commercial vehicle distribution";
  return "Unknown";
}

function inferBuyerType(industry: string) {
  if (/distribution/.test(industry)) return "Dealer / distributor";
  if (/haulage|logistics/.test(industry)) return "Fleet operator";
  return "Equipment owner / end user";
}

function evidenceItem(company: Company, field: string, value: string, result: SearchResult, confidence: number): Evidence {
  return {
    id: `evidence-${stableId(`${company.domain}-${field}-${result.url}`)}`,
    field,
    value,
    sourceUrl: result.url,
    sourceType: "search_result",
    retrievedAt: result.retrievedAt,
    confidence,
    provider: result.provider,
    verificationStatus: confidence > 0 ? "unverified" : "not_applicable",
    isMock: false,
  };
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
