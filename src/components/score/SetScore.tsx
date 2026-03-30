"use client"

interface SetScoreProps {
  setIndex: number
  team1Score: number
  team2Score: number
  onTeam1Change: (value: number) => void
  onTeam2Change: (value: number) => void
}

export function SetScore({
  setIndex,
  team1Score,
  team2Score,
  onTeam1Change,
  onTeam2Change,
}: SetScoreProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-xs text-muted-foreground">Set {setIndex + 1}</span>
      <input
        type="number"
        min={0}
        max={99}
        value={team1Score}
        onChange={(e) => onTeam1Change(parseInt(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
        className="h-10 w-16 rounded-md border border-input bg-background px-3 text-center text-lg font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <span className="text-muted-foreground">:</span>
      <input
        type="number"
        min={0}
        max={99}
        value={team2Score}
        onChange={(e) => onTeam2Change(parseInt(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
        className="h-10 w-16 rounded-md border border-input bg-background px-3 text-center text-lg font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}
