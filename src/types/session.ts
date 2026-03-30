import type { Player } from "./player"
import type { Match } from "./match"

export interface Session {
  id: string
  date: string
  createdBy: number
  status: "active" | "finished"
  closesAt: string
  createdAt: string
  players: Player[]
  blocks: MatchBlock[]
}

export interface MatchBlock {
  blockNumber: number
  matches: Match[]
}
