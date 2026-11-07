import { billingRun } from "./billing.ts";
import { addDays, addMonths, daysBetween, monthEnd, monthStart, round2 } from "./dates.ts";
import { toGroupAt } from "./fx.ts";
import { revenueKeys, trialBalance } from "./ledger.ts";
import { ageBuckets, chargeLabels, type AgeBucket, type ArBook, type ArInvoice, type ArPayment, type Scope } from "./types.ts";

export interface InvoiceBalance {
  invoice: ArInvoice;
  collected: number;
  credited: number;
  outstanding: number;
  settledOn?: string;
}

export function inScope(record: { entityId: string; propertyId?: string; tenantId?: string }, scope: Scope = {}): boolean {
  if (scope.entityId && record.entityId !== scope.entityId) return false;
  if (scope.propertyId && record.propertyId !== scope.propertyId) return false;
  if (scope.tenantId && record.tenantId !== scope.tenantId) return false;
  return true;
}

export function isOpenInvoice(invoice: ArInvoice): boolean {
  return invoice.status === "Posted" || invoice.status === "Reversal requested";
}

export function livePayments(book: ArBook): ArPayment[] {
  return book.payments.filter((payment) => payment.status !== "Reversed");
}

/** Outstanding balance per posted invoice as of a date: total − collected before import − allocations − credit notes − deposits applied. */
export function balances(book: ArBook, asOf?: string): Map<string, InvoiceBalance> {
  const events = new Map<string, { date: string; amount: number; kind: "collected" | "credited" }[]>();
  const push = (invoiceId: string, date: string, amount: number, kind: "collected" | "credited") => {
    if (asOf && date > asOf) return;
    const list = events.get(invoiceId) ?? [];
    list.push({ date, amount, kind });
    events.set(invoiceId, list);
  };
  for (const payment of livePayments(book)) for (const allocation of payment.allocations) push(allocation.invoiceId, allocation.date, allocation.amount, "collected");
  for (const note of book.creditNotes) if (note.status === "Posted") push(note.invoiceId, note.date, note.amount, "credited");
  for (const deposit of book.deposits) if (deposit.status === "Applied" && deposit.appliedInvoiceId && deposit.settledDate) push(deposit.appliedInvoiceId, deposit.settledDate, deposit.amount, "collected");

  const result = new Map<string, InvoiceBalance>();
  for (const invoice of book.invoices) {
    if (!isOpenInvoice(invoice)) continue;
    const effective = invoice.kind === "imported" ? invoice.invoiceDate : invoice.postingDate ?? invoice.invoiceDate;
    if (asOf && effective > asOf) continue;
    const list = (events.get(invoice.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    let collected = 0;
    let credited = 0;
    let settledOn: string | undefined;
    const open = invoice.total - invoice.priorCollected;
    for (const event of list) {
      if (event.kind === "collected") collected += event.amount;
      else credited += event.amount;
      if (!settledOn && round2(open - collected - credited) <= 0) settledOn = event.date;
    }
    result.set(invoice.id, { invoice, collected: round2(collected), credited: round2(credited), outstanding: round2(open - collected - credited), settledOn });
  }
  return result;
}

export function bucketFor(daysPastDue: number): AgeBucket {
  if (daysPastDue <= 0) return "Current";
  if (daysPastDue <= 30) return "1–30";
  if (daysPastDue <= 60) return "31–60";
  if (daysPastDue <= 90) return "61–90";
  return "90+";
}

export interface AgeingRow {
  invoice: ArInvoice;
  tenantName: string;
  propertyName: string;
  daysPastDue: number;
  bucket: AgeBucket;
  outstanding: number;
  outstandingGroup: number;
  disputed: boolean;
}

export function ageing(book: ArBook, asOf: string, scope: Scope = {}): AgeingRow[] {
  const tenants = new Map(book.tenants.map((tenant) => [tenant.id, tenant]));
  const disputed = new Set(book.disputes.filter((dispute) => dispute.status === "Open" || dispute.status === "Under review").map((dispute) => dispute.invoiceId));
  const period = asOf.slice(0, 7);
  const rows: AgeingRow[] = [];
  for (const balance of balances(book, asOf).values()) {
    const { invoice } = balance;
    if (balance.outstanding <= 0 || !inScope(invoice, scope)) continue;
    const days = daysBetween(invoice.dueDate, asOf);
    const tenant = tenants.get(invoice.tenantId);
    rows.push({
      invoice,
      tenantName: tenant?.name ?? invoice.tenantId,
      propertyName: tenant?.propertyId === invoice.propertyId ? tenant.propertyName || invoice.propertyId : invoice.propertyId,
      daysPastDue: days,
      bucket: bucketFor(days),
      outstanding: balance.outstanding,
      outstandingGroup: round2(toGroupAt(book.settings, balance.outstanding, invoice.currency, period, invoice.fx)),
      disputed: disputed.has(invoice.id),
    });
  }
  return rows.sort((a, b) => b.daysPastDue - a.daysPastDue);
}

export function bucketTotals(rows: AgeingRow[]): Record<AgeBucket, number> {
  const totals = Object.fromEntries(ageBuckets.map((bucket) => [bucket, 0])) as Record<AgeBucket, number>;
  for (const row of rows) totals[row.bucket] = round2(totals[row.bucket] + row.outstandingGroup);
  return totals;
}

export type DrillLevel = "entity" | "property" | "tenant" | "invoice";

export interface DrillNode {
  key: string;
  label: string;
  buckets: Record<AgeBucket, number>;
  total: number;
  count: number;
}

export function drill(rows: AgeingRow[], level: DrillLevel, propertyNames: Record<string, string> = {}): DrillNode[] {
  const groups = new Map<string, AgeingRow[]>();
  for (const row of rows) {
    const key = level === "entity" ? row.invoice.entityId : level === "property" ? row.invoice.propertyId : level === "tenant" ? row.invoice.tenantId : row.invoice.id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([key, items]) => ({
      key,
      label: level === "entity" ? key : level === "property" ? propertyNames[key] || items[0].propertyName || key : level === "tenant" ? items[0].tenantName : items[0].invoice.number,
      buckets: bucketTotals(items),
      total: round2(items.reduce((sum, item) => sum + item.outstandingGroup, 0)),
      count: items.length,
    }))
    .sort((a, b) => b.total - a.total);
}

function groupAmount(amount: number, invoiceOrPayment: { currency: string; fx?: { rateToGroup: number } }): number {
  return amount * (invoiceOrPayment.fx?.rateToGroup ?? 1);
}

export function unallocated(payment: ArPayment): number {
  return round2(payment.amount - payment.allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
}

export interface ArKpis {
  currency: string;
  total: number;
  current: number;
  overdue: number;
  collectionRate: number | null;
  collectionBasis: string;
  dso: number | null;
  billedThisMonth: number;
  collectedThisMonth: number;
  unallocated: number;
  disputed: number;
  badDebtExposure: number;
  depositsHeld: number;
  unbilled: number;
  buckets: Record<AgeBucket, number>;
  openInvoices: number;
  overdueInvoices: number;
}

export function kpis(book: ArBook, asOf: string, scope: Scope = {}): ArKpis {
  const rows = ageing(book, asOf, scope);
  const buckets = bucketTotals(rows);
  const total = round2(rows.reduce((sum, row) => sum + row.outstandingGroup, 0));
  const month = asOf.slice(0, 7);
  const all = balances(book, asOf);
  const scoped = [...all.values()].filter((balance) => inScope(balance.invoice, scope));
  const billedThisMonth = round2(scoped.filter((balance) => balance.invoice.kind !== "imported" && balance.invoice.invoiceDate.slice(0, 7) === month).reduce((sum, balance) => sum + groupAmount(balance.invoice.total, balance.invoice), 0));
  const windowStart = addDays(asOf, -90);
  const due = scoped.filter((balance) => balance.invoice.kind !== "imported" && balance.invoice.dueDate > windowStart && balance.invoice.dueDate <= asOf);
  const dueNet = due.reduce((sum, balance) => sum + groupAmount(balance.invoice.total - balance.credited, balance.invoice), 0);
  const dueCollected = due.reduce((sum, balance) => sum + groupAmount(balance.collected, balance.invoice), 0);
  const billed90 = scoped.filter((balance) => balance.invoice.kind !== "imported" && balance.invoice.invoiceDate > windowStart && balance.invoice.invoiceDate <= asOf).reduce((sum, balance) => sum + groupAmount(balance.invoice.total, balance.invoice), 0);
  const payments = livePayments(book).filter((payment) => inScope({ entityId: payment.entityId, tenantId: payment.tenantId }, { entityId: scope.entityId, tenantId: scope.tenantId }) && payment.receivedDate <= asOf);
  const propertyTenants = scope.propertyId ? new Set(book.tenants.filter((tenant) => tenant.propertyId === scope.propertyId).map((tenant) => tenant.id)) : null;
  const scopedPayments = propertyTenants ? payments.filter((payment) => propertyTenants.has(payment.tenantId)) : payments;
  const collectedThisMonth = round2(scopedPayments.filter((payment) => payment.receivedDate.slice(0, 7) === month).reduce((sum, payment) => sum + payment.amount * payment.fx.rateToGroup, 0));
  const unallocatedTotal = round2(scopedPayments.reduce((sum, payment) => sum + unallocated(payment) * payment.fx.rateToGroup, 0));
  const disputed = round2(
    book.disputes
      .filter((dispute) => dispute.status === "Open" || dispute.status === "Under review")
      .reduce((sum, dispute) => {
        const balance = all.get(dispute.invoiceId);
        if (!balance || !inScope(balance.invoice, scope)) return sum;
        return sum + groupAmount(Math.min(dispute.amount, Math.max(balance.outstanding, 0)), balance.invoice);
      }, 0),
  );
  const badDebtExposure = round2(ageBuckets.reduce((sum, bucket) => sum + (buckets[bucket] * (book.settings.allowance[bucket] ?? 0)) / 100, 0));
  const depositsHeld = round2(book.deposits.filter((deposit) => deposit.status === "Held" && deposit.receivedDate <= asOf && inScope(deposit, scope)).reduce((sum, deposit) => sum + deposit.amount * deposit.fx.rateToGroup, 0));
  const unbilled = unbilledRent(book, month, scope);
  return {
    currency: book.settings.groupCurrency,
    total,
    current: buckets.Current,
    overdue: round2(total - buckets.Current),
    collectionRate: dueNet > 0 ? Math.round((dueCollected / dueNet) * 1000) / 10 : null,
    collectionBasis: `Collected ÷ net billed for invoices due ${windowStart} to ${asOf}`,
    dso: billed90 > 0 ? Math.round((total / billed90) * 90) : null,
    billedThisMonth,
    collectedThisMonth,
    unallocated: unallocatedTotal,
    disputed,
    badDebtExposure,
    depositsHeld,
    unbilled,
    buckets,
    openInvoices: rows.length,
    overdueInvoices: rows.filter((row) => row.daysPastDue > 0).length,
  };
}

/** Contractual charges for the month on active leases that have not been invoiced yet. */
export function unbilledRent(book: ArBook, period: string, scope: Scope = {}): number {
  const run = billingRun({ period, leases: book.leases.filter((lease) => lease.status === "Active" && inScope(lease, scope)), tenants: book.tenants, invoices: book.invoices });
  return round2(
    run.proposals.reduce((sum, proposal) => {
      try {
        return sum + toGroupAt(book.settings, proposal.total, proposal.currency, period);
      } catch {
        return sum;
      }
    }, 0),
  );
}

export interface PerformanceRow {
  key: string;
  label: string;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  rate: number | null;
}

/** Billing and collection performance by property or entity for invoices dated in the window. */
export function performance(book: ArBook, asOf: string, by: "property" | "entity", months = 3): PerformanceRow[] {
  const from = monthStart(addMonths(monthStart(asOf.slice(0, 7)), -(months - 1)).slice(0, 7));
  const rows = new Map<string, PerformanceRow>();
  const names: Record<string, string> = {};
  for (const tenant of book.tenants) if (tenant.propertyName) names[tenant.propertyId] = tenant.propertyName;
  const ageingRows = ageing(book, asOf);
  for (const balance of balances(book, asOf).values()) {
    const { invoice } = balance;
    const key = by === "property" ? invoice.propertyId : invoice.entityId;
    const row = rows.get(key) ?? { key, label: by === "property" ? names[key] || key : key, billed: 0, collected: 0, outstanding: 0, overdue: 0, rate: null };
    if (invoice.kind !== "imported" && invoice.invoiceDate >= from && invoice.invoiceDate <= asOf) {
      row.billed += groupAmount(invoice.total - balance.credited, invoice);
      row.collected += groupAmount(balance.collected, invoice);
    }
    rows.set(key, row);
  }
  for (const row of ageingRows) {
    const key = by === "property" ? row.invoice.propertyId : row.invoice.entityId;
    const target = rows.get(key);
    if (!target) continue;
    target.outstanding += row.outstandingGroup;
    if (row.daysPastDue > 0) target.overdue += row.outstandingGroup;
  }
  return [...rows.values()]
    .map((row) => ({ ...row, billed: round2(row.billed), collected: round2(row.collected), outstanding: round2(row.outstanding), overdue: round2(row.overdue), rate: row.billed > 0 ? Math.round((row.collected / row.billed) * 1000) / 10 : null }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function monthlyTrend(book: ArBook, asOf: string, months = 6, scope: Scope = {}): { month: string; billed: number; collected: number }[] {
  const result: { month: string; billed: number; collected: number }[] = [];
  const last = monthStart(asOf.slice(0, 7));
  for (let index = months - 1; index >= 0; index -= 1) {
    const month = addMonths(last, -index).slice(0, 7);
    const billed = book.invoices.filter((invoice) => isOpenInvoice(invoice) && invoice.kind !== "imported" && invoice.invoiceDate.slice(0, 7) === month && inScope(invoice, scope)).reduce((sum, invoice) => sum + groupAmount(invoice.total, invoice), 0);
    const collected = livePayments(book).filter((payment) => payment.receivedDate.slice(0, 7) === month && inScope({ entityId: payment.entityId, tenantId: payment.tenantId }, { entityId: scope.entityId, tenantId: scope.tenantId })).reduce((sum, payment) => sum + payment.amount * payment.fx.rateToGroup, 0);
    result.push({ month, billed: round2(billed), collected: round2(collected) });
  }
  return result;
}

export interface StatementLine {
  date: string;
  type: "Invoice" | "Payment" | "Credit note" | "Write-off" | "Deposit applied" | "Opening balance";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

/** Statement of account for one tenant in the transaction currency. Unapplied receipts are shown as credits. */
export function statementOfAccount(book: ArBook, tenantId: string, asOf?: string): StatementLine[] {
  const lines: Omit<StatementLine, "balance">[] = [];
  for (const invoice of book.invoices) {
    if (invoice.tenantId !== tenantId || !isOpenInvoice(invoice)) continue;
    const date = invoice.postingDate ?? invoice.invoiceDate;
    if (invoice.kind === "imported") lines.push({ date, type: "Opening balance", reference: invoice.number, description: `Imported open balance (${invoice.source.system})`, debit: round2(invoice.total - invoice.priorCollected), credit: 0, currency: invoice.currency });
    else lines.push({ date, type: "Invoice", reference: invoice.number, description: invoice.lines.map((line) => line.description).join(", "), debit: invoice.total, credit: 0, currency: invoice.currency });
  }
  for (const payment of livePayments(book)) {
    if (payment.tenantId !== tenantId) continue;
    lines.push({ date: payment.receivedDate, type: "Payment", reference: payment.number, description: `${payment.method} ${payment.reference}`.trim(), debit: 0, credit: payment.amount, currency: payment.currency });
  }
  for (const note of book.creditNotes) {
    if (note.tenantId !== tenantId || note.status !== "Posted") continue;
    lines.push({ date: note.date, type: note.type === "write_off" ? "Write-off" : "Credit note", reference: note.number, description: note.reason, debit: 0, credit: note.amount, currency: book.invoices.find((invoice) => invoice.id === note.invoiceId)?.currency ?? "" });
  }
  for (const deposit of book.deposits) {
    if (deposit.tenantId !== tenantId || deposit.status !== "Applied" || !deposit.settledDate) continue;
    lines.push({ date: deposit.settledDate, type: "Deposit applied", reference: deposit.id.split(":").pop() ?? deposit.id, description: "Security deposit applied", debit: 0, credit: deposit.amount, currency: deposit.currency });
  }
  let running = 0;
  return lines
    .filter((line) => !asOf || line.date <= asOf)
    .sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit)
    .map((line) => {
      running = round2(running + line.debit - line.credit);
      return { ...line, balance: running };
    });
}

export interface SubledgerSummary {
  currency: string;
  revenue: { key: string; label: string; amount: number }[];
  grossBilled: number;
  creditNotes: number;
  netRevenue: number;
  badDebt: number;
  fx: number;
  receivables: number;
  unapplied: number;
  deposits: number;
  cashCollected: number;
  balanced: boolean;
}

/** Statement figures from AR journals: revenue for the period, balances at the period end. Group currency. */
export function subledgerSummary(book: ArBook, from: string, to: string, scope: { entityId?: string; propertyId?: string } = {}): SubledgerSummary {
  const accounts = book.settings.accounts;
  const period = trialBalance(book.journals, { ...scope, from, to });
  const closing = trialBalance(book.journals, { ...scope, to });
  const balanceOf = (rows: typeof period.rows, code: string) => rows.find((row) => row.account === code)?.balance ?? 0;
  const creditJournals = book.journals.filter((journal) => journal.sourceType === "credit_note" && journal.date >= from && journal.date <= to && (!scope.entityId || journal.entityId === scope.entityId) && (!scope.propertyId || journal.propertyId === scope.propertyId));
  const revenueCodes = new Set(revenueKeys.map((key) => accounts[key].code));
  const creditNotes = round2(creditJournals.reduce((sum, journal) => sum + journal.lines.filter((line) => revenueCodes.has(line.account)).reduce((inner, line) => inner + (line.debit - line.credit) * journal.functionalToGroup, 0), 0));
  const revenue = revenueKeys.map((key) => ({ key, label: chargeLabels[key], amount: round2(-balanceOf(period.rows, accounts[key].code)) })).filter((row) => row.amount !== 0);
  const netRevenue = round2(revenue.reduce((sum, row) => sum + row.amount, 0));
  const bank = new Set(book.settings.bankAccounts.map((item) => item.code));
  const cashCollected = round2(
    book.journals
      .filter((journal) => (journal.sourceType === "payment" || journal.sourceType === "reversal") && journal.date >= from && journal.date <= to && (!scope.entityId || journal.entityId === scope.entityId) && (!scope.propertyId || journal.propertyId === scope.propertyId))
      .filter((journal) => journal.sourceType === "payment" || book.journals.find((item) => item.id === journal.reverses)?.sourceType === "payment")
      .reduce((sum, journal) => sum + journal.lines.filter((line) => bank.has(line.account)).reduce((inner, line) => inner + (line.debit - line.credit) * journal.functionalToGroup, 0), 0),
  );
  return {
    currency: book.settings.groupCurrency,
    revenue,
    grossBilled: round2(netRevenue + creditNotes),
    creditNotes,
    netRevenue,
    badDebt: round2(balanceOf(period.rows, accounts.bad_debt.code)),
    fx: round2(-balanceOf(period.rows, accounts.fx.code)),
    receivables: round2(balanceOf(closing.rows, accounts.receivables.code)),
    unapplied: round2(-balanceOf(closing.rows, accounts.unapplied.code)),
    deposits: round2(-balanceOf(closing.rows, accounts.deposits.code)),
    cashCollected,
    balanced: closing.debit === closing.credit,
  };
}

export interface CollectionsByBank {
  bankAccount: string;
  receipts: number;
  deposits: number;
  count: number;
}

export function collectionsByBank(book: ArBook, from: string, to: string): CollectionsByBank[] {
  const rows = new Map<string, CollectionsByBank>();
  for (const payment of livePayments(book)) {
    if (payment.receivedDate < from || payment.receivedDate > to) continue;
    const row = rows.get(payment.bankAccount) ?? { bankAccount: payment.bankAccount, receipts: 0, deposits: 0, count: 0 };
    row.receipts += payment.amount * payment.fx.rateToGroup;
    row.count += 1;
    rows.set(payment.bankAccount, row);
  }
  for (const deposit of book.deposits) {
    if (deposit.receivedDate < from || deposit.receivedDate > to) continue;
    const row = rows.get(deposit.bankAccount) ?? { bankAccount: deposit.bankAccount, receipts: 0, deposits: 0, count: 0 };
    row.deposits += deposit.amount * deposit.fx.rateToGroup;
    row.count += 1;
    rows.set(deposit.bankAccount, row);
  }
  return [...rows.values()].map((row) => ({ ...row, receipts: round2(row.receipts), deposits: round2(row.deposits) }));
}

export function tenantBalances(book: ArBook, asOf: string): Map<string, { outstanding: number; overdue: number; unapplied: number; currency: string }> {
  const map = new Map<string, { outstanding: number; overdue: number; unapplied: number; currency: string }>();
  for (const row of ageing(book, asOf)) {
    const entry = map.get(row.invoice.tenantId) ?? { outstanding: 0, overdue: 0, unapplied: 0, currency: row.invoice.currency };
    entry.outstanding = round2(entry.outstanding + row.outstanding);
    if (row.daysPastDue > 0) entry.overdue = round2(entry.overdue + row.outstanding);
    map.set(row.invoice.tenantId, entry);
  }
  for (const payment of livePayments(book)) {
    const open = unallocated(payment);
    if (open <= 0 || payment.receivedDate > asOf) continue;
    const entry = map.get(payment.tenantId) ?? { outstanding: 0, overdue: 0, unapplied: 0, currency: payment.currency };
    entry.unapplied = round2(entry.unapplied + open);
    map.set(payment.tenantId, entry);
  }
  return map;
}

export function monthRange(period: string): { from: string; to: string } {
  return { from: monthStart(period), to: monthEnd(period) };
}
