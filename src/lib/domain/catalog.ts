/**
 * Catalogue de démonstration repris du prototype.
 * Les valeurs entre crochets ([Marque], [Valeur]) sont des emplacements à remplacer
 * par les données réelles du distributeur.
 */

export type Carrosserie = "Citadine" | "Berline" | "SUV" | "Monospace";
export type Usage = "Ville" | "Mixte" | "Longs trajets";

export interface VehicleVersion {
  name: string;
  /** Supplément par rapport au prix de base, en MAD. */
  extra: number;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  carro: Carrosserie;
  places: number;
  color: string;
  usages: Usage[];
  /** Prix de base (première version), en MAD. */
  base: number;
  versions: VehicleVersion[];
}

const v = (name: string, extra: number): VehicleVersion => ({ name, extra });

export const CATALOG: Vehicle[] = [
  { id: "a", base: 379000, name: "Modèle A", type: "SUV compact", carro: "SUV", places: 5, color: "#94a3b8", usages: ["Mixte", "Longs trajets"], versions: [v("Essentielle", 0), v("Confort", 30000), v("Grande autonomie", 60000)] },
  { id: "b", base: 429000, name: "Modèle B", type: "Berline", carro: "Berline", places: 5, color: "#1d4ed8", usages: ["Mixte", "Longs trajets"], versions: [v("Confort", 0), v("Exclusive", 45000)] },
  { id: "c", base: 549000, name: "Modèle C", type: "SUV familial", carro: "SUV", places: 7, color: "#334155", usages: ["Mixte", "Longs trajets"], versions: [v("Confort", 0), v("Grande autonomie", 50000), v("Performance", 90000)] },
  { id: "d", base: 259000, name: "Modèle D", type: "Citadine", carro: "Citadine", places: 4, color: "#b91c1c", usages: ["Ville", "Mixte"], versions: [v("Essentielle", 0), v("Confort", 20000)] },
  { id: "e", base: 219000, name: "Modèle E", type: "Citadine", carro: "Citadine", places: 4, color: "#f1f5f9", usages: ["Ville"], versions: [v("Essentielle", 0), v("Urbaine plus", 15000)] },
  { id: "f", base: 339000, name: "Modèle F", type: "SUV compact", carro: "SUV", places: 5, color: "#0f766e", usages: ["Ville", "Mixte"], versions: [v("Essentielle", 0), v("Confort", 25000), v("Grande autonomie", 55000)] },
  { id: "g", base: 589000, name: "Modèle G", type: "Monospace", carro: "Monospace", places: 7, color: "#64748b", usages: ["Mixte", "Longs trajets"], versions: [v("Confort", 0), v("Exclusive", 40000)] },
  { id: "h", base: 469000, name: "Modèle H", type: "Berline", carro: "Berline", places: 5, color: "#e2e8f0", usages: ["Longs trajets"], versions: [v("Confort", 0), v("Grande autonomie", 45000)] },
];

export const BRAND = "[Marque]";

export const COLORS: [string, string][] = [
  ["Blanc nacré", "#f1f5f9"],
  ["Gris", "#94a3b8"],
  ["Noir", "#1e293b"],
  ["Bleu", "#1d4ed8"],
  ["Rouge", "#b91c1c"],
];

export interface TechSection {
  s: string;
  t: string;
  rows?: [string, string][];
  pills?: number;
}

export const TECH: TechSection[] = [
  { s: "Moteur", t: "Moteur & infos techniques", rows: [["Motorisation", "[Type]"], ["Puissance", "[Valeur] ch"], ["Couple", "[Valeur] Nm"], ["Batterie", "[Valeur] kWh"], ["Transmission", "[Type]"], ["Boîte de vitesses", "[Type]"]] },
  { s: "Conso. & perf.", t: "Conso. & performances", rows: [["Autonomie", "[Valeur] km"], ["Consommation", "[Valeur] kWh / 100 km"], ["Recharge rapide", "[Durée]"], ["Puissance de charge", "[Valeur] kW"], ["0 à 100 km/h", "[Valeur] s"], ["Vitesse maximale", "[Valeur] km/h"]] },
  { s: "Dimensions", t: "Dimensions & volumes", rows: [["Longueur", "[Valeur] m"], ["Largeur", "[Valeur] m"], ["Hauteur", "[Valeur] m"], ["Empattement", "[Valeur] m"], ["Coffre", "[Valeur] L"], ["Poids", "[Valeur] kg"]] },
  { s: "Sécurité", t: "Sécurité", pills: 6 },
  { s: "Confort", t: "Confort", pills: 6 },
  { s: "Esthétique", t: "Esthétique", pills: 5 },
];

