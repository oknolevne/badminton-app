import { redirect } from "next/navigation"
import {
  fetchCurrentPlayer,
  fetchPlayerStats,
  fetchPlayerRank,
  fetchRecentMatches,
} from "@/lib/supabase/queries"
import { formatElo, formatEloDelta } from "@/lib/utils"
import { StatCard } from "@/components/shared/StatCard"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const player = await fetchCurrentPlayer()
  if (!player) redirect("/login")

  const [stats, rank, recentMatches] = await Promise.all([
    fetchPlayerStats(player.id),
    fetchPlayerRank(player.id),
    fetchRecentMatches(player.id, 3),
  ])

  const lastDelta = stats.eloHistory.length > 0
    ? stats.eloHistory[stats.eloHistory.length - 1].delta
    : null

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* ELO Hero Card */}
      <div className="rounded-2xl border border-elo-border bg-elo-bg p-6 text-center">
        <p className="text-sm text-text-label">Tvoje ELO</p>
        <p className="mt-1 font-display text-7xl text-foreground">
          {formatElo(player.elo)}
        </p>
        {lastDelta !== null && (
          <Badge
            variant={lastDelta >= 0 ? "default" : "destructive"}
            className="mt-2"
          >
            {formatEloDelta(lastDelta)}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Zápasy" value={stats.totalMatches} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} />
        <StatCard label="Pořadí" value={`#${rank}`} />
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
