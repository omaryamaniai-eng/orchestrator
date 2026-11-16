"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConnectButton, PersonRow, SkillChip } from "@/components/talents/person"
import { SectionHeader, linkButtonClass } from "@/components/talents/brand"
import { useTalents } from "@/components/talents/talents-provider"
import { ME, PEOPLE, firstName, personById, unitById } from "@/lib/talents/data"

export default function AccueilPage() {
  const { connections, added, openTrombi } = useTalents()
  const me = personById(ME)!
  const mySkills = me.skills.concat(added.comp.map((d) => d[0]))
  const myUnit = unitById(me.unit)

  const suggestions = PEOPLE.filter((p) => p.id !== ME && connections[p.id] !== "connected")
    .map((p) => {
      const shared = p.skills.find((k) => mySkills.includes(k))
      let score = 0
      let reason = ""
      if (p.unit === myUnit.id) {
        score = 3
        reason = "Même unité : " + myUnit.name
      } else if (shared) {
        score = 2
        reason = "Compétence commune : " + shared
      } else if (myUnit.parent && unitById(p.unit).parent === myUnit.parent) {
        score = 1
        reason = "Même direction : " + unitById(myUnit.parent).name
      }
      return { p, score, reason }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  const myConnections = PEOPLE.filter((p) => connections[p.id] === "connected")

  const kpis = [
    { label: "Années d'expérience", link: "Voir mes expériences", href: "/profil?onglet=exp" },
    { label: "Compétences", link: "Voir mes compétences", href: "/profil?onglet=comp" },
    { label: "Connexions", link: "Voir mes connexions", onClick: () => openTrombi({}, true) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[22px] font-semibold">Bonjour {firstName(me)}</h1>
      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {kpis.map((k) => {
              const inner = (
                <>
                  <span className="text-[13px] text-muted-foreground">{k.label}</span>
                  <span className="text-[26px] font-semibold">[Nombre]</span>
                  <span className="text-xs font-medium text-link">{k.link}</span>
                </>
              )
              const cls =
                "flex flex-col gap-2 rounded-xl border bg-card p-[18px] text-left outline-none transition-colors hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/50"
              return k.href ? (
                <Link key={k.label} href={k.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button key={k.label} type="button" onClick={k.onClick} className={cls}>
                  {inner}
                </button>
              )
            })}
          </div>

          <Card className="gap-3.5 rounded-xl p-5 shadow-none">
            <SectionHeader
              title="Mes compétences"
              action={
                <Button asChild variant="link" className={linkButtonClass}>
                  <Link href="/profil">Voir mon profil</Link>
                </Button>
              }
            />
            <div className="flex flex-wrap gap-2">
              {mySkills.map((s, i) => (
                <SkillChip key={s + i}>{s}</SkillChip>
              ))}
            </div>
          </Card>

          <Card className="gap-2.5 rounded-xl p-5 shadow-none">
            <SectionHeader
              title="Mes connexions"
              action={
                <Button type="button" variant="link" className={linkButtonClass} onClick={() => openTrombi({}, true)}>
                  Voir tout
                </Button>
              }
            />
            {myConnections.map((p) => (
              <PersonRow key={p.id} person={p} from="accueil" />
            ))}
          </Card>
        </div>

        <Card className="min-w-0 gap-1.5 rounded-xl p-5 shadow-none">
          <h2 className="mb-1.5 text-[15px] font-semibold">Suggestions de connexion</h2>
          {suggestions.map(({ p, reason }) => (
            <div key={p.id} className="flex items-center gap-2.5 border-t border-muted py-2.5">
              <PersonRow
                person={p}
                from="accueil"
                className="flex-1 py-0"
                subtitle={<span className="text-[11px] text-chip">{reason}</span>}
              />
              <ConnectButton person={p} compact />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
