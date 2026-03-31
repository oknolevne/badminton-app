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
  sessionDate?: string
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

export interface CommunityStats {
  totalMatches: number
  activePlayers: number
}

export interface CommunityMatch {
  matchId: string
  team1Player1: string
  team1Player2: string
  team2Player1: string
  team2Player2: string
  score: string
  submittedAt: string
}

export interface PlayerRecord {
  matchId: string
  delta: number
  elo: number
  opponentNames: string
  partnerName: string
  score: string
  date: string
}

export interface PlayerRecords {
  bestWin: PlayerRecord | null
  worstLoss: PlayerRecord | null
}
