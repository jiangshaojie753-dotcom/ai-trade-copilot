import { describe, expect, it } from "vitest";
import { evidenceSchema } from "./schemas";

describe("evidence validation", () => {
  it("accepts sourced Unknown values and rejects invented unsourced values", () => {
    const base = {
      id: "e1", field: "business_email", value: "Unknown", sourceUrl: "https://example.com/contact",
      sourceType: "official_website" as const, retrievedAt: "2026-09-19T00:00:00.000Z", confidence: 0,
      verificationStatus: "not_applicable" as const, isMock: false,
    };
    expect(evidenceSchema.parse(base).value).toBe("Unknown");
    expect(evidenceSchema.safeParse({ ...base, sourceUrl: "", confidence: 2 }).success).toBe(false);
  });
});
