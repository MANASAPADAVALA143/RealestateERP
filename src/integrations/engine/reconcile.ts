import { normalizeId } from "./matching.ts";
import { categoryById } from "./categories.ts";
import { recordKey } from "./validate.ts";
import type { CategoryId, MasterRecord, StoredRecord } from "./types.ts";

export type ReconKind = "tb_vs_gl" | "gl_vs_gl" | "property_master" | "lease_register" | "ap" | "ar";

export const reconKinds: { id: ReconKind; label: string; source: CategoryId; destination: string; measure: string }[] = [
  { id: "tb_vs_gl", label: "Source Trial Balance (Yardi, ERP, or Excel) vs EstateCFO Trial Balance", source: "trial_balance", destination: "EstateCFO trial balance (published GL, net movement by account)", measure: "Net period movement (debit − credit)" },
  { id: "gl_vs_gl", label: "Source GL vs EstateCFO GL", source: "gl_transactions", destination: "Published EstateCFO general ledger", measure: "Line amount (debit − credit)" },
  { id: "property_master", label: "Source Property Master vs EstateCFO Property Master", source: "property_master", destination: "EstateCFO property master", measure: "Market value" },
  { id: "lease_register", label: "Source Lease Register vs EstateCFO Lease Register", source: "lease_register", destination: "Published EstateCFO lease register", measure: "Lease payment" },
  { id: "ap", label: "Imported AP vs EstateCFO AP", source: "accounts_payable", destination: "Published EstateCFO accounts payable", measure: "Open balance" },
  { id: "ar", label: "Imported AR vs EstateCFO AR", source: "accounts_receivable", destination: "Published EstateCFO accounts receivable", measure: "Open balance" },
];

export interface ReconFilters {
  entity?: string;
  property?: string;
  account?: string;
  period?: string;
}

export type ExceptionStatus = "matched" | "difference" | "missing_in_destination" | "missing_in_source" | "duplicate_source" | "duplicate_destination";

export interface ReconLine {
  key: string;
  status: ExceptionStatus;
  entity: string | null;
  property: string | null;
  account: string | null;
  period: string | null;
  sourceAmount: number | null;
  destinationAmount: number | null;
  difference: number;
  note: string;
  source?: Record<string, string | number | null>;
  destination?: Record<string, string | number | null>;
}

export interface ReconResult {
  kind: ReconKind;
  lines: ReconLine[];
  summary: {
    sourceBalance: number;
    destinationBalance: number;
    difference: number;
    matched: number;
    unmatched: number;
    missing: number;
    duplicates: number;
    exceptions: number;
  };
  status: "Reconciled" | "Differences found";
}

