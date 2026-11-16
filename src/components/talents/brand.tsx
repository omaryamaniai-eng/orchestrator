import { cn } from "@/lib/utils"

/** Pastille de marque de la plateforme (carré bleu de la maquette). */
export function BrandMark({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("shrink-0 bg-primary", className)} />
}

/** En-tête de section de carte : titre + action optionnelle. */
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[30px] items-center justify-between gap-2">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  )
}

export const linkButtonClass =
  "h-auto p-0 py-1.5 text-[13px] font-medium text-link hover:text-link hover:underline"
