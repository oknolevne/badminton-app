import type { Player } from "@/types"

interface ScheduleMatch {
  blockNumber: number
  matchNumber: number
  team1: [Player, Player]
  team2: [Player, Player]
  isTraining: boolean
}

interface ScheduleBlock {
  blockNumber: number
  matches: ScheduleMatch[]
}

/**
 * Generate a match schedule for a session.
 * Players are sorted by ELO and paired using snake-draft (strongest with weakest).
 * If playerCount % 4 === 2, the two lowest-ELO players play a training match.
 */
export function generateSchedule(players: Player[]): ScheduleBlock[] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo)

  const hasTraining = sorted.length % 4 === 2
  const mainPlayers = hasTraining ? sorted.slice(0, sorted.length - 2) : [...sorted]
  const trainingPlayers = hasTraining ? sorted.slice(sorted.length - 2) : []

  const blocks: ScheduleBlock[] = []
  const numBlocks = 3

  for (let b = 0; b < numBlocks; b++) {
    const shuffled = shuffleWithSeed(mainPlayers, b)
    const pairs = createBalancedPairs(shuffled)
    const matches = createMatchesFromPairs(pairs, b + 1)

    if (b === 0 && trainingPlayers.length === 2) {
      matches.push({
        blockNumber: 1,
        matchNumber: matches.length + 1,
        team1: [trainingPlayers[0], trainingPlayers[1]],
        team2: [trainingPlayers[1], trainingPlayers[0]],
        isTraining: true,
      })
    }

    blocks.push({ blockNumber: b + 1, matches })
  }

  return blocks
}

function shuffleWithSeed(players: Player[], seed: number): Player[] {
  const arr = [...players]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = ((seed + 1) * (i + 1) * 7 + arr[i].id) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function createBalancedPairs(players: Player[]): [Player, Player][] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo)
  const pairs: [Player, Player][] = []
  let left = 0
  let right = sorted.length - 1

  while (left < right) {
    pairs.push([sorted[left], sorted[right]])
    left++
    right--
  }

  return pairs
}

function createMatchesFromPairs(
  pairs: [Player, Player][],
  blockNumber: number
): ScheduleMatch[] {
  const matches: ScheduleMatch[] = []

  for (let i = 0; i + 1 < pairs.length; i += 2) {
    matches.push({
      blockNumber,
      matchNumber: matches.length + 1,
      team1: pairs[i],
      team2: pairs[i + 1],
      isTraining: false,
    })
  }

  if (pairs.length >= 2 && matches.length < 3) {
    for (let i = 0; matches.length < 3 && i < pairs.length; i++) {
      const nextIdx = (i + 1) % pairs.length
      if (i !== nextIdx) {
        matches.push({
          blockNumber,
          matchNumber: matches.length + 1,
          team1: pairs[i],
          team2: pairs[nextIdx],
          isTraining: false,
        })
      }
    }
  }

  return matches
}

export function validatePlayerCount(count: number): {
  valid: boolean
  message: string
} {
  if (count < 4) {
    return { valid: false, message: "Minimum 4 hráči" }
  }

  const mod = count % 4
  if (mod === 0) {
    return { valid: true, message: `${count} hráčů` }
  }
  if (mod === 2) {
    return { valid: true, message: `${count} hráčů (2 hrají trénink)` }
  }

  return {
    valid: false,
    message: `${count} hráčů nelze rozdělit. Přidejte nebo odeberte hráče.`,
  }
}
