/**
 * ELO calculation for 2v2 badminton doubles.
 *
 * Formula:
 *   teamElo = (player1.elo + player2.elo) / 2
 *   expected = 1 / (1 + 10^((oppTeamElo - myTeamElo) / DIVISOR))
 *   actual = myPoints / (myPoints + oppPoints)   — proportional
 *   delta = K * (actual - expected)
 *
 * Both players on a team receive the same delta.
 */

export const K = 100
export const DIVISOR = 1400

export function calculateEloDelta(
  myTeamElo: number,
  oppTeamElo: number,
  myPoints: number,
  oppPoints: number
): number {
  const totalPoints = myPoints + oppPoints
  if (totalPoints === 0) return 0

  const expected = 1 / (1 + Math.pow(10, (oppTeamElo - myTeamElo) / DIVISOR))
  const actual = myPoints / totalPoints

  const raw = K * (actual - expected)
  return Math.sign(raw) * Math.round(Math.abs(raw))
}

export function calculateTeamElo(elo1: number, elo2: number): number {
  return (elo1 + elo2) / 2
}
