import type { Dataset } from "../../integrations/engine/metrics.ts";
import type { StoredRecord } from "../../integrations/engine/types.ts";
import { ageing, balances } from "./analytics.ts";
import { addDays, isDate, round2 } from "./dates.ts";
import type { AgeBucket, ArBook, ArCreditNote, ArInvoice, ArLease, ArTenant, ChargeSchedule, ChargeType, Frequency, Lineage } from "./types.ts";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lineage(record: StoredRecord): Lineage {
  return { system: record.sourceSystem, recordId: record.sourceRecordId, jobId: record.jobId, connectionId: record.connectionId };
}

export function chargeTypeFor(code: string): ChargeType {
  const value = code.toLowerCase();
  if (/(^|[^a-z])(rent|rnt|base)/.test(value)) return "base_rent";
  if (/cam|common area/.test(value)) return "cam";
  if (/util|elec|water|gas|sewer/.test(value)) return "utilities";
  if (/maint|repair/.test(value)) return "maintenance";
  if (/park|prk|garage/.test(value)) return "parking";
  if (/late/.test(value)) return "late_fee";
  return "other";
}

export function frequencyFor(value: string): Frequency {
  const lower = value.toLowerCase();
  if (lower.startsWith("q")) return "quarterly";
  if (lower.startsWith("a") || lower.startsWith("y")) return "annual";
  return "monthly";
}

function escalationFrom(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
}

export interface ImportPlan {
  tenants: { add: ArTenant[]; update: ArTenant[] };
  leases: { add: ArLease[]; update: ArLease[] };
  invoices: ArInvoice[];
  creditNotes: ArCreditNote[];
  skipped: { kind: string; reference: string; reason: string }[];
}

export interface PlanContext {
  workspaceId: string;
  user: string;
  now: string;
  groupCurrency: string;
  defaultTermsDays: number;
  propertyNames: Record<string, string>;
  propertyEntities: Record<string, string>;
  /** "never" adds new records only; "approval" also updates records previously imported from the same connection. */
  policy: "approval" | "never";
}

function sameSource(existing: Lineage, record: StoredRecord): boolean {
  return Boolean(existing.connectionId) && existing.connectionId === record.connectionId;
}

/**
 * Plans how published integration records become AR master data and open items. Records created in
 * EstateCFO are never overwritten by imports; a code clash is reported instead of assuming the two
 * records are the same tenant or lease.
 */
