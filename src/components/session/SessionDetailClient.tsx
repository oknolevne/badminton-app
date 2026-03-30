"use client"

import { useState } from "react"
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

  useRealtimeSession(session.id)

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
      {session.blocks.map((block) => (
        <div key={block.blockNumber}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Blok {block.blockNumber}
          </h3>
          <div className="space-y-2">
            {block.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onScoreClick={handleScoreClick}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Score Input Sheet */}
      <ScoreInput
        key={selectedMatch?.id}
        match={selectedMatch}
        sessionId={session.id}
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
      />
    </div>
  )
}
