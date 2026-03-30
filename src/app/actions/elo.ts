"use server"

import { createClient } from "@/lib/supabase/server"

export async function processMatchElo(matchId: string) {
  const supabase = await createClient()

  const { error } = await supabase.rpc("calculate_elo_for_match", {
    p_match_id: matchId,
  })

  if (error) {
    console.error("ELO calculation failed:", error.message)
    throw new Error("Chyba při výpočtu ELO")
  }
}
