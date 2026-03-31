import { createClient } from "@/lib/supabase/server"
import { fetchPlayers } from "@/lib/supabase/queries"
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow"

export default async function LeaderboardPage() {
  const players = await fetchPlayers()
  const supabase = await createClient()

  // Get last ELO delta for all players in one batch query
  const playerIds = players.map((p) => p.id)
  const { data: allDeltas } = await supabase
    .from("elo_history")
    .select("player_id, delta, created_at")
    .in("player_id", playerIds)
    .order("created_at", { ascending: false })

  const lastDeltas = new Map<number, number>()
  if (allDeltas) {
    for (const entry of allDeltas) {
      if (!lastDeltas.has(entry.player_id)) {
        lastDeltas.set(entry.player_id, entry.delta)
      }
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h2 className="mb-4 font-display text-3xl text-foreground">ŽEBŘÍČEK</h2>
      <div className="space-y-2">
        {players.map((player, index) => (
          <LeaderboardRow
            key={player.id}
            rank={index + 1}
            playerId={player.id}
            name={player.displayName}
            elo={player.elo}
            lastDelta={lastDeltas.get(player.id) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
