import { round2 } from "./dates.ts";
import type { AccountKey, ArInvoice, ArSettings, ChargeType, Fx, Journal, JournalLine, JournalSource } from "./types.ts";

export class LedgerError extends Error {}

export const defaultAccounts: Record<AccountKey, { code: string; name: string }> = {
  receivables: { code: "1200", name: "Tenant receivables" },
  unapplied: { code: "2150", name: "Unapplied tenant receipts" },
  deposits: { code: "2200", name: "Security deposits held" },
  base_rent: { code: "4000", name: "Rental revenue" },
  cam: { code: "4010", name: "CAM recoveries" },
  utilities: { code: "4020", name: "Utility recoveries" },
  maintenance: { code: "4030", name: "Maintenance recoveries" },
  parking: { code: "4040", name: "Parking income" },
  other: { code: "4090", name: "Other lease income" },
  late_fee: { code: "4100", name: "Late payment charges" },
  bad_debt: { code: "6900", name: "Bad debt expense" },
  fx: { code: "7900", name: "Foreign exchange gain / loss" },
  opening: { code: "3990", name: "Opening balance clearing — imported receivables" },
};

export const revenueKeys: ChargeType[] = ["base_rent", "cam", "utilities", "maintenance", "parking", "other", "late_fee"];

function account(settings: ArSettings, key: AccountKey): { account: string; accountName: string } {
  const found = settings.accounts[key] ?? defaultAccounts[key];
  return { account: found.code, accountName: found.name };
}

export function bankAccountFor(settings: ArSettings, name: string): { account: string; accountName: string } {
  const bank = settings.bankAccounts.find((item) => item.name === name) ?? settings.bankAccounts[0];
  if (!bank) throw new LedgerError("No bank account is set up. Add one in AR Settings.");
  return { account: bank.code, accountName: bank.name };
}

function dr(target: { account: string; accountName: string }, functional: number, txn: number, extra: Partial<JournalLine> = {}): JournalLine {
  return { ...target, debit: round2(functional), credit: 0, txnAmount: round2(txn), ...extra };
}

function cr(target: { account: string; accountName: string }, functional: number, txn: number, extra: Partial<JournalLine> = {}): JournalLine {
  return { ...target, debit: 0, credit: round2(functional), txnAmount: -round2(txn), ...extra };
}

/** Balancing line for differences between the rate a receivable was booked at and the rate it was settled at. */
function fxLine(settings: ArSettings, lines: JournalLine[]): JournalLine[] {
  const difference = round2(lines.reduce((sum, line) => sum + line.debit - line.credit, 0));
  if (difference === 0) return lines;
  const target = account(settings, "fx");
  return [...lines, difference > 0 ? { ...target, debit: 0, credit: difference, txnAmount: 0 } : { ...target, debit: -difference, credit: 0, txnAmount: 0 }];
}

