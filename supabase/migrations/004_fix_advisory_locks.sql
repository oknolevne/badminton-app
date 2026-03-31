-- ============================================================
-- 004_fix_advisory_locks.sql
-- Fix: lock all 4 players sorted ascending (prevent deadlocks)
-- Previously only locked LEAST and GREATEST (2 of 4)
-- ============================================================

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
  v_sorted_ids integer[];
  v_lock_id integer;
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

  -- Advisory locks on all 4 players sorted ascending (prevent deadlocks)
  v_sorted_ids := ARRAY[
    v_match.team1_player1, v_match.team1_player2,
    v_match.team2_player1, v_match.team2_player2
  ];
  SELECT array_agg(x ORDER BY x) INTO v_sorted_ids FROM unnest(v_sorted_ids) x;

  FOREACH v_lock_id IN ARRAY v_sorted_ids LOOP
    PERFORM pg_advisory_xact_lock(v_lock_id);
  END LOOP;

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
