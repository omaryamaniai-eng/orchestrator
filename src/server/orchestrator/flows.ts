import "server-only";
import type { Document } from "@langchain/core/documents";
import { TurnContext, newId } from "./context";
import {
  BRAND,
  CARROSSERIES,
  DEFAULT_NEED,
  DISTANCES,
  PLACES,
  RECHARGE,
  USAGES,
  byId,
  clampVersion,
  priceAt,
  recommend,
  vehicleLabel,
  type Need,
} from "@/lib/domain/catalog";
import {
  CREDIT,
  CRENEAUX,
  DEFAULT_ELIG,
  DEFAULT_RATE,
  FINANCING_TYPES,
  compareDurations,
  compute,
  evaluateEligibility,
  fmt,
  groupDigits,
  nextCallDay,
  normTel,
  telFmt,
  validateEligStep1,
  validateEligStep2,
  validateSim,
  type EligInput,
  type SimParams,
  type Simulation,
} from "@/lib/domain/finance";
import type {
  BlockRef,
  ChatMessage,
  CompareBlock,
  ConfirmationBlock,
  ContactFormBlock,
  ContactInput,
  EligFormBlock,
  NeedFormBlock,
  OfferRequest,
  OtpBlock,
  SimFormBlock,
  Suggestion,
} from "@/lib/domain/types";
import * as SG from "@/lib/domain/suggestions";
import { config, isLlmConfigured } from "../config";
import { store } from "../store/store";
import { extractiveAnswer, streamGeneralAnswer, streamRagAnswer } from "../llm/chains";
import { Bm25Retriever, type PassageMetadata } from "../rag/retriever";
import { generateOtp, hashOtp, sms } from "../sms";

const retriever = new Bm25Retriever({ k: 3 });
const NUM = ["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit"];

export class FlowError extends Error {}

/* ---------------- utilitaires ---------------- */

function suggestions(ctx: TurnContext, msg: ChatMessage, items: (string | Suggestion)[]) {
  ctx.add(msg, { kind: "suggestions", items: items.map((x) => (typeof x === "string" ? { label: x } : x)) });
}

function formAt<K extends "needForm" | "simForm" | "eligForm" | "contactForm" | "otp">(ctx: TurnContext, ref: BlockRef, kind: K) {
  const found = ctx.find(ref);
  if (!found || found.block.kind !== kind) throw new FlowError("Ce formulaire n'est plus disponible.");
  return found as { msg: ChatMessage; block: Extract<ChatMessage["blocks"][number], { kind: K }> };
}

/** Diffuse une réponse du modèle ; en cas d'échec, remplace par un texte de repli. */
async function streamOr(ctx: TurnContext, msg: ChatMessage, factory: () => Promise<AsyncIterable<string>>, fallback: string) {
  try {
    const text = await ctx.stream(msg, await factory());
    if (text) return;
  } catch (err) {
    if (ctx.signal?.aborted) throw err;
    console.error("[llm] échec de génération :", err instanceof Error ? err.message : err);
  }
  const last = msg.blocks[msg.blocks.length - 1];
  if (last?.kind === "text" && !last.text.trim()) msg.blocks.pop();
  await ctx.say(msg, fallback);
}

function stateSummary(ctx: TurnContext): string {
  const s = ctx.state;
  const lines: string[] = [];
  if (s.lastNeed)
    lines.push(
      `Besoin exprimé : usage ${s.lastNeed.usage}, carrosserie ${s.lastNeed.carros.join(", ")}, ${s.lastNeed.places} places, budget ${groupDigits(s.lastNeed.budget)} MAD, recharge à domicile ${s.lastNeed.recharge}.`,
    );
  if (s.chosen) {
    const v = byId(s.chosen.vehicleId);
    if (v) lines.push(`Véhicule choisi : ${vehicleLabel(v, s.chosen.versionIndex)} à ${fmt(priceAt(v, s.chosen.versionIndex))}.`);
  }
  if (s.lastSim) lines.push(`Dernière simulation : ${s.lastSim.params.type}, ${fmt(s.lastSim.c.m)} par mois sur ${s.lastSim.c.n} mois.`);
  if (s.lastElig) lines.push(`Éligibilité : ${s.lastElig.label}, mensualité supportable ${fmt(s.lastElig.cap)}.`);
  if (s.request) lines.push(`Demande d'offre envoyée, référence ${s.request.ref}.`);
  return lines.join("\n");
}

