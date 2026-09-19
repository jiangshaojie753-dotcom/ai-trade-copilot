import { describe, expect, it } from "vitest";
import { createStructuredSearchPlan } from "./search-planner";
import { searchPlannerOutputSchema } from "./schemas";

describe("structured search planner", () => {
  it("returns the Phase 2 contract and buyer-oriented queries", () => {
    const plan = createStructuredSearchPlan({ product: "80T Lowbed Trailer", country: "Kenya" });
    expect(searchPlannerOutputSchema.parse(plan)).toEqual(plan);
    expect(Object.keys(plan).sort()).toEqual([
      "buyer_types", "country", "decision_maker_roles", "industries", "product", "search_queries", "use_cases",
    ]);
    expect(plan.search_queries.map((item) => item.query)).toContain("heavy haulage company Kenya");
    expect(plan.search_queries.every((item) => item.intent && item.buyer_type && item.use_case)).toBe(true);
  });
});
