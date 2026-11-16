import {
  ALL_SITES,
  ALL_SKILLS,
  Filters,
  PEOPLE,
  UNITS,
  hasWord,
  matchPeople,
  norm,
  unitById,
} from "./data"

export type ChatCard = { kind: "person" | "unit"; id: string }

export type ChatMessage =
  | { from: "user"; text: string }
  | {
      from: "bot"
      text: string
      cards: ChatCard[]
      action: { label: string; filters: Filters } | null
    }

export type AssistantAnswer = {
  text: string
  cards: ChatCard[]
  action?: { label: string; filters: Filters }
  nav?: string
}

export const CHAT_SUGGESTIONS = [
  "Qui maîtrise Python à Casablanca ?",
  "Montre-moi l'unité Data et IA",
  "Trouve Karim Idrissi",
  "Ouvre l'organigramme",
]

/** Moteur de réponse simulé : recherche par nom, compétence, unité, lieu ou navigation. */
export function answer(text: string): AssistantAnswer {
  let n = norm(text)
  const ppl = PEOPLE.filter((p) => norm(p.name).split(" ").some((w) => w.length > 3 && hasWord(n, w)))
  if (ppl.length) {
    return {
      text: ppl.length > 1 ? "Voici les profils correspondants." : "Voici le profil correspondant.",
      cards: ppl.slice(0, 3).map((p) => ({ kind: "person", id: p.id })),
    }
  }
  const skills = ALL_SKILLS.filter((s) => n.includes(norm(s)))
  skills.forEach((s) => {
    n = n.replace(norm(s), " ")
  })
  const sites = ALL_SITES.filter((s) => hasWord(n, norm(s)))
  const units = UNITS.filter((u) => u.alias.some((a) => hasWord(n, a))).map((u) => u.id)

  if (units.length === 1 && !skills.length && !sites.length) {
    return {
      text: `Voici l'unité ${unitById(units[0]).name}.`,
      cards: [{ kind: "unit", id: units[0] }],
      action: { label: "Afficher dans le trombinoscope", filters: { units, skills: [], sites: [] } },
    }
  }
  if (units.length || skills.length || sites.length) {
    const filters = { units, skills, sites }
    const res = matchPeople(filters)
    const crit = units.map((u) => unitById(u).name).concat(skills, sites).join(", ")
    if (!res.length) return { text: `Aucun collaborateur ne correspond à : ${crit}.`, cards: [] }
    return {
      text: `Collaborateurs correspondant à : ${crit}.`,
      cards: res.slice(0, 3).map((p) => ({ kind: "person", id: p.id })),
      action: { label: "Afficher les résultats", filters },
    }
  }
  const navs: [string, string, string][] = [
    ["organigramme", "/organigramme", "L'organigramme est ouvert."],
    ["trombinoscope", "/trombinoscope", "Le trombinoscope est ouvert."],
    ["accueil", "/accueil", "L'accueil est ouvert."],
    ["profil", "/profil", "Votre profil est ouvert."],
  ]
  for (const [key, href, msg] of navs) {
    if (n.includes(key)) return { text: msg, cards: [], nav: href }
  }
  return {
    text: "La recherche porte sur un nom, une compétence, une unité ou un lieu. Exemple : « Python à Casablanca ».",
    cards: [],
  }
}
