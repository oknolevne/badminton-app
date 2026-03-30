# ARCHITECTURE.md – Slash Smash Badminton

## Přehled architektury

```
Vercel (Next.js 16 App Router)
    │
    ├── Server Components (data fetching)
    │       └── src/lib/supabase/server.ts
    │
    ├── Server Actions (mutace)
    │       └── src/app/actions/
    │
    ├── Client Components (interaktivita, realtime)
    │       └── src/lib/supabase/client.ts
    │
    └── Middleware (auth guard)
            └── src/middleware.ts
                    │
                    ▼
            Supabase (dukmdhsnrvxexkeaszui)
                ├── PostgreSQL
                ├── Auth
                ├── Realtime
                └── Storage (avatary)
```

---

## Adresářová struktura

```
badminton-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonty, dark mode class)
│   │   ├── page.tsx                # Redirect → /dashboard
│   │   ├── globals.css             # Tailwind v4 @theme inline, design tokeny
│   │   ├── actions/
│   │   │   ├── auth.ts             # login(), logout()
│   │   │   ├── session.ts          # createSession(), updateMatchResult(), finishSession(), deleteSession(), refetchSession()
│   │   │   └── elo.ts              # processMatchElo(), recalculateEloFromMatch()
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx        # Login stránka (Server Component)
│   │   └── (app)/
│   │       ├── layout.tsx          # Auth guard + TopBar + BottomNav (Server Component)
│   │       ├── dashboard/
│   │       │   └── page.tsx        # Server Component
│   │       ├── session/
│   │       │   ├── new/
│   │       │   │   ├── page.tsx               # Server Component (fetchPlayers)
│   │       │   │   └── NewSessionForm.tsx      # Client Component
│   │       │   └── [id]/
│   │       │       ├── page.tsx               # Server Component (fetchSessionById)
│   │       │       └── SessionDetailClient.tsx # Client Component (realtime)
│   │       ├── leaderboard/
│   │       │   └── page.tsx        # Server Component
│   │       └── profile/
│   │           ├── page.tsx        # Server redirect
│   │           └── [id]/
│   │               └── page.tsx    # Server Component
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn v4 (base-nova, @base-ui/react)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── alert-dialog.tsx
│   │   ├── auth/
│   │   │   └── LoginForm.tsx       # 'use client'
│   │   ├── player/
│   │   │   ├── PlayerAvatar.tsx    # Server Component
│   │   │   ├── PlayerChip.tsx      # 'use client' (toggle)
│   │   │   ├── PlayerProfile.tsx   # Server Component
│   │   │   └── EloChart.tsx        # 'use client' (Recharts)
│   │   ├── session/
│   │   │   ├── PlayerSelector.tsx  # 'use client'
│   │   │   ├── ScheduleView.tsx    # 'use client'
│   │   │   ├── ScheduleBlock.tsx   # Server Component
│   │   │   ├── MatchCard.tsx       # Server Component
│   │   │   ├── SessionTimer.tsx    # 'use client'
│   │   │   └── DeleteSessionDialog.tsx  # 'use client'
│   │   ├── score/
│   │   │   ├── ScoreInput.tsx      # 'use client'
│   │   │   └── SetScore.tsx        # 'use client'
│   │   ├── leaderboard/
│   │   │   ├── Leaderboard.tsx     # Server Component
│   │   │   ├── LeaderboardRow.tsx  # Server Component
│   │   │   └── EloChange.tsx       # Server Component
│   │   └── shared/
│   │       ├── TopBar.tsx          # Server Component
│   │       ├── BottomNav.tsx       # 'use client' (usePathname)
│   │       └── StatCard.tsx        # Server Component
│   │
│   ├── hooks/
│   │   └── useRealtimeSession.ts   # 'use client' — realtime subscription
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # createBrowserClient — pro 'use client'
│   │   │   ├── server.ts           # createServerClient — pro Server Components/Actions
│   │   │   ├── admin.ts            # service role — pouze skripty
│   │   │   └── queries/
│   │   │       ├── players.ts      # fetchPlayers, fetchPlayer, fetchCurrentPlayer
│   │   │       ├── sessions.ts     # fetchSessions, fetchSessionById
│   │   │       ├── matches.ts      # upsertMatchResult
│   │   │       ├── stats.ts        # fetchPlayerStats, fetchEloHistory, fetchAllPlayerStats, fetchPlayerRank
│   │   │       └── index.ts        # re-export
│   │   ├── elo.ts                  # Čistý ELO výpočet (K=100, DIVISOR=1400)
│   │   ├── pairing.ts              # Snake-draft párování, generování rozvrhu
│   │   └── utils.ts                # cn(), formatElo(), formatEloDelta(), getInitials()
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── player.ts               # Player, PlayerStats, EloHistoryEntry, PartnerStat
│   │   ├── session.ts              # Session, MatchBlock
│   │   └── match.ts                # Match, MatchResult
│   │
│   └── middleware.ts               # Auth guard (Next.js middleware)
│
├── scripts/
│   ├── seed-auth.ts                # Vytvoří auth účty pro 21 hráčů
│   └── import-history.ts           # Import 445 historických zápasů + ELO přepočet
│
├── supabase/
│   └── migrations/
│       ├── 001_full_schema.sql     # Tabulky, indexy, RLS, seed hráčů
│       ├── 002_create_session_function.sql  # RPC create_session_with_matches
│       └── 003_audit_log.sql       # Audit log tabulka
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DATA_MODEL.md
│   ├── ELO_SPEC.md
│   └── FEATURES.md
│
├── CLAUDE.md
├── .env.local                      # Nikdy necommitovat
├── .env.example
├── components.json                 # shadcn konfigurace
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Data flow

### Čtení dat (Server Component)
```
Browser request
  → Next.js Server Component
  → src/lib/supabase/server.ts (createServerClient)
  → src/lib/supabase/queries/*.ts
  → Supabase PostgreSQL
  → HTML response
```

### Mutace (Server Action)
```
User action (form submit / button)
  → Server Action (src/app/actions/*.ts)
  → getAuthenticatedPlayer() — ověří auth
  → src/lib/supabase/server.ts
  → Supabase PostgreSQL
  → revalidatePath() — refreshne cache
  → UI update
```

### Realtime (score updates)
```
Jiný hráč uloží výsledek
  → Supabase Realtime broadcast
  → useRealtimeSession() hook
  → refetchSession() Server Action
  → SessionDetailClient state update
  → UI update
```

---

## Databázové schéma (přehled)

| Tabulka | Popis |
|---------|-------|
| `players` | 21 hráčů, integer ID, ELO, auth_user_id |
| `sessions` | Večery (active/finished), 24h closes_at |
| `session_players` | M:N hráči ↔ session |
| `matches` | Zápasy v blocích, 4 FK na hráče |
| `match_results` | JSONB sety, total_team1/2, submitted_by |
| `elo_history` | Změny ELO po každém zápase |
| `audit_log` | Log akcí (admin only) |

Viz `docs/DATA_MODEL.md` pro kompletní SQL.

---

## Navigace (mobile-first)

```
Bottom Navigation:
[🏠 Domů]  [📅 Večer]  [🏆 Žebříček]  [👤 Profil]
```

- Domů → `/dashboard`
- Večer → aktivní session nebo `/session/new`
- Žebříček → `/leaderboard`
- Profil → `/profile` (redirect na `/profile/{id}`)

---

## Auth flow

```
/login → LoginForm → login() Server Action
  → supabase.auth.signInWithPassword({email: username@slashsmash.app})
  → cookie set → redirect /dashboard

Middleware (src/middleware.ts):
  → Každý request na /(app)/* → ověří Supabase session cookie
  → Nepřihlášen → redirect /login
  → Přihlášen na /login → redirect /dashboard
```
