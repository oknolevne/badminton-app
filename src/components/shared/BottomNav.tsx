"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Trophy, User } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Domů", icon: Home },
  { href: "/session/new", label: "Večer", icon: Calendar },
  { href: "/leaderboard", label: "Žebříček", icon: Trophy },
  { href: "/profile", label: "Profil", icon: User },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border-subtle bg-background-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || pathname.startsWith(href + "/")

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
