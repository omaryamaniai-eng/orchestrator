"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTalents } from "@/components/talents/talents-provider"
import { cn } from "@/lib/utils"
import { kidsOf, norm, personById, unitById } from "@/lib/talents/data"

const NW = 164
const NH = 76
const GX = 16
const GY = 56

type Line = { left: number; top: number; width: number; height: number }

/** Calcule la position de chaque unité et les traits de liaison de l'arbre. */
function layout(collapsed: Record<string, boolean>) {
  const pos: Record<string, { x: number; y: number }> = {}
  const lines: Line[] = []
  let next = 0
  let maxD = 0
  const place = (id: string, d: number) => {
    const kids = collapsed[id] ? [] : kidsOf(id)
    if (d > maxD) maxD = d
    let x: number
    if (!kids.length) {
      x = next
      next += NW + GX
    } else {
      kids.forEach((k) => place(k, d + 1))
      const a = pos[kids[0]].x
      const b = pos[kids[kids.length - 1]].x
      x = (a + b) / 2
      const y = d * (NH + GY)
      lines.push({ left: x + NW / 2, top: y + NH, width: 1, height: GY / 2 })
      lines.push({ left: a + NW / 2, top: y + NH + GY / 2, width: b - a + 1, height: 1 })
      kids.forEach((k) => lines.push({ left: pos[k].x + NW / 2, top: y + NH + GY / 2, width: 1, height: GY / 2 }))
    }
    pos[id] = { x, y: d * (NH + GY) }
  }
  place("dg", 0)
  return { pos, lines, w: next - GX, h: (maxD + 1) * NH + maxD * GY + 16 }
}

function Organigramme() {
  const params = useSearchParams()
  const { unitId, setUnitId } = useTalents()
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})
  const [zoom, setZoom] = React.useState(1)
  const [search, setSearch] = React.useState("")

  const fromUrl = params.get("unite")
  React.useEffect(() => {
    if (fromUrl) setUnitId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl])

  const L = layout(collapsed)
  const q = norm(search.trim())

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold">Organigramme</h1>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            aria-label="Rechercher une unité"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une unité"
            className="h-9 w-[220px] rounded-lg bg-card px-3 text-[13px] shadow-none"
          />
          <Button type="button" variant="outline" size="icon" aria-label="Réduire le zoom" className="rounded-lg text-secondary-foreground shadow-none" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))}>
            <Minus />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Augmenter le zoom" className="rounded-lg text-secondary-foreground shadow-none" onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}>
            <Plus />
          </Button>
        </div>
      </div>

      <Card className="min-h-[520px] overflow-auto rounded-xl px-6 py-8 shadow-none">
        <div className="mx-auto" style={{ width: Math.ceil(L.w * zoom), height: Math.ceil(L.h * zoom) }}>
          <div className="relative origin-top-left" style={{ width: L.w, height: L.h, transform: `scale(${zoom})` }}>
            {L.lines.map((l, i) => (
              <div key={i} aria-hidden="true" className="absolute bg-[#94a3b8]" style={l} />
            ))}
            {Object.keys(L.pos).map((id) => {
              const u = unitById(id)
              const hit = q && norm(u.name).includes(q)
              const sel = unitId === id
              const isCollapsed = !!collapsed[id]
              const hasKids = kidsOf(id).length > 0
              return (
                <div key={id} className="absolute" style={{ left: L.pos[id].x, top: L.pos[id].y, width: NW, height: NH }}>
                  <button
                    type="button"
                    onClick={() => setUnitId(id)}
                    className={cn(
                      "flex size-full flex-col items-center justify-center gap-0.5 rounded-[10px] p-1.5 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      sel
                        ? "border-2 border-primary bg-accent"
                        : hit
                          ? "border-2 border-[#b45309] bg-[#fffbeb]"
                          : "border border-input bg-card hover:bg-[#f8fafc]"
                    )}
                  >
                    <span className="text-[13px] font-semibold">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{personById(u.manager)!.name}</span>
                    <span className="text-[11px] text-muted-foreground">{u.site}</span>
                  </button>
                  {hasKids && (
                    <button
                      type="button"
                      aria-label={(isCollapsed ? "Déplier " : "Replier ") + u.name}
                      onClick={() => setCollapsed((c) => ({ ...c, [id]: !isCollapsed }))}
                      className="absolute -bottom-3 left-1/2 -ml-3 flex size-6 items-center justify-center rounded-full border border-[#94a3b8] bg-card p-0 text-sm leading-none text-secondary-foreground"
                    >
                      {isCollapsed ? "+" : "−"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function OrganigrammePage() {
  return (
    <Suspense>
      <Organigramme />
    </Suspense>
  )
}
