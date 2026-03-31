import { redirect } from "next/navigation"
import Link from "next/link"
import { fetchCurrentPlayer } from "@/lib/supabase/queries/players"
import { ArrowLeft } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const player = await fetchCurrentPlayer()

  if (!player) redirect("/login")
  if (player.role !== "admin") redirect("/dashboard")

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Admin</h1>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  )
}
