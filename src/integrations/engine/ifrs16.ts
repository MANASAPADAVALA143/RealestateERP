import type { StoredRecord } from "./types.ts";

export const ifrs16InputFields = [
  { key: "lease_id", label: "Lease ID" },
  { key: "property_id", label: "Property ID" },
  { key: "entity_id", label: "Entity ID" },
  { key: "commencement_date", label: "Lease Commencement Date" },
  { key: "expiry_date", label: "Lease Expiry Date" },
  { key: "payment_amount", label: "Lease Payment" },
  { key: "payment_frequency", label: "Payment Frequency" },
  { key: "discount_rate", label: "Discount Rate" },
  { key: "escalation_terms", label: "Escalation Terms" },
] as const;

export const ifrs16OutputFields = [
  { key: "lease_id", label: "Lease ID", type: "string" },
  { key: "period", label: "Period", type: "string" },
  { key: "rou_asset", label: "ROU Asset", type: "number" },
  { key: "lease_liability", label: "Lease Liability", type: "number" },
  { key: "depreciation_expense", label: "Depreciation Expense", type: "number" },
  { key: "interest_expense", label: "Interest Expense", type: "number" },
  { key: "principal_repayment", label: "Principal Repayment", type: "number" },
  { key: "closing_lease_liability", label: "Closing Lease Liability", type: "number" },
  { key: "journal_reference", label: "Lease Accounting Journal", type: "string" },
  { key: "disclosure_note", label: "Disclosure Data", type: "string" },
] as const;

export const IFRS16_SCHEMA_VERSION = "estatecfo.ifrs16.exchange/v1";

export function ifrs16Payload(leases: StoredRecord[], tenantId: string) {
  return {
    schema: IFRS16_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    tenantId,
    leases: leases.map((record) => {
      const out: Record<string, string | number | null> = {};
      for (const field of ifrs16InputFields) out[field.key] = record.values[field.key] ?? null;
      out.property_id = record.propertyId ?? out.property_id;
      out.entity_id = record.entityId ?? out.entity_id;
      out.source_job_id = record.jobId;
      out.source_record_id = record.sourceRecordId;
      return out;
    }),
  };
}

export function ifrs16Rows(leases: StoredRecord[]): Record<string, string | number | null>[] {
  return ifrs16Payload(leases, "").leases;
}
