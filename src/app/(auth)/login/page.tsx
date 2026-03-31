import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-5xl tracking-wide">
            <span className="text-foreground">SLASH</span>{" "}
            <span className="text-primary">SMASH</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Zadej své herní ID
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