/* ---------------- conversation générale ---------------- */

export async function generalFlow(ctx: TurnContext, text: string, attachments: string) {
  const msg = ctx.addAssistant();
  const greeting = /^(bonjour|salut|merci|hello|bonsoir|coucou)\b/i.test(text.trim());
  const fallback = greeting
    ? "Avec plaisir. Je peux vous recommander un véhicule ou répondre à une question sur les motorisations."
    : "Je ne peux pas rédiger de réponse libre pour le moment : le modèle de langage n'est pas joignable. Les parcours guidés restent disponibles.";
  if (isLlmConfigured()) {
    const history = ctx.history().slice(0, -1);
    await streamOr(
      ctx,
      msg,
      () => streamGeneralAnswer({ input: text, history, state: stateSummary(ctx), attachments }, ctx.signal),
      fallback,
    );
  } else {
    await ctx.say(msg, fallback);
  }
  suggestions(ctx, msg, ctx.state.chosen ? [SG.S_SIM, SG.S_ELIG] : [SG.S_FIND, SG.S_PHEV]);
  ctx.finish(msg);
}

/* ---------------- RAG ---------------- */

const CMP: [string, string, string][] = [
  ["Ce qui entraîne les roues", "Le moteur électrique et le moteur thermique, seuls ou ensemble", "Uniquement le moteur électrique"],
  ["Rôle du moteur thermique", "Propulse le véhicule quand la batterie est vide ou à forte allure", "Produit de l'électricité pour recharger la batterie, sans entraîner les roues"],
  ["Batterie", "Plus petite, conçue pour les trajets courts en électrique", "Plus grande, la conduite reste électrique en permanence"],
  ["Recharge", "Sur prise ou borne, et par le moteur thermique", "Sur prise ou borne, et par le prolongateur thermique"],
  ["Usage adapté", "Trajets quotidiens courts en électrique, longs trajets en hybride", "Conduite électrique au quotidien sans contrainte d'autonomie sur longs trajets"],
];

export async function ragFlow(ctx: TurnContext, question: string) {
  const msg = ctx.addAssistant();
  const reasoning = ctx.add<Extract<ChatMessage["blocks"][number], { kind: "reasoning" }>>(msg, {
    kind: "reasoning",
    status: "running",
    title: "Recherche dans la base documentaire…",
    steps: [],
  });
  const docs = (await retriever.invoke(question)) as Document<PassageMetadata>[];
  const matched = retriever.score(question).length;
  reasoning.status = "done";
  reasoning.title = `Recherche dans la base documentaire · ${docs.length} source${docs.length > 1 ? "s" : ""} retenue${docs.length > 1 ? "s" : ""}`;
  reasoning.steps = [
    `Recherche : ${question}`,
    `${matched} passage${matched > 1 ? "s" : ""} trouvé${matched > 1 ? "s" : ""}, ${docs.length} retenu${docs.length > 1 ? "s" : ""} pour leur pertinence`,
    docs.length ? "Réponse rédigée à partir des passages retenus" : "Aucun passage exploitable",
  ];
  ctx.update(msg);

  if (!docs.length) {
    await ctx.say(msg, "La base documentaire ne contient pas d'information sur ce point. Reformulez votre question ou choisissez un parcours ci-dessous.");
    suggestions(ctx, msg, [SG.S_FIND, SG.S_PHEV]);
    ctx.finish(msg);
    return;
  }

  const fallback = extractiveAnswer(docs);
  if (isLlmConfigured()) {
    const history = ctx.history().slice(0, -1);
    await streamOr(ctx, msg, () => streamRagAnswer({ question, docs, history }, ctx.signal), fallback);
  } else {
    await ctx.say(msg, fallback);
  }

  if (/phev|reev|erev|prolongateur|hybride rechargeable/i.test(question)) {
    ctx.add(msg, {
      kind: "compareTable",
      title: "PHEV et REEV en un coup d'œil",
      columns: ["PHEV · hybride rechargeable", "REEV · électrique à prolongateur"],
      rows: CMP,
    });
  }
  ctx.add(msg, {
    kind: "sources",
    sources: docs.map((d, i) => ({
      n: i + 1,
      docId: d.metadata.docId,
      title: d.metadata.title,
      sub: d.metadata.sub,
      section: d.metadata.section,
      excerpt: d.pageContent,
    })),
  });
  suggestions(ctx, msg, [SG.S_FIND, SG.S_RANGE]);
  ctx.finish(msg);
}

