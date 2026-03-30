import { redirect } from "next/navigation"
import { fetchCurrentPlayer } from "@/lib/supabase/queries"

export default async function ProfileRedirect() {
  const player = await fetchCurrentPlayer()
  if (!player) redirect("/login")
  redirect(`/profile/${player.id}`)
}
