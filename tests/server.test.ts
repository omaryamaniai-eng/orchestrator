import { describe, expect, it, beforeAll } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import type { ChatEvent, ChatMessage } from "@/lib/domain/types";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "ve-test-"));
  process.env.OPENROUTER_API_KEY = "";
});

describe("retriever BM25", () => {
  it("retrouve les passages PHEV / REEV", async () => {
    const { Bm25Retriever } = await import("@/server/rag/retriever");
    const r = new Bm25Retriever({ k: 3 });
    const docs = await r.invoke("Quelle est la différence entre PHEV et REEV ?");
    expect(docs.length).toBe(3);
    expect(docs.map((d) => d.metadata.docId)).toContain("guide-motorisations");
  });
  it("ne renvoie rien pour une requête hors sujet", async () => {
    const { Bm25Retriever } = await import("@/server/rag/retriever");
    expect(await new Bm25Retriever().invoke("recette de couscous")).toHaveLength(0);
  });
});

describe("routeur", () => {
  it("route les suggestions sans appel au modèle", async () => {
    const { routeMessage } = await import("@/server/llm/router");
    expect((await routeMessage("Simuler le crédit", [])).intent).toBe("simulate");
  });
  it("se replie sur les règles sans clé OpenRouter", async () => {
    const { routeMessage } = await import("@/server/llm/router");
    const r = await routeMessage("Je veux être rappelé par un conseiller", []);
    expect(r).toMatchObject({ intent: "contact", source: "rules" });
  });
  it("nettoie les critères extraits par le modèle", async () => {
    const { sanitizeNeed } = await import("@/server/llm/router");
    expect(sanitizeNeed({ usage: "Ville", carros: ["SUV", "Camion"], budget: "350 000", places: 9 })).toEqual({ usage: "Ville", budget: "350000" });
    expect(sanitizeNeed({ carros: ["SUV", "SUV"], budget: 350000 })).toEqual({ carros: ["SUV"], budget: "350000" });
  });
});

