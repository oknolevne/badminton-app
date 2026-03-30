import { fetchPlayers } from "@/lib/supabase/queries"
import { NewSessionForm } from "@/components/session/NewSessionForm"

export default async function NewSessionPage() {
  const players = await fetchPlayers()

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h2 className="mb-4 font-display text-3xl text-foreground">NOVÝ VEČER</h2>
      <NewSessionForm players={players} />
    </div>
  )
}
