# TECH_STACK.md – Slash Smash Badminton

## Frontend

| Technologie | Verze | Účel |
|-------------|-------|------|
| **Next.js** | 16 (App Router) | Framework, routing, Server Components |
| **React** | 19 | UI |
| **TypeScript** | 5 | Typová bezpečnost |
| **Tailwind CSS** | v4 | Styling — konfigurace v `globals.css` (`@theme inline`) |
| **shadcn v4** | base-nova styl | UI komponenty (`@base-ui/react` primitiva) |
| **@base-ui/react** | 1.3+ | Headless UI primitiva (Dialog, Button, Tabs...) |
| **Recharts** | 3+ | ELO grafy |
| **Lucide React** | latest | Ikony |
| **clsx + tailwind-merge** | latest | Utility pro className |
| **tw-animate-css** | latest | CSS animace |

## Backend

| Technologie | Verze | Účel |
|-------------|-------|------|
| **Supabase** | latest | PostgreSQL, Auth, Realtime, Storage |
| **@supabase/supabase-js** | 2+ | JS client |
| **@supabase/ssr** | 0.9+ | SSR/cookies integrace |
| **Zod** | 3+ | Validace server actions a formulářů |

## Hosting

| Služba | Tier | Účel |
|--------|------|------|
| **Vercel** | Free | Frontend hosting, CI/CD (auto-deploy z main) |
| **Supabase** | Free | DB, Auth, Realtime |

## Dev nástroje

| Nástroj | Účel |
|---------|------|
| **tsx** | Spouštění TypeScript skriptů (`seed-auth.ts`, `import-history.ts`) |
| **ESLint** | Linting |
| **TypeScript** | Type checking (`npm run build`) |

---

## Klíčová rozhodnutí

### Tailwind CSS v4
- Konfigurace přes `@theme inline` v `globals.css` — **žádný `tailwind.config.ts`**
- Custom tokeny jako utility třídy: `bg-background`, `text-muted`, `border-card`
- Dark mode: `@custom-variant dark (&:is(.dark *))`

### shadcn v4 (base-nova)
- Používá `@base-ui/react` (ne Radix UI) — modernější primitiva
- Instalace: `npx shadcn@latest add <component>`
- Konfigurace: `components.json`

### Server Components jako default
- Data fetching přímo v Server Components
- `'use client'` pouze pro interaktivní části (formuláře, realtime, useState)
- Žádný client-side data context

### Supabase Auth
- Email/password (`{username}@slashsmash.app`)
- Middleware (`src/middleware.ts`) chrání `/(app)/*` routes
- Server client pro Server Components a Actions
- Browser client pro realtime subscriptions

### Supabase Realtime
- Subscription na `match_results` změny pro live score updates
- Hook `useRealtimeSession()` — single-purpose, malý
- Refetch přes server action `refetchSession()`

---

## package.json (závislosti)

```json
{
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "@supabase/supabase-js": "^2.100.0",
    "@supabase/ssr": "^0.9.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.400.0",
    "next": "16.x",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^3.8.0",
    "shadcn": "^4.0.0",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^8",
    "eslint-config-next": "16.x",
    "tsx": "^4.0.0",
    "typescript": "^5"
  }
}
```
