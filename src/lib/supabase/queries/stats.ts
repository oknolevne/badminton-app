import { createClient } from "@/lib/supabase/server"
import type { PlayerStats, EloHistoryEntry, PartnerStat, CommunityStats, CommunityMatch, PlayerRecord, PlayerRecords } from "@/types"

export async function fetchPlayerStats(playerId: number): Promise<PlayerStats> {
  const supabase = await createClient()

  // Get all matches where this player participated
  const { data: matches } = await supabase
    .from("matches")
    .select("id, team1_player1, team1_player2, team2_player1, team2_player2, is_training, match_results(*)")
    .or(`team1_player1.eq.${playerId},team1_player2.eq.${playerId},team2_player1.eq.${playerId},team2_player2.eq.${playerId}`)
    .eq("is_training", false)

  let totalMatches = 0
  let wins = 0
  let losses = 0

  // Track partner/opponent stats
  const partnerCounts = new Map<number, { wins: number; total: number }>()
  const opponentCounts = new Map<number, { wins: number; total: number }>()

  for (const match of matches ?? []) {
    const result = Array.isArray(match.match_results)
      ? match.match_results[0]
      : match.match_results

    if (!result) continue

    totalMatches++

    const isTeam1 =
      match.team1_player1 === playerId || match.team1_player2 === playerId

    const myTotal = isTeam1 ? result.total_team1 : result.total_team2
    const oppTotal = isTeam1 ? result.total_team2 : result.total_team1
    const won = myTotal > oppTotal

    if (won) wins++
    else losses++

    // Partner tracking
    const partnerId = isTeam1
      ? match.team1_player1 === playerId
        ? match.team1_player2
        : match.team1_player1
      : match.team2_player1 === playerId
        ? match.team2_player2
        : match.team2_player1

    if (!partnerCounts.has(partnerId)) {
      partnerCounts.set(partnerId, { wins: 0, total: 0 })
    }
    const pc = partnerCounts.get(partnerId)!
    pc.total++
    if (won) pc.wins++

    // Opponent tracking
    const opp1 = isTeam1 ? match.team2_player1 : match.team1_player1
    const opp2 = isTeam1 ? match.team2_player2 : match.team1_player2

    for (const oppId of [opp1, opp2]) {
      if (!opponentCounts.has(oppId)) {
        opponentCounts.set(oppId, { wins: 0, total: 0 })
      }
      const oc = opponentCounts.get(oppId)!
      oc.total++
      if (won) oc.wins++
    }
  }

  // Get ELO history
  const eloHistory = await fetchEloHistory(playerId)

  // Get player names for partner/opponent stats
  const allRelatedIds = new Set([...partnerCounts.keys(), ...opponentCounts.keys()])
  const { data: relatedPlayers } = allRelatedIds.size > 0
    ? await supabase
        .from("players")
        .select("id, display_name")
        .in("id", [...allRelatedIds])
    : { data: [] }

  const nameMap = new Map<number, string>()
  for (const p of relatedPlayers ?? []) {
    nameMap.set(p.id, p.display_name)
  }

  // Find frequent, best, worst
  const frequentPartner = findTopPartner(partnerCounts, nameMap, "count")
  const bestPartner = findTopPartner(partnerCounts, nameMap, "winRate")
  const worstOpponent = findWorstOpponent(opponentCounts, nameMap)

  return {
    playerId,
    totalMatches,
    wins,
    losses,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
    eloHistory,
    frequentPartner,
    bestPartner,
    worstOpponent,
  }
}

export async function fetchEloHistory(playerId: number): Promise<EloHistoryEntry[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("elo_history")
    .select("elo_after, delta, match_id, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: true })

  if (!data || data.length === 0) return []

  // Batch-fetch matches to get session_ids
  const matchIds = [...new Set(data.map((e) => e.match_id))]
  const { data: matches } = await supabase
    .from("matches")
    .select("id, session_id")
    .in("id", matchIds)

  // Batch-fetch sessions to get real dates
  const sessionIds = [...new Set((matches ?? []).map((m) => m.session_id))]
  const { data: sessions } = sessionIds.length > 0
    ? await supabase.from("sessions").select("id, date").in("id", sessionIds)
    : { data: [] }

  const matchSessionMap = new Map<string, string>()
  for (const m of matches ?? []) matchSessionMap.set(m.id, m.session_id)

  const sessionDateMap = new Map<string, string>()
  for (const s of sessions ?? []) sessionDateMap.set(s.id, s.date)

  return data.map((entry) => {
    const sessionId = matchSessionMap.get(entry.match_id)
    const sessionDate = sessionId ? sessionDateMap.get(sessionId) : undefined

    return {
      date: entry.created_at,
      sessionDate: sessionDate ?? entry.created_at,
      elo: entry.elo_after,
      delta: entry.delta,
      matchId: entry.match_id,
    }
  })
}

export async function fetchPlayerRank(playerId: number): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("players")
    .select("id, elo")
    .eq("is_active", true)
    .order("elo", { ascending: false })

  if (!data) return 0

  const index = data.findIndex((p) => p.id === playerId)
  return index >= 0 ? index + 1 : 0
}