export function planImport(book: ArBook, dataset: Dataset, context: PlanContext): ImportPlan {
  const plan: ImportPlan = { tenants: { add: [], update: [] }, leases: { add: [], update: [] }, invoices: [], creditNotes: [], skipped: [] };
  const tenantsByCode = new Map(book.tenants.map((tenant) => [tenant.code.toUpperCase(), tenant]));
  const leasesByCode = new Map(book.leases.map((lease) => [lease.code.toUpperCase(), lease]));
  const blockedTenants = new Set<string>();

  const upsertTenant = (record: StoredRecord, values: Partial<ArTenant> & { code: string; name: string }): ArTenant | null => {
    const code = values.code.toUpperCase();
    const existing = tenantsByCode.get(code);
    if (existing && !sameSource(existing.source, record)) {
      blockedTenants.add(code);
      plan.skipped.push({ kind: "Tenant", reference: values.code, reason: `Tenant code ${values.code} already exists from ${existing.source.system}. It was not overwritten and is not assumed to be the same tenant; rename one of them or import through the same connection.` });
      return null;
    }
    const propertyId = values.propertyId ?? existing?.propertyId ?? "";
    const tenant: ArTenant = {
      id: existing?.id ?? `${context.workspaceId}:T:${code}`,
      workspaceId: context.workspaceId,
      code: values.code,
      name: values.name,
      entityId: values.entityId || existing?.entityId || context.propertyEntities[propertyId] || "",
      propertyId,
      propertyName: context.propertyNames[propertyId] ?? existing?.propertyName ?? propertyId,
      building: values.building ?? existing?.building ?? "",
      unit: values.unit ?? existing?.unit ?? "",
      contactName: values.contactName ?? existing?.contactName ?? "",
      email: values.email ?? existing?.email ?? "",
      phone: values.phone ?? existing?.phone ?? "",
      billingFrequency: values.billingFrequency ?? existing?.billingFrequency ?? "monthly",
      paymentTermsDays: values.paymentTermsDays ?? existing?.paymentTermsDays ?? context.defaultTermsDays,
      currency: values.currency ?? existing?.currency ?? context.groupCurrency,
      collectionOwner: existing?.collectionOwner ?? context.user,
      status: values.status ?? existing?.status ?? "Active",
      source: lineage(record),
      createdAt: existing?.createdAt ?? context.now,
      updatedAt: context.now,
    };
    if (existing) {
      if (context.policy === "never") {
        plan.skipped.push({ kind: "Tenant", reference: values.code, reason: "Already in the register; the overwrite policy is “never overwrite”, so it was not updated." });
        return existing;
      }
      plan.tenants.update.push(tenant);
    } else plan.tenants.add.push(tenant);
    tenantsByCode.set(code, tenant);
    return tenant;
  };

  for (const record of dataset.tenant_master ?? []) {
    const values = record.values;
    const status = text(values.status).toLowerCase();
    upsertTenant(record, {
      code: text(values.tenant_id),
      name: text(values.tenant_name),
      propertyId: record.propertyId ?? undefined,
      entityId: record.entityId ?? undefined,
      unit: text(values.unit_id) || undefined,
      contactName: text(values.contact_name) || undefined,
      email: text(values.contact_email) || undefined,
      phone: text(values.phone) || undefined,
      paymentTermsDays: num(values.payment_terms_days) ?? undefined,
      billingFrequency: text(values.billing_frequency) ? frequencyFor(text(values.billing_frequency)) : undefined,
      status: status && /past|former|inactive|moved/.test(status) ? "Inactive" : "Active",
    });
  }

  const chargesByLease = new Map<string, ChargeSchedule[]>();
  for (const record of dataset.rent_charges ?? []) {
    const values = record.values;
    const lease = text(values.lease_id).toUpperCase();
    const code = text(values.charge_code);
    const charge: ChargeSchedule = {
      id: `${code}:${text(values.start_date) || "lease"}`,
      type: chargeTypeFor(`${code} ${text(values.description)}`),
      description: text(values.description) || code,
      amount: num(values.amount) ?? 0,
      frequency: frequencyFor(text(values.frequency)),
      start: text(values.start_date) || undefined,
      end: text(values.end_date) || undefined,
      escalationPct: num(values.escalation_pct) ?? 0,
    };
    chargesByLease.set(lease, [...(chargesByLease.get(lease) ?? []), charge]);
  }

  for (const record of dataset.lease_register ?? []) {
    const values = record.values;
    const code = text(values.lease_id);
    if (text(values.lease_type).toLowerCase() === "lessee") {
      plan.skipped.push({ kind: "Lease", reference: code, reason: "Lessee lease: accounted for in the IFRS 16 application, not billed by AR." });
      continue;
    }
    const tenantCode = text(values.tenant_id) || text(values.tenant_name);
    if (!tenantCode) {
      plan.skipped.push({ kind: "Lease", reference: code, reason: "No tenant on the lease record." });
      continue;
    }
    if (blockedTenants.has(tenantCode.toUpperCase())) {
      plan.skipped.push({ kind: "Lease", reference: code, reason: `Tenant ${tenantCode} was not imported (code clash).` });
      continue;
    }
    const tenant = tenantsByCode.get(tenantCode.toUpperCase()) ?? upsertTenant(record, { code: tenantCode, name: text(values.tenant_name) || tenantCode, propertyId: record.propertyId ?? undefined, entityId: record.entityId ?? undefined, unit: text(values.unit_id) || undefined });
    if (!tenant) continue;
    const existing = leasesByCode.get(code.toUpperCase());
    if (existing && !sameSource(existing.source, record)) {
      plan.skipped.push({ kind: "Lease", reference: code, reason: `Lease ${code} already exists from ${existing.source.system}; not overwritten.` });
      continue;
    }
    if (existing && context.policy === "never") {
      plan.skipped.push({ kind: "Lease", reference: code, reason: "Already in AR; the overwrite policy is “never overwrite”." });
      continue;
    }
    const start = text(values.commencement_date);
    const end = text(values.expiry_date);
    const imported = chargesByLease.get(code.toUpperCase());
    const charges: ChargeSchedule[] = imported ?? [{ id: "base_rent", type: "base_rent", description: "Base rent", amount: num(values.payment_amount) ?? 0, frequency: frequencyFor(text(values.payment_frequency)), escalationPct: escalationFrom(text(values.escalation_terms)) }];
    const propertyId = record.propertyId ?? tenant.propertyId;
    const lease: ArLease = {
      id: existing?.id ?? `${context.workspaceId}:L:${code.toUpperCase()}`,
      workspaceId: context.workspaceId,
      code,
      tenantId: tenant.id,
      entityId: record.entityId || tenant.entityId || context.propertyEntities[propertyId] || "",
      propertyId,
      propertyName: context.propertyNames[propertyId] ?? propertyId,
      building: tenant.building,
      unit: text(values.unit_id) || tenant.unit,
      start,
      end,
      currency: text(values.currency) || tenant.currency,
      charges,
      depositRequired: num(values.deposit_amount) ?? existing?.depositRequired ?? 0,
      status: end && end < context.now.slice(0, 10) ? "Ended" : "Active",
      source: lineage(record),
      createdAt: existing?.createdAt ?? context.now,
      updatedAt: context.now,
    };
    if (!isDate(start) || !isDate(end) || end < start) {
      plan.skipped.push({ kind: "Lease", reference: code, reason: "Commencement and expiry dates are missing or out of order." });
      continue;
    }
    (existing ? plan.leases.update : plan.leases.add).push(lease);
    leasesByCode.set(code.toUpperCase(), lease);
  }

  for (const [leaseCode] of chargesByLease) {
    if (![...plan.leases.add, ...plan.leases.update].some((lease) => lease.code.toUpperCase() === leaseCode)) {
      const existing = leasesByCode.get(leaseCode);
      plan.skipped.push({ kind: "Rent charges", reference: leaseCode, reason: existing ? "Charges belong to a lease that was not updated by this import." : "No lease with this code; import the lease register first." });
    }
  }

  const importedKeys = new Set(book.invoices.flatMap((invoice) => invoice.billingKeys));
  for (const record of dataset.accounts_receivable ?? []) {
    const values = record.values;
    const tenantCode = text(values.customer_id);
    const number = text(values.invoice_id);
    const key = `import|${record.connectionId}|${tenantCode.toUpperCase()}|${number.toUpperCase()}`;
    if (importedKeys.has(key)) {
      plan.skipped.push({ kind: "Invoice", reference: number, reason: "Already brought into AR from this connection." });
      continue;
    }
    if (blockedTenants.has(tenantCode.toUpperCase())) {
      plan.skipped.push({ kind: "Invoice", reference: number, reason: `Tenant ${tenantCode} was not imported (code clash).` });
      continue;
    }
    const tenant = tenantsByCode.get(tenantCode.toUpperCase()) ?? upsertTenant(record, { code: tenantCode, name: text(values.customer_name) || tenantCode, propertyId: record.propertyId ?? undefined, entityId: record.entityId ?? undefined });
    if (!tenant) continue;
    const amount = num(values.amount) ?? 0;
    const balance = num(values.balance) ?? round2(amount - (num(values.amount_received) ?? 0));
    if (balance <= 0) {
      plan.skipped.push({ kind: "Invoice", reference: number, reason: "Fully settled in the source system; nothing to collect." });
      continue;
    }
    const invoiceDate = text(values.invoice_date);
    const propertyId = record.propertyId ?? tenant.propertyId;
    plan.invoices.push({
      id: `${context.workspaceId}:INV:import:${record.jobId}:${record.row}`,
      workspaceId: context.workspaceId,
      number,
      kind: "imported",
      tenantId: tenant.id,
      entityId: record.entityId || tenant.entityId,
      propertyId,
      unit: tenant.unit,
      invoiceDate,
      dueDate: text(values.due_date) || invoiceDate,
      periodStart: invoiceDate,
      periodEnd: invoiceDate,
      billingPeriod: invoiceDate.slice(0, 7),
      currency: tenant.currency,
      lines: [{ chargeType: "other", description: `Imported receivable ${number}`, amount, periodStart: invoiceDate, periodEnd: invoiceDate }],
      total: amount,
      priorCollected: round2(amount - balance),
      billingKeys: [key],
      status: "Draft",
      source: lineage(record),
      createdBy: context.user,
      createdAt: context.now,
    });
    importedKeys.add(key);
  }

  const creditKeys = new Set(book.creditNotes.map((note) => note.source.recordId).filter(Boolean));
  const allInvoices = [...book.invoices, ...plan.invoices];
  for (const record of dataset.credit_notes ?? []) {
    const values = record.values;
    const number = text(values.credit_note_id);
    if (creditKeys.has(record.sourceRecordId)) {
      plan.skipped.push({ kind: "Credit note", reference: number, reason: "Already brought into AR." });
      continue;
    }
    const invoiceRef = text(values.invoice_id).toUpperCase();
    const invoice = allInvoices.find((item) => item.number.toUpperCase() === invoiceRef && item.status !== "Reversed");
    if (!invoice) {
      plan.skipped.push({ kind: "Credit note", reference: number, reason: `Invoice ${text(values.invoice_id)} is not in AR.` });
      continue;
    }
    plan.creditNotes.push({
      id: `${context.workspaceId}:CN:import:${record.jobId}:${record.row}`,
      workspaceId: context.workspaceId,
      number,
      type: "credit",
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      entityId: invoice.entityId,
      date: text(values.credit_date),
      amount: Math.abs(num(values.amount) ?? 0),
      chargeType: invoice.lines[0]?.chargeType ?? "other",
      reason: text(values.reason) || `Imported credit note ${number}`,
      status: "Draft",
      requestedBy: context.user,
      requestedAt: context.now,
      source: lineage(record),
    });
  }
  return plan;
}

