"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { ProfileView } from "@/components/talents/profile-view"
import { ME, PROFILE_TABS, ProfileTab, personById } from "@/lib/talents/data"

function MyProfile() {
  const params = useSearchParams()
  const onglet = params.get("onglet")
  const tab = PROFILE_TABS.some((t) => t.id === onglet) ? (onglet as ProfileTab) : "exp"
  return <ProfileView person={personById(ME)!} initialTab={tab} />
}

export default function ProfilPage() {
  return (
    <Suspense>
      <MyProfile />
    </Suspense>
  )
}
