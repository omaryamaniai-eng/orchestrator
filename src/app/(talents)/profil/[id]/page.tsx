"use client"

import { Suspense } from "react"
import { notFound, useParams, useSearchParams } from "next/navigation"

import { ProfileView } from "@/components/talents/profile-view"
import { personById } from "@/lib/talents/data"

function ColleagueProfile() {
  const { id } = useParams<{ id: string }>()
  const from = useSearchParams().get("from")
  const person = personById(id)
  if (!person) notFound()
  return <ProfileView key={person.id} person={person} from={from} />
}

export default function ProfilCollaborateurPage() {
  return (
    <Suspense>
      <ColleagueProfile />
    </Suspense>
  )
}