export interface BankLine {
  key: string;
  kind: "Receipt export" | "Bank transaction";
  date: string;
  amount: number;
  description: string;
  reference: string;
  bankAccount: string;
  tenantCode: string;
  invoiceRef: string;
  entityId: string;
  source: Lineage;
}

/** Receipts from payment-transaction exports and inflows from bank transaction imports, not yet matched in AR. */
export function bankLines(book: ArBook, dataset: Dataset): BankLine[] {
  const matched = new Set(book.payments.filter((payment) => payment.status !== "Reversed" && payment.bankLineRef).map((payment) => payment.bankLineRef as string));
  const lines: BankLine[] = [];
  for (const record of dataset.ar_payments ?? []) {
    const values = record.values;
    const key = `${record.connectionId}|receipt|${text(values.receipt_id)}|${text(values.tenant_id)}`;
    if (matched.has(key)) continue;
    lines.push({ key, kind: "Receipt export", date: text(values.receipt_date), amount: num(values.amount) ?? 0, description: text(values.tenant_name), reference: text(values.reference) || text(values.receipt_id), bankAccount: text(values.bank_account), tenantCode: text(values.tenant_id), invoiceRef: text(values.invoice_id), entityId: record.entityId ?? "", source: lineage(record) });
  }
  for (const record of dataset.cash_transactions ?? []) {
    const values = record.values;
    const amount = num(values.amount) ?? 0;
    if (amount <= 0) continue;
    const key = `${record.connectionId}|bank|${text(values.transaction_id) || record.sourceRecordId}|${text(values.transaction_date)}|${amount}`;
    if (matched.has(key)) continue;
    lines.push({ key, kind: "Bank transaction", date: text(values.transaction_date), amount, description: text(values.description), reference: text(values.transaction_id), bankAccount: text(values.bank_account), tenantCode: "", invoiceRef: "", entityId: record.entityId ?? "", source: lineage(record) });
  }
  return lines.sort((a, b) => b.date.localeCompare(a.date));
}

