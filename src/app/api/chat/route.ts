import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { ChatRequestSchema, handleTurn } from "@/server/orchestrator";
import type { ChatEvent } from "@/lib/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Un tour de conversation, diffusé en NDJSON (un événement JSON par ligne). */
export async function POST(request: NextRequest) {
  const parsed = ChatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide", details: parsed.error.issues.slice(0, 3) }, { status: 400 });
  }
  const user = await getCurrentUser(request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: ChatEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      try {
        await handleTurn(parsed.data, user, emit, request.signal);
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* flux déjà fermé */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
