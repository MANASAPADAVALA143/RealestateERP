import { addDays, addMonths, daysBetween, maxDate, minDate, monthEnd, monthStart, round2, wholeYears } from "./dates.ts";
import { chargeLabels, frequencyMonths, type ArDispute, type ArInvoice, type ArLease, type ArSettings, type ArTenant, type InvoiceLine } from "./types.ts";

export interface ProposedInvoice {
  kind: "rent" | "late_fee";
  leaseId?: string;
  tenantId: string;
  tenantName: string;
  entityId: string;
  propertyId: string;
  unit: string;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  billingPeriod: string;
  lines: InvoiceLine[];
  total: number;
  billingKeys: string[];
}

export interface SkippedCharge {
  leaseId?: string;
  invoiceId?: string;
  tenant: string;
  charge?: string;
  reason: string;
}

/** Monthly equivalent of a lease's recurring charges at a date, including escalation to that date. */
export function contractualMonthly(lease: ArLease, asOf: string): number {
  return round2(
    lease.charges.reduce((sum, charge) => {
      if ((charge.start && charge.start > asOf) || (charge.end && charge.end < asOf)) return sum;
      const years = charge.escalationPct ? wholeYears(lease.start, asOf) : 0;
      return sum + (charge.amount * (1 + charge.escalationPct / 100) ** years) / frequencyMonths[charge.frequency];
    }, 0),
  );
}

function monthIndex(value: string): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

function billedKeys(invoices: ArInvoice[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const invoice of invoices) {
    if (invoice.status === "Reversed") continue;
    for (const key of invoice.billingKeys) map.set(key, invoice.number);
  }
  return map;
}

/**
 * Recurring billing for one calendar month. A charge is billed when one of its billing periods
 * (anchored on the first day of the lease start month) begins in that month. Partial periods are
 * prorated by days; escalation compounds on each lease anniversary. Charges already billed for the
 * same lease, charge, and period start are skipped.
 */
export function billingRun(input: { period: string; leases: ArLease[]; tenants: ArTenant[]; invoices: ArInvoice[]; invoiceDate?: string }): { proposals: ProposedInvoice[]; skipped: SkippedCharge[] } {
  const { period } = input;
  const target = monthIndex(period);
  const pMonthStart = monthStart(period);
  const pMonthEnd = monthEnd(period);
  const billed = billedKeys(input.invoices);
  const tenants = new Map(input.tenants.map((tenant) => [tenant.id, tenant]));
  const proposals: ProposedInvoice[] = [];
  const skipped: SkippedCharge[] = [];

  for (const lease of input.leases) {
    if (lease.end < pMonthStart || lease.start > pMonthEnd) continue;
    const tenant = tenants.get(lease.tenantId);
    if (!tenant) {
      skipped.push({ leaseId: lease.id, tenant: lease.tenantId, reason: `Lease ${lease.code} has no tenant in the register.` });
      continue;
    }
    if (tenant.status !== "Active") {
      skipped.push({ leaseId: lease.id, tenant: tenant.name, reason: `${tenant.name} is inactive.` });
      continue;
    }
    const anchor = monthIndex(lease.start);
    const lines: InvoiceLine[] = [];
    const keys: string[] = [];
    let invoiceStart = "";
    let invoiceEnd = "";
    for (const charge of lease.charges) {
      if (!(charge.amount > 0)) continue;
      const months = frequencyMonths[charge.frequency];
      const offset = target - anchor;
      if (offset < 0 || offset % months !== 0) continue;
      const periodStart = pMonthStart;
      const periodEnd = addDays(addMonths(periodStart, months), -1);
      const chargeStart = maxDate(lease.start, charge.start || lease.start);
      const chargeEnd = minDate(lease.end, charge.end || lease.end);
      const coverStart = maxDate(periodStart, chargeStart);
      const coverEnd = minDate(periodEnd, chargeEnd);
      if (coverStart > coverEnd) continue;
      const key = `${lease.id}|${charge.id}|${periodStart}`;
      const label = charge.description || chargeLabels[charge.type];
      const existing = billed.get(key);
      if (existing) {
        skipped.push({ leaseId: lease.id, tenant: tenant.name, charge: label, reason: `Already billed on ${existing} for the period starting ${periodStart}.` });
        continue;
      }
      const years = charge.escalationPct ? wholeYears(lease.start, coverStart) : 0;
      const escalated = charge.amount * (1 + charge.escalationPct / 100) ** years;
      const periodDays = daysBetween(periodStart, periodEnd) + 1;
      const covered = daysBetween(coverStart, coverEnd) + 1;
      const amount = round2((escalated * covered) / periodDays);
      const notes: string[] = [];
      if (years > 0) notes.push(`Escalated ${charge.escalationPct}% × ${years} year${years === 1 ? "" : "s"} from ${round2(charge.amount)}`);
      if (covered < periodDays) notes.push(`Prorated ${covered} of ${periodDays} days`);
      lines.push({ chargeId: charge.id, chargeType: charge.type, description: label, amount, periodStart: coverStart, periodEnd: coverEnd, note: notes.join("; ") || undefined });
      keys.push(key);
      invoiceStart = invoiceStart ? minDate(invoiceStart, coverStart) : coverStart;
      invoiceEnd = invoiceEnd ? maxDate(invoiceEnd, coverEnd) : coverEnd;
    }
    if (lines.length === 0) continue;
    const invoiceDate = input.invoiceDate ?? maxDate(pMonthStart, lease.start);
    proposals.push({
      kind: "rent",
      leaseId: lease.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      entityId: lease.entityId,
      propertyId: lease.propertyId,
      unit: lease.unit,
      currency: lease.currency,
      invoiceDate,
      dueDate: addDays(invoiceDate, tenant.paymentTermsDays),
      periodStart: invoiceStart,
      periodEnd: invoiceEnd,
      billingPeriod: period,
      lines,
      total: round2(lines.reduce((sum, line) => sum + line.amount, 0)),
      billingKeys: keys,
    });
  }
  return { proposals, skipped };
}

