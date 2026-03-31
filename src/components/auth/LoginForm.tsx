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
        <label htmlFor="id" className="text-sm text-text-label">
          Zadej své ID
        </label>
        <Input
          id="id"
          name="id"
          type="number"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="např. 24"
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
