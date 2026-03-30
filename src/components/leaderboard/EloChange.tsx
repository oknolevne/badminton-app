import { formatEloDelta } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface EloChangeProps {
  delta: number
}

export function EloChange({ delta }: EloChangeProps) {
  return (
    <span
      className={cn(
        "text-sm font-medium",
        delta > 0 && "text-success",
        delta < 0 && "text-destructive",
        delta === 0 && "text-muted-foreground"
      )}
    >
      {formatEloDelta(delta)}
    </span>
  )
}
