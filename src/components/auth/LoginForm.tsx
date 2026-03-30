"use client"

import { useActionState } from "react"
import { login, type LoginState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm text-text-label">
          Uživatelské jméno
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          required
          placeholder="např. martin"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm text-text-label">
          Heslo
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Přihlašuji..." : "Přihlásit se"}
      </Button>
    </form>
  )
}
