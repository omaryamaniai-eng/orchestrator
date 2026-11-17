import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { store } from "@/server/store/store";
import { compute, type Simulation } from "@/lib/domain/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  return NextResponse.json({ simulations: await store.getSimulations(user.id) });
}

const Sim = z.object({
  id: z.string().max(64),
  at: z.string().max(40),
  requested: z.string().max(20).optional(),
  params: z.object({
    type: z.string().max(60),
    prix: z.string().max(20),
    apport: z.string().max(20),
    duree: z.number().int().min(1).max(120),
    taux: z.number().min(0).max(30),
    option: z.string().max(20),
    vehicleId: z.string().max(16).nullable(),
    versionIndex: z.number().int().nullable(),
    vlabel: z.string().max(120).nullable(),
  }),
});

/** Enregistre une simulation ; les montants sont recalculés côté serveur. */
export async function POST(request: Request) {
  const parsed = Sim.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const user = await getCurrentUser(request);
  const p = parsed.data.params as Simulation["params"];
  const sim: Simulation = { ...parsed.data, params: p, c: compute(p, p.duree) };
  return NextResponse.json({ simulations: await store.saveSimulation(user.id, sim) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  const user = await getCurrentUser(request);
  return NextResponse.json({ simulations: await store.deleteSimulation(user.id, id) });
}
