"use server"

import { createClient } from "@/lib/supabase/server"
import { fetchCurrentPlayer } from "@/lib/supabase/queries/players"
import { generateSchedule, validatePlayerCount } from "@/lib/pairing"
import { processMatchElo } from "./elo"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ==================== createSession ====================

export async function createSession(playerIds: number[]): Promise<{ sessionId: string }> {
  const currentPlayer = await fetchCurrentPlayer()
  if (!currentPlayer) throw new Error("Nepřihlášen")

  const validation = validatePlayerCount(playerIds.length)
  if (!validation.valid) throw new Error(validation.message)

  // Fetch players for schedule generation
  const supabase = await createClient()
  const { data: players } = await supabase
    .from("players")
    .select("*")
    .in("id", playerIds)

  if (!players || players.length !== playerIds.length) {
    throw new Error("Někteří hráči nebyli nalezeni")
  }

  const playerObjects = players.map((p) => ({
    id: p.id as number,
    username: p.username as string,
    displayName: p.display_name as string,
    avatarUrl: p.avatar_url as string | null,
    elo: p.elo as number,
    role: p.role as "player" | "admin",
    createdAt: p.created_at as string,
  }))

  const blocks = generateSchedule(playerObjects)

  // Map to RPC format
  const matchesJson = blocks.flatMap((block) =>
    block.matches.map((m) => ({
      blockNumber: m.blockNumber,
      matchNumber: m.matchNumber,
      team1Player1: m.team1[0].id,
      team1Player2: m.team1[1].id,
      team2Player1: m.team2[0].id,
      team2Player2: m.team2[1].id,
      isTraining: m.isTraining,
    }))
  )

  const { data, error } = await supabase.rpc("create_session_with_matches", {
    p_date: new Date().toISOString().split("T")[0],
    p_created_by: currentPlayer.id,
    p_player_ids: playerIds,
    p_matches: matchesJson,
  })

  if (error) {
    console.error("Create session failed:", error.message, error.details, error.hint)
    throw new Error(`Chyba při vytváření večera: ${error.message}`)
  }

  if (!data) {
    throw new Error("RPC nevrátilo ID session")
  }

  const sessionId = String(data)

  revalidatePath("/dashboard")
  return { sessionId }
}

// ==================== updateMatchResult ====================

const setSchema = z.object({
  team1: z.number().int().min(0).max(99),
  team2: z.number().int().min(0).max(99),
}).refine(
  (set) => set.team1 >= 11 || set.team2 >= 11,
  { message: "Alespoň jeden tým musí mít ≥ 11 bodů" }
)

const updateMatchSchema = z.object({
  matchId: z.string().uuid(),
  sessionId: z.string().uuid(),
  sets: z.array(setSchema).min(1, "Alespoň 1 set"),
})

export async function updateMatchResult(input: {
  matchId: string
  sessionId: string
  sets: { team1: number; team2: number }[]
}) {
  const currentPlayer = await fetchCurrentPlayer()
  if (!currentPlayer) throw new Error("Nepřihlášen")

  const parsed = updateMatchSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message)
  }

  const { matchId, sessionId, sets } = parsed.data

  const totalTeam1 = sets.reduce((sum, s) => sum + s.team1, 0)
  const totalTeam2 = sets.reduce((sum, s) => sum + s.team2, 0)

  const supabase = await createClient()

  // Check if result already exists
  const { data: existing } = await supabase
    .from("match_results")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle()

  if (existing) {
    // Update
    const { error } = await supabase
      .from("match_results")
      .update({
        sets,
        total_team1: totalTeam1,
        total_team2: totalTeam2,
        updated_by: currentPlayer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("match_id", matchId)

    if (error) throw new Error("Chyba při aktualizaci výsledku")
  } else {
    // Insert
    const { error } = await supabase.from("match_results").insert({
      match_id: matchId,
      sets,
      total_team1: totalTeam1,
      total_team2: totalTeam2,
      submitted_by: currentPlayer.id,
    })

    if (error) throw new Error("Chyba při ukládání výsledku")
  }

  // Recalculate ELO
  await processMatchElo(matchId)

  revalidatePath(`/session/${sessionId}`)
  revalidatePath("/dashboard")
  revalidatePath("/leaderboard")
}

// ==================== deleteSession ====================

export async function deleteSession(sessionId: string) {
  const currentPlayer = await fetchCurrentPlayer()
  if (!currentPlayer) throw new Error("Nepřihlášen")

  const supabase = await createClient()

  // Verify ownership or admin
  const { data: session } = await supabase
    .from("sessions")
    .select("created_by")
    .eq("id", sessionId)
    .single()

  if (!session) throw new Error("Večer nenalezen")

  if (session.created_by !== currentPlayer.id && currentPlayer.role !== "admin") {
    throw new Error("Nemáš oprávnění smazat tento večer")
  }

  // CASCADE will delete matches, results, elo_history
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)

  if (error) throw new Error("Chyba při mazání večera")

  revalidatePath("/dashboard")
}
