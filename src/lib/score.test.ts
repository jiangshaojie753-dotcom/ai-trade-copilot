import { describe, expect, it } from "vitest";
import { calculateLeadScore } from "./score";
import type { Evidence } from "./schemas";

const evidence: Evidence[] = [{
  id: "e-industry", field: "industry", value: "Heavy haulage", sourceUrl: "https://example.com",
  sourceType: "official_website", retrievedAt: "2026-09-18T12:00:00.000Z", confidence: 0.9,
  verificationStatus: "not_applicable", isMock: true,
}];

describe("calculateLeadScore", () => {
  it("uses the fixed 100 point rubric and links evidence", () => {
    const score = calculateLeadScore({ industryMatch: 25, useCaseMatch: 20, buyingSignal: 15, authenticity: 10, marketMatch: 10, reachability: 5 }, evidence);
    expect(score.total).toBe(85);
    expect(score.breakdown).toHaveLength(6);
    expect(score.breakdown[0].maxPoints).toBe(25);
    expect(score.breakdown[0].evidenceIds).toEqual(["e-industry"]);
  });

  it("clamps every component to its configured maximum", () => {
    const score = calculateLeadScore({ industryMatch: 99, useCaseMatch: 99, buyingSignal: 99, authenticity: 99, marketMatch: 99, reachability: 99 }, []);
    expect(score.total).toBe(100);
  });
});
