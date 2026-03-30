-- ============================================================
-- 001_full_schema.sql — Slash Smash Badminton
-- Tables, indexes, RLS policies, seed players, ELO function
-- ============================================================

-- ==================== TABLES ====================

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

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_by  integer NOT NULL REFERENCES players(id),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  closes_at   timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE session_players (
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id   integer NOT NULL REFERENCES players(id),
  is_training boolean NOT NULL DEFAULT false,
  PRIMARY KEY (session_id, player_id)
);

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

CREATE TABLE match_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  sets         jsonb NOT NULL,
  total_team1  integer NOT NULL,
  total_team2  integer NOT NULL,
  submitted_by integer NOT NULL REFERENCES players(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_by   integer REFERENCES players(id),
  updated_at   timestamptz
);

CREATE TABLE elo_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   integer NOT NULL REFERENCES players(id),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  elo_before  integer NOT NULL,
  elo_after   integer NOT NULL,
  delta       integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date ON sessions(date DESC);
CREATE INDEX idx_matches_session ON matches(session_id);
CREATE INDEX idx_match_results_match ON match_results(match_id);
CREATE INDEX idx_elo_history_player ON elo_history(player_id);
CREATE INDEX idx_elo_history_match ON elo_history(match_id);
CREATE INDEX idx_elo_history_created ON elo_history(created_at);
CREATE INDEX idx_session_players_session ON session_players(session_id);
CREATE INDEX idx_session_players_player ON session_players(player_id);

-- ==================== RLS ====================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;

-- Players: everyone can read, only own row or admin can update
CREATE POLICY "players_select" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "players_update_own" ON players
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR role = 'admin');

-- Sessions: authenticated can read and create
CREATE POLICY "sessions_select" ON sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sessions_insert" ON sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sessions_update" ON sessions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "sessions_delete" ON sessions
  FOR DELETE TO authenticated USING (true);

-- Session players: authenticated can read and manage
CREATE POLICY "session_players_select" ON session_players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "session_players_insert" ON session_players
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "session_players_delete" ON session_players
  FOR DELETE TO authenticated USING (true);

-- Matches: authenticated can read (insert via RPC)
CREATE POLICY "matches_select" ON matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "matches_insert" ON matches
  FOR INSERT TO authenticated WITH CHECK (true);

-- Match results: authenticated can read, insert, update
CREATE POLICY "match_results_select" ON match_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "match_results_insert" ON match_results
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "match_results_update" ON match_results
  FOR UPDATE TO authenticated USING (true);

-- ELO history: authenticated can read (insert via DB function)
CREATE POLICY "elo_history_select" ON elo_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "elo_history_insert" ON elo_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==================== SEED PLAYERS (elo=1500, import will recalculate) ====================

INSERT INTO players (id, username, display_name, elo, role) VALUES
  (61, 'martin',   'Martin',   1500, 'admin'),
  (11, 'jindra',   'Jindra',   1500, 'player'),
  (22, 'terka',    'Terka',    1500, 'player'),
  (15, 'anicka',   'Anicka',   1500, 'player'),
  (88, 'honza',    'Honza',    1500, 'player'),
  (77, 'novo',     'Novo',     1500, 'player'),
  (19, 'fanda',    'Fanda',    1500, 'player'),
  (17, 'klara',    'Klara',    1500, 'player'),
  (24, 'kony',     'Kony',     1500, 'player'),
  (10, 'aik',      'Aik',      1500, 'player'),
  (99, 'doki',     'Doki',     1500, 'player'),
  (42, 'stroblik', 'Stroblik', 1500, 'player'),
  (13, 'bart',     'Bart',     1500, 'player'),
  (69, 'jindrad',  'Jindrad',  1500, 'player'),
  (78, 'rutak',    'Rutak',    1500, 'player'),
  (26, 'majda',    'Majda',    1500, 'player'),
  (35, 'hena',     'Heňa',     1500, 'player'),
  (16, 'dan',      'Dan',      1500, 'player'),
  (63, 'tyna',     'Tyna',     1500, 'player'),
  (70, 'adam',     'Adam',     1500, 'player'),
  (12, 'andrej',   'Andrej',   1500, 'player');

-- ==================== ELO CALCULATION FUNCTION ====================

CREATE OR REPLACE FUNCTION calculate_elo_for_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_result RECORD;
  v_team1_elo numeric;
  v_team2_elo numeric;
  v_expected1 numeric;
  v_actual1 numeric;
  v_delta integer;
  v_p1_elo integer;
  v_p2_elo integer;
  v_p3_elo integer;
  v_p4_elo integer;
  v_k constant integer := 100;
  v_divisor constant integer := 1400;
BEGIN
  -- Get match data
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  -- Skip training matches
  IF v_match.is_training THEN
    RETURN;
  END IF;

  -- Get result
  SELECT * INTO v_result FROM match_results WHERE match_id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No result for match: %', p_match_id;
  END IF;

  -- Skip if no points
  IF v_result.total_team1 + v_result.total_team2 = 0 THEN
    RETURN;
  END IF;

  -- Advisory locks on all 4 players (sorted to prevent deadlocks)
  PERFORM pg_advisory_xact_lock(LEAST(v_match.team1_player1, v_match.team1_player2, v_match.team2_player1, v_match.team2_player2));
  PERFORM pg_advisory_xact_lock(GREATEST(v_match.team1_player1, v_match.team1_player2, v_match.team2_player1, v_match.team2_player2));

  -- Get current ELO values
  SELECT elo INTO v_p1_elo FROM players WHERE id = v_match.team1_player1;
  SELECT elo INTO v_p2_elo FROM players WHERE id = v_match.team1_player2;
  SELECT elo INTO v_p3_elo FROM players WHERE id = v_match.team2_player1;
  SELECT elo INTO v_p4_elo FROM players WHERE id = v_match.team2_player2;

  -- Calculate team ELOs
  v_team1_elo := (v_p1_elo + v_p2_elo)::numeric / 2;
  v_team2_elo := (v_p3_elo + v_p4_elo)::numeric / 2;

  -- Expected score for team 1
  v_expected1 := 1.0 / (1.0 + power(10.0, (v_team2_elo - v_team1_elo) / v_divisor));

  -- Actual proportional score for team 1
  v_actual1 := v_result.total_team1::numeric / (v_result.total_team1 + v_result.total_team2)::numeric;

  -- Delta
  v_delta := round(v_k * (v_actual1 - v_expected1));

  -- Delete existing elo_history for this match (in case of recalculation)
  DELETE FROM elo_history WHERE match_id = p_match_id;

  -- Update team 1 players
  UPDATE players SET elo = elo + v_delta WHERE id = v_match.team1_player1;
  UPDATE players SET elo = elo + v_delta WHERE id = v_match.team1_player2;

  -- Update team 2 players (opposite delta)
  UPDATE players SET elo = elo - v_delta WHERE id = v_match.team2_player1;
  UPDATE players SET elo = elo - v_delta WHERE id = v_match.team2_player2;

  -- Insert ELO history
  INSERT INTO elo_history (player_id, match_id, elo_before, elo_after, delta)
  VALUES
    (v_match.team1_player1, p_match_id, v_p1_elo, v_p1_elo + v_delta, v_delta),
    (v_match.team1_player2, p_match_id, v_p2_elo, v_p2_elo + v_delta, v_delta),
    (v_match.team2_player1, p_match_id, v_p3_elo, v_p3_elo - v_delta, -v_delta),
    (v_match.team2_player2, p_match_id, v_p4_elo, v_p4_elo - v_delta, -v_delta);
END;
$$;
