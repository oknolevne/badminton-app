-- ============================================================
-- 002_create_session_function.sql
-- Atomic RPC: create session + session_players + matches
-- ============================================================

CREATE OR REPLACE FUNCTION create_session_with_matches(
  p_date date,
  p_created_by integer,
  p_player_ids integer[],
  p_matches jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_match jsonb;
  v_player_id integer;
BEGIN
  -- Create session
  INSERT INTO sessions (date, created_by)
  VALUES (p_date, p_created_by)
  RETURNING id INTO v_session_id;

  -- Add session players
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    INSERT INTO session_players (session_id, player_id)
    VALUES (v_session_id, v_player_id);
  END LOOP;

  -- Add matches
  FOR v_match IN SELECT * FROM jsonb_array_elements(p_matches)
  LOOP
    INSERT INTO matches (
      session_id,
      block_number,
      match_number,
      team1_player1,
      team1_player2,
      team2_player1,
      team2_player2,
      is_training
    ) VALUES (
      v_session_id,
      (v_match->>'blockNumber')::integer,
      (v_match->>'matchNumber')::integer,
      (v_match->>'team1Player1')::integer,
      (v_match->>'team1Player2')::integer,
      (v_match->>'team2Player1')::integer,
      (v_match->>'team2Player2')::integer,
      COALESCE((v_match->>'isTraining')::boolean, false)
    );
  END LOOP;

  RETURN v_session_id;
END;
$$;
