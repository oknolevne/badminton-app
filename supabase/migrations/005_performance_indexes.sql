-- ============================================================
-- 005_performance_indexes.sql
-- Composite index for batch ELO delta queries (leaderboard)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_elo_history_player_created
  ON elo_history (player_id, created_at DESC);
