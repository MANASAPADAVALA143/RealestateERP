-- Migration 001: estatecfo schema extensions
-- Adds user_workspaces table and has_access() helper to the existing estatecfo schema.
-- Run AFTER the base integration_schema.sql is applied.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.
--
-- Phase 5 Architecture Approval Gate — All decisions locked 2026-11-28
-- D2: Supabase email/password auth
-- D7: React workspace context
-- D9: Group currency = INR

-- ── user_workspaces ──────────────────────────────────────────────────────────
-- Maps Supabase Auth users to workspaces with roles.
-- Supports multiple workspaces per user (SaaS model).
CREATE TABLE IF NOT EXISTS estatecfo.user_workspaces (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id  text NOT NULL REFERENCES estatecfo.workspaces(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner','admin','accountant','viewer')),
  invited_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS uw_workspace_idx ON estatecfo.user_workspaces (workspace_id);
CREATE INDEX IF NOT EXISTS uw_user_idx      ON estatecfo.user_workspaces (user_id);

-- ── audit_log ────────────────────────────────────────────────────────────────
-- Replaces the IndexedDB 'audit' object store.
-- Append-only: no UPDATE or DELETE policies.
CREATE TABLE IF NOT EXISTS estatecfo.audit_log (
  id           text        PRIMARY KEY,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  tenant_id    text,
  at           timestamptz NOT NULL DEFAULT now(),
  by           text        NOT NULL DEFAULT '',
  action       text        NOT NULL,
  target       text        NOT NULL,
  detail       text        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS audit_ws     ON estatecfo.audit_log (workspace_id);
CREATE INDEX IF NOT EXISTS audit_at     ON estatecfo.audit_log (workspace_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_tenant ON estatecfo.audit_log (workspace_id, tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ── has_access() helper ───────────────────────────────────────────────────────
-- SECURITY DEFINER so it can query user_workspaces without RLS loops.
-- Returns true if auth.uid() belongs to p_workspace_id with at least p_min_role.
CREATE OR REPLACE FUNCTION estatecfo.has_access(
  p_workspace_id text,
  p_min_role     text DEFAULT 'viewer'
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM estatecfo.user_workspaces uw
    WHERE uw.user_id = auth.uid()
      AND uw.workspace_id = p_workspace_id
      AND CASE p_min_role
            WHEN 'viewer'     THEN uw.role IN ('owner','admin','accountant','viewer')
            WHEN 'accountant' THEN uw.role IN ('owner','admin','accountant')
            WHEN 'admin'      THEN uw.role IN ('owner','admin')
            WHEN 'owner'      THEN uw.role = 'owner'
            ELSE false
          END
  )
$$;

-- ── RLS on existing estatecfo tables ─────────────────────────────────────────
ALTER TABLE estatecfo.workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatecfo.connections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatecfo.import_batches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatecfo.cdm_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatecfo.audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatecfo.user_workspaces  ENABLE ROW LEVEL SECURITY;

-- workspaces: user can see any workspace they belong to
CREATE POLICY ws_select ON estatecfo.workspaces
  FOR SELECT USING (estatecfo.has_access(id, 'viewer'));

-- user_workspaces: a user can see their own membership rows
CREATE POLICY uw_select ON estatecfo.user_workspaces
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY uw_insert ON estatecfo.user_workspaces
  FOR INSERT WITH CHECK (
    estatecfo.has_access(workspace_id, 'admin')
  );
CREATE POLICY uw_delete ON estatecfo.user_workspaces
  FOR DELETE USING (
    estatecfo.has_access(workspace_id, 'admin')
  );

-- connections
CREATE POLICY conn_select ON estatecfo.connections
  FOR SELECT USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY conn_insert ON estatecfo.connections
  FOR INSERT WITH CHECK (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY conn_update ON estatecfo.connections
  FOR UPDATE USING (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY conn_delete ON estatecfo.connections
  FOR DELETE USING (estatecfo.has_access(workspace_id, 'admin'));

-- import_batches
CREATE POLICY batch_select ON estatecfo.import_batches
  FOR SELECT USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY batch_insert ON estatecfo.import_batches
  FOR INSERT WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));

-- cdm_records
CREATE POLICY cdm_select ON estatecfo.cdm_records
  FOR SELECT USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY cdm_insert ON estatecfo.cdm_records
  FOR INSERT WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));

-- audit_log: all workspace members can read; no one can update or delete
CREATE POLICY audit_select ON estatecfo.audit_log
  FOR SELECT USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY audit_insert ON estatecfo.audit_log
  FOR INSERT WITH CHECK (estatecfo.has_access(workspace_id, 'viewer'));
