"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { z } from "zod"

const loginSchema = z.object({
  username: z.string().min(1, "Zadej uživatelské jméno"),
  password: z.string().min(1, "Zadej heslo"),
})

export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { username, password } = parsed.data
  const email = `${username.toLowerCase()}@slashsmash.app`

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: "Nesprávné jméno nebo heslo" }
  }

  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
