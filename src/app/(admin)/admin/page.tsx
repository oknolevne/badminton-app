import Link from "next/link"
import { Users, Calendar, FileText } from "lucide-react"

const sections = [
  { href: "/admin/players", label: "Hráči", icon: Users, description: "Přidat, upravit, deaktivovat" },
  { href: "/admin/sessions", label: "Večery", icon: Calendar, description: "Skóre, smazání" },
  { href: "/admin/audit", label: "Audit log", icon: FileText, description: "Historie změn" },
]

export default function AdminPage() {
  return (
    <div className="space-y-3">
      {sections.map(({ href, label, icon: Icon, description }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <Icon className="h-6 w-6 text-primary" />
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
