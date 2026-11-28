-- Migration 002: ar schema (Accounts Receivable)
-- Creates the complete ar.* schema to replace the IndexedDB AR object stores.
-- Run AFTER 001_estatecfo_extensions.sql.
--
-- Phase 5 Architecture Approval Gate — All decisions locked 2026-11-28
-- D1: Sequential invoice numbering INV-00001
-- D3: Lease charges stored as JSONB
-- D4: Invoice lines stored as JSONB
-- D5: Payment allocations normalized in ar.payment_allocations
-- D6: Transactional workflows via PostgreSQL plpgsql + supabase.rpc()
-- D9: Group currency = INR (functional_to_group = 1.0 for all Rental OS journals)

CREATE SCHEMA IF NOT EXISTS ar;

-- ── ar.counters ───────────────────────────────────────────────────────────────
-- Replaces ArSettings.counters JSONB blob.
-- D1: fy = '*' for sequential numbering (never resets).
CREATE TABLE ar.counters (
  workspace_id  text    NOT NULL REFERENCES estatecfo.workspaces(id),
  kind          text    NOT NULL CHECK (kind IN ('invoice','receipt','credit','journal')),
  fy            text    NOT NULL DEFAULT '*',
  last_seq      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, kind, fy)
);

-- ── ar.next_counter() ─────────────────────────────────────────────────────────
-- Atomic, concurrent-safe counter increment.
-- Called inside every transactional RPC — never from the browser directly.
CREATE FUNCTION ar.next_counter(
  p_workspace_id text,
  p_kind         text,
  p_fy           text DEFAULT '*'
) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_seq    integer;
  v_prefix text;
BEGIN
  INSERT INTO ar.counters (workspace_id, kind, fy, last_seq)
  VALUES (p_workspace_id, p_kind, p_fy, 1)
  ON CONFLICT (workspace_id, kind, fy)
  DO UPDATE SET last_seq = ar.counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  v_prefix := CASE p_kind
    WHEN 'invoice' THEN 'INV'
    WHEN 'receipt' THEN 'RCT'
    WHEN 'credit'  THEN 'CN'
    WHEN 'journal' THEN 'JE'
    ELSE upper(p_kind)
  END;

  RETURN v_prefix || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

