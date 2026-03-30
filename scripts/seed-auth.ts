/**
 * seed-auth.ts — Creates Supabase Auth accounts for all 21 players
 * and links their auth_user_id in the players table.
 *
 * Usage: npx tsx scripts/seed-auth.ts
 *
 * Idempotent: skips players that already have an auth account.
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

config({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = "slashsmash2026"

const PLAYERS = [
  { id: 61, username: "martin" },
  { id: 11, username: "jindra" },
  { id: 22, username: "terka" },
  { id: 15, username: "anicka" },
  { id: 88, username: "honza" },
  { id: 77, username: "novo" },
  { id: 19, username: "fanda" },
  { id: 17, username: "klara" },
  { id: 24, username: "kony" },
  { id: 10, username: "aik" },
  { id: 99, username: "doki" },
  { id: 42, username: "stroblik" },
  { id: 13, username: "bart" },
  { id: 69, username: "jindrad" },
  { id: 78, username: "rutak" },
  { id: 26, username: "majda" },
  { id: 35, username: "hena" },
  { id: 16, username: "dan" },
  { id: 63, username: "tyna" },
  { id: 70, username: "adam" },
  { id: 12, username: "andrej" },
]

async function main() {
  console.log(`Seeding ${PLAYERS.length} auth accounts...`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const player of PLAYERS) {
    const email = `${player.username}@slashsmash.app`

    // Check if auth account already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users.find((u) => u.email === email)

    let authUserId: string

    if (existing) {
      console.log(`  ⏭  ${player.username} — already exists`)
      authUserId = existing.id
      skipped++
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      })

      if (error || !data.user) {
        console.error(`  ✗  ${player.username} — ${error?.message}`)
        errors++
        continue
      }

      authUserId = data.user.id
      console.log(`  ✓  ${player.username} — created`)
      created++
    }

    // Link auth_user_id to players table
    const { error: updateError } = await supabase
      .from("players")
      .update({ auth_user_id: authUserId })
      .eq("id", player.id)

    if (updateError) {
      console.error(`  ✗  ${player.username} — failed to link: ${updateError.message}`)
      errors++
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${errors} errors`)
}

main().catch(console.error)
