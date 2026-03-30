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

const MAX_SLOTS = 3

/**
 * Generate a match schedule for a session.
 *
 * Model:
 * - 3 blocks, each with unique teammate pairs (no pair repeats across blocks)
 * - Within each block: round-robin (circle method) — every pair plays every other
 * - Max 3 time slots per block (capped for 6+ pairs)
 * - Training pair rotates each block, plays as many training matches as there are slots
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

    // Snake-draft pairs + uniqueness swap
    let pairs = createBalancedPairs(mainPlayers)
    pairs = ensureUniquePairs(pairs, usedPairs)

    for (const [p1, p2] of pairs) {
      usedPairs.add(pairKey(p1, p2))
    }

    // Round-robin slots (circle method, max 3)
    const slots = generateRoundRobinSlots(pairs)

    // Flatten slots into matches
    const matches: ScheduleMatch[] = []
    let matchNumber = 1

    for (const slot of slots) {
      for (const matchup of slot) {
        matches.push({
          blockNumber: blockIdx + 1,
          matchNumber: matchNumber++,
          team1: matchup.team1,
          team2: matchup.team2,
          isTraining: false,
        })
      }
    }

    // Training matches = number of slots (so training pair plays alongside others)
    if (trainingPlayers.length === 2) {
      const numTrainingMatches = slots.length
      for (let i = 0; i < numTrainingMatches; i++) {
        matches.push({
          blockNumber: blockIdx + 1,
          matchNumber: matchNumber++,
          team1: [trainingPlayers[0], trainingPlayers[1]],
          team2: [trainingPlayers[1], trainingPlayers[0]],
          isTraining: true,
        })
      }
    }

    blocks.push({ blockNumber: blockIdx + 1, matches })
  }

  return blocks
}

/**
 * Round-robin scheduling using the circle method.
 * N pairs → min(N-1, MAX_SLOTS) time slots, each with N/2 simultaneous matches.
 */
function generateRoundRobinSlots(
  pairs: [Player, Player][]
): { team1: [Player, Player]; team2: [Player, Player] }[][] {
  const n = pairs.length
  if (n < 2) return []

  const numRounds = Math.min(n - 1, MAX_SLOTS)
  const indices = Array.from({ length: n }, (_, i) => i)
  const slots: { team1: [Player, Player]; team2: [Player, Player] }[][] = []

  for (let round = 0; round < numRounds; round++) {
    const slot: { team1: [Player, Player]; team2: [Player, Player] }[] = []

    for (let i = 0; i < n / 2; i++) {
      slot.push({
        team1: pairs[indices[i]],
        team2: pairs[indices[n - 1 - i]],
      })
    }

    slots.push(slot)

    // Rotate: fix first, shift rest right by 1
    const last = indices[n - 1]
    for (let i = n - 1; i > 1; i--) {
      indices[i] = indices[i - 1]
    }
    indices[1] = last
  }

  return slots
}

/**
 * Snake-draft pairing: strongest with weakest.
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
 * Swap players between pairs to resolve uniqueness conflicts.
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

      const newA1: [Player, Player] = [result[conflictIdx][0], result[otherIdx][0]]
      const newA2: [Player, Player] = [result[conflictIdx][1], result[otherIdx][1]]

      if (!usedPairs.has(pairKey(newA1[0], newA1[1])) &&
          !usedPairs.has(pairKey(newA2[0], newA2[1]))) {
        result[conflictIdx] = newA1
        result[otherIdx] = newA2
        fixed = true
        break
      }

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
