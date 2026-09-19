import { describe, expect, it } from "vitest";
import { analyzeMockInquiry, createMockSearchPlan, runMockDiscovery } from "./mock-pipeline";

describe("Mock Phase 1 workflow", () => {
  it("creates structured search queries from product and country", () => {
    const plan = createMockSearchPlan({ product: "80T Lowbed Trailer", country: "Kenya" });
    expect(plan.queries.length).toBeGreaterThanOrEqual(4);
    expect(plan.queries.every((item) => item.query.includes("Kenya"))).toBe(true);
  });

  it("runs through search, resolution, research, score and CRM payload", async () => {
    const result = await runMockDiscovery({ product: "80T Lowbed Trailer", country: "Kenya" });
    expect(result.mode).toBe("mock");
    expect(result.searchResults).toHaveLength(12);
    expect(result.leads).toHaveLength(3);
    expect(result.stages.map((item) => item.key)).toEqual(["planner", "search", "extract", "resolve", "research", "score", "crm"]);
    expect(result.leads.every((lead) => lead.company.isMock && lead.evidence.every((item) => item.isMock))).toBe(true);
  });

  it("extracts inquiry requirements without inventing missing fields", () => {
    const result = analyzeMockInquiry("Please quote 2 units of 80T lowbed trailers for excavator transport to Nairobi urgently.");
    expect(result.quantity).toBe("2 units");
    expect(result.requestedProduct).toBe("Lowbed trailer");
    expect(result.purchaseTimeline).toContain("Urgent");
    expect(result.missingInformation).toContain("Required delivery date");
  });
});