export async function fetchRecentMatches(playerId: number, limit = 3) {
  const supabase = await createClient()

  const { data: eloEntries } = await supabase
    .from("elo_history")
    .select("match_id, delta, elo_after, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!eloEntries || eloEntries.length === 0) return []

  const matchIds = eloEntries.map((e) => e.match_id)

  const { data: matches } = await supabase
    .from("matches")
    .select("id, team1_player1, team1_player2, team2_player1, team2_player2, match_results(*)")
    .in("id", matchIds)

  if (!matches) return []

  // Get all player IDs
  const playerIds = new Set<number>()
  for (const m of matches) {
    playerIds.add(m.team1_player1)
    playerIds.add(m.team1_player2)
    playerIds.add(m.team2_player1)
    playerIds.add(m.team2_player2)
  }

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name")
    .in("id", [...playerIds])

  const nameMap = new Map<number, string>()
  for (const p of players ?? []) {
    nameMap.set(p.id, p.display_name)
  }

  return eloEntries.map((entry) => {
    const match = matches.find((m) => m.id === entry.match_id)
    if (!match) return null

    const isTeam1 =
      match.team1_player1 === playerId || match.team1_player2 === playerId

    const partnerId = isTeam1
      ? match.team1_player1 === playerId ? match.team1_player2 : match.team1_player1
      : match.team2_player1 === playerId ? match.team2_player2 : match.team2_player1

    const opp1 = isTeam1 ? match.team2_player1 : match.team1_player1
    const opp2 = isTeam1 ? match.team2_player2 : match.team1_player2

    const result = Array.isArray(match.match_results)
      ? match.match_results[0]
      : match.match_results

    return {
      matchId: entry.match_id,
      delta: entry.delta,
      partner: nameMap.get(partnerId) ?? "?",
      opponents: `${nameMap.get(opp1) ?? "?"} & ${nameMap.get(opp2) ?? "?"}`,
      score: result
        ? `${result.total_team1}:${result.total_team2}`
        : null,
      won: result
        ? isTeam1
          ? result.total_team1 > result.total_team2
          : result.total_team2 > result.total_team1
        : false,
      date: entry.created_at,
    }
  }).filter(Boolean)
}

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const supabase = await createClient()

  const [matchCount, playerCount] = await Promise.all([
    supabase.from("match_results").select("*", { count: "exact", head: true }),
    supabase.from("players").select("*", { count: "exact", head: true }).eq("is_active", true),
  ])

  return {
    totalMatches: matchCount.count ?? 0,
    activePlayers: playerCount.count ?? 0,
  }
}

