import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { publicState, store } from "@/server/store/store";
import type { ConversationView } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  const c = await store.getConversation(user.id, id);
  if (!c) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  const view: ConversationView = { id: c.id, title: c.title, updatedAt: c.updatedAt, messages: c.messages, state: publicState(c.state) };
  return NextResponse.json(view);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser(request);
  const ok = await store.deleteConversation(user.id, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
