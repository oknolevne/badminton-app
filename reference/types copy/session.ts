import type { Match } from "./match"
import type { Player } from "./player"

export interface Session {
  id: string
  date: string
  createdAt: number
  createdBy: number
  status: "draft" | "active" | "finished"
  players: Player[]
  blocks: MatchBlock[]
}

export interface MatchBlock {
  blockNumber: number
  matches: Match[]
}
