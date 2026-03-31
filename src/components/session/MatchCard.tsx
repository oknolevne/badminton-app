"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Match } from "@/types"

interface MatchCardProps {
  match: Match
  onScoreClick: (match: Match) => void
}

export function MatchCard({ match, onScoreClick }: MatchCardProps) {
  const hasResult = match.result !== null
  const team1Won = hasResult && match.result!.totalTeam1 > match.result!.totalTeam2
  const team2Won = hasResult && match.result!.totalTeam2 > match.result!.totalTeam1

  return (
    <button
      type="button"
      onClick={() => onScoreClick(match)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/30"
    >
      {match.isTraining && (
        <Badge variant="secondary" className="mb-2 text-xs">
          Trénink
        </Badge>
      )}

      <div className="flex items-center justify-between">
        {/* Team 1 */}
        <div className={cn("flex-1", team1Won && "text-success")}>
          <p className="text-sm font-medium">
            {match.team1[0].displayName}
          </p>
          {!match.isTraining && (
            <p className="text-sm font-medium">
              {match.team1[1].displayName}
            </p>
          )}
        </div>

        {/* Score */}
        <div className="px-3 text-center">
          {hasResult ? (
            <div className="rounded-md bg-score-bg px-3 py-1 border border-score-border">
              <span className={cn("font-display text-xl", team1Won && "text-success")}>
                {match.result!.totalTeam1}
              </span>
              <span className="mx-1 text-muted-foreground">:</span>
              <span className={cn("font-display text-xl", team2Won && "text-success")}>
                {match.result!.totalTeam2}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[#bbb]">Zadat skóre</span>
          )}
        </div>

        {/* Team 2 */}
        <div className={cn("flex-1 text-right", team2Won && "text-success")}>
          <p className="text-sm font-medium">
            {match.team2[0].displayName}
          </p>
          {!match.isTraining && (
            <p className="text-sm font-medium">
              {match.team2[1].displayName}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
