import { ageing, balances, inScope, performance, type AgeingRow } from "./analytics.ts";
import { addDays, addMonths, daysBetween, maxDate, monthStart, round2 } from "./dates.ts";
import type { ArBook, Scope } from "./types.ts";

export interface PaymentHistory {
  tenantId: string;
  settled: number;
  late: number;
  averageDaysLate: number | null;
  brokenPromises: number;
}

/** Days late on every settled invoice, from the date the balance reached zero. */
export function paymentHistory(book: ArBook, asOf: string): Map<string, PaymentHistory> {
  const map = new Map<string, PaymentHistory & { totalLate: number }>();
  for (const balance of balances(book, asOf).values()) {
    const { invoice } = balance;
    if (invoice.kind === "imported" || !balance.settledOn) continue;
    const entry = map.get(invoice.tenantId) ?? { tenantId: invoice.tenantId, settled: 0, late: 0, averageDaysLate: null, brokenPromises: 0, totalLate: 0 };
    const late = Math.max(daysBetween(invoice.dueDate, balance.settledOn), 0);
    entry.settled += 1;
    entry.totalLate += late;
    if (late > 5) entry.late += 1;
    map.set(invoice.tenantId, entry);
  }
  const outstanding = balances(book, asOf);
  for (const followUp of book.followUps) {
    if (!followUp.promiseDate || followUp.promiseDate >= asOf) continue;
    const invoiceIds = followUp.invoiceId ? [followUp.invoiceId] : book.invoices.filter((invoice) => invoice.tenantId === followUp.tenantId).map((invoice) => invoice.id);
    const paidSince = book.payments.some((payment) => payment.status !== "Reversed" && payment.tenantId === followUp.tenantId && payment.receivedDate >= followUp.date && payment.receivedDate <= followUp.promiseDate!);
    const stillOpen = invoiceIds.some((id) => (outstanding.get(id)?.outstanding ?? 0) > 0);
    if (!paidSince && stillOpen) {
      const entry = map.get(followUp.tenantId) ?? { tenantId: followUp.tenantId, settled: 0, late: 0, averageDaysLate: null, brokenPromises: 0, totalLate: 0 };
      entry.brokenPromises += 1;
      map.set(followUp.tenantId, entry);
    }
  }
  const result = new Map<string, PaymentHistory>();
  for (const [key, entry] of map) result.set(key, { tenantId: entry.tenantId, settled: entry.settled, late: entry.late, averageDaysLate: entry.settled ? Math.round(entry.totalLate / entry.settled) : null, brokenPromises: entry.brokenPromises });
  return result;
}

export interface Insight {
  id: string;
  kind: "repeat_late" | "high_value" | "disputed" | "property_deterioration" | "growing_exposure" | "expected_delay" | "broken_promise";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  amount?: number;
  tenantId?: string;
  propertyId?: string;
  invoiceIds: string[];
}

export interface PriorityRow {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  overdue: number;
  oldestDays: number;
  score: number;
  reasons: string[];
  suggestedAction: string;
}

export interface ExpectedCollections {
  buckets: { label: string; amount: number; count: number }[];
  atRisk: number;
  basis: string;
}

export interface CollectionsIntelligence {
  insights: Insight[];
  priorities: PriorityRow[];
  expected: ExpectedCollections;
  basis: string;
}

const HIGH_VALUE = 10_000;

/**
 * Deterministic collections analysis over posted AR records. Amounts are taken from the ledger;
 * nothing is estimated except the expected collection date, whose basis is stated.
 */
