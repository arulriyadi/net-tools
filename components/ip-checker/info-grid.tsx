import { cn } from "@/lib/utils"

export function InfoGrid({
  items,
  className,
}: {
  items: { label: string; value?: string | null }[]
  className?: string
}) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-all">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
