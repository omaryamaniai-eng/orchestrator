/**
 * Calculs financiers repris du prototype : simulation de crédit / LOA,
 * estimation de budget, évaluation d'éligibilité.
 * Les règles marquées "démonstration" sont à remplacer par celles de l'organisme de financement.
 */

export const DUREES = [24, 36, 48, 60, 72, 84] as const;
export const LOA = "Location avec option d'achat";
export const CREDIT = "Crédit classique";
export const FINANCING_TYPES = [CREDIT, LOA] as const;
export type FinancingType = (typeof FINANCING_TYPES)[number];

export const DEFAULT_RATE = 5; // % annuel, règle de démonstration
export const EST_DUREE = 84; // mois, estimateur de budget
export const EST_RATES = ["5 %", "6 %"] as const;
export const DEBT_RATIO = 0.4; // endettement maximal, règle de démonstration

/** Convertit une saisie utilisateur en nombre ; NaN si invalide. */
export function num(value: unknown): number {
  const s = String(value ?? "")
    .replace(/[\s  ]/g, "")
    .replace(/MAD$/i, "")
    .replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}

export function optNum(value: string | undefined | null): number {
  return value == null || value === "" ? 0 : num(value);
}

export function groupDigits(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function fmt(n: number): string {
  const neg = n < 0;
  const a = Math.abs(Math.round(n));
  return (neg ? "- " : "") + groupDigits(a) + " MAD";
}

export function pct(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",") + " %";
}

/* ---------------- simulation ---------------- */

export interface SimParams {
  type: FinancingType;
  /** Prix du véhicule, chiffres. */
  prix: string;
  apport: string;
  duree: number;
  taux: number;
  /** Option d'achat finale (LOA). */
  option: string;
  vehicleId: string | null;
  versionIndex: number | null;
  vlabel: string | null;
}

export interface SimComputation {
  P: number;
  A: number;
  T: number;
  F: number;
  n: number;
  m: number;
  O: number;
  loa: boolean;
  total: number;
  cost: number;
}

export interface Simulation {
  id: string;
  params: SimParams;
  c: SimComputation;
  at: string;
  /** Référence de la demande d'offre associée. */
  requested?: string;
}

export function compute(p: Pick<SimParams, "prix" | "apport" | "taux" | "type" | "option">, n: number): SimComputation {
  const P = num(p.prix);
  const A = optNum(p.apport);
  const T = p.taux;
  const loa = p.type === LOA;
  const O = loa ? num(p.option) : 0;
  const F = P - A;
  const r = T / 100 / 12;
  const base = loa ? F - O / Math.pow(1 + r, n) : F;
  const m = r > 0 ? (base * r) / (1 - Math.pow(1 + r, -n)) : base / n;
  const total = m * n + (loa ? O : 0);
  return { P, A, T, F, n, m, O, loa, total, cost: total - F };
}

export type FieldErrors = Record<string, string>;

export function validateSim(p: SimParams): FieldErrors {
  const e: FieldErrors = {};
  const P = num(p.prix);
  const A = optNum(p.apport);
  const loa = p.type === LOA;
  if (!(P > 0)) e.prix = "Indiquez le prix en chiffres.";
  if (isNaN(A)) e.apport = "Indiquez l'apport en chiffres.";
  else if (P > 0 && A >= P) e.apport = "L'apport dépasse le prix du véhicule.";
  if (loa) {
    const O = num(p.option);
    if (isNaN(O)) e.option = "Indiquez l'option d'achat en chiffres.";
    else if (P > 0 && !isNaN(A) && O >= P - A) e.option = "L'option d'achat doit rester inférieure au montant financé.";
  }
  if (!DUREES.includes(p.duree as (typeof DUREES)[number])) e.duree = "Choisissez une durée.";
  return e;
}

/** Trois durées autour de la durée simulée, bornées à 24–84 mois. */
export function compareDurations(n: number): number[] {
  let ds = [n - 12, n, n + 12];
  if (ds[0] < 24) ds = [24, 36, 48];
  if (ds[2] > 84) ds = [60, 72, 84];
  return ds;
}

/* ---------------- estimateur de budget ---------------- */

export interface BudgetEstimateInput {
  estRev: string;
  estAut: string;
  estDet: string;
  estApp: string;
  estTaux: string;
}

export interface BudgetEstimate {
  M: number;
  C: number;
  B: number;
  AP: number;
  none?: boolean;
}

export function estimateBudget(n: BudgetEstimateInput): BudgetEstimate | null {
  const R = num(n.estRev);
  const A = optNum(n.estAut);
  const D = optNum(n.estDet);
  const AP = optNum(n.estApp);
  if (!(R > 0) || isNaN(A) || isNaN(D) || isNaN(AP)) return null;
  const M = (R + A) * DEBT_RATIO - D;
  const r = parseFloat(n.estTaux) / 100 / 12;
  if (M <= 0) return { M: 0, C: 0, B: AP, AP, none: true };
  const C = (M * (1 - Math.pow(1 + r, -EST_DUREE))) / r;
  return { M, C, B: C + AP, AP };
}

/* ---------------- éligibilité ---------------- */

