"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteSession } from "@/app/actions/session"
import { Trash2 } from "lucide-react"

interface DeleteSessionDialogProps {
  sessionId: string
}

export function DeleteSessionDialog({ sessionId }: DeleteSessionDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSession(sessionId)
        router.push("/dashboard")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při mazání")
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive" />}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Smazat večer
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat večer?</AlertDialogTitle>
          <AlertDialogDescription>
            Tato akce smaže všechny zápasy a výsledky tohoto večera. Nelze ji vrátit zpět.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "Mažu..." : "Smazat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
