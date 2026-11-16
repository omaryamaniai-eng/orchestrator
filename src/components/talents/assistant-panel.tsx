"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUp, Maximize, Minus, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { personById, unitById } from "@/lib/talents/data"
import { CHAT_SUGGESTIONS, ChatCard } from "@/lib/talents/assistant"
import { profileHref } from "./person"
import { useTalents } from "./talents-provider"

export function AssistantPanel() {
  const router = useRouter()
  const { chat, setChat, ask, openTrombi, openUnit } = useTalents()
  const endRef = React.useRef<HTMLDivElement>(null)
  const canSend = chat.input.trim().length > 0

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [chat.messages.length])

  const cardView = (c: ChatCard) => {
    if (c.kind === "unit") {
      const u = unitById(c.id)
      return { title: u.name, sub: `${u.site} · ${personById(u.manager)!.name}`, open: () => openUnit(c.id) }
    }
    const p = personById(c.id)!
    return { title: p.name, sub: `${p.role} · ${unitById(p.unit).name}`, open: () => router.push(profileHref(p.id)) }
  }

  const iconBtn = "size-9 text-muted-foreground"

  return (
    <aside
      aria-label="Assistant"
      className={cn(
        "z-10 flex shrink-0 flex-col border-l bg-card shadow-[-8px_0_24px_rgba(15,23,42,0.06)] max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:w-full",
        chat.wide ? "w-[600px]" : "w-[400px]"
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b pr-3 pl-4">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-[15px]" strokeWidth={1.8} />
          </span>
          <h2 className="text-[15px] font-semibold">Assistant</h2>
        </div>
        <div className="flex">
          <Button type="button" variant="ghost" size="icon" aria-label="Agrandir ou rétrécir" className={cn(iconBtn, "max-md:hidden")} onClick={() => setChat((c) => ({ ...c, wide: !c.wide }))}>
            <Maximize className="size-3.5" strokeWidth={1.8} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Réduire" className={iconBtn} onClick={() => setChat((c) => ({ ...c, open: false }))}>
            <Minus className="size-3.5" strokeWidth={1.8} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Fermer" className={iconBtn} onClick={() => setChat((c) => ({ ...c, open: false, messages: [], input: "" }))}>
            <X className="size-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        {chat.messages.length === 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm leading-[21px] text-[#1e293b]">Recherchez un collègue, une compétence ou une unité.</p>
            {CHAT_SUGGESTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                onClick={() => ask(s)}
                className="h-auto min-h-10 justify-start rounded-[10px] px-3 py-2 text-left text-[13px] font-normal whitespace-normal shadow-none"
              >
                {s}
              </Button>
            ))}
          </div>
        )}
        {chat.messages.map((m, i) =>
          m.from === "user" ? (
            <p key={i} className="max-w-[280px] self-end rounded-[14px] bg-[#e8eefc] px-3.5 py-2.5 text-sm leading-[21px]">
              {m.text}
            </p>
          ) : (
            <div key={i} className="flex flex-col gap-2">
              <p className="text-sm leading-[21px] text-[#1e293b]">{m.text}</p>
              {m.cards.map((c) => {
                const v = cardView(c)
                return (
                  <div key={c.kind + c.id} className="flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13px] font-semibold">{v.title}</span>
                      <span className="text-xs text-muted-foreground">{v.sub}</span>
                    </span>
                    <Button type="button" variant="outline" onClick={v.open} className="h-9 px-3 text-xs font-semibold shadow-none">
                      Ouvrir
                    </Button>
                  </div>
                )
              })}
              {m.action && (
                <Button
                  type="button"
                  onClick={() => openTrombi(m.action!.filters)}
                  className="h-9 self-start px-3 text-xs font-semibold shadow-none"
                >
                  {m.action.label}
                </Button>
              )}
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(chat.input)
        }}
        className="flex gap-2 px-4 pb-4"
      >
        <Input
          type="text"
          aria-label="Votre message"
          value={chat.input}
          onChange={(e) => setChat((c) => ({ ...c, input: e.target.value }))}
          placeholder="Poser une question"
          className="h-11 rounded-xl px-3.5 text-sm shadow-none"
        />
        <Button
          type="submit"
          aria-label="Envoyer"
          disabled={!canSend}
          className="size-11 shrink-0 rounded-xl disabled:bg-border disabled:text-[#64748b] disabled:opacity-100"
        >
          <ArrowUp className="size-4" strokeWidth={2} />
        </Button>
      </form>
    </aside>
  )
}
