import type { InquiryAnalysis } from "../schemas";

export type InquiryInput = {
  inquiryText: string;
  buyerName?: string;
  companyName?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  product?: string;
};

export interface InquiryRepository {
  save(input: InquiryInput, analysis: InquiryAnalysis, isMock: boolean): Promise<void>;
}
