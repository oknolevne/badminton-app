-- ============================================================
-- 003_audit_log.sql
-- Audit log table for admin actions
-- ============================================================

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

CREATE INDEX idx_audit_log_player ON audit_log(player_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.auth_user_id = auth.uid()
      AND players.role = 'admin'
    )
  );

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated WITH CHECK (true);