/* ---------------- recommandation ---------------- */

export async function recommendFlow(ctx: TurnContext, extracted: Partial<Need>) {
  const msg = ctx.addAssistant();
  const need: Need = { ...structuredClone(DEFAULT_NEED), ...extracted };
  const prefilled = Object.keys(extracted);
  await ctx.say(
    msg,
    prefilled.length
      ? "J'ai prérempli le formulaire avec les éléments de votre message. Complétez-le ou ajustez-le, puis validez."
      : "Quelques informations sur votre usage pour cibler les bons modèles.",
  );
  ctx.add<NeedFormBlock>(msg, { kind: "needForm", need, submitted: false, prefilled, results: [] });
  ctx.finish(msg);
}

function cleanNeed(raw: Need): Need {
  const digits = String(raw.budget ?? "").replace(/[\s.,]/g, "");
  const carros = (Array.isArray(raw.carros) ? raw.carros : []).filter((c) => CARROSSERIES.includes(c));
  const need: Need = {
    usage: USAGES.includes(raw.usage) ? raw.usage : DEFAULT_NEED.usage,
    carros: [...new Set(carros)],
    distance: DISTANCES.includes(raw.distance) ? raw.distance : DEFAULT_NEED.distance,
    places: PLACES.includes(raw.places) ? raw.places : DEFAULT_NEED.places,
    recharge: RECHARGE.includes(raw.recharge) ? raw.recharge : DEFAULT_NEED.recharge,
    budget: digits,
  };
  if (raw.estUsed) {
    need.estUsed = true;
    need.estTaux = String(raw.estTaux ?? "");
    need.estApp = String(raw.estApp ?? "");
    need.estRev = String(raw.estRev ?? "");
    need.estDet = String(raw.estDet ?? "");
  }
  if (!need.carros.length) throw new FlowError("Choisissez au moins une carrosserie.");
  if (!digits || /\D/.test(digits)) throw new FlowError("Indiquez un budget en chiffres.");
  return need;
}

export async function needSubmit(ctx: TurnContext, ref: BlockRef, raw: Need) {
  const { msg: formMsg, block } = formAt(ctx, ref, "needForm");
  const need = cleanNeed(raw);
  block.need = need;
  block.submitted = true;
  ctx.dropResults(block);
  ctx.update(formMsg);
  ctx.state.lastNeed = need;

  const reco = recommend(need);
  const msg = ctx.addAssistant();
  block.results.push(msg.id);
  const all = reco.within.length + reco.above.length;
  if (!all) {
    await ctx.say(msg, "Aucun modèle ne correspond à cette combinaison de carrosserie et de places.");
    ctx.add(msg, { kind: "noMatch", formRef: ref });
    ctx.finish(msg);
    return;
  }
  const w = reco.within.length;
  const a = reco.above.length;
  const head = w
    ? `${w === 1 ? "Un modèle correspond" : `${NUM[w]} modèles correspondent`} à votre usage dans votre budget de ${fmt(reco.budget)}.` +
      (w > 1 ? ` Le premier est le mieux adapté à un usage ${need.usage.toLowerCase()}.` : "")
    : `Aucun modèle de ce type ne tient dans votre budget de ${fmt(reco.budget)}. ${a === 1 ? "Un modèle s'en approche." : `${NUM[a]} modèles s'en approchent.`}`;
  await ctx.say(msg, head);
  ctx.add(msg, { kind: "vehicles", within: reco.within, above: reco.above, versions: reco.versions, budget: reco.budget, usage: need.usage });
  ctx.add(msg, { kind: "note", text: "Prix catalogue de démonstration, à remplacer par les tarifs du distributeur." });
  suggestions(ctx, msg, [SG.S_SIM, SG.S_PHEV]);
  ctx.finish(msg);
}

/* ---------------- choix du véhicule ---------------- */

