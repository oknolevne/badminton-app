import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TopBar } from "@/components/shared/TopBar"
import { BottomNav } from "@/components/shared/BottomNav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check for active session
  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav activeSessionId={activeSession?.id ?? null} />
    </div>
  )
}
