import { createClient } from "@/lib/supabase/server"
import { SessionManagement } from "@/components/admin/SessionManagement"

export interface AdminMatch {
  id: string
  blockNumber: number
  matchNumber: number
  team1Player1: string
  team1Player2: string
  team2Player1: string
  team2Player2: string
  totalTeam1: number | null
  totalTeam2: number | null
}

export interface AdminSession {
  id: string
  date: string
  matchCount: number
  playerCount: number
  matches: AdminMatch[]
}

export default async function AdminSessionsPage() {
  const supabase = await createClient()

  // Fetch finished sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("status", "finished")
    .order("date", { ascending: false })

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Žádné uzavřené večery.</p>
    )
  }

  const sessionIds = sessions.map((s) => s.id)

  // Batch fetch matches, results, and player counts
  const [matchesRes, playersRes] = await Promise.all([
    supabase
      .from("matches")
      .select("id, session_id, block_number, match_number, team1_player1, team1_player2, team2_player1, team2_player2, match_results(total_team1, total_team2)")
      .in("session_id", sessionIds)
      .order("block_number", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase
      .from("session_players")
      .select("session_id, player_id")
      .in("session_id", sessionIds),
  ])

  // Get all player names
  const playerIds = new Set<number>()
  for (const m of matchesRes.data ?? []) {
    playerIds.add(m.team1_player1)
    playerIds.add(m.team1_player2)
    playerIds.add(m.team2_player1)
    playerIds.add(m.team2_player2)
  }

  const { data: playerNames } = await supabase
    .from("players")
    .select("id, display_name")
    .in("id", [...playerIds])

  const nameMap = new Map<number, string>()
  for (const p of playerNames ?? []) nameMap.set(p.id, p.display_name)

  // Count players per session
  const playerCountMap = new Map<string, number>()
  for (const sp of playersRes.data ?? []) {
    playerCountMap.set(sp.session_id, (playerCountMap.get(sp.session_id) ?? 0) + 1)
  }

  // Group matches by session
  const matchesBySession = new Map<string, AdminMatch[]>()
  for (const m of matchesRes.data ?? []) {
    const result = Array.isArray(m.match_results) ? m.match_results[0] : m.match_results
    const match: AdminMatch = {
      id: m.id,
      blockNumber: m.block_number,
      matchNumber: m.match_number,
      team1Player1: nameMap.get(m.team1_player1) ?? "?",
      team1Player2: nameMap.get(m.team1_player2) ?? "?",
      team2Player1: nameMap.get(m.team2_player1) ?? "?",
      team2Player2: nameMap.get(m.team2_player2) ?? "?",
      totalTeam1: result?.total_team1 ?? null,
      totalTeam2: result?.total_team2 ?? null,
    }

    if (!matchesBySession.has(m.session_id)) {
      matchesBySession.set(m.session_id, [])
    }
    matchesBySession.get(m.session_id)!.push(match)
  }

  const adminSessions: AdminSession[] = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    matchCount: matchesBySession.get(s.id)?.length ?? 0,
    playerCount: playerCountMap.get(s.id) ?? 0,
    matches: matchesBySession.get(s.id) ?? [],
  }))

  return <SessionManagement sessions={adminSessions} />
}
