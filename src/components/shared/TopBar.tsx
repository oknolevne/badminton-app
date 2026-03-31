import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border-subtle bg-background-nav px-4">
      <h1 className="font-display text-2xl tracking-wide">
        <span className="text-foreground">SLASH</span>{" "}
        <span className="text-primary">SMASH</span>
      </h1>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
          Odhlásit
        </Button>
      </form>
    </header>
  )
}
