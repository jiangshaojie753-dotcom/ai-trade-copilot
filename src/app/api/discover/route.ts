import { NextResponse } from "next/server";
import { z } from "zod";
import { runMockDiscovery } from "@/lib/mock-pipeline";

const inputSchema = z.object({
  product: z.string().trim().min(2).max(160),
  description: z.string().max(1000).optional(),
  country: z.string().trim().min(2).max(100),
  city: z.string().max(100).optional(),
  buyerType: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please provide a valid product and target country." }, { status: 400 });
  return NextResponse.json(await runMockDiscovery(parsed.data));
}
