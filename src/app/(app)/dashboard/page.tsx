import {
  fetchPlayers,
  fetchCommunityStats,
  fetchCommunityRecentMatches,
} from "@/lib/supabase/queries"
import { formatElo } from "@/lib/utils"
import { StatCard } from "@/components/shared/StatCard"

const medals = ["🥇", "🥈", "🥉"]

export default async function DashboardPage() {
  const [players, communityStats, recentMatches] = await Promise.all([
    fetchPlayers(),
    fetchCommunityStats(),
    fetchCommunityRecentMatches(5),
  ])

  const top3 = players.slice(0, 3)

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* TOP 3 */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Top hráči
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {top3.map((player, i) => (
            <div
              key={player.id}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-3"
            >
              <span className="text-2xl">{medals[i]}</span>
              <p className="mt-1 text-sm font-medium text-foreground truncate w-full text-center">
                {player.displayName}
              </p>
              <p className="font-display text-lg text-primary">
                {formatElo(player.elo)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Zápasy" value={communityStats.totalMatches} />
        <StatCard label="Hráči" value={communityStats.activePlayers} />
      </div>

      {/* Recent Community Matches */}
      {recentMatches.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Poslední zápasy
          </h3>
          <div className="space-y-2">
            {recentMatches.map((match) => (
              <div
                key={match.matchId}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    {match.team1Player1} + {match.team1Player2}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    vs {match.team2Player1} + {match.team2Player2}
                  </p>
                </div>
                <p className="ml-3 font-display text-lg text-foreground">
                  {match.score}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