-- ── ar.settings ───────────────────────────────────────────────────────────────
-- One row per workspace. Counters moved out to ar.counters.
-- D9: group_currency default 'INR'; functional_to_group = 1.0 for all ROS journals.
CREATE TABLE ar.settings (
  id                 text        PRIMARY KEY,  -- 'ar:{workspace_id}'
  workspace_id       text        NOT NULL UNIQUE REFERENCES estatecfo.workspaces(id),
  group_currency     char(3)     NOT NULL DEFAULT 'INR',  -- D9 LOCKED
  entity_currencies  jsonb       NOT NULL DEFAULT '{}',
  fx_rates           jsonb       NOT NULL DEFAULT '[]',
  accounts           jsonb       NOT NULL DEFAULT '{}',
  bank_accounts      jsonb       NOT NULL DEFAULT '[]',
  default_terms_days integer     NOT NULL DEFAULT 5,
  late_fee           jsonb       NOT NULL DEFAULT '{}',
  allowance          jsonb       NOT NULL DEFAULT '{}',
  approvals          jsonb       NOT NULL DEFAULT '{}',
  locked_periods     text[]      NOT NULL DEFAULT '{}',
  user_name          text        NOT NULL DEFAULT 'CFO Office',
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── ar.tenants ────────────────────────────────────────────────────────────────
CREATE TABLE ar.tenants (
  id                   text        PRIMARY KEY,
  workspace_id         text        NOT NULL REFERENCES estatecfo.workspaces(id),
  code                 text        NOT NULL,
  name                 text        NOT NULL,
  entity_id            text        NOT NULL,
  property_id          text        NOT NULL,
  property_name        text        NOT NULL DEFAULT '',
  building             text        NOT NULL DEFAULT '',
  unit                 text        NOT NULL DEFAULT '',
  contact_name         text        NOT NULL DEFAULT '',
  email                text,
  phone                text        NOT NULL DEFAULT '',
  billing_frequency    text        NOT NULL DEFAULT 'monthly'
                           CHECK (billing_frequency IN ('monthly','quarterly','annual')),
  payment_terms_days   integer     NOT NULL DEFAULT 5 CHECK (payment_terms_days >= 0),
  currency             char(3)     NOT NULL DEFAULT 'INR',
  collection_owner     text        NOT NULL DEFAULT '',
  status               text        NOT NULL DEFAULT 'Active'
                           CHECK (status IN ('Active','Inactive')),
  source               jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  created_by           text        NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ar.tenants ADD CONSTRAINT ar_tenants_ws_id_unique UNIQUE (workspace_id, id);
CREATE UNIQUE INDEX ar_tenants_code_unique ON ar.tenants (workspace_id, upper(code));
CREATE INDEX ar_tenants_ws ON ar.tenants (workspace_id);

-- ── ar.leases ─────────────────────────────────────────────────────────────────
-- D3: charges stored as JSONB (ChargeSchedule[]).
CREATE TABLE ar.leases (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL REFERENCES estatecfo.workspaces(id),
  code            text        NOT NULL,
  tenant_id       text        NOT NULL,
  entity_id       text        NOT NULL,
  property_id     text        NOT NULL,
  property_name   text        NOT NULL DEFAULT '',
  building        text        NOT NULL DEFAULT '',
  unit            text        NOT NULL DEFAULT '',
  start_date      date        NOT NULL,
  end_date        date        NOT NULL CHECK (end_date >= start_date),
  currency        char(3)     NOT NULL,
  charges         jsonb       NOT NULL DEFAULT '[]',
  deposit_required numeric(18,2) NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'Active'
                      CHECK (status IN ('Active','Ended')),
  ifrs16_lease_id text,
  source          jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_leases_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
ALTER TABLE ar.leases ADD CONSTRAINT ar_leases_ws_id_unique UNIQUE (workspace_id, id);
CREATE UNIQUE INDEX ar_leases_code_unique ON ar.leases (workspace_id, upper(code));
CREATE INDEX ar_leases_ws     ON ar.leases (workspace_id);
CREATE INDEX ar_leases_tenant ON ar.leases (workspace_id, tenant_id);
CREATE INDEX ar_leases_status ON ar.leases (workspace_id, status);

-- ── ar.invoices ───────────────────────────────────────────────────────────────
-- D4: lines stored as JSONB (InvoiceLine[]).
-- D1: number format INV-NNNNN, unique per workspace.
CREATE TABLE ar.invoices (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL REFERENCES estatecfo.workspaces(id),
  number          text        NOT NULL,
  kind            text        NOT NULL
                      CHECK (kind IN ('rent','late_fee','manual','imported')),
  tenant_id       text        NOT NULL,
  lease_id        text,
  entity_id       text        NOT NULL,
  property_id     text        NOT NULL,
  unit            text        NOT NULL DEFAULT '',
  invoice_date    date        NOT NULL,
  due_date        date        NOT NULL,
  period_start    date        NOT NULL,
  period_end      date        NOT NULL,
  billing_period  text        NOT NULL,
  currency        char(3)     NOT NULL,
  lines           jsonb       NOT NULL DEFAULT '[]',
  total           numeric(18,2) NOT NULL,
  prior_collected numeric(18,2) NOT NULL DEFAULT 0,
  billing_keys    text[]      NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'Draft'
                      CHECK (status IN (
                        'Draft','Approved','Posted',
                        'Reversal requested','Reversed'
                      )),
  fx              jsonb,
  posting_date    date,
  journal_id      text,
  approved_by     text,
  approved_at     timestamptz,
  reversal        jsonb,
  source          jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  created_by      text        NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_invoices_number_unique UNIQUE (workspace_id, number),
  CONSTRAINT ar_invoices_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
ALTER TABLE ar.invoices ADD CONSTRAINT ar_invoices_ws_id_unique UNIQUE (workspace_id, id);
CREATE INDEX ar_invoices_ws     ON ar.invoices (workspace_id);
CREATE INDEX ar_invoices_tenant ON ar.invoices (workspace_id, tenant_id);
CREATE INDEX ar_invoices_period ON ar.invoices (workspace_id, billing_period);
CREATE INDEX ar_invoices_status ON ar.invoices (workspace_id, status)
  WHERE status IN ('Draft','Approved','Posted');

-- ── ar.journals ───────────────────────────────────────────────────────────────
CREATE TABLE ar.journals (
  id                  text        PRIMARY KEY,
  workspace_id        text        NOT NULL REFERENCES estatecfo.workspaces(id),
  number              text        NOT NULL,
  date                date        NOT NULL,
  period              text        NOT NULL,
  entity_id           text        NOT NULL,
  property_id         text        NOT NULL,
  description         text        NOT NULL,
  source_type         text        NOT NULL
    CHECK (source_type IN (
      'invoice','payment','allocation','credit_note','write_off',
      'deposit','deposit_refund','deposit_applied','opening','reversal'
    )),
  source_id           text        NOT NULL,
  currency            char(3)     NOT NULL,
  functional_currency char(3),
  group_currency      char(3),
  functional_to_group numeric(18,8),
  reverses            text,
  reversed_by         text,
  created_by          text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_journals_number_unique UNIQUE (workspace_id, number)
);
ALTER TABLE ar.journals ADD CONSTRAINT ar_journals_ws_id_unique UNIQUE (workspace_id, id);
ALTER TABLE ar.journals
  ADD CONSTRAINT ar_journals_reverses_fk    FOREIGN KEY (reverses)
    REFERENCES ar.journals(id),
  ADD CONSTRAINT ar_journals_reversed_by_fk FOREIGN KEY (reversed_by)
    REFERENCES ar.journals(id);
CREATE INDEX ar_journals_ws     ON ar.journals (workspace_id);
CREATE INDEX ar_journals_period ON ar.journals (workspace_id, period);
CREATE INDEX ar_journals_source ON ar.journals (workspace_id, source_id);

-- ── ar.journal_lines (normalized) ────────────────────────────────────────────
-- Replaces Journal.lines[] embedded array.
-- Required for GL aggregation and trial balance queries.
CREATE TABLE ar.journal_lines (
  id           text        PRIMARY KEY,
  journal_id   text        NOT NULL REFERENCES ar.journals(id) ON DELETE CASCADE,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  account_code text        NOT NULL,
  account_name text        NOT NULL DEFAULT '',
  debit        numeric(18,2) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
  credit       numeric(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  txn_amount   numeric(18,2) NOT NULL DEFAULT 0,
  entity_id    text,
  property_id  text,
  tenant_id    text,
  invoice_id   text,
  CONSTRAINT journal_lines_dr_xor_cr CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX jl_journal   ON ar.journal_lines (journal_id);
CREATE INDEX jl_ws_acct   ON ar.journal_lines (workspace_id, account_code);
CREATE INDEX jl_tenant    ON ar.journal_lines (workspace_id, tenant_id)
  WHERE tenant_id IS NOT NULL;

-- Invoice → journal FK (journal table now exists)
ALTER TABLE ar.invoices ADD CONSTRAINT ar_invoices_journal_fk
  FOREIGN KEY (journal_id) REFERENCES ar.journals(id);

-- ── ar.payments ───────────────────────────────────────────────────────────────
-- D5: allocations normalized into ar.payment_allocations.
-- unallocated_amount = amount - SUM(allocations.amount), kept in sync by RPC.
CREATE TABLE ar.payments (
  id                 text        PRIMARY KEY,
  workspace_id       text        NOT NULL REFERENCES estatecfo.workspaces(id),
  number             text        NOT NULL,
  tenant_id          text        NOT NULL,
  entity_id          text        NOT NULL,
  received_date      date        NOT NULL,
  amount             numeric(18,2) NOT NULL CHECK (amount > 0),
  unallocated_amount numeric(18,2) NOT NULL DEFAULT 0
                         CHECK (unallocated_amount >= 0),
  currency           char(3)     NOT NULL,
  bank_account       text        NOT NULL,
  method             text        NOT NULL DEFAULT '',
  reference          text        NOT NULL DEFAULT '',
  status             text        NOT NULL DEFAULT 'Posted'
                         CHECK (status IN ('Posted','Reversal requested','Reversed')),
  fx                 jsonb       NOT NULL,
  journal_ids        text[]      NOT NULL DEFAULT '{}',
  bank_line_ref      text,
  reversal           jsonb,
  source             jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  created_by         text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_payments_number_unique UNIQUE (workspace_id, number),
  CONSTRAINT ar_payments_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
CREATE INDEX ar_payments_ws       ON ar.payments (workspace_id);
CREATE INDEX ar_payments_tenant   ON ar.payments (workspace_id, tenant_id);
CREATE INDEX ar_payments_unalloc  ON ar.payments (workspace_id, unallocated_amount)
  WHERE unallocated_amount > 0;
CREATE INDEX ar_payments_ref      ON ar.payments (bank_line_ref)
  WHERE bank_line_ref IS NOT NULL;

-- ── ar.payment_allocations (D5 LOCKED — normalized) ──────────────────────────
-- Supports: partial payments, one receipt → many invoices,
-- many receipts → one invoice, unallocated customer advances.
CREATE TABLE ar.payment_allocations (
  id             text        PRIMARY KEY,
  workspace_id   text        NOT NULL REFERENCES estatecfo.workspaces(id),
  payment_id     text        NOT NULL REFERENCES ar.payments(id) ON DELETE CASCADE,
  invoice_id     text        NOT NULL,
  amount         numeric(18,2) NOT NULL CHECK (amount > 0),
  allocated_date date        NOT NULL,
  journal_id     text        REFERENCES ar.journals(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alloc_invoice_fk FOREIGN KEY (workspace_id, invoice_id)
    REFERENCES ar.invoices(workspace_id, id)
);
CREATE INDEX alloc_payment ON ar.payment_allocations (payment_id);
CREATE INDEX alloc_invoice ON ar.payment_allocations (workspace_id, invoice_id);
CREATE INDEX alloc_ws      ON ar.payment_allocations (workspace_id);

-- ── ar.credit_notes ───────────────────────────────────────────────────────────
CREATE TABLE ar.credit_notes (
  id           text        PRIMARY KEY,
  workspace_id text        NOT NULL REFERENCES estatecfo.workspaces(id),
  number       text        NOT NULL,
  type         text        NOT NULL CHECK (type IN ('credit','write_off')),
  invoice_id   text        NOT NULL,
  tenant_id    text        NOT NULL,
  entity_id    text        NOT NULL,
  date         date        NOT NULL,
  amount       numeric(18,2) NOT NULL CHECK (amount > 0),
  charge_type  text        NOT NULL,
  reason       text        NOT NULL,
  status       text        NOT NULL DEFAULT 'Draft'
                   CHECK (status IN ('Draft','Posted','Rejected')),
  dispute_id   text,
  journal_id   text        REFERENCES ar.journals(id),
  requested_by text        NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by  text,
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  source       jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  CONSTRAINT ar_cn_number_unique UNIQUE (workspace_id, number),
  CONSTRAINT ar_cn_invoice_fk FOREIGN KEY (workspace_id, invoice_id)
    REFERENCES ar.invoices(workspace_id, id),
  CONSTRAINT ar_cn_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
CREATE INDEX ar_cn_ws      ON ar.credit_notes (workspace_id);
CREATE INDEX ar_cn_invoice ON ar.credit_notes (workspace_id, invoice_id);

-- ── ar.deposits ───────────────────────────────────────────────────────────────
CREATE TABLE ar.deposits (
  id                 text        PRIMARY KEY,
  workspace_id       text        NOT NULL REFERENCES estatecfo.workspaces(id),
  tenant_id          text        NOT NULL,
  lease_id           text,
  entity_id          text        NOT NULL,
  property_id        text        NOT NULL,
  amount             numeric(18,2) NOT NULL CHECK (amount > 0),
  currency           char(3)     NOT NULL,
  received_date      date        NOT NULL,
  bank_account       text        NOT NULL,
  status             text        NOT NULL DEFAULT 'Held'
                         CHECK (status IN ('Held','Refunded','Applied')),
  settled_date       date,
  applied_invoice_id text,
  fx                 jsonb       NOT NULL,
  journal_ids        text[]      NOT NULL DEFAULT '{}',
  source             jsonb       NOT NULL DEFAULT '{"system":"EstateCFO"}',
  created_by         text        NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_deposits_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
CREATE INDEX ar_deposits_ws     ON ar.deposits (workspace_id);
CREATE INDEX ar_deposits_tenant ON ar.deposits (workspace_id, tenant_id);

-- ── ar.followups ──────────────────────────────────────────────────────────────
CREATE TABLE ar.followups (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL REFERENCES estatecfo.workspaces(id),
  tenant_id       text        NOT NULL,
  invoice_id      text,
  date            date        NOT NULL,
  type            text        NOT NULL
                      CHECK (type IN ('Call','Email','Letter','Meeting','Note','Reminder')),
  note            text        NOT NULL,
  by              text        NOT NULL,
  promise_date    date,
  promise_amount  numeric(18,2),
  next_follow_up  date,
  reminder_status text        CHECK (reminder_status IN ('Draft','Approved')),
  approved_by     text,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_fu_tenant_fk FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
CREATE INDEX ar_fu_ws     ON ar.followups (workspace_id);
CREATE INDEX ar_fu_tenant ON ar.followups (workspace_id, tenant_id);

-- ── ar.disputes ───────────────────────────────────────────────────────────────
-- notes stored as JSONB [{at, by, text}]: audit thread on the dispute.
CREATE TABLE ar.disputes (
  id             text        PRIMARY KEY,
  workspace_id   text        NOT NULL REFERENCES estatecfo.workspaces(id),
  tenant_id      text        NOT NULL,
  invoice_id     text        NOT NULL,
  amount         numeric(18,2) NOT NULL CHECK (amount > 0),
  reason         text        NOT NULL,
  status         text        NOT NULL DEFAULT 'Open'
                     CHECK (status IN (
                       'Open','Under review',
                       'Resolved — credit issued','Resolved — rejected'
                     )),
  opened_by      text        NOT NULL,
  opened_at      timestamptz NOT NULL DEFAULT now(),
  owner          text        NOT NULL,
  notes          jsonb       NOT NULL DEFAULT '[]',
  resolved_at    timestamptz,
  resolution     text,
  credit_note_id text,
  CONSTRAINT ar_disp_invoice_fk FOREIGN KEY (workspace_id, invoice_id)
    REFERENCES ar.invoices(workspace_id, id),
  CONSTRAINT ar_disp_tenant_fk  FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES ar.tenants(workspace_id, id)
);
CREATE INDEX ar_disp_ws     ON ar.disputes (workspace_id);
CREATE INDEX ar_disp_status ON ar.disputes (workspace_id, status)
  WHERE status IN ('Open','Under review');

-- ── RLS on all ar.* tables ────────────────────────────────────────────────────
ALTER TABLE ar.counters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.leases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.journals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.journal_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.credit_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.deposits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.followups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar.disputes           ENABLE ROW LEVEL SECURITY;

-- counters: written only by RPCs (SECURITY DEFINER); no direct client access
CREATE POLICY cnt_rpc ON ar.counters FOR ALL
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- settings
CREATE POLICY set_select ON ar.settings FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY set_upsert ON ar.settings FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'admin'));
CREATE POLICY set_update ON ar.settings FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- tenants
CREATE POLICY ten_select ON ar.tenants FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY ten_insert ON ar.tenants FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY ten_update ON ar.tenants FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'))
  WITH CHECK (workspace_id = workspace_id);
CREATE POLICY ten_delete ON ar.tenants FOR DELETE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- leases (same pattern as tenants)
CREATE POLICY lea_select ON ar.leases FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY lea_insert ON ar.leases FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY lea_update ON ar.leases FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'))
  WITH CHECK (workspace_id = workspace_id);
CREATE POLICY lea_delete ON ar.leases FOR DELETE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- invoices
CREATE POLICY inv_select ON ar.invoices FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY inv_insert ON ar.invoices FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY inv_update ON ar.invoices FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY inv_delete ON ar.invoices FOR DELETE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- journals (posted by RPCs; direct select allowed for reporting)
CREATE POLICY jnl_select ON ar.journals FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY jnl_insert ON ar.journals FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));

-- journal_lines (workspace_id denormalized for fast RLS check)
CREATE POLICY jl_select ON ar.journal_lines FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY jl_insert ON ar.journal_lines FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));

-- payments
CREATE POLICY pay_select ON ar.payments FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY pay_insert ON ar.payments FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY pay_update ON ar.payments FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- payment_allocations
CREATE POLICY alloc_select ON ar.payment_allocations FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY alloc_insert ON ar.payment_allocations FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY alloc_delete ON ar.payment_allocations FOR DELETE
  USING (estatecfo.has_access(workspace_id, 'admin'));

-- credit_notes
CREATE POLICY cn_select ON ar.credit_notes FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY cn_insert ON ar.credit_notes FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY cn_update ON ar.credit_notes FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- deposits
CREATE POLICY dep_select ON ar.deposits FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY dep_insert ON ar.deposits FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY dep_update ON ar.deposits FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

-- followups, disputes: viewer can read; accountant can write
CREATE POLICY fu_select  ON ar.followups FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY fu_insert  ON ar.followups FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY fu_update  ON ar.followups FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));

CREATE POLICY dis_select ON ar.disputes FOR SELECT
  USING (estatecfo.has_access(workspace_id, 'viewer'));
CREATE POLICY dis_insert ON ar.disputes FOR INSERT
  WITH CHECK (estatecfo.has_access(workspace_id, 'accountant'));
CREATE POLICY dis_update ON ar.disputes FOR UPDATE
  USING (estatecfo.has_access(workspace_id, 'accountant'));
