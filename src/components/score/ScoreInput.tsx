"use client"

import { useState, useTransition } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SetScore } from "./SetScore"
import { updateMatchResult } from "@/app/actions/session"
import { cn } from "@/lib/utils"
import type { Match } from "@/types"

interface ScoreInputProps {
  match: Match | null
  sessionId: string
  open: boolean
  onClose: () => void
}

export function ScoreInput({ match, sessionId, open, onClose }: ScoreInputProps) {
  const [sets, setSets] = useState<{ team1: number; team2: number }[]>([
    { team1: 0, team2: 0 },
    { team1: 0, team2: 0 },
  ])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Initialize with existing result when match changes
  const initSets = match?.result
    ? match.result.sets
    : [{ team1: 0, team2: 0 }, { team1: 0, team2: 0 }]

  // Reset state when match changes
  function handleOpenChange(isOpen: boolean) {
    if (isOpen && match) {
      setSets(
        match.result
          ? [...match.result.sets]
          : [{ team1: 0, team2: 0 }, { team1: 0, team2: 0 }]
      )
      setError(null)
    }
    if (!isOpen) onClose()
  }

  const totalTeam1 = sets.reduce((sum, s) => sum + s.team1, 0)
  const totalTeam2 = sets.reduce((sum, s) => sum + s.team2, 0)
  const team1Won = totalTeam1 > totalTeam2
  const team2Won = totalTeam2 > totalTeam1

  function updateSet(
    index: number,
    team: "team1" | "team2",
    value: number
  ) {
    setSets((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [team]: value }
      return next
    })
  }

  function addSet() {
    setSets((prev) => [...prev, { team1: 0, team2: 0 }])
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    if (!match) return
    setError(null)

    startTransition(async () => {
      try {
        await updateMatchResult({
          matchId: match.id,
          sessionId,
          sets,
        })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při ukládání")
      }
    })
  }

  if (!match) return null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-center text-foreground">
            Zadat skóre
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-2 pb-6">
          {/* Team names */}
          <div className="flex items-center justify-between text-sm">
            <div className={cn("font-medium", team1Won && "text-success")}>
              {match.team1[0].displayName} & {match.team1[1].displayName}
            </div>
            <div className={cn("font-medium text-right", team2Won && "text-success")}>
              {match.team2[0].displayName} & {match.team2[1].displayName}
            </div>
          </div>

          {/* Sets */}
          <div className="flex flex-col items-center gap-2">
            {sets.map((set, i) => (
              <div key={i} className="flex items-center gap-1">
                <SetScore
                  setIndex={i}
                  team1Score={set.team1}
                  team2Score={set.team2}
                  onTeam1Change={(v) => updateSet(i, "team1", v)}
                  onTeam2Change={(v) => updateSet(i, "team2", v)}
                />
                {i >= 2 && (
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addSet} className="w-full">
            + Přidat set
          </Button>

          {/* Total */}
          <div className="flex items-center justify-center gap-3 text-center">
            <span className="text-sm text-muted-foreground">Celkem:</span>
            <span className={cn("font-display text-2xl", team1Won && "text-success")}>
              {totalTeam1}
            </span>
            <span className="text-muted-foreground">:</span>
            <span className={cn("font-display text-2xl", team2Won && "text-success")}>
              {totalTeam2}
            </span>
          </div>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Ukládám..." : match.result ? "Upravit" : "Uložit"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
