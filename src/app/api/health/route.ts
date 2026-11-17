import { NextResponse } from "next/server";
import { config, isLlmConfigured } from "@/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    llm: { provider: "openrouter", model: config.openrouter.model, configured: isLlmConfigured() },
    otpDemoMode: config.otp.demoMode,
  });
}
