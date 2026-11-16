// Données fictives de la plateforme de gestion des talents.

export type Unit = {
  id: string
  name: string
  parent: string | null
  site: string
  manager: string
  alias: string[]
}

export type Person = {
  id: string
  name: string
  role: string
  unit: string
  site: string
  skills: string[]
}

export type Filters = { units: string[]; skills: string[]; sites: string[] }

export type ConnectionState = "connected" | "sent"

export const UNITS: Unit[] = [
  { id: "dg", name: "Direction générale", parent: null, site: "Casablanca", manager: "p1", alias: ["direction generale"] },
  { id: "rh", name: "Ressources humaines", parent: "dg", site: "Casablanca", manager: "p2", alias: ["ressources humaines", "rh"] },
  { id: "tech", name: "Technologie", parent: "dg", site: "Rabat", manager: "p3", alias: ["technologie", "tech"] },
  { id: "dev", name: "Développement", parent: "tech", site: "Rabat", manager: "p4", alias: ["developpement", "dev"] },
  { id: "data", name: "Data et IA", parent: "tech", site: "Casablanca", manager: "p5", alias: ["data et ia", "data", "ia"] },
  { id: "fin", name: "Finance", parent: "dg", site: "Casablanca", manager: "p6", alias: ["finance"] },
  { id: "com", name: "Commercial", parent: "dg", site: "Tanger", manager: "p7", alias: ["commercial"] },
]

export const PEOPLE: Person[] = [
  { id: "p1", name: "Salma Bennani", role: "Directrice générale", unit: "dg", site: "Casablanca", skills: ["Stratégie", "Leadership", "Gestion de projet"] },
  { id: "p2", name: "Karim Idrissi", role: "Directeur des ressources humaines", unit: "rh", site: "Casablanca", skills: ["Recrutement", "Gestion des talents", "Droit social"] },
  { id: "p3", name: "Youssef Alami", role: "Directeur technologie", unit: "tech", site: "Rabat", skills: ["Architecture logicielle", "Cloud", "Leadership"] },
  { id: "p4", name: "Nadia Tazi", role: "Responsable développement", unit: "dev", site: "Rabat", skills: ["JavaScript", "React", "Gestion de projet"] },
  { id: "p5", name: "Omar Chraibi", role: "Responsable data et IA", unit: "data", site: "Casablanca", skills: ["Python", "Machine learning", "SQL"] },
  { id: "p6", name: "Leila Fassi", role: "Directrice financière", unit: "fin", site: "Casablanca", skills: ["Contrôle de gestion", "Excel", "Comptabilité"] },
  { id: "p7", name: "Hicham Berrada", role: "Directeur commercial", unit: "com", site: "Tanger", skills: ["Négociation", "CRM", "Leadership"] },
  { id: "p8", name: "Yasmine El Amrani", role: "Designer produit", unit: "dev", site: "Rabat", skills: ["UX design", "Prototypage", "React"] },
  { id: "p9", name: "Mehdi Lahlou", role: "Développeur full stack", unit: "dev", site: "Rabat", skills: ["JavaScript", "Python", "SQL"] },
  { id: "p10", name: "Sara Kettani", role: "Data scientist", unit: "data", site: "Casablanca", skills: ["Python", "Machine learning", "Data visualisation"] },
  { id: "p11", name: "Amine Zniber", role: "Chargé de recrutement", unit: "rh", site: "Casablanca", skills: ["Recrutement", "Marque employeur"] },
  { id: "p12", name: "Imane Sqalli", role: "Ingénieure commerciale", unit: "com", site: "Tanger", skills: ["Négociation", "CRM", "Excel"] },
  { id: "p13", name: "Rachid Ouazzani", role: "Contrôleur de gestion", unit: "fin", site: "Casablanca", skills: ["Contrôle de gestion", "Excel", "SQL"] },
]

/** Identifiant de l'utilisateur connecté. */
export const ME = "p8"

export const INITIAL_CONNECTIONS: Record<string, ConnectionState> = { p2: "connected", p3: "connected" }

export const AVATAR_COLORS: [string, string][] = [
  ["#dbeafe", "#1e40af"],
  ["#fef3c7", "#92400e"],
  ["#dcfce7", "#166534"],
  ["#fce7f3", "#9d174d"],
  ["#e0e7ff", "#3730a3"],
  ["#ffedd5", "#9a3412"],
]

export const norm = (s: string) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

export const hasWord = (text: string, w: string) =>
  new RegExp("(^|[^a-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])").test(text)

export const unitById = (id: string) => UNITS.find((u) => u.id === id)!
export const personById = (id: string) => PEOPLE.find((p) => p.id === id)
export const kidsOf = (id: string) => UNITS.filter((u) => u.parent === id).map((u) => u.id)
export const descendants = (id: string): string[] =>
  kidsOf(id).reduce((a, k) => a.concat(descendants(k)), [id])

