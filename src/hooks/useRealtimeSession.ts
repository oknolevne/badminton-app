"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useRealtimeSession(
  sessionId: string,
  onMatchUpdated?: (matchId: string) => void
) {
  const router = useRouter()
  const supabase = createClient()
  const callbackRef = useRef(onMatchUpdated)
  callbackRef.current = onMatchUpdated

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown> | null
          const matchId = newData?.match_id as string | undefined
          if (matchId && callbackRef.current) {
            callbackRef.current(matchId)
          }
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, router, supabase])
}
