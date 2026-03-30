import { createClient } from "@/lib/supabase/server"
import { fetchPlayers } from "@/lib/supabase/queries"
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow"

export default async function LeaderboardPage() {
  const players = await fetchPlayers()
  const supabase = await createClient()

  // Get last ELO delta for each player
  const lastDeltas = new Map<number, number>()
  for (const player of players) {
    const { data } = await supabase
      .from("elo_history")
      .select("delta")
      .eq("player_id", player.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      lastDeltas.set(player.id, data.delta)
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