export const SITUATIONS = ["Salarié du privé", "Fonctionnaire", "Profession libérale", "Commerçant", "Retraité"] as const;
export const ANCIENNETES = ["Plus de 2 ans", "1 à 2 ans", "Moins de 1 an"] as const;

export interface EligInput {
  situation: string;
  anciennete: string;
  revenus: string;
  autres: string;
  loyer: string;
  credits: "Oui" | "Non";
  mens: string;
}

export const DEFAULT_ELIG: EligInput = {
  situation: "Salarié du privé",
  anciennete: "Plus de 2 ans",
  revenus: "",
  autres: "",
  loyer: "",
  credits: "Non",
  mens: "",
};

export type EligLevel = "fav" | "etu" | "def";

export const LEVELS: Record<EligLevel, { label: string; bg: string; fg: string; icon: "check" | "alert" | "close" }> = {
  fav: { label: "Favorable", bg: "#dcfce7", fg: "#166534", icon: "check" },
  etu: { label: "À étudier", bg: "#ffedd5", fg: "#9a3412", icon: "alert" },
  def: { label: "Défavorable", bg: "#fee2e2", fg: "#991b1b", icon: "close" },
};

export function validateEligStep1(e: EligInput): FieldErrors {
  const r: FieldErrors = {};
  if (!(num(e.revenus) > 0)) r.revenus = "Indiquez vos revenus en chiffres.";
  if (isNaN(optNum(e.autres))) r.autres = "Indiquez un montant en chiffres.";
  if (!SITUATIONS.includes(e.situation as (typeof SITUATIONS)[number])) r.situation = "Choisissez une situation.";
  if (!ANCIENNETES.includes(e.anciennete as (typeof ANCIENNETES)[number])) r.anciennete = "Choisissez une ancienneté.";
  return r;
}

export function validateEligStep2(e: EligInput): FieldErrors {
  const r: FieldErrors = {};
  if (isNaN(num(e.loyer))) r.loyer = "Indiquez un montant en chiffres, 0 si aucun.";
  if (e.credits === "Oui" && !(num(e.mens) > 0)) r.mens = "Indiquez vos mensualités en chiffres.";
  return r;
}

export interface EligResult {
  lvl: EligLevel;
  label: string;
  cap: number;
  monthly: number | null;
  reste: number;
  line: string;
  text: string;
  suggestions: string[];
}

export function evaluateEligibility(e: EligInput, simulatedMonthly: number | null): EligResult {
  const R = num(e.revenus) + optNum(e.autres);
  const L = num(e.loyer);
  const M = e.credits === "Oui" ? num(e.mens) : 0;
  const cap = R * DEBT_RATIO - M;
  const m = simulatedMonthly;
  const reste = R - L - M - (m || 0);
  let lvl: EligLevel;
  if (cap <= 0 || (m !== null && (m > cap * 1.2 || reste <= 0))) lvl = "def";
  else if (m !== null && m > cap) lvl = "etu";
  else lvl = "fav";
  const anc = lvl === "fav" && e.anciennete === "Moins de 1 an";
  if (anc) lvl = "etu";

  let line: string, text: string, suggestions: string[];
  if (lvl === "fav") {
    line = m !== null ? "Votre profil permet d'envisager ce financement." : "Votre capacité de remboursement est positive.";
    text =
      m !== null
        ? "D'après vos réponses, le financement simulé est envisageable."
        : "D'après vos réponses, voici la mensualité que vous pouvez envisager. Simulez un crédit pour la comparer.";
    suggestions = m !== null ? ["Recevoir l'offre", "Ajuster la simulation", "Modifier ma situation"] : ["Simuler le crédit", "Modifier ma situation"];
  } else if (lvl === "etu") {
    line = anc ? "Votre ancienneté demande une étude du dossier." : "La mensualité simulée dépasse la mensualité supportable.";
    text = anc
      ? "Le dossier reste possible, un conseiller l'étudiera en détail."
      : "Une durée plus longue ou un apport plus élevé rapproche la mensualité de votre capacité.";
    suggestions = ["Comparer trois durées", "Ajuster la simulation", "Recevoir l'offre"];
  } else {
    line =
      cap <= 0
        ? "Vos charges actuelles ne laissent pas de capacité de remboursement."
        : "La mensualité simulée est trop élevée pour votre situation actuelle.";
    text = "Un apport plus élevé, une durée plus longue ou un véhicule moins cher sont à envisager.";
    suggestions = ["Ajuster la simulation", "Être rappelé par un conseiller"];
  }
  return { lvl, label: LEVELS[lvl].label, cap: Math.max(cap, 0), monthly: m, reste, line, text, suggestions };
}

/* ---------------- contact ---------------- */

export const CRENEAUX = ["Matin", "Midi", "Après-midi", "Soir"] as const;

/** Normalise un numéro marocain mobile ; renvoie les 9 chiffres ou null. */
export function normTel(value: string): string | null {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("212")) d = d.slice(3);
  if (d.length === 10 && d[0] === "0") d = d.slice(1);
  return /^[67]\d{8}$/.test(d) ? d : null;
}

export function telFmt(d: string): string {
  return `+212 ${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

export function nextCallDay(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function hhmm(iso: string): string {
  const t = new Date(iso);
  return ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2);
}
