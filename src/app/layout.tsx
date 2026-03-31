import type { Metadata } from "next"
import { Bebas_Neue, DM_Sans } from "next/font/google"
import { cn } from "@/lib/utils"
import "./globals.css"

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
})

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Slash Smash Badminton",
  description: "Badmintonové večery - ELO rating, rozvrhy, statistiky",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="cs" className={cn(bebasNeue.variable, dmSans.variable)}>
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
