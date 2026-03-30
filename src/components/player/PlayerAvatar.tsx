import { cn, getInitials } from "@/lib/utils"

const COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
] as const

interface PlayerAvatarProps {
  name: string
  playerId: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PlayerAvatar({
  name,
  playerId,
  size = "md",
  className,
}: PlayerAvatarProps) {
  const colorIndex = playerId % COLORS.length
  const initials = getInitials(name)

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        COLORS[colorIndex],
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
