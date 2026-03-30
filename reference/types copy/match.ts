import type { Player } from "./player"

export interface Match {
  id: string
  sessionId: string
  blockNumber: number
  matchNumber: number
  team1: [Player, Player]
  team2: [Player, Player]
  isTraining: boolean
  result: MatchResult | null
}

export interface MatchResult {
  sets: { team1: number; team2: number }[]
  totalTeam1: number
  totalTeam2: number
}
