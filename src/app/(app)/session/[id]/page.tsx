import { use } from "react"
import { notFound } from "next/navigation"
import { fetchSessionById } from "@/lib/supabase/queries"
import { SessionDetailClient } from "@/components/session/SessionDetailClient"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const session = await fetchSessionById(id)

  if (!session) notFound()

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h2 className="mb-4 font-display text-3xl text-foreground">VEČER</h2>
      <SessionDetailClient session={session} />
    </div>
  )
}
