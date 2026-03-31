"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { z } from "zod"

const loginSchema = z.object({
  id: z.string().min(1, "Zadej své ID").transform((v) => {
    const n = parseInt(v)
    if (isNaN(n) || n <= 0) throw new Error("ID musí být kladné číslo")
    return n
  }),
})

export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    id: formData.get("id"),
  })

  if (!parsed.success) {
    return { error: "Zadej platné herní ID" }
  }

  const id = parsed.data.id
  const email = `${id}@slashsmash.cz`
  const password = String(id)

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: "Hráč s tímto ID neexistuje" }
  }

  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
