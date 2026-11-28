# RealestateERP — Phase 5 Supabase Migrations

Three migration files. Apply in order. All are idempotent where possible.

## Prerequisites

1. A Supabase project created (free tier is fine for development).
2. The base `db/integration_schema.sql` already applied (creates `estatecfo` schema,
   `workspaces`, `connectors`, `connections`, `import_batches`, `cdm_records` tables).
3. Supabase Auth enabled (email/password provider).

---

## Apply Order

### 001_estatecfo_extensions.sql

Adds to the existing `estatecfo` schema:
- `user_workspaces` — maps Auth users to workspaces with roles
- `audit_log` — append-only audit trail (replaces IndexedDB `audit` store)
- `has_access()` — SECURITY DEFINER helper used by all RLS policies
- RLS policies on all existing `estatecfo.*` tables

**Apply in Supabase SQL editor or via CLI:**
```
supabase db push  -- if using migrations folder
-- or paste into SQL Editor → Run
```

**Exit check:** `SELECT * FROM estatecfo.user_workspaces LIMIT 1;` returns empty (no error).

---

### 002_ar_schema.sql

Creates the entire `ar` schema (12 tables + counter function + RLS policies):

| Table | Replaces IDB store |
|---|---|
| `ar.counters` | `ar_settings.counters` JSONB |
| `ar.settings` | `ar_settings` |
| `ar.tenants` | `ar_tenants` |
| `ar.leases` | `ar_leases` |
| `ar.invoices` | `ar_invoices` |
| `ar.journals` | `ar_journals` (header only) |
| `ar.journal_lines` | `ar_journals[].lines` (embedded → normalized) |
| `ar.payments` | `ar_payments` |
| `ar.payment_allocations` | `ar_payments[].allocations` (embedded → normalized) |
| `ar.credit_notes` | `ar_credit_notes` |
| `ar.deposits` | `ar_deposits` |
| `ar.followups` | `ar_followups` |
| `ar.disputes` | `ar_disputes` |

**Exit check:** `SELECT table_name FROM information_schema.tables WHERE table_schema = 'ar' ORDER BY 1;`
Should return 13 rows (counters + settings + 11 entity tables).

---

### 003_ros_schema.sql

Creates the `ros` schema (5 tables + RLS policies):
- `ros.properties` — 5 properties (seeded in Phase 5.7)
- `ros.buildings` — 10 buildings
- `ros.units` — 200 units
- `ros.vendors` — maintenance vendors
- `ros.maintenance_requests` — work requests

**Exit check:** `SELECT table_name FROM information_schema.tables WHERE table_schema = 'ros' ORDER BY 1;`
Should return 5 rows.

---

## Phase 5.1 Exit Criteria (from approval gate)

All of the following must pass before Phase 5.2 (SupabaseAdapter) work begins:

```sql
-- 1. All 3 schemas exist
SELECT schema_name FROM information_schema.schemata
  WHERE schema_name IN ('estatecfo','ar','ros');
-- Expected: 3 rows

-- 2. ar schema has 13 tables
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'ar';
-- Expected: 13

-- 3. ros schema has 5 tables
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'ros';
-- Expected: 5

-- 4. Composite unique constraints exist (workspace isolation)
SELECT conname FROM pg_constraint
  WHERE conname IN (
    'ar_tenants_ws_id_unique','ar_leases_ws_id_unique',
    'ar_invoices_ws_id_unique','ar_journals_ws_id_unique',
    'ros_prop_ws_id_unique','ros_bldg_ws_id_unique'
  );
-- Expected: 6 rows

-- 5. RLS enabled on all ar.* and ros.* tables
SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname IN ('ar','ros') AND rowsecurity = false;
-- Expected: 0 rows

-- 6. Counter function works
SELECT ar.next_counter('test-workspace', 'invoice');
-- Expected: 'INV-00001'
SELECT ar.next_counter('test-workspace', 'invoice');
-- Expected: 'INV-00002'

-- 7. Cleanup test counter
DELETE FROM ar.counters WHERE workspace_id = 'test-workspace';
```

---

## Architecture decisions locked

| # | Decision | Choice |
|---|---|---|
| D1 | Invoice numbering | Sequential INV-00001 (never resets) |
| D2 | Auth | Supabase email/password |
| D3 | Lease charges | JSONB in ar.leases.charges |
| D4 | Invoice lines | JSONB in ar.invoices.lines |
| D5 | Payment allocations | Normalized ar.payment_allocations |
| D6 | Transactional RPCs | PostgreSQL plpgsql via supabase.rpc() |
| D7 | Multi-workspace UI | React workspace context |
| D8 | Dead navigation | Maintenance + Vendors only; hide remaining 16 |
| D9 | Group currency | INR (MHLP reports in INR; functional_to_group = 1.0) |

---

## Next phase

**Phase 5.2** — implement `SupabaseAdapter` (the `kind: "server"` StorageAdapter).
Seven workflows require PostgreSQL RPCs (see approval gate §3):
`post_invoice`, `record_payment`, `approve_credit_note`, `reverse_journal`,
`settle_deposit`, `allocate_payment`, `bring_in`.
