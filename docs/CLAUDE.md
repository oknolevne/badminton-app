# CLAUDE.md – Slash Smash Badminton

## Přehled projektu

Webová aplikace pro správu badmintonových večerů. Mobile-first, česky. Skupina ~16 hráčů, 2v2 čtyřhry, ELO rating systém. Aplikace je od začátku napojená na Supabase — žádné mock data, žádný localStorage.

Viz `docs/PRD.md` pro plný kontext, `docs/ARCHITECTURE.md` pro strukturu, `docs/TECH_STACK.md` pro technologie.

---

## Příkazy

```bash
npm install                    # Instalace závislostí
npm run dev                    # Dev server (http://localhost:3000)
npm run build                  # Produkční build + TypeScript check
npm run lint                   # ESLint
npx tsx scripts/seed-auth.ts   # Vytvoří auth účty pro 21 hráčů
npx tsx scripts/import-history.ts  # Import 445 historických zápasů
```

---

## Tech stack

- **Next.js 16** (App Router) — používej Context7 pro aktuální dokumentaci
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4** — konfigurace POUZE v `src/app/globals.css` (`@theme inline`), nikdy v `tailwind.config.ts`
- **shadcn v4** (styl `base-nova`) — používá `@base-ui/react` primitiva (NE Radix UI)
- **Supabase** — databáze, auth, realtime
- **Zod** — validace formulářů a server actions
- **Recharts** — ELO grafy
- **Lucide React** — ikony

---

## Architektura — klíčová pravidla

### Server Components jako default
- Každá stránka je Server Component pokud není nutná interaktivita
- `'use client'` pouze pro: formuláře, realtime, useState, event handlery
- Data se fetchují přímo v Server Components — žádný context pro data

### Žádné mock data
- Aplikace vyžaduje Supabase připojení
- Žádný localStorage fallback
- Žádný dual-mode (mock/live)

### Supabase client pravidla
- Browser client: `src/lib/supabase/client.ts` → pouze v `'use client'` komponentách
- Server client: `src/lib/supabase/server.ts` → Server Components, Server Actions, Route Handlers
- Admin client: `src/lib/supabase/admin.ts` → pouze v serverových skriptech, nikdy na klientu
- **Nikdy neposílej service role key na klienta**

### Server Actions
- Všechny mutace (create, update, delete) jsou Server Actions v `src/app/actions/`
- Každá action volá `getAuthenticatedPlayer()` jako první krok
- Po mutaci volej `revalidatePath()` aby se data refreshla

---

## Coding standards

### TypeScript
- Vždy TypeScript, nikdy `any`
- Typy a interfaces v `src/types/`
- Preferuj `interface` před `type` pro objekty

### React & Next.js
- App Router (Next.js 16)
- Server Components jako default
- `next/image` pro obrázky, `next/link` pro navigaci
- `use(params)` API pro dynamické route params v Next.js 16

### Styling
- Pouze Tailwind CSS — žádné inline styly, žádné CSS moduly
- Tailwind v4: custom tokeny přes `@theme inline` v `globals.css`
- Mobile-first: nejdřív základní styl, pak `md:` a `lg:`

### Konvence pojmenování
- Komponenty: `PascalCase` (např. `PlayerCard.tsx`)
- Hooks: `camelCase` s prefixem `use` (např. `useRealtimeSession.ts`)
- Utility funkce: `camelCase`
- Konstanty: `SCREAMING_SNAKE_CASE`
- Stránky: `page.tsx`, layouty: `layout.tsx`
- Named exports všude — výjimka: `page.tsx` a `layout.tsx`

### Komponenty
```typescript
// ✅ Správně
interface PlayerCardProps {
  player: Player
  showElo?: boolean
}

export function PlayerCard({ player, showElo = true }: PlayerCardProps) {
  // max ~150 řádků, jedna zodpovědnost
}

// ❌ Špatně
export default function PlayerCard(props: any) {}
```

---

## ELO logika
- Vzorec v `src/lib/elo.ts` — nikdy nepočítej ELO mimo tento soubor
- ELO se počítá v DB funkci `calculate_elo_for_match()` volanou ze Server Action
- K = 100, DIVISOR = 1400, výsledek je proporcionální (ne binární)

---

## Co nedělat

- ❌ Nepřidávej závislosti bez souhlasu
- ❌ `console.log` v produkčním kódu (pouze `console.error`)
- ❌ Necommituj `.env*` soubory
- ❌ Žádné mock data ani localStorage fallbacky
- ❌ Nepoužívej `any`
- ❌ Žádné inline styly
- ❌ Nepoužívej `tailwind.config.ts` — Tailwind v4 se konfiguruje v `globals.css`
- ❌ Nepoužívej `useEffect` pro data fetching — použij Server Components
- ❌ Žádný god-object context pro správu dat (SessionContext anti-pattern)

---

## Environment proměnné

```env
NEXT_PUBLIC_SUPABASE_URL=https://dukmdhsnrvxexkeaszui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # legacy JWT klíč (ne sb_publishable_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # pouze server-side, nikdy na klientu
```

---

## Git workflow

- Jeden commit = jedna logická změna
- Po každém commitu ověř `npm run build`
- Commit message: anglicky, jasně popisující změnu
- Vždy pushni na `main` → Vercel automaticky deployuje
