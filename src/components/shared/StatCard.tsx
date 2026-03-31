import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  className?: string
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stat-border bg-stat-bg px-4 py-3",
        className
      )}
    >
      <p className="text-xs text-stat-label">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </div>
  )
}