interface Side {
  key: string;
  amount: number;
  entity: string | null;
  property: string | null;
  account: string | null;
  period: string | null;
  label?: string;
  values: Record<string, string | number | null>;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function passes(side: Side, filters: ReconFilters): boolean {
  if (filters.entity && normalizeId(side.entity ?? "") !== normalizeId(filters.entity)) return false;
  if (filters.property && normalizeId(side.property ?? "") !== normalizeId(filters.property)) return false;
  if (filters.account && normalizeId(side.account ?? "") !== normalizeId(filters.account)) return false;
  if (filters.period && side.period !== filters.period && !(side.period ?? "").startsWith(filters.period)) return false;
  return true;
}

function fromRecord(record: StoredRecord, key: string, amount: number): Side {
  return {
    key,
    amount,
    entity: record.entityId ?? str(record.values.entity_id),
    property: record.propertyId ?? str(record.values.property_id),
    account: str(record.values.account_code),
    period: record.period ?? str(record.values.period),
    values: record.values,
  };
}

function aggregate(sides: Side[]): Map<string, Side[]> {
  const map = new Map<string, Side[]>();
  for (const side of sides) map.set(side.key, [...(map.get(side.key) ?? []), side]);
  return map;
}

function sides(kind: ReconKind, records: StoredRecord[], role: "source" | "destination"): Side[] {
  if (kind === "tb_vs_gl") {
    if (role === "source") {
      return records.map((record) => {
        const entity = record.entityId ?? str(record.values.entity_id) ?? "";
        const account = str(record.values.account_code) ?? "";
        const period = record.period ?? "";
        return fromRecord(record, `${normalizeId(entity)}|${normalizeId(account)}|${period}`, round(num(record.values.period_debit) - num(record.values.period_credit)));
      });
    }
    const totals = new Map<string, Side>();
    for (const record of records) {
      const entity = record.entityId ?? str(record.values.entity_id) ?? "";
      const account = str(record.values.account_code) ?? "";
      const period = record.period ?? (typeof record.values.transaction_date === "string" ? record.values.transaction_date.slice(0, 7) : "");
      const key = `${normalizeId(entity)}|${normalizeId(account)}|${period}`;
      const existing = totals.get(key);
      const amount = num(record.values.debit) - num(record.values.credit);
      if (existing) existing.amount = round(existing.amount + amount);
      else totals.set(key, { key, amount: round(amount), entity, property: null, account, period, values: { entity_id: entity, account_code: account, period, lines: 1 } });
    }
    return [...totals.values()];
  }
  if (kind === "gl_vs_gl") {
    const category = categoryById("gl_transactions");
    return records.map((record) => fromRecord(record, recordKey(category, record.values) ?? record.id, round(num(record.values.debit) - num(record.values.credit))));
  }
  if (kind === "property_master") return records.map((record) => ({ ...fromRecord(record, normalizeId(String(record.values.property_id ?? "")), num(record.values.market_value)), label: str(record.values.property_name) ?? undefined }));
  if (kind === "lease_register") return records.map((record) => fromRecord(record, normalizeId(String(record.values.lease_id ?? "")), num(record.values.payment_amount)));
  const idField = kind === "ap" ? "vendor_id" : "customer_id";
  return records.map((record) => {
    const balance = record.values.balance !== null && record.values.balance !== undefined ? num(record.values.balance) : num(record.values.amount) - num(record.values[kind === "ap" ? "amount_paid" : "amount_received"]);
    return fromRecord(record, `${normalizeId(String(record.values.invoice_id ?? ""))}|${normalizeId(String(record.values[idField] ?? ""))}`, round(balance));
  });
}

export function masterAsRecords(master: MasterRecord[], values: Record<string, Record<string, string | number | null>>): StoredRecord[] {
  return master.map((item) => ({
    id: `master-${item.id}`,
    tenantId: "",
    jobId: item.source,
    connectionId: "estatecfo",
    category: "property_master",
    row: 0,
    status: "imported",
    sourceSystem: "EstateCFO",
    sourceRecordId: item.id,
    entityId: null,
    propertyId: item.id,
    period: null,
    values: { property_id: item.id, property_name: item.name, ...(values[item.id] ?? {}) },
    raw: {},
    issues: [],
  }));
}

export function reconcile(kind: ReconKind, source: StoredRecord[], destination: StoredRecord[], filters: ReconFilters, materiality: number): ReconResult {
  const sourceSides = aggregate(sides(kind, source, "source").filter((side) => passes(side, filters)));
  const destinationSides = aggregate(sides(kind, destination, "destination").filter((side) => passes(side, filters)));
  const keys = new Set([...sourceSides.keys(), ...destinationSides.keys()]);
  const lines: ReconLine[] = [];

  for (const key of keys) {
    const left = sourceSides.get(key) ?? [];
    const right = destinationSides.get(key) ?? [];
    const first = left[0] ?? right[0];
    const base = { key, entity: first.entity, property: first.property, account: first.account, period: first.period, source: left[0]?.values, destination: right[0]?.values };
    if (left.length > 1) {
      lines.push({ ...base, status: "duplicate_source", sourceAmount: round(left.reduce((total, side) => total + side.amount, 0)), destinationAmount: right[0]?.amount ?? null, difference: 0, note: `${left.length} source records share this key.` });
      continue;
    }
    if (right.length > 1) {
      lines.push({ ...base, status: "duplicate_destination", sourceAmount: left[0]?.amount ?? null, destinationAmount: round(right.reduce((total, side) => total + side.amount, 0)), difference: 0, note: `${right.length} EstateCFO records share this key.` });
      continue;
    }
    if (left.length === 0) {
      lines.push({ ...base, status: "missing_in_source", sourceAmount: null, destinationAmount: right[0].amount, difference: round(-right[0].amount), note: "In EstateCFO but not in the source file." });
      continue;
    }
    if (right.length === 0) {
      lines.push({ ...base, status: "missing_in_destination", sourceAmount: left[0].amount, destinationAmount: null, difference: round(left[0].amount), note: "In the source file but not in EstateCFO." });
      continue;
    }
    const difference = round(left[0].amount - right[0].amount);
    const nameDiffers = kind === "property_master" && left[0].label && right[0].label && left[0].label.trim().toLowerCase() !== right[0].label.trim().toLowerCase();
    if (Math.abs(difference) > materiality || nameDiffers) {
      lines.push({ ...base, status: "difference", sourceAmount: left[0].amount, destinationAmount: right[0].amount, difference, note: nameDiffers ? `Name differs: "${left[0].label}" vs "${right[0].label}".` : "Amounts differ." });
    } else {
      lines.push({ ...base, status: "matched", sourceAmount: left[0].amount, destinationAmount: right[0].amount, difference, note: "Matched." });
    }
  }

  lines.sort((a, b) => (a.status === "matched" ? 1 : 0) - (b.status === "matched" ? 1 : 0) || Math.abs(b.difference) - Math.abs(a.difference));
  const sourceBalance = round([...sourceSides.values()].flat().reduce((total, side) => total + side.amount, 0));
  const destinationBalance = round([...destinationSides.values()].flat().reduce((total, side) => total + side.amount, 0));
  const count = (...statuses: ExceptionStatus[]) => lines.filter((line) => statuses.includes(line.status)).length;
  const exceptions = lines.filter((line) => line.status !== "matched").length;
  return {
    kind,
    lines,
    summary: {
      sourceBalance,
      destinationBalance,
      difference: round(sourceBalance - destinationBalance),
      matched: count("matched"),
      unmatched: count("difference"),
      missing: count("missing_in_destination", "missing_in_source"),
      duplicates: count("duplicate_source", "duplicate_destination"),
      exceptions,
    },
    status: exceptions === 0 ? "Reconciled" : "Differences found",
  };
}
