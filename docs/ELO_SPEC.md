# ELO_SPEC.md – Slash Smash Badminton

## Vzorec

```
K = 100
DIVISOR = 1400

teamElo  = (player1.elo + player2.elo) / 2
expected = 1 / (1 + 10^((opponentTeamElo - myTeamElo) / DIVISOR))
actual   = myTotalPoints / (myTotalPoints + opponentTotalPoints)  ← proporcionální
delta    = Math.round(K * (actual - expected))

player1.elo += delta
player2.elo += delta
```

Oba hráči v týmu dostávají **stejnou** deltu.

---

## Příklad

**Zápas:** Kony (1845) + Novo (1502) vs Martin (1708) + Aik (1590), výsledek 42:37

1. Team ELO: A = 1673.5, B = 1649
2. Expected A: `1 / (1 + 10^((1649 - 1673.5) / 1400))` = 0.5101
3. Actual A: `42 / (42+37)` = 0.5316
4. Delta: `Math.round(100 × (0.5316 - 0.5101))` = **+2**
5. Kony: 1847, Novo: 1504, Martin: 1706, Aik: 1588

---

## Parametry

| Parametr | Hodnota |
|----------|---------|
| K faktor | 100 |
| Dělitel | 1400 |
| Výchozí ELO | 1500 |
| Zaokrouhlení | `Math.round()` |

---

## Pravidla

**Tréninkové zápasy** (`is_training = true`):
- Vznikají když `playerCount % 4 === 2`
- ELO se nepočítá, žádný záznam v `elo_history`

**Remíza:**
- `actual = 0.5` — delta závisí na rozdílu ELO týmů
- Silnější tým ztrácí, slabší získává

**Více setů:**
- Sčítají se body přes všechny sety: `total = sum(set.team1)`
- Záleží jen na celkovém poměru, ne na počtu vyhraných setů

---

## Implementace

### Frontend (`src/lib/elo.ts`)
Čistá matematika — pouze pro zobrazení a preview, nepočítá pro DB.

```typescript
export const K = 100
export const DIVISOR = 1400

export function calculateTeamElo(p1: number, p2: number): number {
  return (p1 + p2) / 2
}

export function calculateExpected(myElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - myElo) / DIVISOR))
}

export function calculateActual(myPoints: number, opponentPoints: number): number {
  return myPoints / (myPoints + opponentPoints)
}

export function calculateDelta(expected: number, actual: number): number {
  return Math.round(K * (actual - expected))
}
```

### Backend (Supabase DB funkce)
`calculate_elo_for_match(p_match_id uuid)` — viz `supabase/migrations/001_full_schema.sql`

- Volá se ze Server Action `processMatchElo(matchId)` po uložení výsledku
- Advisory lock zabraňuje race conditions při souběžném zápisu
- Transakční — buď se přepočítá vše nebo nic

---

## Zpětný přepočet (admin)

### Kdy
Admin edituje výsledek zpětně.

### Algoritmus
1. Načti editovaný zápas a jeho timestamp
2. Resetuj ELO dotčených hráčů na stav před editovaným zápasem
3. Přepočítej ELO sekvenčně od editovaného zápasu chronologicky dál
4. Aktualizuj `elo_history` a `players.elo`

### Implementace
Server Action `recalculateEloFromMatch(matchId)` v `src/app/actions/elo.ts`.

---

## Historický import

445 zápasů z `Bedas_Hry.xlsx` bylo importováno skriptem `scripts/import-history.ts`.

ELO bylo přepočítáno sekvenčně od nejstaršího záznamu. Výsledné hodnoty odpovídají tabulce hráčů (Kony=1845, Martin=1708 atd.).