export async function fetchCommunityRecentMatches(limit = 5): Promise<CommunityMatch[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("matches")
    .select("id, team1_player1, team1_player2, team2_player1, team2_player2, match_results(total_team1, total_team2, submitted_at)")
    .eq("is_training", false)
    .not("match_results", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  const playerIds = new Set<number>()
  for (const m of data) {
    playerIds.add(m.team1_player1)
    playerIds.add(m.team1_player2)
    playerIds.add(m.team2_player1)
    playerIds.add(m.team2_player2)
  }

  const { data: players } = await supabase
    .from("players")
    .select("id, display_name")
    .in("id", [...playerIds])

  const nameMap = new Map<number, string>()
  for (const p of players ?? []) nameMap.set(p.id, p.display_name)

  return data.map((m) => {
    const result = Array.isArray(m.match_results) ? m.match_results[0] : m.match_results
    return {
      matchId: m.id,
      team1Player1: nameMap.get(m.team1_player1) ?? "?",
      team1Player2: nameMap.get(m.team1_player2) ?? "?",
      team2Player1: nameMap.get(m.team2_player1) ?? "?",
      team2Player2: nameMap.get(m.team2_player2) ?? "?",
      score: result ? `${result.total_team1}:${result.total_team2}` : "?",
      submittedAt: result?.submitted_at ?? "",
    }
  })
}

export async function fetchPlayerRecords(playerId: number): Promise<PlayerRecords> {
  const supabase = await createClient()

  const { data: eloEntries } = await supabase
    .from("elo_history")
    .select("match_id, delta, elo_after, created_at")
    .eq("player_id", playerId)

  if (!eloEntries || eloEntries.length === 0) {
    return { bestWin: null, worstLoss: null }
  }

  const wins = eloEntries.filter((e) => e.delta > 0)
  const losses = eloEntries.filter((e) => e.delta < 0)

  const bestWinEntry = wins.length > 0
    ? wins.reduce((best, e) => (e.delta > best.delta ? e : best))
    : null
  const worstLossEntry = losses.length > 0
    ? losses.reduce((worst, e) => (e.delta < worst.delta ? e : worst))
    : null

  const relevantMatchIds = [bestWinEntry?.match_id, worstLossEntry?.match_id].filter(Boolean) as string[]
  if (relevantMatchIds.length === 0) return { bestWin: null, worstLoss: null }

  const { data: matches } = await supabase
    .from("matches")
    .select("id, team1_player1, team1_player2, team2_player1, team2_player2, session_id, match_results(total_team1, total_team2)")
    .in("id", relevantMatchIds)

  const playerIdsSet = new Set<number>()
  const sessionIds = new Set<string>()
  for (const m of matches ?? []) {
    playerIdsSet.add(m.team1_player1)
    playerIdsSet.add(m.team1_player2)
    playerIdsSet.add(m.team2_player1)
    playerIdsSet.add(m.team2_player2)
    if (m.session_id) sessionIds.add(m.session_id)
  }

  const [playersRes, sessionsRes] = await Promise.all([
    supabase.from("players").select("id, display_name").in("id", [...playerIdsSet]),
    sessionIds.size > 0
      ? supabase.from("sessions").select("id, date").in("id", [...sessionIds])
      : Promise.resolve({ data: [] as { id: string; date: string }[] }),
  ])

  const nameMap = new Map<number, string>()
  for (const p of playersRes.data ?? []) nameMap.set(p.id, p.display_name)

  const sessionDateMap = new Map<string, string>()
  for (const s of sessionsRes.data ?? []) sessionDateMap.set(s.id, s.date)

  function buildRecord(entry: { match_id: string; delta: number; elo_after: number; created_at: string }): PlayerRecord | null {
    const match = matches?.find((m) => m.id === entry.match_id)
    if (!match) return null

    const isTeam1 = match.team1_player1 === playerId || match.team1_player2 === playerId
    const partnerId = isTeam1
      ? (match.team1_player1 === playerId ? match.team1_player2 : match.team1_player1)
      : (match.team2_player1 === playerId ? match.team2_player2 : match.team2_player1)
    const opp1 = isTeam1 ? match.team2_player1 : match.team1_player1
    const opp2 = isTeam1 ? match.team2_player2 : match.team1_player2
    const result = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results

    return {
      matchId: entry.match_id,
      delta: entry.delta,
      elo: entry.elo_after,
      opponentNames: `${nameMap.get(opp1) ?? "?"} & ${nameMap.get(opp2) ?? "?"}`,
      partnerName: nameMap.get(partnerId) ?? "?",
      score: result ? `${result.total_team1}:${result.total_team2}` : "?",
      date: sessionDateMap.get(match.session_id) ?? entry.created_at,
    }
  }

  return {
    bestWin: bestWinEntry ? buildRecord(bestWinEntry) : null,
    worstLoss: worstLossEntry ? buildRecord(worstLossEntry) : null,
  }
}

function findTopPartner(
  counts: Map<number, { wins: number; total: number }>,
  nameMap: Map<number, string>,
  sortBy: "count" | "winRate"
): PartnerStat | null {
  if (counts.size === 0) return null

  const entries = [...counts.entries()]
    .filter(([, stats]) => stats.total >= 2) // Min 2 matches together

  if (entries.length === 0) return null

  entries.sort(([, a], [, b]) => {
    if (sortBy === "count") return b.total - a.total
    return (b.wins / b.total) - (a.wins / a.total)
  })

  const [id, stats] = entries[0]
  return {
    playerId: id,
    playerName: nameMap.get(id) ?? "Neznámý",
    count: stats.total,
    winRate: Math.round((stats.wins / stats.total) * 100),
  }
}

function findWorstOpponent(
  counts: Map<number, { wins: number; total: number }>,
  nameMap: Map<number, string>
): PartnerStat | null {
  if (counts.size === 0) return null

  const entries = [...counts.entries()]
    .filter(([, stats]) => stats.total >= 2)

  if (entries.length === 0) return null

  // Worst = lowest win rate against
  entries.sort(([, a], [, b]) => (a.wins / a.total) - (b.wins / b.total))

  const [id, stats] = entries[0]
  return {
    playerId: id,
    playerName: nameMap.get(id) ?? "Neznámý",
    count: stats.total,
    winRate: Math.round((stats.wins / stats.total) * 100),
  }
}
