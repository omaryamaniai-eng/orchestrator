"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandMark } from "@/components/talents/brand"

export default function ConnexionPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [pwd, setPwd] = React.useState("")
  const [error, setError] = React.useState(false)

  return (
    <Card className="w-full max-w-[380px] gap-4 rounded-[14px] p-8 shadow-none">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (email.trim() && pwd) router.push("/accueil")
          else setError(true)
        }}
      >
        <div className="flex items-center justify-center gap-2.5">
          <BrandMark className="size-8 rounded-[9px]" />
          <span className="text-lg font-semibold">Talents</span>
        </div>
        <h1 className="text-center text-xl font-semibold">Connexion</h1>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-id" className="text-[13px]">Identifiant</Label>
          <Input
            id="login-id"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(false)
            }}
            placeholder="prenom.nom@entreprise.com"
            className="h-10 rounded-lg px-3 shadow-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-pw" className="text-[13px]">Mot de passe</Label>
          <Input
            id="login-pw"
            type="password"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value)
              setError(false)
            }}
            className="h-10 rounded-lg px-3 shadow-none"
          />
        </div>
        <Link href="/mot-de-passe-oublie" className="self-end py-1 text-[13px] text-link hover:underline">
          Mot de passe oublié
        </Link>
        {error && (
          <p role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-destructive">
            Identifiant ou mot de passe incorrect.
          </p>
        )}
        <Button type="submit" className="h-11 rounded-lg font-semibold shadow-none">
          Se connecter
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-lg shadow-none" onClick={() => router.push("/accueil")}>
          Continuer avec le compte de l&apos;organisation
        </Button>
      </form>
    </Card>
  )
}
