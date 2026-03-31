"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Trophy, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeSessionId?: string | null
}

export function BottomNav({ activeSessionId }: BottomNavProps) {
  const pathname = usePathname()

  const sessionHref = activeSessionId
    ? `/session/${activeSessionId}`
    : "/session/new"

  const navItems = [
    { href: "/dashboard", label: "Domů", icon: Home },
    { href: sessionHref, label: "Večer", icon: Calendar },
    { href: "/leaderboard", label: "Žebříček", icon: Trophy },
    { href: "/profile", label: "Profil", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#c8c8c8] bg-background-nav">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          pathname.startsWith(href + "/") ||
          (label === "Večer" && pathname.startsWith("/session"))

        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "relative flex flex-col items-center gap-1 px-3 py-2 text-xs text-foreground transition-opacity",
              isActive ? "opacity-100" : "opacity-30 hover:opacity-60"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
            {isActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
