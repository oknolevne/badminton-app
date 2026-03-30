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
 * Players are sorted by ELO. Each block uses round-robin rotation
 * to ensure unique teammate pairs across blocks.
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
    // Round-robin rotation: fix first player, rotate the rest
    const rotated = rotatePlayersForBlock(mainPlayers, b)
    const pairs = createBalancedPairs(rotated)
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

/**
 * Round-robin rotation: fix the first player, rotate rest by `rotation` positions.
 * This guarantees different teammate pairs in each block.
 */
function rotatePlayersForBlock(players: Player[], rotation: number): Player[] {
  if (players.length <= 2) return [...players]

  const first = players[0]
  const rest = players.slice(1)

  // Rotate the rest array by `rotation` positions
  const shift = rotation % rest.length
  const rotated = [...rest.slice(shift), ...rest.slice(0, shift)]

  return [first, ...rotated]
}

export function createBalancedPairs(players: Player[]): [Player, Player][] {
  // Pair adjacent players: [0,1], [2,3], [4,5], ...
  // Since rotation changes the order, this produces different pairs each block
  const pairs: [Player, Player][] = []
  for (let i = 0; i + 1 < players.length; i += 2) {
    pairs.push([players[i], players[i + 1]])
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

  // Fill remaining matches if needed (less than 3 matches)
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
