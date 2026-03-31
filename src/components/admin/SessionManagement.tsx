"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateMatchScore, deleteSessionAdmin } from "@/app/actions/admin"
import type { AdminSession, AdminMatch } from "@/app/(admin)/admin/sessions/page"

export function SessionManagement({ sessions }: { sessions: AdminSession[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <h3 className="text-sm font-medium text-muted-foreground">
        Uzavřené večery ({sessions.length})
      </h3>

      <div className="space-y-2">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isExpanded={expandedId === session.id}
            onToggle={() =>
              setExpandedId(expandedId === session.id ? null : session.id)
            }
            onError={(msg) => setError(msg)}
            onSuccess={() => {
              setError(null)
              router.refresh()
            }}
          />
        ))}
      </div>
    </div>
  )
}

function SessionRow({
  session,
  isExpanded,
  onToggle,
  onError,
  onSuccess,
}: {
  session: AdminSession
  isExpanded: boolean
  onToggle: () => void
  onError: (msg: string) => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSessionAdmin(session.id)
        setShowDeleteConfirm(false)
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  const formattedDate = new Date(session.date).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="rounded-xl border border-border bg-card">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={onToggle}
      >
        <div>
          <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          <p className="text-xs text-muted-foreground">
            {session.matchCount} zápasů · {session.playerCount} hráčů
          </p>
        </div>
        <span className="text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {session.matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              onError={onError}
              onSuccess={onSuccess}
            />
          ))}

          <div className="pt-2 border-t border-border">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-red-600">
                  Opravdu smazat? ELO bude přepočítáno.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="rounded bg-red-500 px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  {isPending ? "Mažu..." : "Smazat"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs text-muted-foreground"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Smazat večer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MatchRow({
  match,
  onError,
  onSuccess,
}: {
  match: AdminMatch
  onError: (msg: string) => void
  onSuccess: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [t1, setT1] = useState(String(match.totalTeam1 ?? ""))
  const [t2, setT2] = useState(String(match.totalTeam2 ?? ""))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMatchScore({
          matchId: match.id,
          totalTeam1: parseInt(t1),
          totalTeam2: parseInt(t2),
        })
        setIsEditing(false)
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  const hasResult = match.totalTeam1 !== null

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-xs text-muted-foreground">
        {match.blockNumber}.{match.matchNumber}
      </span>
      <span className="flex-1 truncate text-foreground">
        {match.team1Player1}+{match.team1Player2} vs {match.team2Player1}+{match.team2Player2}
      </span>

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={t1}
            onChange={(e) => setT1(e.target.value)}
            className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-sm"
          />
          <span>:</span>
          <input
            type="number"
            value={t2}
            onChange={(e) => setT2(e.target.value)}
            className="w-12 rounded border border-border bg-background px-1 py-0.5 text-center text-sm"
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded bg-primary px-2 py-0.5 text-xs text-white disabled:opacity-50"
          >
            {isPending ? "..." : "OK"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setT1(String(match.totalTeam1 ?? ""))
              setT2(String(match.totalTeam2 ?? ""))
            }}
            className="text-xs text-muted-foreground"
          >
            ×
          </button>
        </div>
      ) : (
        <span
          className={`cursor-pointer font-medium ${hasResult ? "text-foreground" : "text-muted-foreground"}`}
          onClick={() => hasResult && setIsEditing(true)}
        >
          {hasResult ? `${match.totalTeam1}:${match.totalTeam2}` : "—"}
        </span>
      )}
    </div>
  )
}
