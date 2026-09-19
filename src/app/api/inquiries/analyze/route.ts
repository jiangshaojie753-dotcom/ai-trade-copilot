import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMockInquiry } from "@/lib/mock-pipeline";

export async function POST(request: Request) {
  const parsed = z.object({ text: z.string().trim().min(10).max(10000) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Inquiry text must contain at least 10 characters." }, { status: 400 });
  return NextResponse.json({ mode: "mock", analysis: analyzeMockInquiry(parsed.data.text) });
}
