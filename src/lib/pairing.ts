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
 *
 * - 3 blocks with unique teammate pairs across blocks
 * - ELO-balanced pairs (greedy: strongest + weakest available)
 * - Training pair rotates each block (if playerCount % 4 === 2)
 */
export function generateSchedule(players: Player[]): ScheduleBlock[] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo)
  const n = sorted.length
  const hasTraining = n % 4 === 2

  const usedPairs = new Set<string>()
  const blocks: ScheduleBlock[] = []

  for (let b = 0; b < 3; b++) {
    let mainPlayers: Player[]
    let trainingPair: [Player, Player] | null = null

    if (hasTraining) {
      // Rotate training pair each block: block 0 → weakest 2, block 1 → next 2, etc.
      const idx1 = n - 2 - b * 2
      const idx2 = n - 1 - b * 2

      // Cyclic mod for small player counts
      const safeIdx1 = ((idx1 % n) + n) % n
      const safeIdx2 = ((idx2 % n) + n) % n

      const tp1 = sorted[safeIdx1]
      const tp2 = sorted[safeIdx2]
      trainingPair = [tp1, tp2]

      const trainingIds = new Set([tp1.id, tp2.id])
      mainPlayers = sorted.filter((p) => !trainingIds.has(p.id))
    } else {
      mainPlayers = [...sorted]
    }

    // Generate unique, ELO-balanced pairs
    const pairs = createBalancedPairs(mainPlayers, usedPairs)

    // Track used pairs
    for (const [p1, p2] of pairs) {
      usedPairs.add(pairKey(p1, p2))
    }

    // Create matches from pairs
    const matches = createMatchesFromPairs(pairs, b + 1)

    // Add training match
    if (trainingPair) {
      matches.push({
        blockNumber: b + 1,
        matchNumber: matches.length + 1,
        team1: trainingPair,
        team2: [trainingPair[1], trainingPair[0]],
        isTraining: true,
      })
    }

    blocks.push({ blockNumber: b + 1, matches })
  }

  return blocks
}

/**
 * Create ELO-balanced pairs with uniqueness constraint.
 * Greedy: for the strongest available player, find the weakest available
 * partner they haven't been paired with yet.
 */
export function createBalancedPairs(
  players: Player[],
  usedPairs: Set<string>
): [Player, Player][] {
  const available = [...players].sort((a, b) => b.elo - a.elo)
  const pairs: [Player, Player][] = []

  while (available.length >= 2) {
    const p1 = available.shift()!

    // Find weakest available partner not yet used
    let foundIdx = -1
    for (let j = available.length - 1; j >= 0; j--) {
      if (!usedPairs.has(pairKey(p1, available[j]))) {
        foundIdx = j
        break
      }
    }

    if (foundIdx >= 0) {
      const p2 = available.splice(foundIdx, 1)[0]
      pairs.push([p1, p2])
    } else {
      // Fallback: all partners used, take the weakest anyway
      const p2 = available.pop()!
      pairs.push([p1, p2])
    }
  }

  return pairs
}

function pairKey(p1: Player, p2: Player): string {
  return `${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`
}

function createMatchesFromPairs(
  pairs: [Player, Player][],
  blockNumber: number
): ScheduleMatch[] {
  const matches: ScheduleMatch[] = []

  // Primary matches: pair[0] vs pair[1], pair[2] vs pair[3], etc.
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    matches.push({
      blockNumber,
      matchNumber: matches.length + 1,
      team1: pairs[i],
      team2: pairs[i + 1],
      isTraining: false,
    })
  }

  // Fill with cross-matches if needed (different pair combinations)
  if (pairs.length >= 4 && matches.length < 3) {
    // Cross-match: pair[0] vs pair[2], pair[1] vs pair[3], etc.
    for (let i = 0; matches.length < 3 && i + 2 < pairs.length; i++) {
      matches.push({
        blockNumber,
        matchNumber: matches.length + 1,
        team1: pairs[i],
        team2: pairs[i + 2],
        isTraining: false,
      })
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
