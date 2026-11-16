"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ADD_FIELDS,
  ADD_TITLES,
  ME,
  PROFILE_TABS,
  Person,
  ProfileTab,
  defaultBio,
  emailOf,
  managerOf,
  personById,
  profileListItems,
  unitById,
} from "@/lib/talents/data"
import { ConnectButton, PersonAvatar, SkillChip, profileHref } from "./person"
import { SectionHeader, linkButtonClass } from "./brand"
import { useTalents } from "./talents-provider"

const BACK_LABELS: Record<string, { label: string; href: string }> = {
  accueil: { label: "l'accueil", href: "/accueil" },
  organigramme: { label: "l'organigramme", href: "/organigramme" },
  trombinoscope: { label: "le trombinoscope", href: "/trombinoscope" },
}

const EMPTY_DRAFT = ["", "", "", ""]

export function ProfileView({
  person,
  from,
  initialTab = "exp",
}: {
  person: Person
  from?: string | null
  initialTab?: ProfileTab
}) {
  const router = useRouter()
  const { bio, setBio, added, addItem, openUnit } = useTalents()
  const isMe = person.id === ME
  const unit = unitById(person.unit)
  const mgrId = managerOf(person)
  const back = from ? BACK_LABELS[from] : undefined

  const [tab, setTab] = React.useState<ProfileTab>(initialTab)
  const [bioEdit, setBioEdit] = React.useState(false)
  const [bioDraft, setBioDraft] = React.useState("")
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState(EMPTY_DRAFT)

  React.useEffect(() => setTab(initialTab), [initialTab, person.id])

  const bioText = isMe && bio !== null ? bio : defaultBio(person)
  const mine = isMe ? added[tab] : []
  const isTagTab = tab === "comp" || tab === "int"
  const skills = isMe ? person.skills.concat(added.comp.map((d) => d[0])) : person.skills
  const tabTags =
    tab === "comp"
      ? skills
      : tab === "int"
        ? mine.map((d) => d[0]).concat(["[Centre d'intérêt]", "[Centre d'intérêt]", "[Centre d'intérêt]"])
        : []
  const tabItems = isTagTab
    ? []
    : mine
        .map((d) => ({ title: d[0], sub: [d[1], d[2]].filter(Boolean).join(" · "), desc: d[3] || "" }))
        .concat(profileListItems(person, tab as "exp" | "dip" | "prj"))

  const contact = [
    { label: "Bâtiment", value: "[Bâtiment]" },
    { label: "Adresse", value: "[Adresse]" },
    { label: "Numéro", value: "[Numéro]" },
    { label: "E-mail", value: emailOf(person) },
  ]

  return (
    <div className="flex flex-col gap-4">
      {back && (
        <Button asChild variant="link" className={cn(linkButtonClass, "self-start")}>
          <Link href={back.href}>← Retour à {back.label}</Link>
        </Button>
      )}

      <Card className="flex-row flex-wrap items-center gap-5 rounded-xl p-6 shadow-none">
        <PersonAvatar person={person} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[22px] font-semibold">{person.name}</h1>
          <span className="text-sm text-secondary-foreground">{person.role}</span>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Button type="button" variant="link" className={cn(linkButtonClass, "py-1")} onClick={() => openUnit(person.unit)}>
              {unit.name}
            </Button>
            <span>{person.site}</span>
          </div>
        </div>
        {!isMe && <ConnectButton person={person} />}
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-2 rounded-xl p-5 shadow-none">
            <SectionHeader
              title="Bio"
              action={
                isMe && !bioEdit ? (
                  <Button
                    type="button"
                    variant="link"
                    className={linkButtonClass}
                    onClick={() => {
                      setBioDraft(bioText)
                      setBioEdit(true)
                    }}
                  >
                    Modifier
                  </Button>
                ) : undefined
              }
            />
            {isMe && bioEdit ? (
              <div className="flex flex-col gap-2.5">
                <Textarea
                  aria-label="Bio"
                  rows={4}
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  className="resize-y rounded-lg border-primary px-3 py-2.5 text-sm leading-[22px] shadow-none"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-[34px] px-3.5 text-[13px] font-semibold shadow-none" onClick={() => setBioEdit(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-[34px] px-3.5 text-[13px] font-semibold shadow-none"
                    onClick={() => {
                      setBio(bioDraft)
                      setBioEdit(false)
                    }}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-[22px] text-secondary-foreground">{bioText}</p>
            )}
          </Card>

          <Card className="gap-3 rounded-xl px-5 pt-2 pb-5 shadow-none">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as ProfileTab)
                setAdding(false)
                setDraft(EMPTY_DRAFT)
              }}
              className="gap-3"
            >
              <div className="flex items-center justify-between gap-2 border-b">
                <TabsList className="h-auto flex-wrap justify-start rounded-none bg-transparent p-0">
                  {PROFILE_TABS.map((t) => (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      className="-mb-px h-11 flex-none rounded-none border-0 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-link data-[state=active]:shadow-none"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {isMe && !adding && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdding(true)
                      setDraft(EMPTY_DRAFT)
                    }}
                    className="h-8 shrink-0 border-primary px-3 text-[13px] font-semibold text-link shadow-none hover:text-link"
                  >
                    + Ajouter
                  </Button>
                )}
              </div>
            </Tabs>

            {isMe && adding && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft[0].trim()) return
                  addItem(tab, draft.map((x) => x.trim()))
                  setAdding(false)
                  setDraft(EMPTY_DRAFT)
                }}
                className="flex flex-col gap-3 rounded-[10px] border border-[#bfdbfe] bg-[#f8fafc] p-4"
              >
                <h3 className="text-sm font-semibold">{ADD_TITLES[tab]}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ADD_FIELDS[tab].map((label, i) => (
                    <label key={label} className="flex flex-col gap-1 text-xs font-medium text-secondary-foreground">
                      <span>{label}</span>
                      <Input
                        type="text"
                        value={draft[i]}
                        onChange={(e) => {
                          const d = draft.slice()
                          d[i] = e.target.value
                          setDraft(d)
                        }}
                        className="h-9 rounded-lg bg-card px-2.5 text-[13px] shadow-none"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-[34px] px-3.5 text-[13px] font-semibold shadow-none" onClick={() => setAdding(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" className="h-[34px] px-3.5 text-[13px] font-semibold shadow-none">
                    Enregistrer
                  </Button>
                </div>
              </form>
            )}

            {isTagTab ? (
              <div className="flex flex-wrap gap-2 py-1.5">
                {tabTags.map((s, i) => (
                  <SkillChip key={s + i}>{s}</SkillChip>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {tabItems.map((it, i) => (
                  <div key={i} className="flex flex-col gap-0.5 border-b border-muted py-2.5">
                    <span className="text-sm font-semibold">{it.title}</span>
                    <span className="text-[13px] text-muted-foreground">{it.sub}</span>
                    <span className="mt-1 text-[13px] text-secondary-foreground">{it.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-3 rounded-xl p-5 shadow-none">
            <h2 className="text-[15px] font-semibold">Coordonnées</h2>
            {contact.map((r) => (
              <Field key={r.label} label={r.label}>
                <span className="text-sm [overflow-wrap:anywhere]">{r.value}</span>
              </Field>
            ))}
          </Card>
          <Card className="gap-3 rounded-xl p-5 shadow-none">
            <h2 className="text-[15px] font-semibold">Organisation</h2>
            <Field label="Unité">
              <Button type="button" variant="link" className={cn(linkButtonClass, "self-start py-0 text-sm")} onClick={() => openUnit(person.unit)}>
                {unit.name}
              </Button>
            </Field>
            <Field label="Unité mère">
              <span className="text-sm">{unit.parent ? unitById(unit.parent).name : "Aucune"}</span>
            </Field>
            <Field label="Manager">
              {mgrId ? (
                <Button
                  type="button"
                  variant="link"
                  className={cn(linkButtonClass, "self-start py-0 text-sm")}
                  onClick={() => router.push(profileHref(mgrId, from ?? undefined))}
                >
                  {personById(mgrId)!.name}
                </Button>
              ) : (
                <span className="text-sm">Aucun</span>
              )}
            </Field>
            <Field label="Années d'expérience">
              <span className="text-sm">[Nombre]</span>
            </Field>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
