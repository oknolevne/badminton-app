"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PlayerSelector } from "./PlayerSelector"
import { validatePlayerCount } from "@/lib/pairing"
import { createSession } from "@/app/actions/session"
import { Button } from "@/components/ui/button"
import type { Player } from "@/types"

interface NewSessionFormProps {
  players: Player[]
}

export function NewSessionForm({ players }: NewSessionFormProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const validation = validatePlayerCount(selectedIds.length)

  function handleToggle(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setError(null)
  }

  function handleSelectAll() {
    if (selectedIds.length === players.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(players.map((p) => p.id))
    }
  }

  function handleSubmit() {
    if (!validation.valid) return

    startTransition(async () => {
      try {
        const { sessionId } = await createSession(selectedIds)
        router.push(`/session/${sessionId}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při vytváření večera")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{validation.message}</p>
        <Button variant="ghost" size="sm" onClick={handleSelectAll}>
          {selectedIds.length === players.length ? "Zrušit vše" : "Vybrat vše"}
        </Button>
      </div>

      <PlayerSelector
        players={players}
        selectedIds={selectedIds}
        onToggle={handleToggle}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        disabled={!validation.valid || isPending}
        onClick={handleSubmit}
      >
        {isPending ? "Generuji rozvrh..." : "Generovat rozvrh"}
      </Button>
    </div>
  )
}