/** One late payment charge per overdue invoice past the grace period. Disputed invoices are excluded. */
export function lateFeeRun(input: { asOf: string; invoices: ArInvoice[]; outstanding: Map<string, number>; disputes: ArDispute[]; tenants: ArTenant[]; settings: ArSettings }): { proposals: ProposedInvoice[]; skipped: SkippedCharge[] } {
  const { lateFee } = input.settings;
  const proposals: ProposedInvoice[] = [];
  const skipped: SkippedCharge[] = [];
  if (!lateFee.enabled) return { proposals, skipped: [{ tenant: "—", reason: "Late payment charges are switched off in AR Settings." }] };
  const billed = billedKeys(input.invoices);
  const tenants = new Map(input.tenants.map((tenant) => [tenant.id, tenant]));
  const disputed = new Set(input.disputes.filter((dispute) => dispute.status === "Open" || dispute.status === "Under review").map((dispute) => dispute.invoiceId));
  for (const invoice of input.invoices) {
    if (invoice.status !== "Posted" || invoice.kind === "late_fee") continue;
    const balance = input.outstanding.get(invoice.id) ?? 0;
    const late = daysBetween(invoice.dueDate, input.asOf);
    if (balance <= 0 || late <= lateFee.graceDays) continue;
    const tenant = tenants.get(invoice.tenantId);
    const name = tenant?.name ?? invoice.tenantId;
    const key = `late|${invoice.id}`;
    if (billed.has(key)) {
      skipped.push({ invoiceId: invoice.id, tenant: name, reason: `${invoice.number} already has a late payment charge (${billed.get(key)}).` });
      continue;
    }
    if (disputed.has(invoice.id)) {
      skipped.push({ invoiceId: invoice.id, tenant: name, reason: `${invoice.number} is under dispute; no late charge until it is resolved.` });
      continue;
    }
    const amount = round2(Math.max(lateFee.minimum, (balance * lateFee.percent) / 100) + lateFee.flat);
    proposals.push({
      kind: "late_fee",
      leaseId: invoice.leaseId,
      tenantId: invoice.tenantId,
      tenantName: name,
      entityId: invoice.entityId,
      propertyId: invoice.propertyId,
      unit: invoice.unit,
      currency: invoice.currency,
      invoiceDate: input.asOf,
      dueDate: addDays(input.asOf, tenant?.paymentTermsDays ?? input.settings.defaultTermsDays),
      periodStart: input.asOf,
      periodEnd: input.asOf,
      billingPeriod: input.asOf.slice(0, 7),
      lines: [{ chargeType: "late_fee", description: `Late payment charge on ${invoice.number}`, amount, periodStart: input.asOf, periodEnd: input.asOf, note: `${late} days past due on ${balance.toFixed(2)} outstanding (${lateFee.percent}% + ${lateFee.flat} flat, minimum ${lateFee.minimum})` }],
      total: amount,
      billingKeys: [key],
    });
  }
  return { proposals, skipped };
}
