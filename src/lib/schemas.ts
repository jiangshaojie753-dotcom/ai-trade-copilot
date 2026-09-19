import { z } from "zod";

export const evidenceSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  sourceUrl: z.string().url(),
  sourceType: z.enum(["official_website", "search_result", "business_directory", "social_media", "news", "enrichment_provider"]),
  retrievedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  provider: z.string().optional(),
  verificationStatus: z.enum(["verified", "unverified", "not_applicable"]).optional(),
  isMock: z.boolean(),
});

export const searchPlannerOutputSchema = z.object({
  product: z.string(),
  country: z.string(),
  use_cases: z.array(z.string()).min(1),
  industries: z.array(z.string()).min(1),
  buyer_types: z.array(z.string()).min(1),
  decision_maker_roles: z.array(z.string()).min(1),
  search_queries: z.array(z.object({
    query: z.string(),
    intent: z.string(),
    buyer_type: z.string(),
    use_case: z.string(),
  })).min(1),
});

export const leadScoreSchema = z.object({
  total: z.number().int().min(0).max(100),
  breakdown: z.array(z.object({
    key: z.enum(["industryMatch", "useCaseMatch", "buyingSignal", "authenticity", "marketMatch", "reachability"]),
    label: z.string(),
    points: z.number().int().nonnegative(),
    maxPoints: z.number().int().positive(),
    reason: z.string(),
    evidenceIds: z.array(z.string()),
  })).length(6),
});

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string().url(),
  domain: z.string(),
  country: z.string(),
  city: z.string().nullable(),
  industry: z.string(),
  description: z.string(),
  buyerType: z.string(),
  products: z.array(z.string()),
  potentialProducts: z.array(z.string()),
  sourceUrl: z.string().url(),
  isMock: z.boolean(),
  address: z.string().nullable().optional(),
  publicBusinessPhone: z.string().nullable().optional(),
});

export const contactSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  position: z.string(),
  linkedinUrl: z.string().url().nullable(),
  publicBusinessEmail: z.string().email().nullable(),
  publicBusinessPhone: z.string().nullable(),
  publicWhatsApp: z.string().nullable().optional(),
  socialLinks: z.array(z.string().url()).optional(),
  confidence: z.number().min(0).max(1),
  sourceUrl: z.string().url().nullable(),
  isMock: z.boolean(),
});

export const leadSchema = z.object({
  id: z.string(),
  company: companySchema,
  contacts: z.array(contactSchema),
  evidence: z.array(evidenceSchema),
  score: leadScoreSchema,
  status: z.enum(["New Lead", "Researched", "Qualified", "Contacted", "Replied", "Requirement Confirmed", "Quoted", "Negotiating", "Won", "Lost", "Follow-up Later"]),
  source: z.enum(["AI Discovery", "Made-in-China", "Google", "LinkedIn", "Facebook", "Referral", "Manual", "Other"]),
  lastContact: z.string().nullable(),
  nextFollowUp: z.string().nullable(),
  notes: z.string(),
  analysis: z.object({
    summary: z.string(),
    possibleUseCases: z.array(z.string()),
    potentialDemand: z.string(),
    recommendedProduct: z.string(),
    matchReason: z.string(),
    painPoints: z.array(z.string()),
    recommendedDecisionMaker: z.string(),
    recommendedChannel: z.string(),
    openingAngle: z.string(),
    risks: z.array(z.string()),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const inquiryAnalysisSchema = z.object({
  requestedProduct: z.string().nullable(),
  quantity: z.string().nullable(),
  specifications: z.array(z.string()),
  application: z.string().nullable(),
  destination: z.string().nullable(),
  purchaseTimeline: z.string().nullable(),
  priceSensitivity: z.enum(["low", "medium", "high", "unknown"]),
  missingInformation: z.array(z.string()),
  buyingStage: z.enum(["Exploring", "Comparing", "Ready to Quote", "Unknown"]),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type SearchPlan = z.infer<typeof searchPlannerOutputSchema>;
export type LeadScore = z.infer<typeof leadScoreSchema>;
export type Company = z.infer<typeof companySchema>;
export type Lead = z.infer<typeof leadSchema>;
export type InquiryAnalysis = z.infer<typeof inquiryAnalysisSchema>;
