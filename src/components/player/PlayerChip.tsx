"use client"

import { cn, getInitials, formatElo } from "@/lib/utils"
import type { Player } from "@/types"

interface PlayerChipProps {
  player: Player
  selected: boolean
  onToggle: (id: number) => void
}

export function PlayerChip({ player, selected, onToggle }: PlayerChipProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(player.id)}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
          selected ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        {getInitials(player.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{player.displayName}</p>
        <p className="text-xs text-muted-foreground">{formatElo(player.elo)}</p>
      </div>
    </button>
  )
}