export async function chooseVehicle(ctx: TurnContext, vehicleId: string, versionIndex: number) {
  const v = byId(vehicleId);
  if (!v) throw new FlowError("Véhicule inconnu.");
  const vi = clampVersion(v, versionIndex);
  const cur = ctx.state.chosen;
  if (cur && cur.vehicleId === vehicleId && cur.versionIndex === vi) {
    ctx.toast("Ce véhicule est déjà choisi.");
    return;
  }
  ctx.state.chosen = { vehicleId, versionIndex: vi };
  const last = ctx.conv.messages[ctx.conv.messages.length - 1];
  if (ctx.state.chosenMessageId && last?.id === ctx.state.chosenMessageId) ctx.remove([last.id]);
  const msg = ctx.addAssistant();
  ctx.state.chosenMessageId = msg.id;
  await ctx.say(
    msg,
    `Vous avez choisi le ${vehicleLabel(v, vi)} à ${fmt(priceAt(v, vi))}. Je le reprends pour la simulation du crédit et la vérification de votre éligibilité.`,
  );
  ctx.add(msg, { kind: "chosen", vehicleId, versionIndex: vi });
  suggestions(ctx, msg, [SG.S_SIM, SG.S_ELIG]);
  ctx.finish(msg);
}

export function setChosenSilently(ctx: TurnContext, vehicleId: string, versionIndex: number) {
  const v = byId(vehicleId);
  if (!v) return;
  ctx.state.chosen = { vehicleId, versionIndex: clampVersion(v, versionIndex) };
}

/* ---------------- simulation ---------------- */

function defaultSimParams(): SimParams {
  return { type: CREDIT, prix: "", apport: "", duree: 60, taux: DEFAULT_RATE, option: "", vehicleId: null, versionIndex: null, vlabel: null };
}

export async function simulateFlow(ctx: TurnContext) {
  const s = ctx.state;
  const p: SimParams = s.lastSim ? structuredClone(s.lastSim.params) : defaultSimParams();
  const prevVeh = `${p.vehicleId}:${p.versionIndex}`;
  p.vehicleId = s.chosen?.vehicleId ?? null;
  p.versionIndex = s.chosen?.versionIndex ?? null;
  p.taux = DEFAULT_RATE;
  if (s.lastSim && prevVeh !== `${p.vehicleId}:${p.versionIndex}`) {
    p.prix = "";
    p.option = "";
  }
  const v = byId(p.vehicleId);
  if (v) {
    p.prix = String(priceAt(v, p.versionIndex ?? 0));
    p.vlabel = vehicleLabel(v, p.versionIndex ?? 0);
  } else p.vlabel = null;
  if (p.apport === "" && s.lastNeed?.estUsed && s.lastNeed.estApp) p.apport = s.lastNeed.estApp;

  const msg = ctx.addAssistant();
  await ctx.say(
    msg,
    v
      ? `Je reprends le ${p.vlabel} à ${fmt(num0(p.prix))}. Indiquez votre apport et la durée souhaitée.`
      : "Aucun véhicule n'est choisi. Saisissez le prix du véhicule visé, ou choisissez d'abord un modèle.",
  );
  const block = ctx.add<SimFormBlock>(msg, { kind: "simForm", params: p, submitted: false, results: [] });
  ctx.state.simFormRef = { messageId: msg.id, blockId: block.id };
  ctx.finish(msg);
}

const num0 = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;

function cleanSimParams(raw: SimParams): SimParams {
  const p: SimParams = {
    type: FINANCING_TYPES.includes(raw.type) ? raw.type : CREDIT,
    prix: String(raw.prix ?? ""),
    apport: String(raw.apport ?? ""),
    duree: Number(raw.duree),
    taux: DEFAULT_RATE,
    option: String(raw.option ?? ""),
    vehicleId: null,
    versionIndex: null,
    vlabel: null,
  };
  const v = byId(raw.vehicleId);
  if (v) {
    p.vehicleId = v.id;
    p.versionIndex = clampVersion(v, raw.versionIndex ?? 0);
    p.prix = String(priceAt(v, p.versionIndex));
    p.vlabel = vehicleLabel(v, p.versionIndex);
  }
  const errors = validateSim(p);
  const first = Object.values(errors)[0];
  if (first) throw new FlowError(first);
  return p;
}

