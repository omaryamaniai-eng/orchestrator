import type { Metadata } from "next"

import { AppShell } from "@/components/talents/app-shell"
import { inter } from "@/lib/talents/font"

export const metadata: Metadata = {
  title: "Talents - Plateforme de gestion des talents",
}

export default function TalentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="fr" className={inter.variable}>
      <AppShell>{children}</AppShell>
    </div>
  )
}
