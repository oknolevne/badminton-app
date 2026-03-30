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
 * - 3 blocks, each with unique teammate pairs (no pair repeats across blocks)
 * - ELO-balanced pairs via snake-draft (strongest + weakest)
 * - Training pair rotates each block (if playerCount % 4 === 2)
 * - Matches: simple 1:1 pairing of pairs (pair[0] vs pair[1], pair[2] vs pair[3], ...)
 */
export function generateSchedule(players: Player[]): ScheduleBlock[] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo)
  const n = sorted.length
  const hasTraining = n % 4 === 2

  const usedPairs = new Set<string>()
  const blocks: ScheduleBlock[] = []

  for (let blockIdx = 0; blockIdx < 3; blockIdx++) {
    let mainPlayers: Player[]
    let trainingPlayers: Player[] = []

    if (hasTraining) {
      // Rotate training pair: block 0 → weakest 2, block 1 → next 2, etc.
      const idx1 = n - 2 - blockIdx * 2
      const idx2 = n - 1 - blockIdx * 2
      const safeIdx1 = ((idx1 % n) + n) % n
      const safeIdx2 = ((idx2 % n) + n) % n

      trainingPlayers = [sorted[safeIdx1], sorted[safeIdx2]]
      const trainingIds = new Set(trainingPlayers.map((p) => p.id))
      mainPlayers = sorted.filter((p) => !trainingIds.has(p.id))
    } else {
      mainPlayers = [...sorted]
    }

    // Snake-draft pairs
    let pairs = createBalancedPairs(mainPlayers)

    // Ensure no pair was used in a previous block
    pairs = ensureUniquePairs(pairs, usedPairs)

    // Register used pairs
    for (const [p1, p2] of pairs) {
      usedPairs.add(pairKey(p1, p2))
    }

    // Generate matches: pair[0] vs pair[1], pair[2] vs pair[3], ...
    const matches = createMatchesFromPairs(pairs, blockIdx + 1)

    // Add training match
    if (trainingPlayers.length === 2) {
      matches.push({
        blockNumber: blockIdx + 1,
        matchNumber: matches.length + 1,
        team1: [trainingPlayers[0], trainingPlayers[1]],
        team2: [trainingPlayers[1], trainingPlayers[0]],
        isTraining: true,
      })
    }

    blocks.push({ blockNumber: blockIdx + 1, matches })
  }

  return blocks
}

/**
 * Snake-draft pairing: strongest with weakest, second strongest with second weakest, etc.
 * Does NOT check uniqueness — that's handled by ensureUniquePairs.
 */
export function createBalancedPairs(players: Player[]): [Player, Player][] {
  const available = [...players].sort((a, b) => b.elo - a.elo)
  const pairs: [Player, Player][] = []

  while (available.length >= 2) {
    const p1 = available.shift()!
    const p2 = available.pop()!
    pairs.push([p1, p2])
  }

  return pairs
}

/**
 * Swap players between pairs to resolve conflicts with previously used pairs.
 * For each conflicting pair, try swapping one player with another pair (2 variants).
 */
function ensureUniquePairs(
  pairs: [Player, Player][],
  usedPairs: Set<string>
): [Player, Player][] {
  const result = pairs.map((p) => [...p] as [Player, Player])
  const MAX_ATTEMPTS = 200

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const conflictIdx = result.findIndex(([p1, p2]) =>
      usedPairs.has(pairKey(p1, p2))
    )
    if (conflictIdx === -1) break

    let fixed = false
    for (let otherIdx = 0; otherIdx < result.length; otherIdx++) {
      if (otherIdx === conflictIdx) continue

      // Variant A: swap first players between pairs
      const newA1: [Player, Player] = [result[conflictIdx][0], result[otherIdx][0]]
      const newA2: [Player, Player] = [result[conflictIdx][1], result[otherIdx][1]]

      if (!usedPairs.has(pairKey(newA1[0], newA1[1])) &&
          !usedPairs.has(pairKey(newA2[0], newA2[1]))) {
        result[conflictIdx] = newA1
        result[otherIdx] = newA2
        fixed = true
        break
      }

      // Variant B: swap cross
      const newB1: [Player, Player] = [result[conflictIdx][0], result[otherIdx][1]]
      const newB2: [Player, Player] = [result[conflictIdx][1], result[otherIdx][0]]

      if (!usedPairs.has(pairKey(newB1[0], newB1[1])) &&
          !usedPairs.has(pairKey(newB2[0], newB2[1]))) {
        result[conflictIdx] = newB1
        result[otherIdx] = newB2
        fixed = true
        break
      }
    }

    if (!fixed) break
  }

  return result
}

function pairKey(p1: Player, p2: Player): string {
  return `${Math.min(p1.id, p2.id)}-${Math.max(p1.id, p2.id)}`
}

/**
 * Simple 1:1 pairing of pairs into matches.
 * pair[0] vs pair[1], pair[2] vs pair[3], etc.
 */
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
