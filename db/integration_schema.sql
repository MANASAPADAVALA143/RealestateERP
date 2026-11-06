-- EstateCFO Universal Integration Engine schema (PostgreSQL 14+ / Supabase).
--
-- Safe to run more than once, and isolated from other applications:
--   * everything lives in its own schema "estatecfo", so existing public tables
--     (for example a public."tenants" table) are never touched or reused;
--   * every statement is idempotent (IF NOT EXISTS / DROP ... IF EXISTS).
--
-- Platform customers are "workspaces". Real-estate tenants (lessees) are a
-- Common Data Model entity (cdm_tenants). Row-level security keys on the
-- session setting app.workspace_id, set by the API from the authenticated user.
-- On Supabase you can instead compare workspace_id with a claim from auth.jwt().

create schema if not exists estatecfo;
set search_path = estatecfo, public;

-- ---------------------------------------------------------------- workspaces
create table if not exists estatecfo.workspaces (
  id          text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- -------------------------------------------------------- A. connector registry
create table if not exists estatecfo.connectors (
  id        text primary key,               -- excel, yardi_voyager_8, sap_s4hana, sap_business_one, oracle_fusion, oracle_netsuite, dynamics_365
  name      text not null,
  vendor    text not null,
  family    text not null check (family in ('Excel', 'Yardi', 'ERP')),
  modes     text[] not null                 -- {'file'} or {'file','api'}
);

-- One row per configured source: several ERPs, several Yardi environments, several Excel sources.
create table if not exists estatecfo.connections (
  id              text primary key,
  workspace_id    text not null references estatecfo.workspaces(id),
  connector_id    text not null references estatecfo.connectors(id),
  name            text not null,
  environment     text not null,
  mode            text not null check (mode in ('file', 'api')),
  schedule        text not null default 'manual' check (schedule in ('manual', 'daily', 'weekly', 'monthly')),
  freshness_days  integer not null default 31,
  verification    jsonb not null default '{}',   -- API checklist; 'verified' requires a tested extraction
  secret_ref      text,                          -- reference into the server secret manager, never the secret
  state           text not null default 'not_configured' check (state in ('ready', 'not_configured', 'awaiting_verification', 'verified', 'error')),
  last_verified_at timestamptz,
  active          boolean not null default true,
  created_by      text not null,
  created_at      timestamptz not null default now()
);
create index if not exists connections_workspace on estatecfo.connections (workspace_id, connector_id);

-- ------------------------------------------------- E. mapping templates/profiles
create table if not exists estatecfo.mapping_templates (
  id             text primary key,
  workspace_id   text not null references estatecfo.workspaces(id),
  connection_id  text references estatecfo.connections(id),
  name           text not null,
  profile        text not null,              -- source-specific mapping profile
  category       text not null,
  headers        jsonb not null,
  date_order     text not null default 'auto',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists mapping_templates_lookup on estatecfo.mapping_templates (workspace_id, category, profile);

create table if not exists estatecfo.mapping_template_fields (
  template_id    text not null references estatecfo.mapping_templates(id) on delete cascade,
  target_field   text not null,
  source_column  text,
  aliases        text[] not null default '{}',
  primary key (template_id, target_field)
);

-- ---------------------------------------------- J. sync manager / import batches
create table if not exists estatecfo.import_batches (
  id                 text primary key,        -- IMP-YYYYMMDD-XXXXXX
  workspace_id       text not null references estatecfo.workspaces(id),
  connection_id      text not null references estatecfo.connections(id),
  source_system      text not null,
  category           text not null,
  sync_mode          text not null default 'incremental' check (sync_mode in ('incremental', 'full_refresh')),
  trigger            text not null default 'manual' check (trigger in ('manual', 'scheduled', 'retry')),
  template_id        text references estatecfo.mapping_templates(id),
  file_name          text,
  sheet_name         text,
  header_row         integer,
  mapping            jsonb not null default '{}',
  date_orders        jsonb not null default '{}',
  entity_ids         text[] not null default '{}',
  property_ids       text[] not null default '{}',
  periods            text[] not null default '{}',
  uploaded_by        text not null,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  total_records      integer not null default 0,
  successful_records integer not null default 0,
  failed_records     integer not null default 0,
  duplicate_records  integer not null default 0,
  warning_records    integer not null default 0,
  status             text not null check (status in ('Running', 'Failed', 'Imported', 'Imported - exceptions open', 'Published', 'Withdrawn')),
  file_checks        jsonb not null default '[]',
  error              text
);
create index if not exists import_batches_workspace_started on estatecfo.import_batches (workspace_id, started_at desc);
create index if not exists import_batches_connection_category on estatecfo.import_batches (connection_id, category, status);

create table if not exists estatecfo.batch_files (
  batch_id      text primary key references estatecfo.import_batches(id) on delete cascade,
  workspace_id  text not null references estatecfo.workspaces(id),
  file_name     text not null,
  size_bytes    bigint not null,
  sha256        text not null,
  storage_uri   text not null                  -- object storage location of the original upload
);

-- ---------------------------------------------------- H. common data model core
-- Every normalized record keeps full lineage. Typed CDM tables below hang off this table.
create table if not exists estatecfo.cdm_records (
  id                 text primary key,         -- <batch_id>:<source row>
  workspace_id       text not null references estatecfo.workspaces(id),
  batch_id           text not null references estatecfo.import_batches(id) on delete cascade,
  connection_id      text not null references estatecfo.connections(id),
  category           text not null,
  source_row         integer not null,
  status             text not null check (status in ('imported', 'error', 'duplicate')),
  source_system      text not null,
  source_record_id   text not null,
  legal_entity_id    text,
  property_id        text,
  reporting_period   text,
  record_key         text,                     -- duplicate-detection key from the category definition
  values             jsonb not null,
  raw                jsonb not null,           -- original source values, never altered
  issues             jsonb not null default '[]'
);
create index if not exists cdm_records_batch on estatecfo.cdm_records (batch_id);
create index if not exists cdm_records_dedupe on estatecfo.cdm_records (workspace_id, category, connection_id, record_key) where status = 'imported';
create index if not exists cdm_records_entity_period on estatecfo.cdm_records (workspace_id, legal_entity_id, reporting_period);
create index if not exists cdm_records_property on estatecfo.cdm_records (workspace_id, property_id);

create table if not exists estatecfo.cdm_properties (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, property_id text not null, property_name text not null, legal_entity_id text,
  property_type text, market_value numeric(18, 2), acquisition_cost numeric(18, 2)
);
create index if not exists cdm_properties_lookup on estatecfo.cdm_properties (workspace_id, property_id);

create table if not exists estatecfo.cdm_legal_entities (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, legal_entity_id text not null, entity_name text not null, parent_entity_id text, currency text
);

create table if not exists estatecfo.cdm_accounts (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, account_code text not null, account_description text not null,
  account_type text not null, account_subtype text, normal_balance text
);
create index if not exists cdm_accounts_lookup on estatecfo.cdm_accounts (workspace_id, account_code);

create table if not exists estatecfo.cdm_gl_lines (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, transaction_id text, legal_entity_id text not null, property_id text not null,
  account_code text not null, transaction_date date not null, reporting_period text not null,
  debit numeric(18, 2) not null default 0, credit numeric(18, 2) not null default 0, reference text, description text
);
create index if not exists cdm_gl_period_account on estatecfo.cdm_gl_lines (workspace_id, reporting_period, account_code);
create index if not exists cdm_gl_property on estatecfo.cdm_gl_lines (workspace_id, property_id, reporting_period);

create table if not exists estatecfo.cdm_trial_balance (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, legal_entity_id text not null, property_id text, account_code text not null, reporting_period text not null,
  opening_debit numeric(18, 2) not null default 0, opening_credit numeric(18, 2) not null default 0,
  period_debit numeric(18, 2) not null default 0, period_credit numeric(18, 2) not null default 0,
  closing_debit numeric(18, 2) not null default 0, closing_credit numeric(18, 2) not null default 0
);
create index if not exists cdm_tb_period on estatecfo.cdm_trial_balance (workspace_id, reporting_period, legal_entity_id);

create table if not exists estatecfo.cdm_statement_lines (            -- income statement, balance sheet, cash flow
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, statement text not null check (statement in ('income_statement', 'balance_sheet', 'cash_flow')),
  legal_entity_id text not null, property_id text, reporting_period text not null,
  line_item text not null, classification text not null, account_code text, amount numeric(18, 2) not null
);
create index if not exists cdm_statement_lookup on estatecfo.cdm_statement_lines (workspace_id, statement, reporting_period, legal_entity_id);

create table if not exists estatecfo.cdm_payables (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, invoice_id text not null, vendor_id text not null, legal_entity_id text, property_id text,
  invoice_date date not null, due_date date, amount numeric(18, 2) not null, balance numeric(18, 2)
);
create index if not exists cdm_payables_vendor on estatecfo.cdm_payables (workspace_id, vendor_id);

create table if not exists estatecfo.cdm_receivables (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, invoice_id text not null, customer_id text not null, legal_entity_id text, property_id text,
  invoice_date date not null, due_date date, amount numeric(18, 2) not null, balance numeric(18, 2)
);
create index if not exists cdm_receivables_customer on estatecfo.cdm_receivables (workspace_id, customer_id);

create table if not exists estatecfo.cdm_vendors (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, vendor_id text not null, vendor_name text not null, category text, payment_terms text
);

create table if not exists estatecfo.cdm_tenants (                    -- real-estate tenants (lessees), not platform workspaces
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, tenant_id text not null, tenant_name text not null, property_id text, status text
);

create table if not exists estatecfo.cdm_leases (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, lease_id text not null, property_id text not null, legal_entity_id text,
  commencement_date date not null, expiry_date date not null, payment_amount numeric(18, 2) not null,
  payment_frequency text, discount_rate numeric(9, 4), escalation_terms text
);
create index if not exists cdm_leases_lookup on estatecfo.cdm_leases (workspace_id, lease_id);

create table if not exists estatecfo.cdm_loans (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, loan_id text not null, lender text not null, legal_entity_id text, property_id text,
  current_balance numeric(18, 2) not null, interest_rate numeric(9, 4) not null, monthly_payment numeric(18, 2),
  interest_expense numeric(18, 2), principal_repaid numeric(18, 2), maturity_date date not null, collateral_value numeric(18, 2)
);

create table if not exists estatecfo.cdm_fixed_assets (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, asset_id text not null, legal_entity_id text, property_id text, asset_class text,
  acquisition_date date, cost numeric(18, 2) not null, accumulated_depreciation numeric(18, 2), net_book_value numeric(18, 2)
);

create table if not exists estatecfo.cdm_budgets (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, legal_entity_id text, property_id text, reporting_period text not null,
  account_code text not null, budget numeric(18, 2) not null, actual numeric(18, 2) not null
);

create table if not exists estatecfo.cdm_capex (
  record_id text primary key references estatecfo.cdm_records(id) on delete cascade,
  workspace_id text not null, project_id text not null, property_id text not null, description text,
  budget numeric(18, 2) not null, spent_to_date numeric(18, 2) not null, start_date date, completion_date date, status text
);

-- --------------------------------------------------- G. master data matching
create table if not exists estatecfo.master_data_links (
  id            text primary key,
  workspace_id  text not null references estatecfo.workspaces(id),
  connection_id text references estatecfo.connections(id),
  kind          text not null check (kind in ('property', 'entity')),
  source_id     text not null,
  master_id     text not null,                 -- '__new__' records a confirmed separate record
  note          text,
  linked_by     text not null,
  linked_at     timestamptz not null default now()
);
create unique index if not exists master_data_links_unique on estatecfo.master_data_links (workspace_id, kind, source_id);

-- ------------------------------------------------- multi-source governance
create table if not exists estatecfo.governance_policies (
  workspace_id       text primary key references estatecfo.workspaces(id),
  overwrite_policy   text not null default 'approval' check (overwrite_policy in ('approval', 'never')),
  materiality        numeric(18, 2) not null default 1,
  default_date_order text not null default 'MDY',
  updated_by         text not null,
  updated_at         timestamptz not null default now()
);

create table if not exists estatecfo.period_locks (
  workspace_id  text not null references estatecfo.workspaces(id),
  period        text not null,                  -- YYYY, YYYY-MM or YYYY-Qn
  locked_by     text not null,
  locked_at     timestamptz not null default now(),
  primary key (workspace_id, period)
);

create table if not exists estatecfo.publications (
  id            text primary key,
  workspace_id  text not null references estatecfo.workspaces(id),
  batch_id      text not null references estatecfo.import_batches(id),
  category      text not null,
  entity_ids    text[] not null default '{}',
  periods       text[] not null default '{}',
  published_by  text not null,
  published_at  timestamptz not null default now(),
  approval_note text,                           -- required when the publication replaced records
  active        boolean not null default true
);
create index if not exists publications_active on estatecfo.publications (workspace_id, category) where active;

create table if not exists estatecfo.source_conflicts (                -- same identifiers from different sources
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       text not null references estatecfo.workspaces(id),
  category           text not null,
  record_key         text not null,
  incoming_record_id text not null references estatecfo.cdm_records(id) on delete cascade,
  existing_record_id text not null references estatecfo.cdm_records(id) on delete cascade,
  resolution         text not null default 'open' check (resolution in ('open', 'use_incoming', 'keep_existing', 'distinct_records')),
  resolved_by        text,
  resolved_at        timestamptz,
  note               text
);
create index if not exists source_conflicts_open on estatecfo.source_conflicts (workspace_id, category) where resolution = 'open';

-- ------------------------------------------- F/I/K. validation, reconciliation, audit
create table if not exists estatecfo.validation_results (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null references estatecfo.workspaces(id),
  batch_id      text not null references estatecfo.import_batches(id) on delete cascade,
  check_id      text not null,
  passed        boolean not null,
  material      boolean not null,
  difference    numeric(18, 2),
  details       jsonb not null,
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_note   text
);
create unique index if not exists validation_results_unique on estatecfo.validation_results (batch_id, check_id);

create table if not exists estatecfo.reconciliation_runs (
  id              text primary key,
  workspace_id    text not null references estatecfo.workspaces(id),
  kind            text not null,
  source_batch_id text not null references estatecfo.import_batches(id),
  filters         jsonb not null default '{}',
  materiality     numeric(18, 2) not null,
  status          text not null check (status in ('Reconciled', 'Differences found')),
  summary         jsonb not null,
  run_by          text not null,
  run_at          timestamptz not null default now()
);
create index if not exists reconciliation_runs_recent on estatecfo.reconciliation_runs (workspace_id, run_at desc);

create table if not exists estatecfo.reconciliation_exceptions (
  run_id             text not null references estatecfo.reconciliation_runs(id) on delete cascade,
  line_key           text not null,
  status             text not null,
  legal_entity_id    text,
  property_id        text,
  account_code       text,
  reporting_period   text,
  source_amount      numeric(18, 2),
  destination_amount numeric(18, 2),
  difference         numeric(18, 2) not null,
  reviewed_by        text,
  reviewed_at        timestamptz,
  review_note        text,
  primary key (run_id, line_key)
);

create table if not exists estatecfo.audit_log (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  text not null references estatecfo.workspaces(id),
  at            timestamptz not null default now(),
  actor         text not null,
  action        text not null,
  target        text not null,
  detail        text not null
);
create index if not exists audit_log_recent on estatecfo.audit_log (workspace_id, at desc);

-- Audit entries are append-only.
create or replace function estatecfo.forbid_audit_change() returns trigger language plpgsql as $$
begin
  raise exception 'estatecfo.audit_log is append-only';
end $$;
drop trigger if exists audit_log_append_only on estatecfo.audit_log;
create trigger audit_log_append_only before update or delete on estatecfo.audit_log for each row execute function estatecfo.forbid_audit_change();

-- Row-level workspace isolation (re-runnable).
do $$
declare t text;
begin
  foreach t in array array[
    'connections', 'mapping_templates', 'import_batches', 'batch_files', 'cdm_records',
    'cdm_properties', 'cdm_legal_entities', 'cdm_accounts', 'cdm_gl_lines', 'cdm_trial_balance', 'cdm_statement_lines',
    'cdm_payables', 'cdm_receivables', 'cdm_vendors', 'cdm_tenants', 'cdm_leases', 'cdm_loans', 'cdm_fixed_assets',
    'cdm_budgets', 'cdm_capex', 'master_data_links', 'governance_policies', 'period_locks', 'publications',
    'source_conflicts', 'validation_results', 'reconciliation_runs', 'audit_log'
  ] loop
    execute format('alter table estatecfo.%I enable row level security', t);
    execute format('drop policy if exists workspace_isolation on estatecfo.%I', t);
    execute format('create policy workspace_isolation on estatecfo.%I using (workspace_id = current_setting(''app.workspace_id'', true))', t);
  end loop;
end $$;

insert into estatecfo.connectors (id, name, vendor, family, modes) values
  ('excel', 'Excel / CSV', 'Any system', 'Excel', '{file}'),
  ('yardi_voyager_8', 'Yardi Voyager 8', 'Yardi Systems', 'Yardi', '{file,api}'),
  ('sap_s4hana', 'SAP S/4HANA', 'SAP', 'ERP', '{file,api}'),
  ('sap_business_one', 'SAP Business One', 'SAP', 'ERP', '{file,api}'),
  ('oracle_fusion', 'Oracle Fusion Cloud ERP', 'Oracle', 'ERP', '{file,api}'),
  ('oracle_netsuite', 'Oracle NetSuite', 'Oracle', 'ERP', '{file,api}'),
  ('dynamics_365', 'Microsoft Dynamics 365', 'Microsoft', 'ERP', '{file,api}')
on conflict (id) do update set name = excluded.name, vendor = excluded.vendor, family = excluded.family, modes = excluded.modes;