export const unitDepth = (id: string) => {
  let d = 0
  let u = unitById(id)
  while (u.parent) {
    d++
    u = unitById(u.parent)
  }
  return d
}

/** Unités dans l'ordre de l'arbre (parcours en profondeur). */
export const unitsInTreeOrder = (id = "dg"): string[] =>
  kidsOf(id).reduce((a, k) => a.concat(unitsInTreeOrder(k)), [id])

export const ALL_SKILLS = Array.from(new Set(PEOPLE.flatMap((p) => p.skills))).sort((a, b) =>
  a.localeCompare(b, "fr")
)
export const ALL_SITES = Array.from(new Set(PEOPLE.map((p) => p.site))).sort()

export const initials = (p: Person) => {
  const parts = p.name.split(" ")
  return parts[0][0] + parts[parts.length - 1][0]
}

export const firstName = (p: Person) => p.name.split(" ")[0]

export const emailOf = (p: Person) => {
  const parts = p.name.split(" ")
  return norm(parts[0]) + "." + norm(parts.slice(1).join("")) + "@entreprise.com"
}

export const avatarColors = (p: Person) => AVATAR_COLORS[PEOPLE.indexOf(p) % AVATAR_COLORS.length]

export const defaultBio = (p: Person) =>
  `${p.role}, unité ${unitById(p.unit).name}, ${p.site}. [Présentation du collaborateur en quelques lignes.]`

/** Manager d'une personne : celui de son unité, ou celui de l'unité mère si elle dirige l'unité. */
export const managerOf = (p: Person) => {
  const u = unitById(p.unit)
  if (u.manager !== p.id) return u.manager
  return u.parent ? unitById(u.parent).manager : null
}

export const EMPTY_FILTERS: Filters = { units: [], skills: [], sites: [] }

export function matchPeople(
  filters: Filters,
  opts: { onlyConnected?: boolean; search?: string; connections?: Record<string, ConnectionState> } = {}
) {
  const unitSet = filters.units.flatMap((u) => descendants(u))
  const q = norm(opts.search || "")
  return PEOPLE.filter((p) => {
    if (filters.units.length && !unitSet.includes(p.unit)) return false
    if (filters.skills.length && !filters.skills.some((s) => p.skills.includes(s))) return false
    if (filters.sites.length && !filters.sites.includes(p.site)) return false
    if (opts.onlyConnected && opts.connections?.[p.id] !== "connected") return false
    if (q && !norm(p.name + " " + p.role).includes(q)) return false
    return true
  })
}

export type ProfileTab = "exp" | "dip" | "prj" | "comp" | "int"

export const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "exp", label: "Expériences" },
  { id: "dip", label: "Diplômes" },
  { id: "prj", label: "Projets" },
  { id: "comp", label: "Compétences" },
  { id: "int", label: "Centres d'intérêt" },
]

export const ADD_FIELDS: Record<ProfileTab, string[]> = {
  exp: ["Poste", "Entreprise", "Période", "Description"],
  dip: ["Diplôme", "Établissement", "Année", "Spécialité"],
  prj: ["Nom du projet", "Rôle", "Période", "Description"],
  comp: ["Compétence"],
  int: ["Centre d'intérêt"],
}

export const ADD_TITLES: Record<ProfileTab, string> = {
  exp: "Nouvelle expérience",
  dip: "Nouveau diplôme",
  prj: "Nouveau projet",
  comp: "Nouvelle compétence",
  int: "Nouveau centre d'intérêt",
}

export type ListItem = { title: string; sub: string; desc: string }

export function profileListItems(p: Person, tab: "exp" | "dip" | "prj"): ListItem[] {
  const unitName = unitById(p.unit).name
  const data: Record<"exp" | "dip" | "prj", ListItem[]> = {
    exp: [
      { title: p.role, sub: "[Entreprise actuelle] · [Période]", desc: `Rattachement : ${unitName}, ${p.site}.` },
      { title: "[Poste précédent]", sub: "[Entreprise] · [Période]", desc: "[Missions principales]" },
    ],
    dip: [
      { title: "[Diplôme]", sub: "[Établissement] · [Année]", desc: "[Spécialité]" },
      { title: "[Diplôme]", sub: "[Établissement] · [Année]", desc: "[Spécialité]" },
    ],
    prj: [
      { title: "[Nom du projet]", sub: "[Rôle] · [Période]", desc: `Compétences mobilisées : ${p.skills.slice(0, 2).join(", ")}.` },
      { title: "[Nom du projet]", sub: "[Rôle] · [Période]", desc: "[Description courte]" },
    ],
  }
  return data[tab]
}
