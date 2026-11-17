import type { Suggestion } from "./types";

export const S_FIND = "Trouver ma voiture électrique";
export const S_SIM = "Simuler le crédit";
export const S_SIM_ADJUST = "Ajuster la simulation";
export const S_ELIG = "Vérifier mon éligibilité";
export const S_ELIG_EDIT = "Modifier ma situation";
export const S_COMPARE = "Comparer trois durées";
export const S_OFFER = "Recevoir l'offre";
export const S_CALLBACK = "Être rappelé par un conseiller";
export const S_PHEV = "Quelle est la différence entre PHEV et REEV ?";
export const S_RANGE = "Quels modèles ont la plus grande autonomie ?";

export const msg = (...labels: string[]): Suggestion[] => labels.map((label) => ({ label }));

export const RESET: Suggestion = { label: "Démarrer une nouvelle recherche", kind: "command", command: "reset" };
export const OPEN_SIMS: Suggestion = { label: "Voir mes simulations", kind: "command", command: "open_sims" };
