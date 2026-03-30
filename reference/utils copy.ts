import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatElo(elo: number): string {
  return Math.round(elo).toString()
}

export function formatEloDelta(delta: number): string {
  if (delta > 0) return `+${Math.round(delta)}`
  return Math.round(delta).toString()
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
