import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { store } from "@/server/store/store";
import { byId } from "@/lib/domain/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  return NextResponse.json({ favorites: await store.getFavorites(user.id) });
}

const Body = z.object({ vehicleId: z.string().max(16), on: z.boolean() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !byId(parsed.data.vehicleId)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const user = await getCurrentUser(request);
  return NextResponse.json({ favorites: await store.setFavorite(user.id, parsed.data.vehicleId, parsed.data.on) });
}
