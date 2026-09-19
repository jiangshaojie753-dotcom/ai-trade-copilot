import { NextResponse } from "next/server";
import { z } from "zod";
import { runDiscovery } from "@/lib/discovery-service";
import { ProviderError } from "@/lib/provider-error";

const inputSchema = z.object({
  product: z.string().trim().min(2).max(160),
  description: z.string().max(1000).optional(),
  country: z.string().trim().min(2).max(100),
  city: z.string().max(100).optional(),
  buyerType: z.string().max(100).optional(),
  mode: z.enum(["real", "mock"]).default("real"),
  page: z.coerce.number().int().min(1).max(10).default(1),
  maxCompanies: z.coerce.number().int().min(1).max(20).default(20),
});

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON.", code: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid product, target country and data mode.", code: "INVALID_INPUT" }, { status: 400 });
  }
  try {
    return NextResponse.json(await runDiscovery(parsed.data));
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        mode: parsed.data.mode,
        retryable: error.retryable,
      }, { status: error.status });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Discovery failed.",
      code: "DISCOVERY_FAILED",
      mode: parsed.data.mode,
      retryable: true,
    }, { status: 500 });
  }
}
