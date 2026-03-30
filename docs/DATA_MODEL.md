# DATA_MODEL.md – Slash Smash Badminton

## TypeScript interfaces

### `src/types/player.ts`

```typescript
export interface Player {
  id: number              // Integer ID z Excelu (Martin=61, Kony=24...)
  username: string        // Přihlašovací jméno
  displayName: string     // Zobrazované jméno
  avatarUrl: string | null
  elo: number
  role: 'player' | 'admin'
  createdAt: string       // ISO datetime
}

export interface PlayerStats {
  playerId: number
  totalMatches: number
  wins: number
  losses: number
  winRate: number         // 0–100
  eloHistory: EloHistoryEntry[]
  frequentPartner: PartnerStat | null
  bestPartner: PartnerStat | null
  worstOpponent: PartnerStat | null
}

export interface EloHistoryEntry {
  date: string            // ISO date
  elo: number
  delta: number
  matchId: string
}

export interface PartnerStat {
  playerId: number
  playerName: string
  count: number           // Počet společných zápasů
  winRate: number         // 0–100
}
```

### `src/types/session.ts`

```typescript
export interface Session {
  id: string              // UUID
  date: string            // ISO date "2026-03-26"
  createdBy: number       // Player ID
  status: 'active' | 'finished'
  closesAt: string        // ISO datetime (created_at + 24h)
  players: Player[]
  blocks: MatchBlock[]
}

export interface MatchBlock {
  blockNumber: number
  matches: Match[]
}
```

### `src/types/match.ts`

```typescript
export interface Match {
  id: string              // UUID
  sessionId: string
  blockNumber: number
  matchNumber: number
  team1: [Player, Player]
  team2: [Player, Player]
  isTraining: boolean
  result: MatchResult | null
}

export interface MatchResult {
  sets: { team1: number; team2: number }[]
  totalTeam1: number
  totalTeam2: number
  submittedBy: number     // Player ID
  submittedAt: string     // ISO datetime
}
```

---

## SQL schéma

### `players`

```sql
CREATE TABLE players (
  id            integer PRIMARY KEY,
  auth_user_id  uuid UNIQUE,
  username      text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  avatar_url    text,
  elo           integer NOT NULL DEFAULT 1500,
  role          text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**Seed data (21 hráčů):**

| id | username | display_name | elo | role |
|----|----------|-------------|-----|------|
| 61 | martin | Martin | 1708 | admin |
| 11 | jindra | Jindra | 1674 | player |
| 22 | terka | Terka | 1533 | player |
| 15 | anicka | Anicka | 1449 | player |
| 88 | honza | Honza | 1624 | player |
| 77 | novo | Novo | 1502 | player |
| 19 | fanda | Fanda | 1476 | player |
| 17 | klara | Klara | 1796 | player |
| 24 | kony | Kony | 1845 | player |
| 10 | aik | Aik | 1590 | player |
| 99 | doki | Doki | 1460 | player |
| 42 | stroblik | Stroblik | 1388 | player |
| 13 | bart | Bart | 1538 | player |
| 69 | jindrad | Jindrad | 1398 | player |
| 78 | rutak | Rutak | 1434 | player |
| 26 | majda | Majda | 1193 | player |
| 35 | hena | Heňa | 1265 | player |
| 16 | dan | Dan | 1432 | player |
| 63 | tyna | Tyna | 1497 | player |
| 70 | adam | Adam | 1567 | player |
| 12 | andrej | Andrej | 1392 | player |

---

### `sessions`

```sql
CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_by  integer NOT NULL REFERENCES players(id),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  closes_at   timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
```

---

### `session_players`

```sql
CREATE TABLE session_players (
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id   integer NOT NULL REFERENCES players(id),
  is_training boolean NOT NULL DEFAULT false,
  PRIMARY KEY (session_id, player_id)
);
```

---

### `matches`

```sql
CREATE TABLE matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  block_number    integer NOT NULL,
  match_number    integer NOT NULL,
  team1_player1   integer NOT NULL REFERENCES players(id),
  team1_player2   integer NOT NULL REFERENCES players(id),
  team2_player1   integer NOT NULL REFERENCES players(id),
  team2_player2   integer NOT NULL REFERENCES players(id),
  is_training     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

### `match_results`

```sql
CREATE TABLE match_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  sets         jsonb NOT NULL,       -- [{team1: 21, team2: 18}, ...]
  total_team1  integer NOT NULL,     -- součet přes všechny sety
  total_team2  integer NOT NULL,
  submitted_by integer NOT NULL REFERENCES players(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_by   integer REFERENCES players(id),
  updated_at   timestamptz
);
```

---

### `elo_history`

```sql
CREATE TABLE elo_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   integer NOT NULL REFERENCES players(id),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  elo_before  integer NOT NULL,
  elo_after   integer NOT NULL,
  delta       integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

### `audit_log`

```sql
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   integer REFERENCES players(id),
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## RPC funkce

### `calculate_elo_for_match(p_match_id uuid)`
- Načte výsledek zápasu a ELO všech 4 hráčů
- Spočítá deltu (K=100, DIVISOR=1400, proporcionální)
- UPDATE `players.elo`
- INSERT `elo_history`
- Advisory lock na hráče (prevence race conditions)
- Tréninkové zápasy přeskočí

### `create_session_with_matches(p_date, p_created_by, p_player_ids[], p_matches jsonb)`
- Atomická transakce: INSERT session + session_players + matches
- Vrací UUID nové session

---

## Mapování TypeScript ↔ SQL

| TypeScript | SQL | Poznámka |
|-----------|-----|----------|
| `Player.id: number` | `players.id: integer` | Stejné ID |
| `Player.displayName` | `players.display_name` | snake_case v DB |
| `Session.closesAt` | `sessions.closes_at` | camelCase v TS |
| `Match.team1: [Player, Player]` | `team1_player1` + `team1_player2` | Tuple → 2 sloupce |
| `MatchResult.sets` | `match_results.sets: jsonb` | Stejný formát |
| `EloHistoryEntry.delta` | `elo_history.delta` | Computed v DB |
