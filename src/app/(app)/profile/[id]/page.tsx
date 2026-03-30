import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { fetchPlayerStats, fetchEloHistory, fetchPlayerRank } from "@/lib/supabase/queries"
import { PlayerAvatar } from "@/components/player/PlayerAvatar"
import { EloChart } from "@/components/player/EloChart"
import { StatCard } from "@/components/shared/StatCard"
import { formatElo } from "@/lib/utils"
import type { Player } from "@/types"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const playerId = parseInt(id)

  if (isNaN(playerId)) notFound()

  const supabase = await createClient()
  const { data: playerData } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single()

  if (!playerData) notFound()

  const player: Player = {
    id: playerData.id,
    username: playerData.username,
    displayName: playerData.display_name,
    avatarUrl: playerData.avatar_url,
    elo: playerData.elo,
    role: playerData.role,
    createdAt: playerData.created_at,
  }

  const [stats, eloHistory, rank] = await Promise.all([
    fetchPlayerStats(playerId),
    fetchEloHistory(playerId),
    fetchPlayerRank(playerId),
  ])

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <PlayerAvatar
          name={player.displayName}
          playerId={player.id}
          size="lg"
        />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {player.displayName}
          </h2>
          <p className="font-display text-3xl text-primary">
            {formatElo(player.elo)}
          </p>
          <p className="text-sm text-muted-foreground">#{rank} v žebříčku</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Zápasy" value={stats.totalMatches} />
        <StatCard label="Výhry" value={stats.wins} />
        <StatCard label="Prohry" value={stats.losses} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} />
      </div>

      {/* ELO Chart */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          ELO historie
        </h3>
        <EloChart history={eloHistory} />
      </div>

      {/* Partner/Opponent Stats */}
      <div className="space-y-3">
        {stats.frequentPartner && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Nejčastější partner</p>
            <p className="font-medium text-foreground">
              {stats.frequentPartner.playerName}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.frequentPartner.count} zápasů, {stats.frequentPartner.winRate}% výher
            </p>
          </div>
        )}
        {stats.bestPartner && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Nejlepší partner</p>
            <p className="font-medium text-foreground">
              {stats.bestPartner.playerName}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.bestPartner.count} zápasů, {stats.bestPartner.winRate}% výher
            </p>
          </div>
        )}
        {stats.worstOpponent && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Nejhorší soupeř</p>
            <p className="font-medium text-foreground">
              {stats.worstOpponent.playerName}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.worstOpponent.count} zápasů, {stats.worstOpponent.winRate}% výher
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
