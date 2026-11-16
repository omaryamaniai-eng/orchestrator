import type { Metadata } from "next"

import { inter } from "@/lib/talents/font"

export const metadata: Metadata = {
  title: "Connexion - Talents",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="fr" className={`${inter.variable} talents flex min-h-dvh items-center justify-center bg-canvas p-4`}>
      {children}
    </div>
  )
}
