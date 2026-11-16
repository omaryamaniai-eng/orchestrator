"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ConnectButton, PersonAvatar, SkillChip, profileHref } from "@/components/talents/person"
import { useTalents } from "@/components/talents/talents-provider"
import { cn } from "@/lib/utils"
import {
  ALL_SITES,
  ALL_SKILLS,
  EMPTY_FILTERS,
  Filters,
  matchPeople,
  norm,
  unitById,
  unitDepth,
  unitsInTreeOrder,
} from "@/lib/talents/data"

const PER_PAGE = 8

export default function TrombinoscopePage() {
  const { trombi, setTrombi, connections, chat } = useTalents()
  const { filters, onlyConnected, search } = trombi
  const [skillSearch, setSkillSearch] = React.useState("")
  const [page, setPage] = React.useState(0)

  const res = matchPeople(filters, { onlyConnected, search, connections })
  const nbPages = Math.max(1, Math.ceil(res.length / PER_PAGE))
  const current = Math.min(page, nbPages - 1)

  const toggle = (kind: keyof Filters, val: string) => {
    setPage(0)
    setTrombi((t) => {
      const list = t.filters[kind]
      return {
        ...t,
        filters: { ...t.filters, [kind]: list.includes(val) ? list.filter((v) => v !== val) : [...list, val] },
      }
    })
  }
  const clear = () => {
    setPage(0)
    setTrombi({ filters: EMPTY_FILTERS, onlyConnected: false, search: "" })
  }

  const chips = [
    ...(onlyConnected
      ? [{ label: "Mes connexions", remove: () => setTrombi((t) => ({ ...t, onlyConnected: false })) }]
      : []),
    ...filters.units.map((id) => ({ label: unitById(id).name, remove: () => toggle("units", id) })),
    ...filters.skills.map((k) => ({ label: k, remove: () => toggle("skills", k) })),
    ...filters.sites.map((k) => ({ label: k, remove: () => toggle("sites", k) })),
  ]

  const sq = norm(skillSearch.trim())

  return (
    <div className="flex flex-col items-start gap-5 md:flex-row">
      <Card className="w-full shrink-0 gap-4 rounded-xl p-4 shadow-none md:w-[230px]">
        <aside aria-label="Filtres" className="flex flex-col gap-4">
          <FilterGroup title="Unité organisationnelle">
            {unitsInTreeOrder().map((id) => (
              <FilterCheck
                key={id}
                label={unitById(id).name}
                checked={filters.units.includes(id)}
                onToggle={() => toggle("units", id)}
                indent={unitDepth(id)}
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Compétences">
            <Input
              type="search"
              aria-label="Rechercher une compétence"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Rechercher"
              className="h-8 rounded-lg px-2.5 text-[13px] shadow-none"
            />
            <div className="flex max-h-[170px] flex-col gap-1.5 overflow-y-auto">
              {ALL_SKILLS.filter((k) => !sq || norm(k).includes(sq)).map((k) => (
                <FilterCheck key={k} label={k} checked={filters.skills.includes(k)} onToggle={() => toggle("skills", k)} />
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Lieu">
            {ALL_SITES.map((k) => (
              <FilterCheck key={k} label={k} checked={filters.sites.includes(k)} onToggle={() => toggle("sites", k)} />
            ))}
          </FilterGroup>
        </aside>
      </Card>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-semibold">Trombinoscope</h1>
          <Input
            type="search"
            aria-label="Rechercher un collaborateur"
            value={search}
            onChange={(e) => {
              setPage(0)
              setTrombi((t) => ({ ...t, search: e.target.value }))
            }}
            placeholder="Rechercher un nom ou un poste"
            className="h-9 w-[260px] rounded-lg bg-card px-3 text-[13px] shadow-none"
          />
        </div>

        <div className="flex min-h-7 flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">
            {res.length} {res.length > 1 ? "collaborateurs" : "collaborateur"}
          </span>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.remove}
              aria-label={"Retirer le filtre " + c.label}
              className="flex h-7 items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-accent px-2.5 text-xs text-chip"
            >
              <span>{c.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
          {chips.length > 0 && (
            <Button type="button" variant="link" className="h-auto px-1 py-1.5 text-xs font-medium text-link" onClick={clear}>
              Effacer les filtres
            </Button>
          )}
        </div>

        {res.length === 0 && (
          <Card className="items-center gap-3 rounded-xl px-6 py-12 shadow-none">
            <span className="text-sm text-secondary-foreground">Aucun collaborateur ne correspond.</span>
            <Button type="button" variant="outline" className="h-9 px-3.5 text-[13px] font-semibold shadow-none" onClick={clear}>
              Effacer les filtres
            </Button>
          </Card>
        )}

        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            chat.open ? "xl:grid-cols-2" : "lg:grid-cols-3 xl:grid-cols-4"
          )}
        >
          {res.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE).map((p) => (
            <Card key={p.id} className="min-w-0 items-center gap-2.5 rounded-xl p-[18px] shadow-none">
              <Link
                href={profileHref(p.id, "trombinoscope")}
                className="flex w-full flex-col items-center gap-2 rounded-md text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <PersonAvatar person={p} size={72} />
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.role}</span>
                <span className="text-xs text-muted-foreground">
                  {unitById(p.unit).name} · {p.site}
                </span>
              </Link>
              <div className="flex flex-wrap justify-center gap-1">
                {p.skills.slice(0, 2).map((s) => (
                  <SkillChip key={s} subtle>
                    {s}
                  </SkillChip>
                ))}
              </div>
              <ConnectButton person={p} />
            </Card>
          ))}
        </div>

        {nbPages > 1 && (
          <div className="flex items-center justify-end gap-2.5">
            <span className="text-[13px] text-muted-foreground">
              Page {current + 1} sur {nbPages}
            </span>
            <Button type="button" variant="outline" className="h-9 px-3 text-[13px] font-normal shadow-none" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Précédent
            </Button>
            <Button type="button" variant="outline" className="h-9 px-3 text-[13px] font-normal shadow-none" disabled={current >= nbPages - 1} onClick={() => setPage(current + 1)}>
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function FilterCheck({
  label,
  checked,
  onToggle,
  indent = 0,
}: {
  label: string
  checked: boolean
  onToggle: () => void
  indent?: number
}) {
  return (
    <label
      className="flex min-h-6 cursor-pointer items-center gap-2 text-[13px] text-secondary-foreground"
      style={{ paddingLeft: indent * 14 }}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span>{label}</span>
    </label>
  )
}
