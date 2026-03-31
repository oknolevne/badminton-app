"use client"

import { useState, useCallback } from "react"
import { MatchCard } from "./MatchCard"
import { SessionTimer } from "./SessionTimer"
import { DeleteSessionDialog } from "./DeleteSessionDialog"
import { ScoreInput } from "@/components/score/ScoreInput"
import { Separator } from "@/components/ui/separator"
import { useRealtimeSession } from "@/hooks/useRealtimeSession"
import type { Session, Match } from "@/types"

interface SessionDetailClientProps {
  session: Session
}

export function SessionDetailClient({ session }: SessionDetailClientProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleMatchUpdated = useCallback(
    (updatedMatchId: string) => {
      if (scoreOpen && selectedMatch?.id === updatedMatchId) {
        setScoreOpen(false)
        setSelectedMatch(null)
        setToast("Výsledek byl upraven jiným hráčem.")
        setTimeout(() => setToast(null), 3000)
      }
    },
    [scoreOpen, selectedMatch?.id]
  )

  useRealtimeSession(session.id, handleMatchUpdated)

  function handleScoreClick(match: Match) {
    setSelectedMatch(match)
    setScoreOpen(true)
  }

  const sessionDate = new Date(session.date).toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm capitalize text-muted-foreground">{sessionDate}</p>
          <p className="text-sm text-muted-foreground">
            {session.players.length} hráčů
          </p>
        </div>
        <div className="flex items-center gap-3">
          {session.status === "active" && (
            <SessionTimer closesAt={session.closesAt} />
          )}
          <DeleteSessionDialog sessionId={session.id} />
        </div>
      </div>

      <Separator />

      {/* Blocks */}
      {session.blocks.map((block) => {
        const mainMatches = block.matches.filter((m) => !m.isTraining)
        const trainingMatches = block.matches.filter((m) => m.isTraining)

        const slotSize =
          mainMatches.length >= 3 && mainMatches.length % 3 === 0
            ? mainMatches.length / 3
            : mainMatches.length

        const slots: Match[][] = []
        for (let i = 0; i < mainMatches.length; i += slotSize) {
          slots.push(mainMatches.slice(i, i + slotSize))
        }

        return (
          <div key={block.blockNumber}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Blok {block.blockNumber}
            </h3>
            <div className="space-y-4">
              {slots.map((slotMatches, slotIdx) => (
                <div key={slotIdx}>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Hra {slotIdx + 1}
                  </p>
                  <div className="space-y-2">
                    {slotMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onScoreClick={handleScoreClick}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {trainingMatches.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Trénink
                  </p>
                  <div className="space-y-2">
                    {trainingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onScoreClick={handleScoreClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Score Input Sheet */}
      <ScoreInput
        key={selectedMatch?.id}
        match={selectedMatch}
        sessionId={session.id}
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg bg-accent px-4 py-3 text-center text-sm text-accent-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
