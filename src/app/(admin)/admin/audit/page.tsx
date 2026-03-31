import { createClient } from "@/lib/supabase/server"

const ACTION_LABELS: Record<string, string> = {
  player_created: "Přidán hráč",
  player_updated: "Upraven hráč",
  player_toggled_active: "Aktivace hráče",
  match_score_updated: "Upraveno skóre",
  session_deleted: "Smazán večer",
  elo_recalculated: "Přepočet ELO",
}

export default async function AdminAuditPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_id, old_data, new_data, created_at, players(display_name)")
    .order("created_at", { ascending: false })
    .limit(100)

  const entries = data ?? []

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Žádné záznamy.</p>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Audit log ({entries.length})
      </h3>

      {entries.map((entry) => {
        const adminName = (entry.players as unknown as { display_name: string })?.display_name ?? "?"
        const date = new Date(entry.created_at).toLocaleString("cs-CZ", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })

        return (
          <div
            key={entry.id}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </p>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {adminName}
              {entry.entity_type && ` · ${entry.entity_type}`}
              {entry.entity_id && ` #${entry.entity_id.substring(0, 8)}`}
            </p>
            {(entry.old_data || entry.new_data) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.old_data && (
                  <span>Před: {JSON.stringify(entry.old_data)} </span>
                )}
                {entry.new_data && (
                  <span>Po: {JSON.stringify(entry.new_data)}</span>
                )}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