/** Rejoue un parcours complet via l'orchestrateur, sans modèle de langage. */
describe("orchestrateur", () => {
  async function turn(conversationId: string | null, input: unknown) {
    const { handleTurn, ChatRequestSchema } = await import("@/server/orchestrator");
    const events: ChatEvent[] = [];
    await handleTurn(ChatRequestSchema.parse({ conversationId, input }), { id: "u1", firstName: "A", lastName: "B" }, (e) => events.push(e));
    const conv = events.find((e) => e.t === "conversation") as Extract<ChatEvent, { t: "conversation" }>;
    const messages = new Map<string, ChatMessage>();
    for (const e of events) if (e.t === "message") messages.set(e.message.id, e.message);
    const errors = events.filter((e) => e.t === "error");
    return { id: conv.id, messages: [...messages.values()], events, errors };
  }
  const block = (msgs: ChatMessage[], kind: string) => {
    for (const m of msgs) for (const b of m.blocks) if (b.kind === kind) return { m, b: b as never as Record<string, unknown> & { id: string } };
    throw new Error("bloc absent : " + kind);
  };

  it("besoin -> recommandations -> choix -> simulation -> éligibilité -> contact -> code -> demande", async () => {
    let r = await turn(null, { type: "message", text: "Trouver ma voiture électrique" });
    const cid = r.id;
    const need = block(r.messages, "needForm");
    r = await turn(cid, { type: "action", action: { type: "need_submit", ref: { messageId: need.m.id, blockId: need.b.id }, need: { usage: "Mixte", carros: ["SUV"], distance: "30 à 80 km", places: "5", budget: "400 000", recharge: "Oui" } } });
    expect(r.errors).toEqual([]);
    const veh = block(r.messages, "vehicles");
    expect(veh.b.within).toEqual(["a", "f"]);

    r = await turn(cid, { type: "action", action: { type: "choose_vehicle", vehicleId: "a", versionIndex: 1 } });
    expect(block(r.messages, "chosen").b.vehicleId).toBe("a");

    r = await turn(cid, { type: "message", text: "Simuler le crédit" });
    const sf = block(r.messages, "simForm");
    const params = sf.b.params as Record<string, unknown>;
    expect(params.prix).toBe("409000");
    r = await turn(cid, { type: "action", action: { type: "sim_submit", ref: { messageId: sf.m.id, blockId: sf.b.id }, params: { ...params, apport: "50000", duree: 72, prix: "1" } } });
    const res = block(r.messages, "simResult").b.sim as { c: { F: number; n: number } };
    expect(res.c.F).toBe(359000); // prix recalculé côté serveur
    expect(res.c.n).toBe(72);

    r = await turn(cid, { type: "message", text: "Comparer trois durées" });
    expect(block(r.messages, "compare").b.durations).toEqual([60, 72, 84]);

    r = await turn(cid, { type: "message", text: "Vérifier mon éligibilité" });
    const ef = block(r.messages, "eligForm");
    r = await turn(cid, { type: "action", action: { type: "elig_submit", ref: { messageId: ef.m.id, blockId: ef.b.id }, data: { situation: "Fonctionnaire", anciennete: "Plus de 2 ans", revenus: "25000", autres: "", loyer: "3000", credits: "Non", mens: "" } } });
    expect((block(r.messages, "eligResult").b.result as { lvl: string }).lvl).toBe("fav");

    r = await turn(cid, { type: "message", text: "Recevoir l'offre" });
    const cf = block(r.messages, "contactForm");
    r = await turn(cid, { type: "action", action: { type: "contact_submit", ref: { messageId: cf.m.id, blockId: cf.b.id }, contact: { prenom: "Sara", tel: "0612345678", creneau: "Matin", consent: true } } });
    const otp = block(r.messages, "otp");
    expect(otp.b.demoCode).toBe("123456");
    const ref = { messageId: otp.m.id, blockId: otp.b.id };

    r = await turn(cid, { type: "action", action: { type: "otp_verify", ref, code: "000000" } });
    expect(block(r.messages, "otp").b.error).toBe("Code incorrect. Vérifiez le SMS reçu.");
    r = await turn(cid, { type: "action", action: { type: "otp_verify", ref, code: "123456" } });
    const conf = block(r.messages, "confirmation").b.request as { ref: string; vlabel: string; elig: { label: string } };
    expect(conf.ref).toMatch(/^VE-/);
    expect(conf.vlabel).toBe("[Marque] Modèle A · Confort");
    expect(conf.elig.label).toBe("Favorable");
    expect(r.events.some((e) => e.t === "simulations")).toBe(true);

    const { store } = await import("@/server/store/store");
    const saved = await store.getConversation("u1", cid);
    expect(saved?.state.request?.ref).toBe(conf.ref);
    expect((await store.listConversations("u1"))[0].title).toBe("Trouver ma voiture électrique");
  });

  it("répond avec citations en mode extractif", async () => {
    const r = await turn(null, { type: "message", text: "Quelle est la différence entre PHEV et REEV ?" });
    const text = r.messages.flatMap((m) => m.blocks).find((b) => b.kind === "text" && /\[1\]/.test((b as { text: string }).text));
    expect(text).toBeDefined();
    block(r.messages, "sources");
    block(r.messages, "compareTable");
  });

  it("refuse un formulaire invalide", async () => {
    const r = await turn(null, { type: "message", text: "Je cherche une voiture" });
    const need = block(r.messages, "needForm");
    const r2 = await turn(r.id, { type: "action", action: { type: "need_submit", ref: { messageId: need.m.id, blockId: need.b.id }, need: { carros: [], budget: "" } } });
    expect(r2.errors[0]).toMatchObject({ text: "Choisissez au moins une carrosserie." });
  });
});
