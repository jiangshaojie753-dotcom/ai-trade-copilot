import { describe, expect, it } from "vitest";
import { extractCompaniesFromSearchResults, isLikelyCompanyResult } from "./company-extraction";
import type { SearchResult } from "./providers";

function result(title: string, url: string): SearchResult {
  return { id: url, title, url, snippet: "Heavy haulage and equipment transport in Kenya", query: "q", provider: "Test", retrievedAt: "2026-09-19T00:00:00.000Z", isMock: false };
}

describe("company extraction", () => {
  it("filters directories, government, social and encyclopedia results", () => {
    expect(isLikelyCompanyResult(result("Apex Logistics", "https://apex.co.ke/about"))).toBe(true);
    expect(isLikelyCompanyResult(result("Wikipedia", "https://en.wikipedia.org/wiki/Apex"))).toBe(false);
    expect(isLikelyCompanyResult(result("Ministry", "https://transport.go.ke/company"))).toBe(false);
    expect(isLikelyCompanyResult(result("Company directory", "https://directory.example/list"))).toBe(false);
  });

  it("prefers one company candidate per official domain and preserves evidence", () => {
    const candidates = extractCompaniesFromSearchResults([
      result("Apex Logistics | Home", "https://www.apex.co.ke/"),
      result("Apex Logistics Contact", "https://apex.co.ke/contact"),
    ], "Kenya");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].company.domain).toBe("apex.co.ke");
    expect(candidates[0].evidence.every((item) => item.sourceUrl && !item.isMock)).toBe(true);
  });
});
