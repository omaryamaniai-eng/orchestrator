import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(await getCurrentUser(request));
}
