# FEATURES.md – Slash Smash Badminton

## Přehled

| ID | Feature | Priorita | Status |
|----|---------|----------|--------|
| F01 | Autentizace | Kritická | MVP |
| F02 | Dashboard | Vysoká | MVP |
| F03 | Vytvoření večera | Vysoká | MVP |
| F04 | Rozvrh večera | Vysoká | MVP |
| F05 | Zápis výsledků | Vysoká | MVP |
| F06 | ELO výpočet | Vysoká | MVP |
| F07 | Žebříček | Střední | MVP |
| F08 | Profil hráče | Střední | MVP |
| F09 | Realtime sync | Střední | MVP |
| F10 | Admin panel | Nízká | Fáze 2 |
| F11 | Audit log | Nízká | Fáze 2 |

---

## F01 – Autentizace

**Stránky:** `/login`
**Server Actions:** `src/app/actions/auth.ts`

Flow:
1. Uživatel zadá username + heslo
2. Server Action: `login({username}@slashsmash.app, heslo)`
3. Supabase Auth nastaví cookie
4. Redirect → `/dashboard`

Middleware (`src/middleware.ts`):
- `/(app)/*` routes → vyžaduje přihlášení
- `/login` → přihlášeného přesměruje na `/dashboard`

Komponenty:
- `LoginForm` — `'use client'`, `useActionState`

---

## F02 – Dashboard

**Stránka:** `/dashboard` (Server Component)
**Data:** `fetchCurrentPlayer()`, `fetchPlayerStats()`, `fetchEloChanges()`, `fetchSessions(3)`, `fetchPlayerRank()`

Obsah:
- **ELO hero karta** — velké číslo ELO + poslední delta badge
- **Stat karty** — Zápasy, Win Rate, Pořadí
- **Aktivní večer** — pokud existuje, odkaz + "Pokračovat"
- **Nový večer** — CTA tlačítko
- **Poslední zápasy** — 3 nejnovější výsledky

---

## F03 – Vytvoření večera

**Stránky:** `/session/new`
**Server Action:** `createSession(playerIds[])`
**Komponenty:** `NewSessionForm` (client), `PlayerSelector` (client)

Flow:
1. Server Component načte všechny hráče
2. `PlayerSelector` — grid hráčů s toggle výběrem
3. Validace počtu:
   - `< 4` → disabled
   - `% 4 === 0` → OK
   - `% 4 === 2` → OK + info "2 hráči hrají trénink"
   - `% 4 === 1 nebo 3` → disabled
4. "Generovat rozvrh" → `createSession()` Server Action
5. Server Action: `pairing.ts` → `create_session_with_matches()` RPC
6. Redirect → `/session/{id}`

---

## F04 – Rozvrh večera

**Stránka:** `/session/[id]`
**Server Component:** `fetchSessionById(id)` → `<SessionDetailClient>`
**Client Component:** `SessionDetailClient` (realtime, score input)

Obsah:
- Datum, počet hráčů, countdown timer
- Bloky (3) s kartami zápasů
- Každá karta: Tým A vs Tým B + výsledek nebo "Zadat skóre"
- "Smazat večer" → `DeleteSessionDialog` → `deleteSession()`

Realtime:
- `useRealtimeSession(sessionId)` — subscribe na `match_results` změny
- `refetchSession(id)` Server Action po každé změně

---

## F05 – Zápis výsledků

**Komponenty:** `ScoreInput` (client), `SetScore` (client)
**Server Action:** `updateMatchResult(sessionId, matchId, sets[])`

Flow:
1. Klik na zápas → otevře `ScoreInput` (Bottom Sheet)
2. Zobrazí jména týmů (vlevo tým1, vpravo tým2)
3. Set 1: 2 inputy (auto-select při focusu)
4. Set 2: stejné
5. "Přidat set" → dynamický přidání setu
6. Live součet + zvýraznění vítěze
7. "Uložit" → `updateMatchResult()` → `processMatchElo()`
8. Sheet se zavře, karta zápasu zobrazí výsledek
9. Tlačítko "Upravit" → znovu otevře s předvyplněnými daty

Validace:
- Každý set: min 0, max 99
- Alespoň jeden tým musí mít ≥ 11 bodů v setu

---

## F06 – ELO výpočet

**Server Action:** `processMatchElo(matchId)` v `src/app/actions/elo.ts`
**DB funkce:** `calculate_elo_for_match(match_id)`

Volá se automaticky po každém `updateMatchResult()`.

Viz `docs/ELO_SPEC.md` pro kompletní specifikaci.

---

## F07 – Žebříček

**Stránka:** `/leaderboard` (Server Component)
**Data:** `fetchPlayers()`, `fetchAllEloChanges()`

Obsah:
- Seřazení podle ELO (sestupně)
- Každý řádek: pořadí, avatar, jméno, ELO, delta badge
- Klik na hráče → `/profile/{id}`

---

## F08 – Profil hráče

**Stránky:** `/profile` (redirect), `/profile/[id]` (Server Component)
**Data:** `fetchPlayer(id)`, `fetchPlayerStats(id)`, `fetchEloHistory(id)`

Obsah:
- Avatar (iniciály), jméno, ELO
- Stat karty: Zápasy, Výhry, Prohry, Win Rate
- ELO graf — liniový (Recharts), celá historie
- Nejčastější partner, nejlepší partner, nejhorší soupeř

---

## F09 – Realtime sync

**Hook:** `src/hooks/useRealtimeSession.ts`

```typescript
// Subscribe na match_results změny pro danou session
// Na změnu: zavolá refetchSession() Server Action
// Vrátí aktuální session state
```

Supabase channels zvládají reconnect automaticky.

---

## F10 – Admin panel (Fáze 2)

**Stránka:** `/admin` (pouze role=admin)

Sekce:
- Hráči: CRUD, reset hesla
- Výsledky: zpětná editace + přepočet ELO
- Audit log: přehled všech akcí

---

## F11 – Audit log (Fáze 2)

Automatické logování:
- Přihlášení/odhlášení
- Vytvoření/smazání večera
- Zápis/editace výsledku
- Admin akce

Zobrazení: tabulka s filtry (pouze admin).
