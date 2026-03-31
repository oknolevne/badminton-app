import { createClient } from "@/lib/supabase/server"
import { PlayerManagement } from "@/components/admin/PlayerManagement"

export interface AdminPlayer {
  id: number
  username: string
  displayName: string
  elo: number
  isActive: boolean
}

export default async function AdminPlayersPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("players")
    .select("id, username, display_name, elo, is_active")
    .order("id", { ascending: true })

  const players: AdminPlayer[] = (data ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    elo: p.elo,
    isActive: p.is_active,
  }))

  return <PlayerManagement players={players} />
}
