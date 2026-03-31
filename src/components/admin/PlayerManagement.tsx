"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addPlayer, updatePlayer, togglePlayerActive } from "@/app/actions/admin"
import type { AdminPlayer } from "@/app/(admin)/admin/players/page"

export function PlayerManagement({ players }: { players: AdminPlayer[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <AddPlayerForm
        onError={setError}
        onSuccess={() => {
          setError(null)
          router.refresh()
        }}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Hráči ({players.length})
        </h3>
        <div className="space-y-2">
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              onError={setError}
              onSuccess={() => {
                setError(null)
                router.refresh()
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AddPlayerForm({
  onError,
  onSuccess,
}: {
  onError: (msg: string) => void
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [id, setId] = useState("")
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [elo, setElo] = useState("1500")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await addPlayer({
          id: parseInt(id),
          username,
          name,
          elo: parseInt(elo),
        })
        setId("")
        setUsername("")
        setName("")
        setElo("1500")
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">Přidat hráče</h3>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Jméno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="ELO"
          value={elo}
          onChange={(e) => setElo(e.target.value)}
          required
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Přidávám..." : "Přidat"}
      </button>
    </form>
  )
}

function PlayerRow({
  player,
  onError,
  onSuccess,
}: {
  player: AdminPlayer
  onError: (msg: string) => void
  onSuccess: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(player.displayName)
  const [elo, setElo] = useState(String(player.elo))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        const updates: { id: number; name?: string; elo?: number } = { id: player.id }
        if (name !== player.displayName) updates.name = name
        if (parseInt(elo) !== player.elo) updates.elo = parseInt(elo)

        if (updates.name || updates.elo) {
          await updatePlayer(updates)
        }
        setIsEditing(false)
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  function handleToggle() {
    startTransition(async () => {
      try {
        await togglePlayerActive(player.id)
        onSuccess()
      } catch (err) {
        onError(err instanceof Error ? err.message : "Chyba")
      }
    })
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 ${
        !player.isActive ? "opacity-50" : ""
      }`}
    >
      <span className="w-8 text-xs text-muted-foreground">#{player.id}</span>

      {isEditing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-24 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <input
            type="number"
            value={elo}
            onChange={(e) => setElo(e.target.value)}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            {isPending ? "..." : "Uložit"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setName(player.displayName)
              setElo(String(player.elo))
            }}
            className="text-xs text-muted-foreground"
          >
            Zrušit
          </button>
        </div>
      ) : (
        <>
          <span
            className="flex-1 cursor-pointer text-sm text-foreground hover:text-primary"
            onClick={() => setIsEditing(true)}
          >
            {player.displayName}
          </span>
          <span className="text-sm font-medium text-primary">{player.elo}</span>
        </>
      )}

      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
          player.isActive
            ? "bg-red-100 text-red-600"
            : "bg-green-100 text-green-600"
        }`}
      >
        {player.isActive ? "Deaktivovat" : "Aktivovat"}
      </button>
    </div>
  )
}