export interface MatchSuggestion {
  tenantId?: string;
  allocations: { invoiceId: string; amount: number }[];
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
}

/** Suggests a tenant and invoices for a bank line. The user confirms; nothing is applied automatically. */
export function suggestMatch(book: ArBook, line: BankLine, asOf: string): MatchSuggestion {
  const open = [...balances(book, asOf).values()].filter((balance) => balance.outstanding > 0).sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));
  const haystack = `${line.description} ${line.reference} ${line.invoiceRef}`.toUpperCase();
  const byInvoice = open.find((balance) => balance.invoice.number && haystack.includes(balance.invoice.number.toUpperCase()));
  let tenantId = byInvoice?.invoice.tenantId;
  let reason = byInvoice ? `Reference mentions ${byInvoice.invoice.number}` : "";
  if (!tenantId && line.tenantCode) {
    const tenant = book.tenants.find((item) => item.code.toUpperCase() === line.tenantCode.toUpperCase());
    if (tenant) {
      tenantId = tenant.id;
      reason = `Tenant code ${tenant.code}`;
    }
  }
  if (!tenantId) {
    const tenant = book.tenants.find((item) => item.name.length > 3 && haystack.includes(item.name.toUpperCase()));
    if (tenant) {
      tenantId = tenant.id;
      reason = `Description mentions ${tenant.name}`;
    }
  }
  if (!tenantId) {
    const exact = open.filter((balance) => Math.abs(balance.outstanding - line.amount) < 0.005);
    if (exact.length === 1) return { tenantId: exact[0].invoice.tenantId, allocations: [{ invoiceId: exact[0].invoice.id, amount: line.amount }], confidence: "low", reason: `Amount equals the open balance of ${exact[0].invoice.number} only; confirm the payer.` };
    return { allocations: [], confidence: "none", reason: "No tenant, invoice reference, or unique amount match." };
  }
  const tenantOpen = open.filter((balance) => balance.invoice.tenantId === tenantId);
  const ordered = byInvoice ? [byInvoice, ...tenantOpen.filter((balance) => balance.invoice.id !== byInvoice.invoice.id)] : tenantOpen;
  let left = line.amount;
  const allocations: { invoiceId: string; amount: number }[] = [];
  for (const balance of ordered) {
    if (left <= 0) break;
    const amount = round2(Math.min(left, balance.outstanding));
    allocations.push({ invoiceId: balance.invoice.id, amount });
    left = round2(left - amount);
  }
  return { tenantId, allocations, confidence: byInvoice ? "high" : "medium", reason: `${reason}; allocated oldest first${left > 0 ? `, ${left.toFixed(2)} left unallocated` : ""}.` };
}

