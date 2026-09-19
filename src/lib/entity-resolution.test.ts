import { describe, expect, it } from "vitest";
import { deduplicateCompanies, normalizeAddress, normalizeDomain, normalizeName, normalizePhone } from "./entity-resolution";
import type { Company } from "./schemas";

const base: Company = { id: "1", name: "Apex Heavy Logistics Ltd", website: "https://www.apex.example/about", domain: "apex.example", country: "Kenya", city: "Nairobi", industry: "Logistics", description: "Fleet", buyerType: "Fleet Operator", products: [], potentialProducts: [], sourceUrl: "https://apex.example/about", isMock: true };

describe("entity resolution", () => {
  it("normalizes domains and common legal suffixes", () => {
    expect(normalizeDomain("https://www.Example.com/a")).toBe("example.com");
    expect(normalizeName("Apex Company Limited")).toBe("apex");
    expect(normalizePhone("+254 (700) 123-456")).toBe("+254700123456");
    expect(normalizeAddress("12 Industrial Rd., Nairobi")).toBe("12industrialrdnairobi");
  });

  it("deduplicates matching domains in the same country", () => {
    const duplicate = { ...base, id: "2", website: "https://apex.example", name: "Apex Heavy Logistics" };
    const otherCountry = { ...base, id: "3", country: "Tanzania" };
    expect(deduplicateCompanies([base, duplicate, otherCountry])).toHaveLength(2);
  });

  it("deduplicates by phone or address within the same country", () => {
    const byPhone = { ...base, id: "4", website: "https://other.example", name: "Other", publicBusinessPhone: "+254 700 123 456" };
    const original = { ...base, publicBusinessPhone: "+254700123456" };
    expect(deduplicateCompanies([original, byPhone])).toHaveLength(1);
  });
});