export function byId(id: string | null | undefined): Vehicle | undefined {
  return CATALOG.find((x) => x.id === id);
}

export function clampVersion(vehicle: Vehicle, index: number | undefined): number {
  const i = Number.isInteger(index) ? (index as number) : 0;
  return Math.min(Math.max(i, 0), vehicle.versions.length - 1);
}

export function priceAt(vehicle: Vehicle, index: number): number {
  return vehicle.base + vehicle.versions[clampVersion(vehicle, index)].extra;
}

export function versionName(vehicle: Vehicle, index: number): string {
  return vehicle.versions[clampVersion(vehicle, index)].name;
}

export function fullName(vehicle: Vehicle, index: number): string {
  return `${vehicle.name} · ${versionName(vehicle, index)}`;
}

/** Libellé complet avec la marque, ex. "[Marque] Modèle A · Confort". */
export function vehicleLabel(vehicle: Vehicle, index: number): string {
  return `${BRAND} ${fullName(vehicle, index)}`;
}

/* ---------------- besoin & recommandation ---------------- */

export const USAGES: Usage[] = ["Ville", "Mixte", "Longs trajets"];
export const CARROSSERIES: Carrosserie[] = ["Citadine", "Berline", "SUV", "Monospace"];
export const DISTANCES = ["Moins de 30 km", "30 à 80 km", "Plus de 80 km"] as const;
export const PLACES = ["2 à 4", "5", "7"] as const;
export const RECHARGE = ["Oui", "Non", "Je ne sais pas"] as const;

export interface Need {
  usage: Usage;
  carros: Carrosserie[];
  distance: (typeof DISTANCES)[number];
  places: (typeof PLACES)[number];
  /** Budget saisi, chiffres uniquement. */
  budget: string;
  recharge: (typeof RECHARGE)[number];
  /** Le budget provient de l'estimateur. */
  estUsed?: boolean;
  estTaux?: string;
  estApp?: string;
  estRev?: string;
  estDet?: string;
}

export const DEFAULT_NEED: Need = {
  usage: "Mixte",
  carros: [],
  distance: "30 à 80 km",
  places: "5",
  budget: "",
  recharge: "Oui",
};

export function matchVehicles(need: Pick<Need, "carros" | "places" | "usage">): Vehicle[] {
  const pl =
    need.places === "2 à 4" ? (p: number) => p <= 4 : need.places === "5" ? (p: number) => p >= 5 : (p: number) => p >= 7;
  const r = CATALOG.filter((x) => need.carros.includes(x.carro) && pl(x.places));
  // Tri stable : les modèles adaptés à l'usage principal d'abord.
  return r
    .map((x, i) => ({ x, i }))
    .sort((a, b) => Number(b.x.usages.includes(need.usage)) - Number(a.x.usages.includes(need.usage)) || a.i - b.i)
    .map((e) => e.x);
}

export interface Recommendation {
  within: string[];
  above: string[];
  /** Version retenue par défaut pour chaque modèle (la plus complète dans le budget). */
  versions: Record<string, number>;
  budget: number;
}

export function recommend(need: Need): Recommendation {
  const all = matchVehicles(need);
  const budget = parseInt(need.budget.replace(/\D/g, ""), 10) || 0;
  const within = all.filter((x) => priceAt(x, 0) <= budget);
  const above = all.filter((x) => priceAt(x, 0) > budget).sort((a, b) => priceAt(a, 0) - priceAt(b, 0));
  const versions: Record<string, number> = {};
  for (const x of within) {
    let k = 0;
    x.versions.forEach((_, i) => {
      if (priceAt(x, i) <= budget) k = i;
    });
    versions[x.id] = k;
  }
  for (const x of above) versions[x.id] = 0;
  return { within: within.map((x) => x.id), above: above.map((x) => x.id), versions, budget };
}

/** Résumé textuel du catalogue, injecté dans le contexte du modèle de langage. */
export function catalogContext(): string {
  return CATALOG.map(
    (x) =>
      `- ${BRAND} ${x.name} (id ${x.id}) : ${x.type}, ${x.places} places, usages ${x.usages.join(" / ")}, versions ${x.versions
        .map((ver, i) => `${ver.name} ${priceAt(x, i)} MAD`)
        .join(", ")}`,
  ).join("\n");
}