export interface AgeingReconRow {
  tenantCode: string;
  tenantName: string;
  source: Record<AgeBucket, number> & { total: number };
  estatecfo: Record<AgeBucket, number> & { total: number };
  difference: number;
}

/** Compares a source system's ageing report with EstateCFO's ageing at the same date, by tenant code. */
export function reconcileAgeing(book: ArBook, dataset: Dataset): { asOf: string | null; rows: AgeingReconRow[]; source: string } {
  const records = dataset.ar_ageing ?? [];
  if (records.length === 0) return { asOf: null, rows: [], source: "" };
  const asOf = text(records[0].values.as_of_date);
  const empty = () => ({ Current: 0, "1–30": 0, "31–60": 0, "61–90": 0, "90+": 0, total: 0 });
  const rows = new Map<string, AgeingReconRow>();
  for (const record of records) {
    const values = record.values;
    const code = text(values.tenant_id).toUpperCase();
    const row = rows.get(code) ?? { tenantCode: text(values.tenant_id), tenantName: text(values.tenant_name), source: empty(), estatecfo: empty(), difference: 0 };
    row.source.Current += num(values.current) ?? 0;
    row.source["1–30"] += num(values.d1_30) ?? 0;
    row.source["31–60"] += num(values.d31_60) ?? 0;
    row.source["61–90"] += num(values.d61_90) ?? 0;
    row.source["90+"] += num(values.d90_plus) ?? 0;
    row.source.total += num(values.total) ?? (num(values.current) ?? 0) + (num(values.d1_30) ?? 0) + (num(values.d31_60) ?? 0) + (num(values.d61_90) ?? 0) + (num(values.d90_plus) ?? 0);
    rows.set(code, row);
  }
  const tenantCode = new Map(book.tenants.map((tenant) => [tenant.id, tenant]));
  for (const item of ageing(book, isDate(asOf) ? asOf : addDays(new Date().toISOString().slice(0, 10), 0))) {
    const tenant = tenantCode.get(item.invoice.tenantId);
    const code = (tenant?.code ?? item.invoice.tenantId).toUpperCase();
    const row = rows.get(code) ?? { tenantCode: tenant?.code ?? code, tenantName: item.tenantName, source: empty(), estatecfo: empty(), difference: 0 };
    row.estatecfo[item.bucket] += item.outstanding;
    row.estatecfo.total += item.outstanding;
    rows.set(code, row);
  }
  const result = [...rows.values()].map((row) => {
    for (const key of Object.keys(row.source) as (keyof typeof row.source)[]) {
      row.source[key] = round2(row.source[key]);
      row.estatecfo[key] = round2(row.estatecfo[key]);
    }
    return { ...row, difference: round2(row.source.total - row.estatecfo.total) };
  });
  return { asOf, rows: result.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)), source: [...new Set(records.map((record) => record.sourceSystem))].join(", ") };
}
