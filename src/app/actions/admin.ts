"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchCurrentPlayer } from "@/lib/supabase/queries/players"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ==================== Constants ====================

const K = 100
const DIVISOR = 1400

// Initial ELO from Excel "Prvni ELO" (from recalculate-elo.ts)
const INITIAL_ELO: Record<number, number> = {
  24: 1800, 61: 1650, 11: 1650, 88: 1650, 17: 1650, 70: 1650,
  33: 1636, 22: 1600, 19: 1550, 63: 1500, 10: 1500, 15: 1450,
  77: 1450, 16: 1400, 99: 1400, 42: 1400, 13: 1400, 69: 1400,
  14: 1363, 23: 1307, 21: 1282, 55: 1208,
  12: 1500, 26: 1500, 35: 1500, 78: 1500,
}

// PG-compatible round (half away from zero)
function pgRound(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x))
}

// ==================== Helpers ====================

async function requireAdmin() {
  const player = await fetchCurrentPlayer()
  if (!player || player.role !== "admin") {
    throw new Error("Nedostatečná oprávnění")
  }
  return player
}

async function auditLog(
  adminId: number,
  action: string,
  entityType: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown,
) {
  const supabase = await createClient()
  await supabase.from("audit_log").insert({
    player_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  })
}

// ==================== addPlayer ====================

const addPlayerSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1).max(30).regex(/^[a-z0-9_-]+$/, "Username: jen malá písmena, čísla, - a _"),
  name: z.string().min(1).max(50),
  elo: z.number().int().min(0).max(3000).default(1500),
})

export async function addPlayer(input: z.infer<typeof addPlayerSchema>) {
  const admin = await requireAdmin()

  const parsed = addPlayerSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { id, username, name, elo } = parsed.data

  // 1. Create auth account FIRST
  const adminClient = createAdminClient()
  const email = `${id}@slashsmash.cz`
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: String(id),
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(`Chyba při vytváření účtu: ${authError?.message}`)
  }

  // 2. Insert player with auth_user_id
  const supabase = await createClient()
  const { error } = await supabase.from("players").insert({
    id,
    username,
    display_name: name,
    elo,
    is_active: true,
    auth_user_id: authData.user.id,
  })

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("username")) {
        throw new Error(`Username "${username}" už existuje`)
      }
      throw new Error(`Hráč s ID ${id} už existuje`)
    }
    throw new Error(`Chyba: ${error.message}`)
  }

  await auditLog(admin.id, "player_created", "player", String(id), null, { id, username, name, elo })
  revalidatePath("/admin/players")
}

// ==================== updatePlayer ====================

const updatePlayerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50).optional(),
  elo: z.number().int().min(0).max(3000).optional(),
})

export async function updatePlayer(input: z.infer<typeof updatePlayerSchema>) {
  const admin = await requireAdmin()

  const parsed = updatePlayerSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { id, name, elo } = parsed.data
  const supabase = await createClient()

  // Fetch old values
  const { data: old } = await supabase
    .from("players")
    .select("display_name, elo")
    .eq("id", id)
    .single()

  if (!old) throw new Error("Hráč nenalezen")

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.display_name = name
  if (elo !== undefined) updates.elo = elo

  if (Object.keys(updates).length === 0) return

  const { error } = await supabase.from("players").update(updates).eq("id", id)
  if (error) throw new Error(`Chyba: ${error.message}`)

  await auditLog(
    admin.id,
    "player_updated",
    "player",
    String(id),
    { name: old.display_name, elo: old.elo },
    { name: name ?? old.display_name, elo: elo ?? old.elo },
  )

  revalidatePath("/admin/players")
  revalidatePath("/leaderboard")
}

// ==================== togglePlayerActive ====================

export async function togglePlayerActive(playerId: number) {
  const admin = await requireAdmin()

  if (playerId === admin.id) {
    throw new Error("Nemůžeš deaktivovat sám sebe")
  }

  const supabase = await createClient()

  const { data: player } = await supabase
    .from("players")
    .select("is_active, display_name")
    .eq("id", playerId)
    .single()

  if (!player) throw new Error("Hráč nenalezen")

  const newActive = !player.is_active

  const { error } = await supabase
    .from("players")
    .update({ is_active: newActive })
    .eq("id", playerId)

  if (error) throw new Error(`Chyba: ${error.message}`)

  await auditLog(
    admin.id,
    "player_toggled_active",
    "player",
    String(playerId),
    { is_active: player.is_active },
    { is_active: newActive },
  )

  revalidatePath("/admin/players")
}

// ==================== updateMatchScore ====================

const updateMatchScoreSchema = z.object({
  matchId: z.string().uuid(),
  totalTeam1: z.number().int().min(0),
  totalTeam2: z.number().int().min(0),
})

