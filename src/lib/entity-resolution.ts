import type { Company } from "./schemas";

export function normalizeDomain(value: string): string {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.trim().replace(/^www\./, "").toLowerCase();
  }
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\b(limited|ltd|inc|llc|company|co|corp|corporation|plc)\b/g, "").replace(/[^a-z0-9]/g, "");
}

export function normalizePhone(value?: string | null): string {
  if (!value) return "";
  return value.replace(/[^0-9+]/g, "").replace(/^00/, "+");
}

export function normalizeAddress(value?: string | null): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function deduplicateCompanies(companies: Company[]): Company[] {
  const seen: Company[] = [];
  for (const company of companies) {
    const country = company.country.toLowerCase();
    const domain = normalizeDomain(company.website);
    const name = normalizeName(company.name);
    const phone = normalizePhone(company.publicBusinessPhone);
    const address = normalizeAddress(company.address);
    const duplicate = seen.some((existing) => {
      if (existing.country.toLowerCase() !== country) return false;
      if (domain && normalizeDomain(existing.website) === domain) return true;
      if (name && normalizeName(existing.name) === name) return true;
      if (phone && normalizePhone(existing.publicBusinessPhone) === phone) return true;
      return Boolean(address && normalizeAddress(existing.address) === address);
    });
    if (!duplicate) seen.push(company);
  }
  return seen;
}
