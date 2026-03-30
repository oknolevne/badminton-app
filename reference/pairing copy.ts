import type { Match, Player, MatchBlock } from "@/types"

export function generateMockSchedule(players: Player[], sessionId: string): MatchBlock[] {
  const sorted = [...players].sort((a, b) => b.elo - a.elo)

  // Separate training players if count % 4 === 2
  const mainPlayers = sorted.length % 4 === 2 ? sorted.slice(0, sorted.length - 2) : [...sorted]
  const trainingPlayers = sorted.length % 4 === 2 ? sorted.slice(sorted.length - 2) : []

  const blocks: MatchBlock[] = []
  const numBlocks = Math.max(3, Math.ceil(mainPlayers.length / 4))

  for (let b = 0; b < numBlocks; b++) {
    const shuffled = shuffleWithSeed(mainPlayers, b)
    const pairs = createBalancedPairs(shuffled)
    const matches = createMatchesFromPairs(pairs, sessionId, b + 1)

    // Add training match to first block
    if (b === 0 && trainingPlayers.length === 2) {
      matches.push({
        id: `gen-${sessionId}-${b + 1}-t`,
        sessionId,
        blockNumber: b + 1,
        matchNumber: matches.length + 1,
        team1: [trainingPlayers[0], trainingPlayers[1]],
        team2: [trainingPlayers[1], trainingPlayers[0]],
        isTraining: true,
        result: null,
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

function createBalancedPairs(players: Player[]): [Player, Player][] {
  // Snake draft: pair strongest with weakest
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
  sessionId: string,
  blockNumber: number
): Match[] {
  const matches: Match[] = []

  // Create 3 matches per block (or fewer if not enough pairs)
  for (let i = 0; i < pairs.length && i + 1 < pairs.length; i += 2) {
    matches.push({
      id: `gen-${sessionId}-${blockNumber}-${matches.length + 1}`,
      sessionId,
      blockNumber,
      matchNumber: matches.length + 1,
      team1: pairs[i],
      team2: pairs[i + 1],
      isTraining: false,
      result: null,
    })
  }

  // If we have an odd number of pairs, rotate for additional matches
  if (pairs.length >= 2 && matches.length < 3) {
    for (let i = 0; matches.length < 3 && i < pairs.length; i++) {
      const nextIdx = (i + 1) % pairs.length
      if (i !== nextIdx) {
        matches.push({
          id: `gen-${sessionId}-${blockNumber}-${matches.length + 1}`,
          sessionId,
          blockNumber,
          matchNumber: matches.length + 1,
          team1: pairs[i],
          team2: pairs[nextIdx],
          isTraining: false,
          result: null,
        })
      }
    }
  }

  return matches
}

export function validatePlayerCount(count: number): {
  valid: boolean
  canGenerate: boolean
  message: string
} {
  if (count < 4) {
    return { valid: false, canGenerate: false, message: "Minimum 4 hráči" }
  }

  const mod = count % 4
  if (mod === 0) {
    return { valid: true, canGenerate: true, message: `${count} hráčů` }
  }
  if (mod === 2) {
    return { valid: true, canGenerate: true, message: `${count} hráčů (2 hrají trénink)` }
  }

  return {
    valid: false,
    canGenerate: false,
    message: `${count} hráčů nelze rozdělit. Přidejte nebo odeberte hráče.`,
  }
}