export async function simSubmit(ctx: TurnContext, ref: BlockRef, raw: SimParams) {
  const { msg: formMsg, block } = formAt(ctx, ref, "simForm");
  const p = cleanSimParams(raw);
  block.params = p;
  block.submitted = true;
  ctx.dropResults(block);
  ctx.update(formMsg);
  ctx.state.simFormRef = ref;
  await showSim(ctx, structuredClone(p), p.duree, block);
}

async function showSim(ctx: TurnContext, p: SimParams, n: number, form: SimFormBlock | null) {
  p.duree = n;
  const sim: Simulation = { id: newId("s"), params: p, c: compute(p, n), at: new Date().toISOString() };
  ctx.state.lastSim = sim;
  const msg = ctx.addAssistant();
  if (form) form.results.push(msg.id);
  await ctx.say(msg, `Voici votre simulation${p.vlabel ? ` pour le ${p.vlabel}` : ""} sur ${n} mois.`);
  ctx.add(msg, { kind: "simResult", sim });
  suggestions(ctx, msg, [SG.S_OFFER, SG.S_COMPARE, SG.S_ELIG]);
  ctx.finish(msg);
}

function simForm(ctx: TurnContext): SimFormBlock | null {
  const ref = ctx.state.simFormRef;
  const found = ref ? ctx.find(ref) : null;
  return found?.block.kind === "simForm" ? found.block : null;
}

export async function compareFlow(ctx: TurnContext) {
  const s = ctx.state.lastSim;
  const msg = ctx.addAssistant();
  if (!s) {
    await ctx.say(msg, "Lancez d'abord une simulation pour comparer les durées.");
    suggestions(ctx, msg, [SG.S_SIM]);
    ctx.finish(msg);
    return;
  }
  simForm(ctx)?.results.push(msg.id);
  await ctx.say(msg, "Trois durées pour le même apport. Une durée plus courte réduit le coût total du crédit.");
  ctx.add<CompareBlock>(msg, { kind: "compare", params: structuredClone(s.params), durations: compareDurations(s.c.n), current: s.c.n });
  ctx.finish(msg);
}

export async function simDuration(ctx: TurnContext, duree: number) {
  const s = ctx.state.lastSim;
  if (!s) throw new FlowError("Aucune simulation à recalculer.");
  if (![24, 36, 48, 60, 72, 84].includes(duree)) throw new FlowError("Durée invalide.");
  ctx.addUser(`Simuler sur ${duree} mois`);
  await showSim(ctx, structuredClone(s.params), duree, simForm(ctx));
}

/* ---------------- éligibilité ---------------- */

export async function eligibilityFlow(ctx: TurnContext) {
  const e: EligInput = ctx.state.lastEligInput ? structuredClone(ctx.state.lastEligInput) : { ...DEFAULT_ELIG };
  const msg = ctx.addAssistant();
  await ctx.say(
    msg,
    "Deux questions sur votre situation pour estimer la faisabilité du financement. Vos réponses servent uniquement à cette estimation.",
  );
  ctx.add<EligFormBlock>(msg, { kind: "eligForm", data: e, submitted: false, results: [] });
  ctx.finish(msg);
}

export async function eligSubmit(ctx: TurnContext, ref: BlockRef, raw: EligInput) {
  const { msg: formMsg, block } = formAt(ctx, ref, "eligForm");
  const e: EligInput = {
    situation: String(raw.situation ?? ""),
    anciennete: String(raw.anciennete ?? ""),
    revenus: String(raw.revenus ?? ""),
    autres: String(raw.autres ?? ""),
    loyer: String(raw.loyer ?? ""),
    credits: raw.credits === "Oui" ? "Oui" : "Non",
    mens: raw.credits === "Oui" ? String(raw.mens ?? "") : "",
  };
  const first = Object.values({ ...validateEligStep1(e), ...validateEligStep2(e) })[0];
  if (first) throw new FlowError(first);
  block.data = e;
  block.submitted = true;
  ctx.dropResults(block);
  ctx.update(formMsg);
  ctx.state.lastEligInput = e;
  const result = evaluateEligibility(e, ctx.state.lastSim?.c.m ?? null);
  ctx.state.lastElig = result;

  const msg = ctx.addAssistant();
  block.results.push(msg.id);
  await ctx.say(msg, result.text);
  ctx.add(msg, { kind: "eligResult", result });
  suggestions(ctx, msg, result.suggestions);
  ctx.finish(msg);
}