export function assertBalanced(lines: JournalLine[]): void {
  const debit = round2(lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = round2(lines.reduce((sum, line) => sum + line.credit, 0));
  if (debit !== credit) throw new LedgerError(`Journal is not balanced: debits ${debit} ≠ credits ${credit}.`);
  if (lines.length < 2) throw new LedgerError("A journal needs at least two lines.");
}

export interface JournalHeader {
  workspaceId: string;
  number: string;
  date: string;
  entityId: string;
  propertyId: string;
  description: string;
  sourceType: JournalSource;
  sourceId: string;
  fx: Fx;
  createdBy: string;
  createdAt: string;
  reverses?: string;
}

export function makeJournal(header: JournalHeader, lines: JournalLine[]): Journal {
  assertBalanced(lines);
  return {
    id: `${header.workspaceId}:JE:${header.number}`,
    workspaceId: header.workspaceId,
    number: header.number,
    date: header.date,
    period: header.date.slice(0, 7),
    entityId: header.entityId,
    propertyId: header.propertyId,
    description: header.description,
    sourceType: header.sourceType,
    sourceId: header.sourceId,
    currency: header.fx.currency,
    functionalCurrency: header.fx.functionalCurrency,
    groupCurrency: header.fx.groupCurrency,
    functionalToGroup: header.fx.rateToGroup / header.fx.rateToFunctional,
    lines,
    reverses: header.reverses,
    createdBy: header.createdBy,
    createdAt: header.createdAt,
  };
}

/** Rent invoice: Dr tenant receivables, Cr the revenue account of each charge. */
export function invoiceLines(settings: ArSettings, invoice: ArInvoice, fx: Fx): JournalLine[] {
  const credits = invoice.lines.map((line) => cr(account(settings, line.chargeType), line.amount * fx.rateToFunctional, line.amount, { tenantId: invoice.tenantId, invoiceId: invoice.id }));
  const debit = round2(credits.reduce((sum, line) => sum + line.credit, 0));
  return [dr(account(settings, "receivables"), debit, invoice.total, { tenantId: invoice.tenantId, invoiceId: invoice.id }), ...credits];
}

/** Imported open balance: Dr tenant receivables, Cr opening balance clearing (revenue was recognised in the source system). */
export function openingLines(settings: ArSettings, invoice: ArInvoice, fx: Fx): JournalLine[] {
  const open = round2(invoice.total - invoice.priorCollected);
  return [dr(account(settings, "receivables"), open * fx.rateToFunctional, open, { tenantId: invoice.tenantId, invoiceId: invoice.id }), cr(account(settings, "opening"), open * fx.rateToFunctional, open, { tenantId: invoice.tenantId, invoiceId: invoice.id })];
}

export interface AllocationInput {
  invoice: ArInvoice;
  amount: number;
}

/** Receipt: Dr bank; Cr receivables for each allocation (at the invoice's booking rate); Cr unapplied receipts for any remainder. */
export function receiptLines(settings: ArSettings, input: { tenantId: string; bankAccount: string; amount: number; fx: Fx; allocations: AllocationInput[] }): JournalLine[] {
  const lines: JournalLine[] = [dr(bankAccountFor(settings, input.bankAccount), input.amount * input.fx.rateToFunctional, input.amount, { tenantId: input.tenantId })];
  let allocated = 0;
  for (const item of input.allocations) {
    const rate = item.invoice.fx?.rateToFunctional ?? input.fx.rateToFunctional;
    lines.push(cr(account(settings, "receivables"), item.amount * rate, item.amount, { tenantId: input.tenantId, invoiceId: item.invoice.id }));
    allocated += item.amount;
  }
  const remainder = round2(input.amount - allocated);
  if (remainder > 0) lines.push(cr(account(settings, "unapplied"), remainder * input.fx.rateToFunctional, remainder, { tenantId: input.tenantId }));
  return fxLine(settings, lines);
}

/** Applying an earlier unallocated receipt: Dr unapplied receipts (receipt rate), Cr receivables (invoice rate). */
export function applyUnappliedLines(settings: ArSettings, input: { tenantId: string; paymentFx: Fx; allocations: AllocationInput[] }): JournalLine[] {
  const lines: JournalLine[] = [];
  for (const item of input.allocations) {
    lines.push(dr(account(settings, "unapplied"), item.amount * input.paymentFx.rateToFunctional, item.amount, { tenantId: input.tenantId, invoiceId: item.invoice.id }));
    lines.push(cr(account(settings, "receivables"), item.amount * (item.invoice.fx?.rateToFunctional ?? input.paymentFx.rateToFunctional), item.amount, { tenantId: input.tenantId, invoiceId: item.invoice.id }));
  }
  return fxLine(settings, lines);
}

/** Credit note: Dr the charge's revenue account (or opening clearing for imported invoices); write-off: Dr bad debt expense. Cr receivables. */
export function creditLines(settings: ArSettings, input: { invoice: ArInvoice; amount: number; type: "credit" | "write_off"; chargeType: ChargeType }): JournalLine[] {
  const rate = input.invoice.fx?.rateToFunctional ?? 1;
  const debitKey: AccountKey = input.type === "write_off" ? "bad_debt" : input.invoice.kind === "imported" ? "opening" : input.chargeType;
  const extra = { tenantId: input.invoice.tenantId, invoiceId: input.invoice.id };
  return [dr(account(settings, debitKey), input.amount * rate, input.amount, extra), cr(account(settings, "receivables"), input.amount * rate, input.amount, extra)];
}

export function depositLines(settings: ArSettings, input: { tenantId: string; bankAccount: string; amount: number; fx: Fx; direction: "received" | "refunded" }): JournalLine[] {
  const bank = bankAccountFor(settings, input.bankAccount);
  const deposits = account(settings, "deposits");
  const functional = input.amount * input.fx.rateToFunctional;
  return input.direction === "received"
    ? [dr(bank, functional, input.amount, { tenantId: input.tenantId }), cr(deposits, functional, input.amount, { tenantId: input.tenantId })]
    : [dr(deposits, functional, input.amount, { tenantId: input.tenantId }), cr(bank, functional, input.amount, { tenantId: input.tenantId })];
}

/** Applying a held deposit against an invoice at lease end: Dr deposits held, Cr receivables. */
export function depositApplyLines(settings: ArSettings, input: { invoice: ArInvoice; amount: number; depositFx: Fx }): JournalLine[] {
  const extra = { tenantId: input.invoice.tenantId, invoiceId: input.invoice.id };
  return fxLine(settings, [
    dr(account(settings, "deposits"), input.amount * input.depositFx.rateToFunctional, input.amount, extra),
    cr(account(settings, "receivables"), input.amount * (input.invoice.fx?.rateToFunctional ?? input.depositFx.rateToFunctional), input.amount, extra),
  ]);
}

/** Mirror image of a posted journal. Posted journals are never edited. */
export function reversalLines(original: Journal): JournalLine[] {
  return original.lines.map((line) => ({ ...line, debit: line.credit, credit: line.debit, txnAmount: -line.txnAmount }));
}

export interface TrialBalanceRow {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Trial balance in group currency (default) or in functional currency. Functional totals are only
 * meaningful when every journal in scope shares one functional currency.
 */
export function trialBalance(journals: Journal[], options: { entityId?: string; propertyId?: string; from?: string; to?: string; currency?: "group" | "functional" } = {}): { rows: TrialBalanceRow[]; debit: number; credit: number; currencies: string[] } {
  const rows = new Map<string, TrialBalanceRow>();
  const currencies = new Set<string>();
  for (const journal of journals) {
    if (options.entityId && journal.entityId !== options.entityId) continue;
    if (options.propertyId && journal.propertyId !== options.propertyId) continue;
    if (options.from && journal.date < options.from) continue;
    if (options.to && journal.date > options.to) continue;
    const factor = options.currency === "functional" ? 1 : journal.functionalToGroup;
    currencies.add(options.currency === "functional" ? journal.functionalCurrency : journal.groupCurrency);
    for (const line of journal.lines) {
      const row = rows.get(line.account) ?? { account: line.account, accountName: line.accountName, debit: 0, credit: 0, balance: 0 };
      row.debit += line.debit * factor;
      row.credit += line.credit * factor;
      rows.set(line.account, row);
    }
  }
  const result = [...rows.values()].map((row) => ({ ...row, debit: round2(row.debit), credit: round2(row.credit), balance: round2(row.debit - row.credit) })).sort((a, b) => a.account.localeCompare(b.account));
  return { rows: result, debit: round2(result.reduce((sum, row) => sum + row.debit, 0)), credit: round2(result.reduce((sum, row) => sum + row.credit, 0)), currencies: [...currencies] };
}
