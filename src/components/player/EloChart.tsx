"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { EloHistoryEntry } from "@/types"

interface EloChartProps {
  history: EloHistoryEntry[]
}

export function EloChart({ history }: EloChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Žádná data</p>
      </div>
    )
  }

  const data = history.map((entry, index) => ({
    index,
    elo: entry.elo,
    date: new Date(entry.date).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "short",
    }),
  }))

  return (
    <div className="h-48 w-full rounded-xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={["dataMin - 20", "dataMax + 20"]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Line
            type="monotone"
            dataKey="elo"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
