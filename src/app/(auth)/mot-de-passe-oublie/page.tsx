"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function MotDePasseOubliePage() {
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)

  return (
    <Card className="w-full max-w-[380px] gap-4 rounded-[14px] p-8 shadow-none">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setSent(true)
        }}
      >
        <h1 className="text-xl font-semibold">Mot de passe oublié</h1>
        <p className="text-sm text-muted-foreground">Un lien de réinitialisation est envoyé à votre adresse.</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-id" className="text-[13px]">Identifiant</Label>
          <Input
            id="reset-id"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@entreprise.com"
            className="h-10 rounded-lg px-3 shadow-none"
          />
        </div>
        {sent && (
          <p role="status" className="rounded-lg border border-[#bfdbfe] bg-accent px-3 py-2.5 text-[13px] text-chip">
            Lien envoyé. Consultez votre messagerie.
          </p>
        )}
        <Button type="submit" className="h-11 rounded-lg font-semibold shadow-none">
          Envoyer le lien
        </Button>
        <Button asChild variant="ghost" className="h-11 text-sm font-normal text-link hover:bg-transparent hover:text-link hover:underline">
          <Link href="/connexion">Retour à la connexion</Link>
        </Button>
      </form>
    </Card>
  )
}
