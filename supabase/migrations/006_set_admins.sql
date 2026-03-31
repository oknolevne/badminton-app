-- ============================================================
-- 006_set_admins.sql
-- Set admin roles + elo_history DELETE policy for recalculation
-- ============================================================

-- Set admin roles for specified players
UPDATE players SET role = 'admin' WHERE id IN (11, 17, 22, 24, 61);

-- Admin can DELETE elo_history (needed for recalculateAllElo)
CREATE POLICY "elo_history_delete_admin" ON elo_history
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.auth_user_id = auth.uid()
      AND players.role = 'admin'
    )
  );