/* ---------------- contact, code, demande d'offre ---------------- */

export async function contactFlow(ctx: TurnContext) {
  const c: ContactInput = ctx.state.lastContact
    ? { ...ctx.state.lastContact, consent: false }
    : { prenom: "", tel: "", creneau: "Après-midi", consent: false };
  const msg = ctx.addAssistant();
  await ctx.say(msg, "Laissez votre numéro : un conseiller vous envoie les offres de financement par SMS et vous rappelle au créneau choisi.");
  ctx.add<ContactFormBlock>(msg, { kind: "contactForm", contact: c, submitted: false, results: [] });
  ctx.finish(msg);
}

async function sendCode(ctx: TurnContext, digits: string, prenom: string, creneau: string) {
  const code = generateOtp();
  const salt = newId("otp");
  ctx.state.otp = {
    codeHash: `${salt}$${hashOtp(code, salt)}`,
    expiresAt: Date.now() + config.otp.ttlMs,
    lastSentAt: Date.now(),
    tries: 0,
    digits,
    prenom,
    creneau,
  };
  await sms.send(telFmt(digits), `Votre code de vérification Assistant VE : ${code}`);
  return code;
}

export async function contactSubmit(ctx: TurnContext, ref: BlockRef, raw: ContactInput) {
  const { msg: formMsg, block } = formAt(ctx, ref, "contactForm");
  const c: ContactInput = {
    prenom: String(raw.prenom ?? "").trim().slice(0, 60),
    tel: String(raw.tel ?? "").slice(0, 30),
    creneau: CRENEAUX.includes(raw.creneau as (typeof CRENEAUX)[number]) ? raw.creneau : "Après-midi",
    consent: raw.consent === true,
  };
  if (!c.consent) throw new FlowError("Acceptez d'être contacté pour recevoir le code.");
  if (!c.prenom) throw new FlowError("Indiquez votre prénom.");
  const digits = normTel(c.tel);
  if (!digits) throw new FlowError("Numéro invalide : 9 chiffres commençant par 6 ou 7.");

  block.contact = c;
  block.digits = digits;
  block.submitted = true;
  ctx.dropResults(block);
  ctx.update(formMsg);
  ctx.state.lastContact = c;

  const code = await sendCode(ctx, digits, c.prenom, c.creneau);
  const msg = ctx.addAssistant();
  block.results.push(msg.id);
  await ctx.say(msg, `Un code à 6 chiffres vient d'être envoyé au ${telFmt(digits)}.`);
  ctx.add<OtpBlock>(msg, {
    kind: "otp",
    digits,
    creneau: c.creneau,
    status: "pending",
    demoCode: config.otp.demoMode ? code : undefined,
    resendAvailableAt: new Date(Date.now() + config.otp.resendDelayMs).toISOString(),
    formRef: ref,
  });
  ctx.finish(msg);
}

export async function otpResend(ctx: TurnContext, ref: BlockRef) {
  const { msg, block } = formAt(ctx, ref, "otp");
  if (block.status === "verified") return;
  if (Date.now() < new Date(block.resendAvailableAt).getTime()) throw new FlowError("Patientez avant de demander un nouveau code.");
  const code = await sendCode(ctx, block.digits, ctx.state.lastContact?.prenom ?? "", block.creneau);
  block.error = undefined;
  block.locked = false;
  block.demoCode = config.otp.demoMode ? code : undefined;
  block.resendAvailableAt = new Date(Date.now() + config.otp.resendDelayMs).toISOString();
  ctx.update(msg);
  ctx.toast("Nouveau code envoyé.");
}

