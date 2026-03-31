import { createClient } from "@/lib/supabase/server"
import type { Session, MatchBlock, Match, MatchResult } from "@/types"
import type { Player } from "@/types"

export async function fetchActiveSession(): Promise<Session | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return buildSession(data.id)
}

export async function fetchSessions(limit = 10): Promise<Session[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!data || data.length === 0) return []

  const sessions: Session[] = []
  for (const row of data) {
    const session = await buildSession(row.id)
    if (session) sessions.push(session)
  }
  return sessions
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  return buildSession(id)
}

async function buildSession(sessionId: string): Promise<Session | null> {
  const supabase = await createClient()

  // Round 1: 3 independent queries in parallel
  const [sessionRes, playersRes, matchesRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
    supabase.from("session_players").select("player_id, is_training, players(*)").eq("session_id", sessionId),
    supabase.from("matches").select("*").eq("session_id", sessionId).order("block_number").order("match_number"),
  ])

  if (!sessionRes.data) return null
  const session = sessionRes.data

  const players: Player[] = (playersRes.data ?? []).map((sp) => {
    const p = sp.players as unknown as Record<string, unknown>
    return {
      id: p.id as number,
      username: p.username as string,
      displayName: p.display_name as string,
      avatarUrl: p.avatar_url as string | null,
      elo: p.elo as number,
      role: p.role as "player" | "admin",
      createdAt: p.created_at as string,
    }
  })

  // Round 2: match_results depends on matchIds from Round 1
  const matches = matchesRes.data
  const matchIds = (matches ?? []).map((m) => m.id)
  const { data: results } = matchIds.length > 0
    ? await supabase
        .from("match_results")
        .select("*")
        .in("match_id", matchIds)
    : { data: [] }

  const resultMap = new Map<string, Record<string, unknown>>()
  for (const r of results ?? []) {
    resultMap.set(r.match_id, r)
  }

  // 5. Build player lookup
  // We need all players referenced in matches, not just session players
  const allPlayerIds = new Set<number>()
  for (const m of matches ?? []) {
    allPlayerIds.add(m.team1_player1)
    allPlayerIds.add(m.team1_player2)
    allPlayerIds.add(m.team2_player1)
    allPlayerIds.add(m.team2_player2)
  }

  // Fetch any missing players
  const missingIds = [...allPlayerIds].filter((id) => !players.find((p) => p.id === id))
  let allPlayers = [...players]
  if (missingIds.length > 0) {
    const { data: extraPlayers } = await supabase
      .from("players")
      .select("*")
      .in("id", missingIds)

    if (extraPlayers) {
      allPlayers = [
        ...allPlayers,
        ...extraPlayers.map((p) => ({
          id: p.id as number,
          username: p.username as string,
          displayName: p.display_name as string,
          avatarUrl: p.avatar_url as string | null,
          elo: p.elo as number,
          role: p.role as "player" | "admin",
          createdAt: p.created_at as string,
        })),
      ]
    }
  }

  const playerMap = new Map<number, Player>()
  for (const p of allPlayers) {
    playerMap.set(p.id, p)
  }

  const defaultPlayer: Player = {
    id: 0,
    username: "unknown",
    displayName: "Neznámý",
    avatarUrl: null,
    elo: 1500,
    role: "player",
    createdAt: "",
  }

  // 6. Build blocks
  const blockMap = new Map<number, Match[]>()
  for (const m of matches ?? []) {
    const result = resultMap.get(m.id)
    const match: Match = {
      id: m.id,
      sessionId: m.session_id,
      blockNumber: m.block_number,
      matchNumber: m.match_number,
      team1: [
        playerMap.get(m.team1_player1) ?? defaultPlayer,
        playerMap.get(m.team1_player2) ?? defaultPlayer,
      ],
      team2: [
        playerMap.get(m.team2_player1) ?? defaultPlayer,
        playerMap.get(m.team2_player2) ?? defaultPlayer,
      ],
      isTraining: m.is_training,
      result: result
        ? {
            sets: result.sets as { team1: number; team2: number }[],
            totalTeam1: result.total_team1 as number,
            totalTeam2: result.total_team2 as number,
            submittedBy: result.submitted_by as number,
            submittedAt: result.submitted_at as string,
            updatedAt: (result.updated_at as string) ?? null,
          }
        : null,
    }

    if (!blockMap.has(m.block_number)) {
      blockMap.set(m.block_number, [])
    }
    blockMap.get(m.block_number)!.push(match)
  }

  const blocks: MatchBlock[] = [...blockMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([blockNumber, blockMatches]) => ({
      blockNumber,
      matches: blockMatches,
    }))

  return {
    id: session.id,
    date: session.date,
    createdBy: session.created_by,
    status: session.status as "active" | "finished",
    closesAt: session.closes_at,
    createdAt: session.created_at,
    players,
    blocks,
  }
}
