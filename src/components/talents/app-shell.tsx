"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { House, Network, UserRound, UsersRound, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ME, initials, personById } from "@/lib/talents/data"
import { AssistantPanel } from "./assistant-panel"
import { BrandMark } from "./brand"
import { TalentsProvider, useTalents } from "./talents-provider"
import { UnitPanel } from "./unit-panel"

const NAV = [
  { href: "/accueil", label: "Accueil", icon: House },
  { href: "/profil", label: "Profil du talent", icon: UserRound },
  { href: "/organigramme", label: "Organigramme", icon: Network },
  { href: "/trombinoscope", label: "Trombinoscope", icon: UsersRound },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TalentsProvider>
      <ShellInner>{children}</ShellInner>
    </TalentsProvider>
  )
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { chat, setChat, unitId, setUnitId } = useTalents()
  const me = personById(ME)!
  const unitOpen = !!unitId && pathname === "/organigramme"

  React.useEffect(() => {
    if (pathname !== "/organigramme") setUnitId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className="talents flex h-dvh flex-col overflow-hidden bg-canvas">
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 md:gap-6 md:px-6">
        <Link href="/accueil" className="flex items-center gap-2.5 md:w-[220px]">
          <BrandMark className="size-7 rounded-lg" />
          <span className="hidden text-[15px] font-semibold sm:inline">Talents</span>
        </Link>
        <nav aria-label="Navigation principale" className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto md:gap-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-[10px] px-3 py-2 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 md:min-w-24 md:px-4",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                <span className="hidden text-xs font-medium sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="flex justify-end md:w-[220px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Menu du profil"
                className="size-9 rounded-full bg-[#dbeafe] text-xs font-semibold text-link outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {initials(me)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="talents w-[200px] rounded-[10px] p-1.5">
              <DropdownMenuItem className="h-10 px-2.5 text-sm" onSelect={() => router.push("/profil")}>
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10 px-2.5 text-sm" onSelect={() => router.push("/connexion")}>
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-7">{children}</main>

        {unitOpen && <UnitPanel unitId={unitId!} onClose={() => setUnitId(null)} />}
        {chat.open && <AssistantPanel />}

        {!chat.open && (
          <Button
            type="button"
            aria-label="Ouvrir l'assistant"
            onClick={() => {
              setUnitId(null)
              setChat((c) => ({ ...c, open: true }))
            }}
            className="absolute right-6 bottom-6 z-10 size-[52px] rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
          >
            <Sparkles className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