export async function otpVerify(ctx: TurnContext, ref: BlockRef, code: string) {
  const { msg, block } = formAt(ctx, ref, "otp");
  if (block.status === "verified") return;
  const otp = ctx.state.otp;
  const fail = (text: string, locked = false) => {
    block.error = text;
    block.locked = locked;
    ctx.update(msg);
  };
  if (!otp || otp.digits !== block.digits) return fail("Ce code n'est plus valide. Demandez un nouveau code.", true);
  if (Date.now() > otp.expiresAt) return fail("Ce code a expiré. Demandez un nouveau code.", true);
  if (otp.tries >= config.otp.maxTries) return fail("Trop d'essais. Demandez un nouveau code.", true);
  const [salt, hash] = otp.codeHash.split("$");
  if (!/^\d{6}$/.test(code) || hashOtp(code, salt) !== hash) {
    otp.tries++;
    if (otp.tries >= config.otp.maxTries) return fail("Trop d'essais. Demandez un nouveau code.", true);
    return fail("Code incorrect. Vérifiez le SMS reçu.");
  }
  block.status = "verified";
  block.error = undefined;
  block.demoCode = undefined;
  ctx.state.otp = null;
  ctx.update(msg);

  const form = ctx.find(block.formRef);
  await confirmation(ctx, otp.prenom, otp.digits, otp.creneau, form?.block.kind === "contactForm" ? form.block : null);
}

async function confirmation(ctx: TurnContext, prenom: string, digits: string, creneau: string, form: ContactFormBlock | null) {
  const s = ctx.state;
  const sim = s.lastSim;
  const ref = "VE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const day = nextCallDay();
  const chosenV = byId(s.chosen?.vehicleId);
  const vehicleId = sim?.params.vehicleId ?? s.chosen?.vehicleId ?? null;
  const versionIndex = sim?.params.vehicleId ? sim.params.versionIndex : s.chosen?.versionIndex ?? null;
  const req: OfferRequest = {
    ref,
    at: new Date().toISOString(),
    vehicleId,
    versionIndex,
    vlabel: sim?.params.vlabel ?? (chosenV && s.chosen ? vehicleLabel(chosenV, s.chosen.versionIndex) : null),
    vprice: sim?.params.vehicleId ? num0(sim.params.prix) : chosenV && s.chosen ? priceAt(chosenV, s.chosen.versionIndex) : null,
    sim: sim ? structuredClone(sim) : null,
    elig: s.lastElig ? { lvl: s.lastElig.lvl, label: s.lastElig.label, cap: s.lastElig.cap } : null,
    contact: { prenom, digits, creneau },
    day,
  };
  s.request = req;
  await store.addRequest(ctx.user.id, req);
  if (sim) {
    sim.requested = ref;
    const sims = await store.saveSimulation(ctx.user.id, sim);
    ctx.emit({ t: "simulations", simulations: sims });
    for (const m of ctx.conv.messages)
      for (const b of m.blocks) if (b.kind === "simResult" && b.sim.id === sim.id) b.sim.requested = ref;
  }

  const msg = ctx.addAssistant();
  form?.results.push(msg.id);
  await ctx.say(
    msg,
    `Merci ${prenom}. Votre demande est transmise : un conseiller vous rappelle ${day} (${creneau.toLowerCase()}) et vous envoie les offres par SMS.`,
  );
  ctx.add<ConfirmationBlock>(msg, { kind: "confirmation", request: req });
  suggestions(ctx, msg, [SG.RESET, SG.OPEN_SIMS]);
  ctx.finish(msg);
}

/* ---------------- réouverture d'un formulaire ---------------- */

export async function reopen(ctx: TurnContext, ref: BlockRef) {
  const found = ctx.find(ref);
  if (!found) throw new FlowError("Ce formulaire n'est plus disponible.");
  const { msg, block } = found;
  if (block.kind === "needForm" || block.kind === "simForm" || block.kind === "eligForm" || block.kind === "contactForm") {
    block.submitted = false;
    if (block.kind === "contactForm") block.contact.consent = false;
    ctx.dropResults(block);
    ctx.update(msg);
    if (block.kind === "contactForm") ctx.state.otp = null;
    return;
  }
  throw new FlowError("Ce bloc ne peut pas être modifié.");
}

/* ---------------- visualisation 3D ---------------- */

export async function viewer3dFlow(ctx: TurnContext) {
  const msg = ctx.addAssistant();
  await ctx.say(msg, "Choisissez un modèle dans les recommandations, puis cliquez sur l'icône 3D de sa carte.");
  suggestions(ctx, msg, [SG.S_FIND]);
  ctx.finish(msg);
}

export { BRAND };
