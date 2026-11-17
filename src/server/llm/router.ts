import "server-only";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import type { BaseMessage } from "@langchain/core/messages";
import { getChatModel } from "./model";
import { isLlmConfigured } from "../config";
import { CARROSSERIES, DISTANCES, PLACES, RECHARGE, USAGES, type Need } from "@/lib/domain/catalog";
import * as SG from "@/lib/domain/suggestions";

export const INTENTS = [
  "recommend",
  "rag",
  "simulate",
  "compare",
  "eligibility",
  "contact",
  "viewer3d",
  "general",
] as const;
export type Intent = (typeof INTENTS)[number];

export interface RouteResult {
  intent: Intent;
  need: Partial<Need>;
  source: "fast-path" | "llm" | "rules";
}

/** Libellés de suggestions connus : routage direct, sans appel au modèle. */
const FAST: Record<string, Intent> = {
  [SG.S_FIND]: "recommend",
  [SG.S_SIM]: "simulate",
  [SG.S_SIM_ADJUST]: "simulate",
  [SG.S_ELIG]: "eligibility",
  [SG.S_ELIG_EDIT]: "eligibility",
  [SG.S_COMPARE]: "compare",
  [SG.S_OFFER]: "contact",
  [SG.S_CALLBACK]: "contact",
  [SG.S_PHEV]: "rag",
};

/** Règles par mots-clés reprises du prototype ; utilisées si le modèle est indisponible. */
export function ruleRoute(text: string): Intent {
  const x = text.toLowerCase();
  if (/phev|reev|erev|hybride|prolongateur|diff[ée]rence|recharg|borne|wallbox|autonomie|entretien|batterie|\bloa\b/.test(x))
    return "rag";
  if (/offre|t[ée]l[ée]phone|rappel|conseiller/.test(x)) return "contact";
  if (/compar/.test(x)) return "compare";
  if (/[ée]ligib|situation|scoring|capacit/.test(x)) return "eligibility";
  if (/simul|cr[ée]dit|mensualit|financ/.test(x)) return "simulate";
  if (/\b3d\b/.test(x)) return "viewer3d";
  if (/^(bonjour|salut|merci|hello|bonsoir|coucou)\b/.test(x) && x.length < 30) return "general";
  return "recommend";
}

const NeedSchema = z
  .object({
    usage: z.enum(USAGES as [string, ...string[]]).nullish(),
    carros: z.array(z.enum(CARROSSERIES as [string, ...string[]])).nullish(),
    distance: z.enum(DISTANCES as unknown as [string, ...string[]]).nullish(),
    places: z.enum(PLACES as unknown as [string, ...string[]]).nullish(),
    budget: z.union([z.number(), z.string()]).nullish(),
    recharge: z.enum(RECHARGE as unknown as [string, ...string[]]).nullish(),
  })
  .partial();

const RouteSchema = z.object({
  intent: z.enum(INTENTS),
  need: z.unknown().optional(),
});

/** Ne conserve que les champs valides extraits par le modèle. */
export function sanitizeNeed(raw: unknown): Partial<Need> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Need> = {};
  const r = raw as Record<string, unknown>;
  for (const key of Object.keys(NeedSchema.shape) as (keyof typeof NeedSchema.shape)[]) {
    const parsed = NeedSchema.shape[key].safeParse(r[key]);
    if (!parsed.success || parsed.data == null) continue;
    if (key === "budget") {
      const digits = String(parsed.data).replace(/[^\d]/g, "");
      if (digits && Number(digits) >= 10000) out.budget = digits;
    } else if (key === "carros") {
      const list = [...new Set(parsed.data as Need["carros"])];
      if (list.length) out.carros = list;
    } else {
      (out as Record<string, unknown>)[key] = parsed.data;
    }
  }
  return out;
}

const SYSTEM = `Tu es le routeur d'un assistant d'achat de véhicules électriques. Tu classes le dernier message de l'utilisateur dans une seule intention et tu extrais les critères de recherche s'il y en a.

Intentions :
- "recommend" : l'utilisateur cherche un véhicule, décrit son besoin, son usage, son budget ou veut des recommandations de modèles.
- "rag" : question de connaissance sur les motorisations (électrique, hybride, PHEV, REEV), la recharge, les bornes, l'autonomie, l'entretien, le fonctionnement du crédit ou de la LOA.
- "simulate" : simuler un crédit, une mensualité, un financement, une LOA, ou ajuster une simulation.
- "compare" : comparer des durées de crédit.
- "eligibility" : vérifier son éligibilité, sa capacité d'emprunt, décrire sa situation financière.
- "contact" : recevoir une offre, être rappelé, parler à un conseiller, laisser son numéro.
- "viewer3d" : voir un véhicule en 3D.
- "general" : salutations, remerciements, questions sur le catalogue (prix, places, versions, comparaison de modèles) ou toute autre demande.

Critères (champ "need", uniquement ceux explicitement mentionnés, sinon omis) :
- usage : "Ville" | "Mixte" | "Longs trajets"
- carros : liste parmi "Citadine", "Berline", "SUV", "Monospace"
- distance : "Moins de 30 km" | "30 à 80 km" | "Plus de 80 km"
- places : "2 à 4" | "5" | "7"
- budget : montant en MAD, nombre entier (ex. 400000 pour "400k" ou "40 millions de centimes")
- recharge : "Oui" | "Non" | "Je ne sais pas" (possibilité de recharger à domicile)

Réponds uniquement avec un objet JSON, sans texte autour :
{{"intent": "<intention>", "need": {{ ... }}}}`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "Contexte récent :\n{history}\n\nDernier message de l'utilisateur :\n{input}"],
]);

export async function routeMessage(text: string, history: BaseMessage[]): Promise<RouteResult> {
  const fast = FAST[text.trim()];
  if (fast) return { intent: fast, need: {}, source: "fast-path" };
  if (!isLlmConfigured()) return { intent: ruleRoute(text), need: {}, source: "rules" };

  try {
    const chain = prompt.pipe(getChatModel({ temperature: 0, maxTokens: 300 })).pipe(new JsonOutputParser());
    const raw = await chain.invoke({
      input: text,
      history:
        history
          .slice(-6)
          .map((m) => `${m.type === "human" ? "Utilisateur" : "Assistant"} : ${String(m.content).slice(0, 400)}`)
          .join("\n") || "(aucun)",
    });
    const parsed = RouteSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Réponse du routeur invalide");
    return { intent: parsed.data.intent, need: sanitizeNeed(parsed.data.need), source: "llm" };
  } catch (err) {
    console.warn("[router] repli sur les règles :", err instanceof Error ? err.message : err);
    return { intent: ruleRoute(text), need: {}, source: "rules" };
  }
}
