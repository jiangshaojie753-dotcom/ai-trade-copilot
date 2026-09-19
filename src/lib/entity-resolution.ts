import type { Company } from "./schemas";

export function normalizeDomain(value: string): string {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.trim().replace(/^www\./, "").toLowerCase();
  }
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\b(limited|ltd|inc|llc|company|co)\b/g, "").replace(/[^a-z0-9]/g, "");
}

export function deduplicateCompanies(companies: Company[]): Company[] {
  const seen = new Map<string, Company>();
  for (const company of companies) {
    const key = `${normalizeDomain(company.website)}|${company.country.toLowerCase()}`;
    const nameKey = `${normalizeName(company.name)}|${company.country.toLowerCase()}`;
    if (![...seen.entries()].some(([existingKey, existing]) => existingKey === key || `${normalizeName(existing.name)}|${existing.country.toLowerCase()}` === nameKey)) {
      seen.set(key, company);
    }
  }
  return [...seen.values()];
}
