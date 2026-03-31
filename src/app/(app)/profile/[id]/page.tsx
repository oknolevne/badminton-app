import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  fetchCurrentPlayer,
  fetchPlayerStats,
  fetchEloHistory,
  fetchPlayerRank,
  fetchRecentMatches,
  fetchPlayerRecords,
} from "@/lib/supabase/queries"
import { PlayerAvatar } from "@/components/player/PlayerAvatar"
import { EloChart } from "@/components/player/EloChart"
import { StatCard } from "@/components/shared/StatCard"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"
import { formatElo, formatEloDelta } from "@/lib/utils"
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

  const [stats, eloHistory, rank, recentMatches, records, currentPlayer] = await Promise.all([
    fetchPlayerStats(playerId),
    fetchEloHistory(playerId),
    fetchPlayerRank(playerId),
    fetchRecentMatches(playerId, 5),
    fetchPlayerRecords(playerId),
    fetchCurrentPlayer(),
  ])

  const lastDelta =
    eloHistory.length > 0 ? eloHistory[eloHistory.length - 1].delta : null

  // Win rate trend: last 10 matches vs overall (only if >= 10 matches)
  const last10 = eloHistory.slice(-10)
  const last10Wins = last10.filter((e) => e.delta > 0).length
  const last10WinRate =
    last10.length > 0 ? Math.round((last10Wins / last10.length) * 100) : 0
  const showTrend = eloHistory.length >= 10

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <PlayerAvatar
          name={player.displayName}
          playerId={player.id}
          size="lg"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-foreground">
            {player.displayName}
          </h2>
          <div className="flex items-center gap-2">
            <p className="font-display text-3xl text-primary">
              {formatElo(player.elo)}
            </p>
            {lastDelta !== null && (
              <Badge
                variant={lastDelta >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {formatEloDelta(lastDelta)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">#{rank} v žebříčku</p>
        </div>
        {currentPlayer?.role === "admin" && currentPlayer.id === playerId && (
          <Link
            href="/admin"
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Shield className="h-4 w-4" />
            <span>Admin</span>
          </Link>
        )}
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

      {/* Records */}
      {(records.bestWin || records.worstLoss) && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Rekordy
          </h3>
          <div className="space-y-2">
            {records.bestWin && (
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Nejlepší výhra
                  </p>
                  <Badge variant="default" className="text-xs">
                    {formatEloDelta(records.bestWin.delta)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  s {records.bestWin.partnerName} vs{" "}
                  {records.bestWin.opponentNames}
                </p>
                <p className="text-xs text-muted-foreground">
                  {records.bestWin.score}
                </p>
              </div>
            )}
            {records.worstLoss && (
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Nejhorší prohra
                  </p>
                  <Badge variant="destructive" className="text-xs">
                    {formatEloDelta(records.worstLoss.delta)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  s {records.worstLoss.partnerName} vs{" "}
                  {records.worstLoss.opponentNames}
                </p>
                <p className="text-xs text-muted-foreground">
                  {records.worstLoss.score}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Win Rate Trend */}
      {showTrend && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Forma</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Posledních 10:{" "}
            <span
              className={
                last10WinRate >= stats.winRate
                  ? "text-green-600"
                  : "text-red-500"
              }
            >
              {last10WinRate}%{" "}
              {last10WinRate >= stats.winRate ? "↑" : "↓"}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · Celkový: {stats.winRate}%
            </span>
          </p>
        </div>
      )}

      {/* Partner/Opponent Stats */}
      <div className="space-y-3">
        {stats.frequentPartner && (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Nejčastější partner
            </p>
            <p className="font-medium text-foreground">
              {stats.frequentPartner.playerName}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.frequentPartner.count} zápasů,{" "}
              {stats.frequentPartner.winRate}% výher
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
              {stats.bestPartner.count} zápasů,{" "}
              {stats.bestPartner.winRate}% výher
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
              {stats.worstOpponent.count} zápasů,{" "}
              {stats.worstOpponent.winRate}% výher
            </p>
          </div>
        )}
      </div>

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Poslední zápasy
          </h3>
          <div className="space-y-2">
            {recentMatches.map((match) => {
              if (!match) return null
              return (
                <div
                  key={match.matchId}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div>
                    <p className="text-sm text-foreground">
                      {match.partner} vs {match.opponents}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.score}
                    </p>
                  </div>
                  <Badge
                    variant={match.won ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {formatEloDelta(match.delta)}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