export async function updateMatchScore(input: z.infer<typeof updateMatchScoreSchema>) {
  const admin = await requireAdmin()

  const parsed = updateMatchScoreSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.errors[0].message)

  const { matchId, totalTeam1, totalTeam2 } = parsed.data
  const supabase = await createClient()

  // Fetch old result
  const { data: old } = await supabase
    .from("match_results")
    .select("total_team1, total_team2")
    .eq("match_id", matchId)
    .single()

  if (!old) throw new Error("Výsledek nenalezen")

  const { error } = await supabase
    .from("match_results")
    .update({
      total_team1: totalTeam1,
      total_team2: totalTeam2,
      sets: [{ team1: totalTeam1, team2: totalTeam2 }],
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("match_id", matchId)

  if (error) throw new Error(`Chyba: ${error.message}`)

  await auditLog(
    admin.id,
    "match_score_updated",
    "match",
    matchId,
    { total_team1: old.total_team1, total_team2: old.total_team2 },
    { total_team1: totalTeam1, total_team2: totalTeam2 },
  )

  await recalculateAllElo()

  revalidatePath("/admin/sessions")
  revalidatePath("/leaderboard")
  revalidatePath("/dashboard")
}

// ==================== deleteSessionAdmin ====================

export async function deleteSessionAdmin(sessionId: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // Fetch session info for audit
  const { data: session } = await supabase
    .from("sessions")
    .select("date")
    .eq("id", sessionId)
    .single()

  if (!session) throw new Error("Večer nenalezen")

  const { count: matchCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)

  // CASCADE delete
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)

  if (error) throw new Error(`Chyba: ${error.message}`)

  await auditLog(
    admin.id,
    "session_deleted",
    "session",
    sessionId,
    { date: session.date, matchCount: matchCount ?? 0 },
    null,
  )

  await recalculateAllElo()

  revalidatePath("/admin/sessions")
  revalidatePath("/leaderboard")
  revalidatePath("/dashboard")
}

// ==================== recalculateAllElo ====================

export async function recalculateAllElo() {
  const supabase = createAdminClient()

  // 1. Get all players
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id")

  if (!allPlayers) throw new Error("Nelze načíst hráče")

  // 2. Reset all players to initial ELO
  for (const p of allPlayers) {
    const initialElo = INITIAL_ELO[p.id] ?? 1500
    await supabase.from("players").update({ elo: initialElo }).eq("id", p.id)
  }

  // 3. Delete all elo_history
  await supabase.from("elo_history").delete().gte("created_at", "1970-01-01")

  // 4. Fetch all matches with results, ordered chronologically
  const { data: matches } = await supabase
    .from("matches")
    .select("id, session_id, block_number, match_number, team1_player1, team1_player2, team2_player1, team2_player2, is_training, sessions(date)")
    .order("block_number", { ascending: true })
    .order("match_number", { ascending: true })

  if (!matches || matches.length === 0) return // Edge case: no matches

  // Sort by session date, then block, then match
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = (a.sessions as unknown as { date: string })?.date ?? ""
    const dateB = (b.sessions as unknown as { date: string })?.date ?? ""
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    if (a.block_number !== b.block_number) return a.block_number - b.block_number
    return a.match_number - b.match_number
  })

  // Fetch all match results at once
  const matchIds = sortedMatches.map((m) => m.id)
  const resultMap = new Map<string, { total_team1: number; total_team2: number }>()

  for (let i = 0; i < matchIds.length; i += 200) {
    const batch = matchIds.slice(i, i + 200)
    const { data: results } = await supabase
      .from("match_results")
      .select("match_id, total_team1, total_team2")
      .in("match_id", batch)

    if (results) {
      for (const r of results) {
        resultMap.set(r.match_id, { total_team1: r.total_team1, total_team2: r.total_team2 })
      }
    }
  }

  // 5. In-memory replay
  const playerElo: Record<number, number> = {}
  for (const p of allPlayers) {
    playerElo[p.id] = INITIAL_ELO[p.id] ?? 1500
  }

  const eloHistoryRows: {
    player_id: number
    match_id: string
    elo_before: number
    elo_after: number
    delta: number
  }[] = []

  for (const match of sortedMatches) {
    if (match.is_training) continue
    const result = resultMap.get(match.id)
    if (!result) continue
    if (result.total_team1 + result.total_team2 === 0) continue

    const p1 = match.team1_player1
    const p2 = match.team1_player2
    const p3 = match.team2_player1
    const p4 = match.team2_player2

    // Ensure all players have ELO
    for (const pid of [p1, p2, p3, p4]) {
      if (playerElo[pid] === undefined) playerElo[pid] = 1500
    }

    const team1Elo = (playerElo[p1] + playerElo[p2]) / 2
    const team2Elo = (playerElo[p3] + playerElo[p4]) / 2

    const totalPoints = result.total_team1 + result.total_team2
    const expected = 1 / (1 + Math.pow(10, (team2Elo - team1Elo) / DIVISOR))
    const actual = result.total_team1 / totalPoints
    const delta = pgRound(K * (actual - expected))

    const before = { [p1]: playerElo[p1], [p2]: playerElo[p2], [p3]: playerElo[p3], [p4]: playerElo[p4] }

    playerElo[p1] += delta
    playerElo[p2] += delta
    playerElo[p3] -= delta
    playerElo[p4] -= delta

    eloHistoryRows.push(
      { player_id: p1, match_id: match.id, elo_before: before[p1], elo_after: playerElo[p1], delta },
      { player_id: p2, match_id: match.id, elo_before: before[p2], elo_after: playerElo[p2], delta },
      { player_id: p3, match_id: match.id, elo_before: before[p3], elo_after: playerElo[p3], delta: -delta },
      { player_id: p4, match_id: match.id, elo_before: before[p4], elo_after: playerElo[p4], delta: -delta },
    )
  }

  // 6. Batch insert elo_history
  for (let i = 0; i < eloHistoryRows.length; i += 200) {
    const batch = eloHistoryRows.slice(i, i + 200)
    const { error } = await supabase.from("elo_history").insert(batch)
    if (error) {
      console.error(`ELO history batch insert failed at ${i}:`, error.message)
      throw new Error("Chyba při ukládání ELO historie")
    }
  }

  // 7. Save final ELO values
  for (const [id, elo] of Object.entries(playerElo)) {
    await supabase.from("players").update({ elo }).eq("id", parseInt(id))
  }
}
