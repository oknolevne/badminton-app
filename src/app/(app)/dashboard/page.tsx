import { fetchCurrentPlayer } from "@/lib/supabase/queries"
import { redirect } from "next/navigation"
import { formatElo } from "@/lib/utils"

export default async function DashboardPage() {
  const player = await fetchCurrentPlayer()

  if (!player) {
    redirect("/login")
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h2 className="text-2xl font-semibold text-foreground">
        Vítej, {player.displayName}
      </h2>
      <p className="mt-2 font-display text-6xl text-primary">
        {formatElo(player.elo)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Tvoje ELO</p>
    </div>
  )
}
