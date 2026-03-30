"use client"

import { PlayerChip } from "@/components/player/PlayerChip"
import type { Player } from "@/types"

interface PlayerSelectorProps {
  players: Player[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

export function PlayerSelector({
  players,
  selectedIds,
  onToggle,
}: PlayerSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {players.map((player) => (
        <PlayerChip
          key={player.id}
          player={player}
          selected={selectedIds.includes(player.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
