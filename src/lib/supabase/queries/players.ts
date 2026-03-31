import { createClient, getAuthUser } from "@/lib/supabase/server"
import type { Player } from "@/types"

export async function fetchCurrentPlayer(): Promise<Player | null> {
  const user = await getAuthUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("auth_user_id", user.id)
    .single()

  if (!data) return null

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    elo: data.elo,
    role: data.role,
    createdAt: data.created_at,
  }
}

export async function fetchPlayers(): Promise<Player[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("is_active", true)
    .order("elo", { ascending: false })

  if (!data) return []

  return data.map((p) => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    elo: p.elo,
    role: p.role,
    createdAt: p.created_at,
  }))
}
