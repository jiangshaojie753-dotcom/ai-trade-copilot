import { searchPlannerOutputSchema, type SearchPlan } from "./schemas";
import type { AIProvider } from "./providers";

export type SearchPlannerInput = {
  product: string;
  description?: string;
  country: string;
  city?: string;
  buyerType?: string;
};

export function createStructuredSearchPlan(input: SearchPlannerInput): SearchPlan {
  const product = input.product.trim();
  const location = [input.city?.trim(), input.country.trim()].filter(Boolean).join(" ");
  const requestedBuyer = input.buyerType && input.buyerType !== "Auto" ? input.buyerType : null;
  const isHeavyTransport = /lowbed|lowboy|trailer|heavy|haul/i.test(`${product} ${input.description ?? ""}`);
  const useCases = isHeavyTransport
    ? ["Heavy equipment transportation", "Mining equipment movement", "Construction machinery logistics", "Fleet or dealer supply"]
    : ["Commercial product use", "Distribution and resale", "Industrial procurement"];
  const industries = isHeavyTransport
    ? ["Heavy haulage", "Mining", "Construction", "Equipment rental", "Commercial vehicle distribution"]
    : ["Distribution", "Industrial services", "Wholesale", "Manufacturing"];
  const buyerTypes = [
    ...(requestedBuyer ? [requestedBuyer] : []),
    "Fleet operator",
    "Dealer / distributor",
    "Equipment owner / end user",
  ].filter((value, index, values) => values.indexOf(value) === index);
  const querySeeds = isHeavyTransport
    ? [
        ["heavy haulage company", "Find fleet operators", "Fleet operator", useCases[0]],
        ["mining contractor", "Find heavy-equipment end users", "Equipment owner / end user", useCases[1]],
        ["heavy equipment rental", "Find equipment owners and rental fleets", "Equipment owner / end user", useCases[2]],
        ["construction company heavy equipment", "Find construction fleets", "Equipment owner / end user", useCases[2]],
        ["excavator transport company", "Find machinery transport specialists", "Fleet operator", useCases[0]],
        ["trailer dealer", "Find trailer channel partners", "Dealer / distributor", useCases[3]],
        ["commercial vehicle dealer", "Find commercial vehicle distributors", "Dealer / distributor", useCases[3]],
      ]
    : [
        [`${product} distributor`, "Find local distributors", "Dealer / distributor", useCases[1]],
        [`${product} supplier`, "Find product suppliers and resellers", "Dealer / distributor", useCases[1]],
        [`${product} industrial company`, "Find industrial end users", "Equipment owner / end user", useCases[2]],
        [`${product} wholesale`, "Find wholesale buyers", "Dealer / distributor", useCases[1]],
      ];

  return searchPlannerOutputSchema.parse({
    product,
    country: input.country.trim(),
    use_cases: useCases,
    industries,
    buyer_types: buyerTypes,
    decision_maker_roles: ["Managing Director", "Procurement Manager", "Fleet Manager", "Operations Manager", "Equipment Manager"],
    search_queries: querySeeds.map(([seed, intent, buyerType, useCase]) => ({
      query: `${seed} ${location}`,
      intent,
      buyer_type: buyerType,
      use_case: useCase,
    })),
  });
}

export async function planSearchWithFallback(input: SearchPlannerInput, provider?: AIProvider): Promise<SearchPlan> {
  if (!provider) return createStructuredSearchPlan(input);
  try {
    return searchPlannerOutputSchema.parse(await provider.planSearch({
      product: input.product,
      description: input.description,
      country: input.country,
      city: input.city,
      buyerType: input.buyerType,
    }));
  } catch {
    return createStructuredSearchPlan(input);
  }
}
