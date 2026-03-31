import { redirect } from "next/navigation"
import { createClient, getAuthUser } from "@/lib/supabase/server"

export default async function ProfileRedirect() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const supabase = await createClient()
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!player) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Profil nenalezen
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tvůj účet není propojen s žádným hráčem. Kontaktuj admina.
        </p>
      </div>
    )
  }

  redirect(`/profile/${player.id}`)
}