export function collectionsIntelligence(book: ArBook, asOf: string, scope: Scope = {}): CollectionsIntelligence {
  const rows = ageing(book, asOf, scope);
  const history = paymentHistory(book, asOf);
  const tenants = new Map(book.tenants.map((tenant) => [tenant.id, tenant]));
  const insights: Insight[] = [];
  const name = (id: string) => tenants.get(id)?.name ?? id;

  for (const [tenantId, entry] of history) {
    if (scope.tenantId && scope.tenantId !== tenantId) continue;
    const tenant = tenants.get(tenantId);
    if (tenant && !inScope(tenant, scope)) continue;
    if (entry.late >= 2) {
      insights.push({ id: `late-${tenantId}`, kind: "repeat_late", severity: entry.late >= 3 ? "high" : "medium", title: `${name(tenantId)} repeatedly pays late`, detail: `${entry.late} of ${entry.settled} settled invoices were paid more than 5 days after the due date; average ${entry.averageDaysLate} days late.`, tenantId, invoiceIds: [] });
    }
    if (entry.brokenPromises > 0) {
      insights.push({ id: `promise-${tenantId}`, kind: "broken_promise", severity: "high", title: `${name(tenantId)} missed a promise to pay`, detail: `${entry.brokenPromises} promise-to-pay date${entry.brokenPromises === 1 ? "" : "s"} passed with no receipt and the balance still open.`, tenantId, invoiceIds: [] });
    }
  }

  const overdueByTenant = new Map<string, AgeingRow[]>();
  for (const row of rows) if (row.daysPastDue > 0) overdueByTenant.set(row.invoice.tenantId, [...(overdueByTenant.get(row.invoice.tenantId) ?? []), row]);
  for (const [tenantId, items] of overdueByTenant) {
    const amount = round2(items.reduce((sum, item) => sum + item.outstandingGroup, 0));
    if (amount >= HIGH_VALUE) {
      insights.push({ id: `high-${tenantId}`, kind: "high_value", severity: "high", title: `${name(tenantId)} has ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${book.settings.groupCurrency} overdue`, detail: `${items.length} overdue invoice${items.length === 1 ? "" : "s"}; oldest ${Math.max(...items.map((item) => item.daysPastDue))} days past due.`, amount, tenantId, invoiceIds: items.map((item) => item.invoice.id) });
    }
  }

  for (const dispute of book.disputes) {
    if (dispute.status !== "Open" && dispute.status !== "Under review") continue;
    const invoice = book.invoices.find((item) => item.id === dispute.invoiceId);
    if (!invoice || !inScope(invoice, scope)) continue;
    insights.push({ id: `dispute-${dispute.id}`, kind: "disputed", severity: daysBetween(dispute.openedAt.slice(0, 10), asOf) > 30 ? "high" : "medium", title: `${invoice.number} disputed by ${name(invoice.tenantId)}`, detail: `${dispute.amount.toLocaleString("en-US")} ${invoice.currency} disputed: ${dispute.reason}. Open ${daysBetween(dispute.openedAt.slice(0, 10), asOf)} days.`, amount: dispute.amount, tenantId: invoice.tenantId, invoiceIds: [invoice.id] });
  }

  const recent = performance(book, asOf, "property", 3);
  const priorAsOf = addDays(monthStart(addMonths(monthStart(asOf.slice(0, 7)), -3).slice(0, 7)), -1);
  const prior = new Map(performance(book, priorAsOf, "property", 3).map((row) => [row.key, row]));
  for (const row of recent) {
    if (scope.propertyId && row.key !== scope.propertyId) continue;
    const before = prior.get(row.key);
    if (row.rate !== null && before && before.rate !== null && before.rate - row.rate >= 5) {
      insights.push({ id: `deteriorate-${row.key}`, kind: "property_deterioration", severity: before.rate - row.rate >= 15 ? "high" : "medium", title: `Collection rate falling at ${row.label}`, detail: `${row.rate}% for invoices dated in the last 3 months, down from ${before.rate}% in the 3 months before.`, propertyId: row.key, invoiceIds: [] });
    }
  }

  const previousRows = ageing(book, addDays(asOf, -30), scope);
  const byPropertyNow = new Map<string, number>();
  const byPropertyThen = new Map<string, number>();
  for (const row of rows) byPropertyNow.set(row.invoice.propertyId, (byPropertyNow.get(row.invoice.propertyId) ?? 0) + row.outstandingGroup);
  for (const row of previousRows) byPropertyThen.set(row.invoice.propertyId, (byPropertyThen.get(row.invoice.propertyId) ?? 0) + row.outstandingGroup);
  for (const [propertyId, now] of byPropertyNow) {
    const then = byPropertyThen.get(propertyId) ?? 0;
    if (now - then >= 1_000 && (then === 0 || now / then >= 1.2)) {
      const label = recent.find((row) => row.key === propertyId)?.label ?? propertyId;
      insights.push({ id: `exposure-${propertyId}`, kind: "growing_exposure", severity: now - then >= HIGH_VALUE ? "high" : "low", title: `Receivables growing at ${label}`, detail: `Outstanding ${round2(now).toLocaleString("en-US")} now versus ${round2(then).toLocaleString("en-US")} 30 days ago (${book.settings.groupCurrency}).`, amount: round2(now - then), propertyId, invoiceIds: [] });
    }
  }

  const promises = new Map<string, string>();
  for (const followUp of [...book.followUps].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!followUp.promiseDate || followUp.promiseDate < asOf) continue;
    if (followUp.invoiceId) promises.set(followUp.invoiceId, followUp.promiseDate);
    else for (const row of rows) if (row.invoice.tenantId === followUp.tenantId) promises.set(row.invoice.id, followUp.promiseDate);
  }
  const buckets = [
    { label: "Next 7 days", days: 7, amount: 0, count: 0 },
    { label: "8–30 days", days: 30, amount: 0, count: 0 },
    { label: "31–60 days", days: 60, amount: 0, count: 0 },
    { label: "61–90 days", days: 90, amount: 0, count: 0 },
  ];
  let atRisk = 0;
  for (const row of rows) {
    const promise = promises.get(row.invoice.id);
    if (!promise && (row.daysPastDue > 90 || row.disputed)) {
      atRisk += row.outstandingGroup;
      continue;
    }
    const delay = history.get(row.invoice.tenantId)?.averageDaysLate ?? 0;
    const expected = promise ?? maxDate(addDays(row.invoice.dueDate, delay), asOf);
    const inDays = daysBetween(asOf, expected);
    const bucket = buckets.find((item) => inDays <= item.days);
    if (bucket) {
      bucket.amount += row.outstandingGroup;
      bucket.count += 1;
      if (!promise && delay > 15 && row.outstandingGroup >= 1_000) {
        insights.push({ id: `delay-${row.invoice.id}`, kind: "expected_delay", severity: "low", title: `${row.invoice.number} likely to be paid late`, detail: `${row.tenantName} has paid ${delay} days late on average; expected around ${expected} against a due date of ${row.invoice.dueDate}.`, amount: row.outstandingGroup, tenantId: row.invoice.tenantId, invoiceIds: [row.invoice.id] });
      }
    } else atRisk += row.outstandingGroup;
  }

  const priorities: PriorityRow[] = [];
  for (const [tenantId, items] of overdueByTenant) {
    const overdue = round2(items.reduce((sum, item) => sum + item.outstandingGroup, 0));
    const oldest = Math.max(...items.map((item) => item.daysPastDue));
    const entry = history.get(tenantId);
    const reasons: string[] = [`${overdue.toLocaleString("en-US")} ${book.settings.groupCurrency} overdue`, `oldest ${oldest} days`];
    let score = Math.min(overdue / 1_000, 40) + Math.min(oldest / 3, 30);
    if (entry && entry.late >= 2) {
      score += 10;
      reasons.push(`${entry.late} late payments`);
    }
    if (entry?.brokenPromises) {
      score += 15;
      reasons.push("broken promise to pay");
    }
    const disputedItems = items.filter((item) => item.disputed);
    if (disputedItems.length) reasons.push(`${disputedItems.length} disputed`);
    const tenant = tenants.get(tenantId);
    const suggestedAction = disputedItems.length === items.length ? "Resolve the dispute before chasing" : oldest > 90 ? "Escalate: final notice or legal review (requires approval)" : oldest > 30 ? "Call the tenant and agree a promise-to-pay date" : "Send a reminder (draft for approval)";
    priorities.push({ tenantId, tenantName: name(tenantId), propertyName: tenant?.propertyName || tenant?.propertyId || "", overdue, oldestDays: oldest, score: Math.round(score), reasons, suggestedAction });
  }
  priorities.sort((a, b) => b.score - a.score);

  const order = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => order[a.severity] - order[b.severity] || (b.amount ?? 0) - (a.amount ?? 0));
  return {
    insights,
    priorities,
    expected: {
      buckets: buckets.map((bucket) => ({ label: bucket.label, amount: round2(bucket.amount), count: bucket.count })),
      atRisk: round2(atRisk),
      basis: "Expected date = promise-to-pay date when recorded, otherwise the due date plus the tenant's average days late on settled invoices. Over 90 days past due or disputed without a promise is treated as at risk, not expected.",
    },
    basis: `Calculated ${asOf} from posted invoices, receipts, credit notes, disputes, and follow-ups in the AR ledger. Group currency ${book.settings.groupCurrency}.`,
  };
}
