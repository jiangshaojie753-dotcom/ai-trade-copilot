import type { Evidence, LeadScore } from "./schemas";

export type ScoreSignals = {
  industryMatch: number;
  useCaseMatch: number;
  buyingSignal: number;
  authenticity: number;
  marketMatch: number;
  reachability: number;
};

const rules = [
  ["industryMatch", "Industry match", 25],
  ["useCaseMatch", "Product / use-case match", 25],
  ["buyingSignal", "Buying / import signal", 20],
  ["authenticity", "Company authenticity", 10],
  ["marketMatch", "Target market match", 10],
  ["reachability", "Decision-maker reachability", 10],
] as const;

export function calculateLeadScore(signals: ScoreSignals, evidence: Evidence[]): LeadScore {
  const breakdown = rules.map(([key, label, maxPoints]) => {
    const points = Math.max(0, Math.min(maxPoints, Math.round(signals[key])));
    const linked = evidence.filter((item) => {
      if (key === "authenticity") return ["website", "company_name", "phone"].includes(item.field);
      if (key === "marketMatch") return ["country", "city"].includes(item.field);
      if (key === "reachability") return ["business_email", "contact_role"].includes(item.field);
      if (key === "industryMatch") return item.field === "industry";
      if (key === "useCaseMatch") return ["products_services", "use_case"].includes(item.field);
      return item.field === "buying_signal";
    });
    return {
      key,
      label,
      points,
      maxPoints,
      reason: points === 0 ? "No supporting evidence found" : `${linked.length || 1} supporting signal${linked.length === 1 ? "" : "s"} found`,
      evidenceIds: linked.map((item) => item.id),
    };
  });
  return { total: breakdown.reduce((sum, item) => sum + item.points, 0), breakdown };
}
