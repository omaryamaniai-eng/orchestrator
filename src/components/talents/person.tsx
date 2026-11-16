"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Person, avatarColors, initials } from "@/lib/talents/data"
import { useTalents } from "./talents-provider"

const AVATAR_SIZES = {
  40: "size-10 text-[13px]",
  72: "size-[72px] text-[22px]",
  88: "size-[88px] text-[28px]",
} as const

export function PersonAvatar({ person, size = 40 }: { person: Person; size?: keyof typeof AVATAR_SIZES }) {
  const [bg, fg] = avatarColors(person)
  return (
    <Avatar aria-hidden="true" className={cn("shrink-0", AVATAR_SIZES[size])}>
      <AvatarFallback className="font-semibold" style={{ background: bg, color: fg }}>
        {initials(person)}
      </AvatarFallback>
    </Avatar>
  )
}

export function profileHref(id: string, from?: string) {
  return from ? `/profil/${id}?from=${from}` : `/profil/${id}`
}

/** Ligne avatar + nom + poste, cliquable vers le profil. */
export function PersonRow({
  person,
  from,
  subtitle,
  className,
}: {
  person: Person
  from?: string
  subtitle?: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={profileHref(person.id, from)}
      className={cn("flex min-w-0 items-center gap-3 rounded-md py-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}
    >
      <PersonAvatar person={person} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{person.name}</span>
        <span className="truncate text-xs text-muted-foreground">{person.role}</span>
        {subtitle}
      </span>
    </Link>
  )
}

/** Bouton de mise en relation : « Se connecter », « Demande envoyée » ou « Connecté ». */
export function ConnectButton({
  person,
  compact = false,
  className,
}: {
  person: Person
  compact?: boolean
  className?: string
}) {
  const { connections, connect } = useTalents()
  const st = connections[person.id]
  const label =
    st === "connected" ? "Connecté" : st === "sent" ? (compact ? "Envoyée" : "Demande envoyée") : "Se connecter"

  if (compact) {
    return (
      <Button
        type="button"
        size="sm"
        variant={st ? "ghost" : "outline"}
        disabled={!!st}
        onClick={() => connect(person.id)}
        className={cn(
          "h-[30px] shrink-0 rounded-full px-3 text-xs font-semibold",
          st ? "text-muted-foreground disabled:opacity-100" : "border-primary text-link hover:text-link",
          className
        )}
      >
        {label}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      disabled={!!st}
      onClick={() => connect(person.id)}
      className={cn(
        "h-[34px] px-3.5 text-[13px] font-semibold shadow-none",
        st ? "bg-muted text-muted-foreground disabled:opacity-100" : "border-primary text-link hover:text-link",
        className
      )}
    >
      {label}
    </Button>
  )
}

export function SkillChip({ children, subtle = false }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full",
        subtle ? "bg-muted px-2 py-[3px] text-[11px] text-secondary-foreground" : "bg-accent px-2.5 py-[5px] text-[13px] text-chip"
      )}
    >
      {children}
    </span>
  )
}
