import Link from "next/link"
import { PlayerAvatar } from "@/components/player/PlayerAvatar"
import { EloChange } from "./EloChange"
import { formatElo } from "@/lib/utils"

interface LeaderboardRowProps {
  rank: number
  playerId: number
  name: string
  elo: number
  lastDelta: number | null
}

export function LeaderboardRow({
  rank,
  playerId,
  name,
  elo,
  lastDelta,
}: LeaderboardRowProps) {
  return (
    <Link
      href={`/profile/${playerId}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-card/80"
    >
      <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
        {rank}
      </span>
      <PlayerAvatar name={name} playerId={playerId} size="sm" />
      <span className="flex-1 font-medium text-foreground">{name}</span>
      <span className="font-display text-lg text-foreground">
        {formatElo(elo)}
      </span>
      {lastDelta !== null && <EloChange delta={lastDelta} />}
    </Link>
  )
}
