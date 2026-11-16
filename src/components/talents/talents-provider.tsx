"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  ConnectionState,
  EMPTY_FILTERS,
  Filters,
  INITIAL_CONNECTIONS,
  ProfileTab,
} from "@/lib/talents/data"
import { ChatMessage, answer } from "@/lib/talents/assistant"

type AddedItems = Record<ProfileTab, string[][]>

type TalentsState = {
  connections: Record<string, ConnectionState>
  connect: (id: string) => void

  bio: string | null
  setBio: (bio: string) => void
  added: AddedItems
  addItem: (tab: ProfileTab, values: string[]) => void

  trombi: { filters: Filters; onlyConnected: boolean; search: string }
  setTrombi: React.Dispatch<React.SetStateAction<TalentsState["trombi"]>>
  openTrombi: (filters?: Partial<Filters>, onlyConnected?: boolean) => void

  unitId: string | null
  setUnitId: (id: string | null) => void
  openUnit: (id: string) => void

  chat: { open: boolean; wide: boolean; input: string; messages: ChatMessage[] }
  setChat: React.Dispatch<React.SetStateAction<TalentsState["chat"]>>
  ask: (text: string) => void
}

const TalentsContext = React.createContext<TalentsState | null>(null)

export function TalentsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [connections, setConnections] = React.useState(INITIAL_CONNECTIONS)
  const [bio, setBio] = React.useState<string | null>(null)
  const [added, setAdded] = React.useState<AddedItems>({ exp: [], dip: [], prj: [], comp: [], int: [] })
  const [trombi, setTrombi] = React.useState({ filters: EMPTY_FILTERS, onlyConnected: false, search: "" })
  const [unitId, setUnitIdState] = React.useState<string | null>(null)
  const [chat, setChat] = React.useState({ open: false, wide: false, input: "", messages: [] as ChatMessage[] })

  const value: TalentsState = {
    connections,
    connect: (id) => setConnections((c) => ({ ...c, [id]: "sent" })),
    bio,
    setBio,
    added,
    addItem: (tab, values) => setAdded((a) => ({ ...a, [tab]: [values, ...a[tab]] })),
    trombi,
    setTrombi,
    openTrombi: (filters = {}, onlyConnected = false) => {
      setTrombi({ filters: { ...EMPTY_FILTERS, ...filters }, onlyConnected, search: "" })
      setUnitIdState(null)
      router.push("/trombinoscope")
    },
    unitId,
    setUnitId: (id) => {
      setUnitIdState(id)
      if (id) setChat((c) => ({ ...c, open: false }))
    },
    openUnit: (id) => {
      setUnitIdState(id)
      setChat((c) => ({ ...c, open: false }))
      router.push("/organigramme")
    },
    chat,
    setChat,
    ask: (text) => {
      const t = text.trim()
      if (!t) return
      const a = answer(t)
      setChat((c) => ({
        ...c,
        open: true,
        input: "",
        messages: [
          ...c.messages,
          { from: "user", text: t },
          { from: "bot", text: a.text, cards: a.cards, action: a.action ?? null },
        ],
      }))
      if (a.nav) {
        setUnitIdState(null)
        router.push(a.nav)
      }
    },
  }

  return <TalentsContext.Provider value={value}>{children}</TalentsContext.Provider>
}

export function useTalents() {
  const ctx = React.useContext(TalentsContext)
  if (!ctx) throw new Error("useTalents doit être utilisé dans TalentsProvider")
  return ctx
}
