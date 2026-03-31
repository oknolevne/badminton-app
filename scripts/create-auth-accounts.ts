/**
 * create-auth-accounts.ts — Creates Supabase Auth accounts for all players
 * using ID-based login: email = {id}@slashsmash.cz, password = {id}
 *
 * Usage: npx tsx scripts/create-auth-accounts.ts
 *
 * Idempotent: skips players whose email already exists, updates auth_user_id link.
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

async function main() {
  // Fetch all players from DB
  const { data: players, error: fetchError } = await supabase
    .from("players")
    .select("id, display_name")
    .order("id")

  if (fetchError || !players) {
    console.error("Failed to fetch players:", fetchError?.message)
    process.exit(1)
  }

  console.log(`Processing ${players.length} players...\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  // Fetch all existing auth users once
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailToUser = new Map<string, string>()
  if (existingUsers?.users) {
    for (const u of existingUsers.users) {
      if (u.email) emailToUser.set(u.email, u.id)
    }
  }

  for (const player of players) {
    const email = `${player.id}@slashsmash.cz`
    const password = String(player.id)

    let authUserId: string

    const existingId = emailToUser.get(email)
    if (existingId) {
      console.log(`  ⏭  #${player.id} ${player.display_name} — already exists`)
      authUserId = existingId
      skipped++
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (error || !data.user) {
        console.error(`  ✗  #${player.id} ${player.display_name} — ${error?.message}`)
        errors++
        continue
      }

      authUserId = data.user.id
      console.log(`  ✓  #${player.id} ${player.display_name} — created`)
      created++
    }

    // Link auth_user_id to players table
    const { error: updateError } = await supabase
      .from("players")
      .update({ auth_user_id: authUserId })
      .eq("id", player.id)

    if (updateError) {
      console.error(`  ✗  #${player.id} — failed to link: ${updateError.message}`)
      errors++
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${errors} errors`)
}

main().catch(console.error)
