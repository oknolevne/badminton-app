export interface Player {
  id: number
  username: string
  displayName: string
  avatarUrl: string | null
  elo: number
  role: "player" | "admin"
  createdAt: string
}

export interface PlayerStats {
  playerId: number
  totalMatches: number
  wins: number
  losses: number
  winRate: number
  eloHistory: EloHistoryEntry[]
  frequentPartner: PartnerStat | null
  bestPartner: PartnerStat | null
  worstOpponent: PartnerStat | null
}

export interface EloHistoryEntry {
  date: string
  elo: number
  delta: number
  matchId: string
}

export interface PartnerStat {
  playerId: number
  playerName: string
  count: number
  winRate: number
}
