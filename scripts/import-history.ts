/**
 * import-history.ts — Import 445 historical matches from Excel
 * and sequentially recalculate ELO for all players.
 *
 * Usage: npx tsx scripts/import-history.ts
 *
 * Reads from "Data" sheet:
 *   Teamy: 8-digit number, e.g. 61881711 = team1(61,88) vs team2(17,11)
 *   Skore: 4-digit number, e.g. 2118 = 21:18
 *   Side table: Id + "Prvni ELO" = initial ELO per player
 *
 * Some players in historical data are no longer active (23, 33, 21, 55, 14).
 * These are added as inactive players for FK integrity.
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import * as XLSX from "xlsx"
import * as path from "path"

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
  return Math.round(K * (actual - expected))
}

// Inactive players that appear in historical data but are not in the current 21
const INACTIVE_PLAYERS: Record<number, string> = {
  23: "Stroj23",
  33: "Stroj33",
  21: "Player21",
  55: "Player55",
  14: "Player14",
}

async function main() {
  const excelPath = path.join(__dirname, "..", "data", "Bedas Hry (1).xlsx")
  console.log(`Reading Excel: ${excelPath}`)

  const workbook = XLSX.readFile(excelPath)

  // Read "Data" sheet for matches
  const dataSheet = workbook.Sheets["Data"]
  if (!dataSheet) {
    console.error("Sheet 'Data' not found")
    process.exit(1)
  }

  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(dataSheet)
  console.log(`Found ${rows.length} matches on 'Data' sheet`)

  // Extract initial ELO values from side table
  const initialEloMap = new Map<number, number>()
  for (const row of rows) {
    if (row.Id && row["Prvni ELO"]) {
      initialEloMap.set(row.Id as number, row["Prvni ELO"] as number)
    }
  }
  console.log(`Found ${initialEloMap.size} initial ELO entries`)

  // Step 1: Ensure all players referenced in data exist in DB
  const allPlayerIds = new Set<number>()
  for (const row of rows) {
    if (!row.Teamy) continue
    const teamsStr = String(row.Teamy).padStart(8, "0")
    allPlayerIds.add(parseInt(teamsStr.slice(0, 2)))
    allPlayerIds.add(parseInt(teamsStr.slice(2, 4)))
    allPlayerIds.add(parseInt(teamsStr.slice(4, 6)))
    allPlayerIds.add(parseInt(teamsStr.slice(6, 8)))
  }

  // Check which players exist
  const { data: existingPlayers } = await supabase.from("players").select("id")
  const existingIds = new Set(existingPlayers?.map((p) => p.id) ?? [])

  // Add missing (inactive) players
  for (const id of allPlayerIds) {
    if (!existingIds.has(id)) {
      const name = INACTIVE_PLAYERS[id] || `Player${id}`
      const username = `player${id}`
      console.log(`  Adding inactive player: ${name} (${id})`)
      const { error } = await supabase.from("players").insert({
        id,
        username,
        display_name: name,
        elo: initialEloMap.get(id) ?? 1500,
        role: "player",
        is_active: false,
      })
      if (error) {
        console.error(`  Failed to add player ${id}:`, error.message)
      }
    }
  }

  // Step 2: Set initial ELO for all players
  console.log("Setting initial ELO values...")
  for (const [id, elo] of initialEloMap) {
    await supabase.from("players").update({ elo }).eq("id", id)
  }
  // Players without "Prvni ELO" entry stay at 1500
  for (const id of allPlayerIds) {
    if (!initialEloMap.has(id)) {
      await supabase.from("players").update({ elo: 1500 }).eq("id", id)
    }
  }

  // Step 3: Clean up existing match data
  console.log("Cleaning up existing match data...")
  await supabase.from("elo_history").delete().gte("created_at", "2000-01-01")
  await supabase.from("match_results").delete().gte("submitted_at", "2000-01-01")
  await supabase.from("matches").delete().gte("created_at", "2000-01-01")
  await supabase.from("session_players").delete().neq("session_id", "00000000-0000-0000-0000-000000000000")
  await supabase.from("sessions").delete().gte("created_at", "2000-01-01")

  // Track ELO in memory
  const playerElo: Record<number, number> = {}
  const { data: allPlayers } = await supabase.from("players").select("id, elo")
  if (allPlayers) {
    for (const p of allPlayers) {
      playerElo[p.id] = p.elo
    }
  }

  // Step 4: Create a single historical session
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      date: "2024-01-01",
      created_by: 61,
      status: "finished",
    })
    .select("id")
    .single()

  if (sessionError || !sessionData) {
    console.error("Failed to create session:", sessionError?.message)
    process.exit(1)
  }

  const sessionId = sessionData.id
  console.log(`Created historical session: ${sessionId}`)

  // Step 5: Process matches sequentially
  let processed = 0
  let errors = 0

  for (const row of rows) {
    if (!row.Teamy || !row.Skore) continue

    const teamsStr = String(row.Teamy).padStart(8, "0")
    const scoreStr = String(row.Skore).padStart(4, "0")

    const team1p1 = parseInt(teamsStr.slice(0, 2))
    const team1p2 = parseInt(teamsStr.slice(2, 4))
    const team2p1 = parseInt(teamsStr.slice(4, 6))
    const team2p2 = parseInt(teamsStr.slice(6, 8))

    const score1 = parseInt(scoreStr.slice(0, 2))
    const score2 = parseInt(scoreStr.slice(2, 4))

    // Verify all players exist in our ELO map
    if (!(team1p1 in playerElo) || !(team1p2 in playerElo) ||
        !(team2p1 in playerElo) || !(team2p2 in playerElo)) {
      console.error(`Match ${processed + 1}: Unknown player ID in ${teamsStr}`)
      errors++
      continue
    }

    // Insert match
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({
        session_id: sessionId,
        block_number: 1,
        match_number: processed + 1,
        team1_player1: team1p1,
        team1_player2: team1p2,
        team2_player1: team2p1,
        team2_player2: team2p2,
        is_training: false,
      })
      .select("id")
      .single()

    if (matchError || !matchData) {
      console.error(`Match ${processed + 1} insert failed:`, matchError?.message)
      errors++
      continue
    }

    // Insert match result
    const { error: resultError } = await supabase.from("match_results").insert({
      match_id: matchData.id,
      sets: [{ team1: score1, team2: score2 }],
      total_team1: score1,
      total_team2: score2,
      submitted_by: 61,
    })

    if (resultError) {
      console.error(`Match ${processed + 1} result failed:`, resultError.message)
      errors++
      continue
    }

    // Calculate ELO
    const team1Elo = (playerElo[team1p1] + playerElo[team1p2]) / 2
    const team2Elo = (playerElo[team2p1] + playerElo[team2p2]) / 2
    const delta = calculateEloDelta(team1Elo, team2Elo, score1, score2)

    const eloBefore = {
      [team1p1]: playerElo[team1p1],
      [team1p2]: playerElo[team1p2],
      [team2p1]: playerElo[team2p1],
      [team2p2]: playerElo[team2p2],
    }

    playerElo[team1p1] += delta
    playerElo[team1p2] += delta
    playerElo[team2p1] -= delta
    playerElo[team2p2] -= delta

    await supabase.from("elo_history").insert([
      { player_id: team1p1, match_id: matchData.id, elo_before: eloBefore[team1p1], elo_after: playerElo[team1p1], delta },
      { player_id: team1p2, match_id: matchData.id, elo_before: eloBefore[team1p2], elo_after: playerElo[team1p2], delta },
      { player_id: team2p1, match_id: matchData.id, elo_before: eloBefore[team2p1], elo_after: playerElo[team2p1], delta: -delta },
      { player_id: team2p2, match_id: matchData.id, elo_before: eloBefore[team2p2], elo_after: playerElo[team2p2], delta: -delta },
    ])

    processed++
    if (processed % 50 === 0) {
      console.log(`  Processed ${processed}/${rows.length} matches...`)
    }
  }

  // Step 6: Update final ELO values in players table
  console.log("Updating final ELO values...")
  for (const [id, elo] of Object.entries(playerElo)) {
    await supabase.from("players").update({ elo }).eq("id", parseInt(id))
  }

  // Print final ELO (active players only)
  console.log("\nFinal ELO values (active players):")
  const { data: finalPlayers } = await supabase
    .from("players")
    .select("id, display_name, elo")
    .eq("is_active", true)
    .order("elo", { ascending: false })

  if (finalPlayers) {
    for (const p of finalPlayers) {
      console.log(`  ${p.display_name} (${p.id}): ${p.elo}`)
    }
  }

  console.log(`\nDone: ${processed} matches imported, ${errors} errors`)
}

main().catch(console.error)
