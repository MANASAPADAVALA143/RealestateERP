-- Migration 003: ros schema (Rental Operating System)
-- Creates the ros.* schema to replace static TypeScript data.ts files.
-- Run AFTER 002_ar_schema.sql.
--
-- Phase 5 Architecture Approval Gate — All decisions locked 2026-11-28
-- Current state: 200 units, 10 buildings, 5 properties hardcoded in TypeScript.
-- Phase 5.7 will seed this schema from the static data via a one-time script.

CREATE SCHEMA IF NOT EXISTS ros;

-- ── ros.properties ────────────────────────────────────────────────────────────
CREATE TABLE ros.properties (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL REFERENCES estatecfo.workspaces(id),
  name            text        NOT NULL,
  address         text        NOT NULL DEFAULT '',
  city            text        NOT NULL DEFAULT '',
  state           text        NOT NULL DEFAULT '',
  property_type   text,
  total_area_sqft numeric(12,2),
  market_value    numeric(18,2),
  entity_id       text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ros.properties ADD CONSTRAINT ros_prop_ws_id_unique UNIQUE (workspace_id, id);
CREATE INDEX ros_prop_ws ON ros.properties (workspace_id);

-- ── ros.buildings ─────────────────────────────────────────────────────────────
CREATE TABLE ros.buildings (
  id           text        PRIMARY KEY,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  property_id  text        NOT NULL,
  name         text        NOT NULL,
  floors       integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ros_bldg_prop_fk FOREIGN KEY (workspace_id, property_id)
    REFERENCES ros.properties(workspace_id, id)
);
ALTER TABLE ros.buildings ADD CONSTRAINT ros_bldg_ws_id_unique UNIQUE (workspace_id, id);
CREATE INDEX ros_bldg_ws   ON ros.buildings (workspace_id);
CREATE INDEX ros_bldg_prop ON ros.buildings (workspace_id, property_id);

-- ── ros.units ─────────────────────────────────────────────────────────────────
CREATE TABLE ros.units (
  id           text        PRIMARY KEY,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  property_id  text        NOT NULL,
  building_id  text,
  unit_number  text        NOT NULL,
  floor        integer,
  area_sqft    numeric(10,2),
  unit_type    text        NOT NULL DEFAULT 'Commercial'
                   CHECK (unit_type IN ('Commercial','Residential','Mixed')),
  status       text        NOT NULL DEFAULT 'Vacant'
                   CHECK (status IN (
                     'Vacant','Occupied','Under Maintenance','Reserved'
                   )),
  monthly_rent numeric(18,2),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, property_id, unit_number),
  CONSTRAINT ros_unit_prop_fk FOREIGN KEY (workspace_id, property_id)
    REFERENCES ros.properties(workspace_id, id),
  CONSTRAINT ros_unit_bldg_fk FOREIGN KEY (workspace_id, building_id)
    REFERENCES ros.buildings(workspace_id, id)
);
CREATE INDEX ros_unit_ws   ON ros.units (workspace_id);
CREATE INDEX ros_unit_prop ON ros.units (workspace_id, property_id);
CREATE INDEX ros_unit_stat ON ros.units (workspace_id, status);

-- ── ros.vendors ───────────────────────────────────────────────────────────────
CREATE TABLE ros.vendors (
  id           text        PRIMARY KEY,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  name         text        NOT NULL,
  category     text,
  phone        text,
  email        text,
  status       text        NOT NULL DEFAULT 'Active'
                   CHECK (status IN ('Active','Inactive')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ros_vendor_ws ON ros.vendors (workspace_id);

-- ── ros.maintenance_requests ──────────────────────────────────────────────────
CREATE TABLE ros.maintenance_requests (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL REFERENCES estatecfo.workspaces(id),
  property_id     text        NOT NULL,
  building_id     text,
  unit_id         text,
  tenant_id       text,
  category        text        NOT NULL,
  priority        text        NOT NULL DEFAULT 'Medium'
                      CHECK (priority IN ('Low','Medium','High','Emergency')),
  status          text        NOT NULL DEFAULT 'Open'
                      CHECK (status IN (
                        'Open','In Progress','Pending Parts','Resolved','Closed'
                      )),
  description     text        NOT NULL,
  reported_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  assigned_to     text,
  vendor_id       text        REFERENCES ros.vendors(id),
  estimated_cost  numeric(18,2),
  actual_cost     numeric(18,2),
  created_by      text        NOT NULL DEFAULT '',
  CONSTRAINT ros_mr_prop_fk FOREIGN KEY (workspace_id, property_id)
    REFERENCES ros.properties(workspace_id, id)
);
CREATE INDEX ros_mr_ws     ON ros.maintenance_requests (workspace_id);
CREATE INDEX ros_mr_status ON ros.maintenance_requests (workspace_id, status)
  WHERE status NOT IN ('Resolved','Closed');
CREATE INDEX ros_mr_prop   ON ros.maintenance_requests (workspace_id, property_id);

-- ── RLS on all ros.* tables ───────────────────────────────────────────────────
ALTER TABLE ros.properties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ros.buildings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ros.units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ros.vendors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ros.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- properties
CREATE POLICY prop_select ON ros.properties FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY prop_insert ON ros.properties FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY prop_update ON ros.properties FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY prop_delete ON ros.properties FOR DELETE
  USING (estatecfo.has_access(workspace_id, 'owner'));

-- buildings
CREATE POLICY bldg_select ON ros.buildings FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY bldg_insert ON ros.buildings FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY bldg_update ON ros.buildings FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- units
CREATE POLICY unit_select ON ros.units FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY unit_insert ON ros.units FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY unit_update ON ros.units FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- vendors
CREATE POLICY vend_select ON ros.vendors FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY vend_insert ON ros.vendors FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY vend_update ON ros.vendors FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- maintenance_requests
CREATE POLICY mr_select ON ros.maintenance_requests FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY mr_insert ON ros.maintenance_requests FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY mr_update ON ros.maintenance_requests FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));
