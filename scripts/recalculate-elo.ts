/**
 * recalculate-elo.ts — Delete test sessions and recalculate ELO
 * from initial values through all 445 historical matches.
 *
 * Usage: npx tsx scripts/recalculate-elo.ts
 *
 * Idempotent: safe to run multiple times.
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const K = 100
const DIVISOR = 1400

// PG-compatible round (half away from zero)
function pgRound(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x))
}

function calculateEloDelta(
  myTeamElo: number,
  oppTeamElo: number,
  myPoints: number,
  oppPoints: number
): number {
  const totalPoints = myPoints + oppPoints
  if (totalPoints === 0) return 0
  const expected = 1 / (1 + Math.pow(10, (oppTeamElo - myTeamElo) / DIVISOR))
  const actual = myPoints / totalPoints
  return pgRound(K * (actual - expected))
}

// Initial ELO from Excel "Prvni ELO"
const INITIAL_ELO: Record<number, number> = {
  24: 1800, 61: 1650, 11: 1650, 88: 1650, 17: 1650, 70: 1650,
  33: 1636, 22: 1600, 19: 1550, 63: 1500, 10: 1500, 15: 1450,
  77: 1450, 16: 1400, 99: 1400, 42: 1400, 13: 1400, 69: 1400,
  14: 1363, 23: 1307, 21: 1282, 55: 1208,
  // Players without Excel entry — default 1500
  12: 1500, 26: 1500, 35: 1500, 78: 1500,
}

async function main() {
  // === STEP 1: DRY RUN ===
  console.log("=== DRY RUN: Test sessions to delete ===")
  const { data: testSessions } = await supabase
    .from("sessions")
    .select("id, date, status")
    .eq("date", "2026-03-30")

  if (testSessions && testSessions.length > 0) {
    for (const s of testSessions) {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id)
      console.log(`  ${s.id.substring(0, 8)} | ${s.date} | ${s.status} | ${count} matches`)
    }
  } else {
    console.log("  No test sessions found (already deleted)")
  }

  // === STEP 2: DELETE test sessions ===
  if (testSessions && testSessions.length > 0) {
    console.log("\nDeleting test sessions (CASCADE)...")
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("date", "2026-03-30")
    if (error) {
      console.error("Failed to delete test sessions:", error.message)
      process.exit(1)
    }
    console.log(`  Deleted ${testSessions.length} test sessions`)
  }

  // === STEP 3: Find historical session ===
  const { data: histSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("date", "2024-01-01")
    .single()

  if (!histSession) {
    console.error("Historical session (2024-01-01) not found!")
    process.exit(1)
  }
  const histSessionId = histSession.id
  console.log(`\nHistorical session: ${histSessionId}`)

  // === STEP 4: Delete elo_history for historical session ===
  console.log("Deleting elo_history for historical matches...")
  const { data: histMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("session_id", histSessionId)

  const matchIds = histMatches?.map((m) => m.id) ?? []
  let deletedElo = 0
  for (let i = 0; i < matchIds.length; i += 100) {
    const batch = matchIds.slice(i, i + 100)
    const { count } = await supabase
      .from("elo_history")
      .delete()
      .in("match_id", batch)
      .select("id", { count: "exact", head: true })
    deletedElo += count ?? 0
  }
  console.log(`  Deleted elo_history entries for ${matchIds.length} matches`)

  // === STEP 5: Reset initial ELO ===
  console.log("Resetting initial ELO values...")
  for (const [id, elo] of Object.entries(INITIAL_ELO)) {
    await supabase.from("players").update({ elo }).eq("id", parseInt(id))
  }

  // === STEP 6: Recalculate ELO ===
  console.log("Recalculating ELO through 445 matches...")

  // Load matches with results in order
  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, team1_player1, team1_player2, team2_player1, team2_player2, is_training")
    .eq("session_id", histSessionId)
    .order("match_number", { ascending: true })

  if (!matches || matches.length === 0) {
    console.error("No matches found!")
    process.exit(1)
  }

  // Load all results at once
  const resultMap = new Map<string, { total_team1: number; total_team2: number }>()
  for (let i = 0; i < matchIds.length; i += 100) {
    const batch = matchIds.slice(i, i + 100)
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

  // In-memory ELO tracker
  const playerElo: Record<number, number> = { ...INITIAL_ELO }

  // Batch elo_history inserts
  const eloHistoryRows: {
    player_id: number
    match_id: string
    elo_before: number
    elo_after: number
    delta: number
  }[] = []

  let processed = 0
  for (const match of matches) {
    const result = resultMap.get(match.id)
    if (!result) continue
    if (match.is_training) continue
    if (result.total_team1 + result.total_team2 === 0) continue

    const p1 = match.team1_player1
    const p2 = match.team1_player2
    const p3 = match.team2_player1
    const p4 = match.team2_player2

    const team1Elo = (playerElo[p1] + playerElo[p2]) / 2
    const team2Elo = (playerElo[p3] + playerElo[p4]) / 2
    const delta = calculateEloDelta(team1Elo, team2Elo, result.total_team1, result.total_team2)

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

    processed++
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${matches.length}...`)
    }
  }

  // Insert elo_history in batches
  console.log(`Inserting ${eloHistoryRows.length} elo_history entries...`)
  for (let i = 0; i < eloHistoryRows.length; i += 200) {
    const batch = eloHistoryRows.slice(i, i + 200)
    const { error } = await supabase.from("elo_history").insert(batch)
    if (error) {
      console.error(`  Batch insert failed at ${i}:`, error.message)
      process.exit(1)
    }
  }

  // === STEP 7: Save final ELO ===
  console.log("Saving final ELO values...")
  for (const [id, elo] of Object.entries(playerElo)) {
    await supabase.from("players").update({ elo }).eq("id", parseInt(id))
  }

  // === STEP 8: Print results ===
  console.log(`\n=== RESULTS: ${processed} matches processed ===\n`)

  const { data: finalPlayers } = await supabase
    .from("players")
    .select("id, display_name, elo")
    .order("elo", { ascending: false })

  if (finalPlayers) {
    for (const p of finalPlayers) {
      console.log(
        `  ${String(p.id).padStart(3)} | ${p.display_name.padEnd(14)} | ${p.elo}`
      )
    }
  }

  console.log("\nDone.")
}

main().catch(console.error)
