"use client"

import { useState, useEffect } from "react"

interface SessionTimerProps {
  closesAt: string
}

export function SessionTimer({ closesAt }: SessionTimerProps) {
  const [remaining, setRemaining] = useState("")

  useEffect(() => {
    function update() {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining("Vypršelo")
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setRemaining(`${hours}h ${minutes}m`)
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [closesAt])

  return (
    <span className="text-xs text-muted-foreground">
      Zbývá: {remaining}
    </span>
  )
}
