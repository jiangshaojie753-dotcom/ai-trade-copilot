import type { SupabaseClient } from "@supabase/supabase-js";
import type { InquiryAnalysis } from "../schemas";
import type { InquiryInput, InquiryRepository } from "./inquiry-repository";
import { requireUser } from "./supabase-lead-repository";

export class SupabaseInquiryRepository implements InquiryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(input: InquiryInput, analysis: InquiryAnalysis, isMock: boolean) {
    const user = await requireUser(this.client);
    const { error } = await this.client.from("inquiries").insert({
      user_id: user.id,
      inquiry_text: input.inquiryText,
      buyer_name: input.buyerName || null,
      company_name: input.companyName || null,
      country: input.country || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      product: input.product || analysis.requestedProduct,
      extracted_data: analysis,
      is_mock: isMock,
    });
    if (error) throw error;
  }
}
