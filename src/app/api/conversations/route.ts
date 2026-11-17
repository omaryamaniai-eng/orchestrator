import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { store } from "@/server/store/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  return NextResponse.json({ conversations: await store.listConversations(user.id) });
}
