import { normalizeDomain } from "./entity-resolution";
import { TtlCache } from "./cache";
import type { Company, Evidence, Lead } from "./schemas";

type Contact = Lead["contacts"][number];
type FetchLike = typeof fetch;
export type WebsiteResearch = { company: Company; evidence: Evidence[]; contacts: Contact[]; pagesVisited: string[] };

const researchCache = new TtlCache<WebsiteResearch>(30 * 60 * 1000);
const pageKeywords = /\b(about|company|products?|services?|contact|contact-us)\b/i;
const socialHosts = ["linkedin.com", "facebook.com", "instagram.com", "youtube.com", "x.com", "twitter.com"];

export async function researchPublicWebsite(
  company: Company,
  fetcher: FetchLike = fetch,
): Promise<WebsiteResearch> {
  const domain = normalizeDomain(company.website);
  const cached = researchCache.get(domain);
  if (cached) return cached;
  assertPublicHttpUrl(company.website);

  const homepage = new URL(company.website).origin;
  const homeHtml = await fetchPublicHtml(homepage, fetcher);
  const links = extractLinks(homeHtml, homepage)
    .filter((url) => normalizeDomain(url) === domain && pageKeywords.test(new URL(url).pathname))
    .filter((url, index, values) => values.indexOf(url) === index)
    .slice(0, 3);
  const pages: Array<{ url: string; html: string }> = [{ url: homepage, html: homeHtml }];
  for (const url of links) {
    try { pages.push({ url, html: await fetchPublicHtml(url, fetcher) }); } catch { /* Keep verified search evidence when a page is unavailable. */ }
  }

  const combinedText = pages.map((page) => htmlToText(page.html)).join("\n");
  const emails = unique(combinedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .filter((email) => !/example\.(com|org|net)$/i.test(email));
  const phones = unique(combinedText.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [])
    .map((phone) => phone.trim())
    .filter((phone) => phone.replace(/\D/g, "").length >= 8)
    .slice(0, 3);
  const allLinks = unique(pages.flatMap((page) => extractLinks(page.html, page.url)));
  const whatsApp = allLinks.find((url) => /(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)/i.test(url)) ?? null;
  const socialLinks = allLinks.filter((url) => socialHosts.some((host) => normalizeDomain(url).endsWith(host))).slice(0, 8);
  const metaDescription = pages.map((page) => extractMetaDescription(page.html)).find(Boolean) ?? null;
  const siteName = extractSiteName(homeHtml) ?? company.name;
  const products = extractProducts(pages);
  const updatedCompany: Company = {
    ...company,
    name: siteName,
    description: metaDescription ?? company.description,
    products: products.length ? products : company.products,
    publicBusinessPhone: phones[0] ?? null,
  };
  const evidence: Evidence[] = [
    createEvidence(updatedCompany, "company_name", updatedCompany.name, homepage, 0.88),
    createEvidence(updatedCompany, "website", homepage, homepage, 0.99),
    createEvidence(updatedCompany, "description", metaDescription ?? "Unknown", homepage, metaDescription ? 0.85 : 0),
    createEvidence(updatedCompany, "products_services", products.length ? products.join(", ") : "Unknown", productSource(pages), products.length ? 0.72 : 0),
    createEvidence(updatedCompany, "business_email", emails[0] ?? "Unknown", contactSource(pages), emails[0] ? 0.9 : 0),
    createEvidence(updatedCompany, "phone", phones[0] ?? "Unknown", contactSource(pages), phones[0] ? 0.82 : 0),
    createEvidence(updatedCompany, "whatsapp", whatsApp ?? "Unknown", contactSource(pages), whatsApp ? 0.88 : 0),
    createEvidence(updatedCompany, "social_links", socialLinks.length ? socialLinks.join(", ") : "Unknown", homepage, socialLinks.length ? 0.8 : 0),
  ];
  const contacts: Contact[] = [{
    id: `contact-${stableId(domain)}`,
    name: null,
    position: "Public business contact",
    linkedinUrl: socialLinks.find((url) => /linkedin\.com/i.test(url)) ?? null,
    publicBusinessEmail: emails[0] ?? null,
    publicBusinessPhone: phones[0] ?? null,
    publicWhatsApp: whatsApp,
    socialLinks,
    confidence: emails[0] || phones[0] ? 0.82 : 0,
    sourceUrl: contactSource(pages),
    isMock: false,
  }];
  const result = { company: updatedCompany, evidence, contacts, pagesVisited: pages.map((page) => page.url) };
  researchCache.set(domain, result);
  return result;
}

export function assertPublicHttpUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only public HTTP(S) pages may be researched.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname === "0.0.0.0" || hostname === "::1") {
    throw new Error("Private network targets are not allowed.");
  }
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new Error("Private network targets are not allowed.");
    }
  }
}

async function fetchPublicHtml(url: string, fetcher: FetchLike) {
  assertPublicHttpUrl(url);
  const response = await fetcher(url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "AtlasB2BResearch/0.2 (+public-business-research)" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("Website did not return HTML.");
  const text = await response.text();
  return text.slice(0, 1_000_000);
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (['http:', 'https:'].includes(url.protocol)) links.push(url.href);
    } catch { /* Ignore malformed links. */ }
  }
  return links;
}

function htmlToText(html: string) {
  return decodeEntities(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " "));
}

function extractMetaDescription(html: string) {
  return decodeEntities(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]
    ?? "").trim() || null;
}

function extractSiteName(html: string) {
  const value = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return value ? decodeEntities(value).split(/\s+[|–—-]\s+/)[0].trim() : null;
}

function extractProducts(pages: Array<{ url: string; html: string }>) {
  const relevant = pages.filter((page) => /product|service/i.test(page.url));
  return unique(relevant.flatMap((page) => [...page.html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map((match) => htmlToText(match[1]).trim())
    .filter((value) => value.length >= 3 && value.length <= 100))).slice(0, 10);
}

function productSource(pages: Array<{ url: string }>) {
  return pages.find((page) => /product|service/i.test(page.url))?.url ?? pages[0].url;
}

function contactSource(pages: Array<{ url: string }>) {
  return pages.find((page) => /contact/i.test(page.url))?.url ?? pages[0].url;
}

function createEvidence(company: Company, field: string, value: string, sourceUrl: string, confidence: number): Evidence {
  return {
    id: `evidence-${stableId(`${company.domain}-${field}-${sourceUrl}`)}`,
    field,
    value,
    sourceUrl,
    sourceType: "official_website",
    retrievedAt: new Date().toISOString(),
    confidence,
    provider: "Public website research",
    verificationStatus: confidence > 0 ? "verified" : "not_applicable",
    isMock: false,
  };
}

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function unique<T>(values: T[]) { return [...new Set(values)]; }

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
