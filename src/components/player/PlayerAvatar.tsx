import { cn, getInitials } from "@/lib/utils"

interface PlayerAvatarProps {
  name: string
  playerId: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PlayerAvatar({
  name,
  size = "md",
  className,
}: PlayerAvatarProps) {
  const initials = getInitials(name)

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white bg-primary",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
}
