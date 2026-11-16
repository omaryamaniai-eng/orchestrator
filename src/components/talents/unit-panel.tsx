"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PEOPLE, personById, unitById } from "@/lib/talents/data"
import { PersonRow } from "./person"
import { useTalents } from "./talents-provider"

export function UnitPanel({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const { openTrombi } = useTalents()
  const u = unitById(unitId)
  const manager = personById(u.manager)!
  const members = PEOPLE.filter((p) => p.unit === u.id && p.id !== u.manager)

  return (
    <aside
      aria-label="Détail de l'unité"
      className="z-10 flex w-[400px] shrink-0 flex-col border-l bg-card shadow-[-8px_0_24px_rgba(15,23,42,0.06)] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:w-full"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b pr-3 pl-5">
        <h2 className="text-base font-semibold">{u.name}</h2>
        <Button type="button" variant="ghost" size="icon" aria-label="Fermer" onClick={onClose} className="text-muted-foreground">
          <X className="size-3.5" strokeWidth={1.8} />
        </Button>
      </div>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Lieu</span>
          <span className="text-sm font-medium">{u.site}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Manager</span>
          <PersonRow person={manager} from="organigramme" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Collaborateurs</span>
          {members.length === 0 && (
            <span className="text-[13px] text-secondary-foreground">Aucun collaborateur rattaché directement.</span>
          )}
          {members.map((p) => (
            <PersonRow key={p.id} person={p} from="organigramme" />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => openTrombi({ units: [u.id] })}
          className="h-10 text-[13px] font-semibold shadow-none"
        >
          Voir dans le trombinoscope
        </Button>
      </div>
    </aside>
  )
}
