import { describe, expect, it } from "vitest";
import { DEFAULT_NEED, priceAt, byId, recommend, matchVehicles } from "@/lib/domain/catalog";
import { compute, compareDurations, estimateBudget, evaluateEligibility, normTel, num, fmt, validateSim, LOA, CREDIT, type SimParams } from "@/lib/domain/finance";

const sim = (o: Partial<SimParams> = {}): SimParams => ({
  type: CREDIT, prix: "400000", apport: "", duree: 60, taux: 5, option: "", vehicleId: null, versionIndex: null, vlabel: null, ...o,
});

describe("catalogue", () => {
  it("filtre par carrosserie et places, usage principal en premier", () => {
    const r = matchVehicles({ carros: ["SUV"], places: "5", usage: "Ville" });
    expect(r.map((v) => v.id)).toEqual(["f", "a", "c"]);
  });
  it("sépare les modèles dans et hors budget et choisit la version la plus complète", () => {
    const r = recommend({ ...DEFAULT_NEED, carros: ["SUV"], places: "5", budget: "400000" });
    expect(r.within).toEqual(["a", "f"]);
    expect(r.above).toEqual(["c"]);
    expect(r.versions.f).toBe(2); // 339000 + 55000 <= 400000
    expect(r.versions.a).toBe(0);
  });
  it("calcule le prix d'une version", () => {
    expect(priceAt(byId("a")!, 2)).toBe(439000);
  });
});

describe("finance", () => {
  it("num accepte les espaces et la virgule", () => {
    expect(num("12 500,5")).toBe(12500.5);
    expect(Number.isNaN(num("abc"))).toBe(true);
  });
  it("fmt groupe les milliers", () => {
    expect(fmt(1234567)).toBe("1 234 567 MAD");
  });
  it("mensualité d'un crédit classique", () => {
    const c = compute(sim(), 60);
    expect(c.F).toBe(400000);
    expect(Math.round(c.m)).toBe(7548);
    expect(c.cost).toBeCloseTo(c.m * 60 - 400000, 6);
  });
  it("LOA : l'option d'achat réduit la mensualité", () => {
    const credit = compute(sim(), 48);
    const loa = compute(sim({ type: LOA, option: "100000" }), 48);
    expect(loa.m).toBeLessThan(credit.m);
    expect(loa.total).toBeCloseTo(loa.m * 48 + 100000, 6);
  });
  it("valide les paramètres de simulation", () => {
    expect(validateSim(sim({ apport: "500000" })).apport).toBeDefined();
    expect(validateSim(sim({ type: LOA, option: "" })).option).toBeDefined();
    expect(validateSim(sim())).toEqual({});
  });
  it("encadre les durées comparées", () => {
    expect(compareDurations(24)).toEqual([24, 36, 48]);
    expect(compareDurations(60)).toEqual([48, 60, 72]);
    expect(compareDurations(84)).toEqual([60, 72, 84]);
  });
  it("estime un budget", () => {
    const e = estimateBudget({ estRev: "20000", estAut: "", estDet: "2000", estApp: "50000", estTaux: "5 %" })!;
    expect(e.M).toBe(6000);
    expect(e.B).toBeGreaterThan(e.C);
    expect(estimateBudget({ estRev: "1000", estAut: "", estDet: "900", estApp: "", estTaux: "5 %" })!.none).toBe(true);
  });
  it("évalue l'éligibilité", () => {
    const base = { situation: "Salarié du privé", anciennete: "Plus de 2 ans", revenus: "20000", autres: "", loyer: "3000", credits: "Non" as const, mens: "" };
    expect(evaluateEligibility(base, 5000).lvl).toBe("fav");
    expect(evaluateEligibility(base, 8500).lvl).toBe("etu");
    expect(evaluateEligibility(base, 12000).lvl).toBe("def");
    expect(evaluateEligibility({ ...base, anciennete: "Moins de 1 an" }, 5000).lvl).toBe("etu");
  });
  it("normalise les numéros marocains", () => {
    expect(normTel("06 12 34 56 78")).toBe("612345678");
    expect(normTel("+212 7 12 34 56 78")).toBe("712345678");
    expect(normTel("0512345678")).toBeNull();
  });
});
