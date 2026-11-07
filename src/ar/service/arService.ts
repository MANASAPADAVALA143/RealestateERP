import type { IntegrationService } from "../../integrations/service/service.ts";
import { AR_STORES, type ArStoreName, type StorageAdapter } from "../../integrations/service/storage.ts";
import { balances, unallocated } from "../engine/analytics.ts";
import { billingRun, lateFeeRun, type ProposedInvoice } from "../engine/billing.ts";
import { isDate, isPeriod, round2 } from "../engine/dates.ts";
import { fxFor } from "../engine/fx.ts";
import { bankLines, planImport, reconcileAgeing, type BankLine } from "../engine/importer.ts";
import {
  applyUnappliedLines,
  creditLines,
  defaultAccounts,
  depositApplyLines,
  depositLines,
  invoiceLines,
  makeJournal,
  openingLines,
  receiptLines,
  reversalLines,
} from "../engine/ledger.ts";
import type {
  ArBook,
  ArCreditNote,
  ArDeposit,
  ArDispute,
  ArFollowUp,
  ArInvoice,
  ArLease,
  ArPayment,
  ArSettings,
  ArTenant,
  ChargeType,
  FollowUpType,
  Fx,
  InvoiceLine,
  Journal,
  JournalLine,
  JournalSource,
  Lineage,
} from "../engine/types.ts";

export class ArError extends Error {}

const ESTATECFO: Lineage = { system: "EstateCFO" };
export const SAMPLE: Lineage = { system: "Sample data" };

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID().slice(0, 8);
}

const prefixes = { invoice: "INV", receipt: "RCT", credit: "CN", journal: "JE" } as const;

export function defaultArSettings(workspaceId: string): ArSettings {
  return {
    id: `ar:${workspaceId}`,
    workspaceId,
    groupCurrency: "USD",
    entityCurrencies: {},
    fxRates: [],
    accounts: { ...defaultAccounts },
    bankAccounts: [{ name: "Operating bank", code: "1010", currency: "USD" }],
    defaultTermsDays: 5,
    lateFee: { enabled: true, graceDays: 10, percent: 5, flat: 0, minimum: 50 },
    allowance: { Current: 0.5, "1–30": 2, "31–60": 10, "61–90": 25, "90+": 50 },
    approvals: { invoices: true, creditNotes: true, reversals: true },
    counters: { invoice: 0, receipt: 0, credit: 0, journal: 0 },
  };
}

export interface PaymentInput {
  tenantId: string;
  receivedDate: string;
  amount: number;
  currency: string;
  bankAccount: string;
  method: string;
  reference: string;
  allocations: { invoiceId: string; amount: number }[];
  bankLineRef?: string;
  source?: Lineage;
}

export class ArService {
  readonly integration: IntegrationService;
  readonly storage: StorageAdapter;

  constructor(integration: IntegrationService) {
    this.integration = integration;
    this.storage = integration.storage;
  }

  private all<T>(store: ArStoreName, workspaceId: string): Promise<T[]> {
    return this.storage.getByIndex<T>(store, "workspaceId", workspaceId);
  }

  private changed(): void {
    this.integration.notify();
  }

  private async audit(workspaceId: string, action: string, target: string, detail: string): Promise<void> {
    await this.integration.audit(workspaceId, action, target, detail);
  }

  async settings(workspaceId: string): Promise<ArSettings> {
    const defaults = defaultArSettings(workspaceId);
    const stored = await this.storage.get<ArSettings>("ar_settings", defaults.id);
    if (!stored) return defaults;
    return { ...defaults, ...stored, accounts: { ...defaults.accounts, ...stored.accounts }, lateFee: { ...defaults.lateFee, ...stored.lateFee }, allowance: { ...defaults.allowance, ...stored.allowance }, approvals: { ...defaults.approvals, ...stored.approvals }, counters: { ...defaults.counters, ...stored.counters } };
  }

  async saveSettings(settings: ArSettings, detail: string): Promise<void> {
    if (!/^[A-Z]{3}$/.test(settings.groupCurrency)) throw new ArError("Group currency must be a 3-letter ISO code.");
    for (const rate of settings.fxRates) {
      if (!/^[A-Z]{3}$/.test(rate.currency) || !isPeriod(rate.period) || !(rate.rate > 0)) throw new ArError(`Exchange rate ${rate.currency} ${rate.period} is invalid. Use a 3-letter code, a YYYY-MM period, and a positive rate.`);
    }
    if (settings.bankAccounts.length === 0) throw new ArError("Keep at least one bank account.");
    const current = await this.settings(settings.workspaceId);
    await this.storage.put("ar_settings", { ...settings, counters: current.counters });
    await this.audit(settings.workspaceId, "AR settings changed", "Real Estate AR", detail);
    this.changed();
  }

  private async next(workspaceId: string, kind: keyof typeof prefixes): Promise<string> {
    const settings = await this.settings(workspaceId);
    const value = (settings.counters[kind] ?? 0) + 1;
    await this.storage.put("ar_settings", { ...settings, counters: { ...settings.counters, [kind]: value } });
    return `${prefixes[kind]}-${String(value).padStart(5, "0")}`;
  }

  private async context(workspaceId: string): Promise<{ settings: ArSettings; user: string; locks: string[] }> {
    const integrationSettings = await this.integration.settings(workspaceId);
    return { settings: await this.settings(workspaceId), user: integrationSettings.userName, locks: integrationSettings.lockedPeriods };
  }

  private assertOpen(date: string, locks: string[], what: string): void {
    if (!isDate(date)) throw new ArError(`${what}: enter a valid date (YYYY-MM-DD).`);
    if (locks.includes(date.slice(0, 7))) throw new ArError(`${what}: period ${date.slice(0, 7)} is locked. Choose a date in an open period or unlock it in Integration Settings.`);
  }

  async book(workspaceId: string): Promise<ArBook> {
    const [context, tenants, leases, invoices, payments, creditNotes, deposits, journals, followUps, disputes] = await Promise.all([
      this.context(workspaceId),
      this.all<ArTenant>("ar_tenants", workspaceId),
      this.all<ArLease>("ar_leases", workspaceId),
      this.all<ArInvoice>("ar_invoices", workspaceId),
      this.all<ArPayment>("ar_payments", workspaceId),
      this.all<ArCreditNote>("ar_credit_notes", workspaceId),
      this.all<ArDeposit>("ar_deposits", workspaceId),
      this.all<Journal>("ar_journals", workspaceId),
      this.all<ArFollowUp>("ar_followups", workspaceId),
      this.all<ArDispute>("ar_disputes", workspaceId),
    ]);
    return {
      workspaceId,
      user: context.user,
      lockedPeriods: context.locks,
      settings: context.settings,
      tenants: tenants.sort((a, b) => a.name.localeCompare(b.name)),
      leases: leases.sort((a, b) => a.code.localeCompare(b.code)),
      invoices: invoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate) || b.number.localeCompare(a.number)),
      payments: payments.sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || b.number.localeCompare(a.number)),
      creditNotes: creditNotes.sort((a, b) => b.date.localeCompare(a.date)),
      deposits,
      journals: journals.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number)),
      followUps: followUps.sort((a, b) => b.date.localeCompare(a.date)),
      disputes: disputes.sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    };
  }

  private async postJournal(workspaceId: string, header: { date: string; entityId: string; propertyId: string; description: string; sourceType: JournalSource; sourceId: string; fx: Fx; reverses?: string }, lines: JournalLine[], user: string): Promise<Journal> {
    const number = await this.next(workspaceId, "journal");
    const journal = makeJournal({ workspaceId, number, createdBy: user, createdAt: now(), ...header }, lines);
    await this.storage.put("ar_journals", journal);
    return journal;
  }

  private async reverseJournal(workspaceId: string, journalId: string, date: string, reason: string, user: string): Promise<Journal> {
    const original = await this.storage.get<Journal>("ar_journals", journalId);
    if (!original) throw new ArError("Original journal not found.");
    if (original.reversedBy) throw new ArError(`Journal ${original.number} is already reversed.`);
    const fx: Fx = { currency: original.currency, functionalCurrency: original.functionalCurrency, groupCurrency: original.groupCurrency, rateToFunctional: 1, rateToGroup: original.functionalToGroup, period: date.slice(0, 7) };
    const reversal = await this.postJournal(workspaceId, { date, entityId: original.entityId, propertyId: original.propertyId, description: `Reversal of ${original.number}: ${reason}`, sourceType: "reversal", sourceId: original.sourceId, fx, reverses: original.id }, reversalLines(original), user);
    await this.storage.put("ar_journals", { ...original, reversedBy: reversal.id });
    return reversal;
  }

  // ---------- Tenants and leases ----------

  async saveTenant(input: Omit<ArTenant, "id" | "createdAt" | "updatedAt" | "source"> & { id?: string; source?: Lineage }): Promise<ArTenant> {
    const missing = (["code", "name", "entityId", "propertyId"] as const).filter((key) => !String(input[key] ?? "").trim());
    if (missing.length) throw new ArError(`Enter ${missing.map((key) => ({ code: "tenant code", name: "tenant name", entityId: "legal entity", propertyId: "property" })[key]).join(", ")}.`);
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new ArError("Contact email is not a valid address.");
    if (!(input.paymentTermsDays >= 0)) throw new ArError("Payment terms must be zero or more days.");
    if (!/^[A-Z]{3}$/.test(input.currency)) throw new ArError("Currency must be a 3-letter ISO code.");
    const existing = await this.all<ArTenant>("ar_tenants", input.workspaceId);
    if (existing.some((tenant) => tenant.code.toUpperCase() === input.code.trim().toUpperCase() && tenant.id !== input.id)) throw new ArError(`Tenant code ${input.code} is already used.`);
    const previous = input.id ? existing.find((tenant) => tenant.id === input.id) : undefined;
    const tenant: ArTenant = { ...input, code: input.code.trim(), name: input.name.trim(), id: input.id ?? `${input.workspaceId}:T:${uid()}`, source: previous?.source ?? input.source ?? ESTATECFO, createdAt: previous?.createdAt ?? now(), updatedAt: now() };
    await this.storage.put("ar_tenants", tenant);
    await this.audit(input.workspaceId, previous ? "AR tenant changed" : "AR tenant added", tenant.code, `${tenant.name} · ${tenant.entityId} · ${tenant.propertyName || tenant.propertyId} unit ${tenant.unit || "—"} · terms ${tenant.paymentTermsDays} days · ${tenant.currency}.`);
    this.changed();
    return tenant;
  }

  async saveLease(input: Omit<ArLease, "id" | "createdAt" | "updatedAt" | "source"> & { id?: string; source?: Lineage }): Promise<ArLease> {
    if (!input.code.trim()) throw new ArError("Enter a lease code.");
    const tenant = await this.storage.get<ArTenant>("ar_tenants", input.tenantId);
    if (!tenant || tenant.workspaceId !== input.workspaceId) throw new ArError("Choose a tenant from the register.");
    if (!isDate(input.start) || !isDate(input.end)) throw new ArError("Enter valid lease start and end dates.");
    if (input.end < input.start) throw new ArError("Lease end is before lease start.");
    if (!/^[A-Z]{3}$/.test(input.currency)) throw new ArError("Currency must be a 3-letter ISO code.");
    if (input.charges.length === 0) throw new ArError("Add at least one charge (for example base rent).");
    for (const charge of input.charges) {
      if (!(charge.amount > 0)) throw new ArError(`Charge “${charge.description || charge.type}” needs a positive amount.`);
      if (charge.escalationPct < 0) throw new ArError("Escalation cannot be negative.");
      if ((charge.start && !isDate(charge.start)) || (charge.end && !isDate(charge.end))) throw new ArError(`Charge “${charge.description || charge.type}” has an invalid date.`);
    }
    if (new Set(input.charges.map((charge) => charge.id)).size !== input.charges.length) throw new ArError("Each charge needs a unique ID.");
    const existing = await this.all<ArLease>("ar_leases", input.workspaceId);
    if (existing.some((lease) => lease.code.toUpperCase() === input.code.trim().toUpperCase() && lease.id !== input.id)) throw new ArError(`Lease code ${input.code} is already used.`);
    const previous = input.id ? existing.find((lease) => lease.id === input.id) : undefined;
    const lease: ArLease = { ...input, code: input.code.trim(), id: input.id ?? `${input.workspaceId}:L:${uid()}`, source: previous?.source ?? input.source ?? ESTATECFO, createdAt: previous?.createdAt ?? now(), updatedAt: now() };
    await this.storage.put("ar_leases", lease);
    await this.audit(input.workspaceId, previous ? "AR lease changed" : "AR lease added", lease.code, `${tenant.name} · ${lease.start} to ${lease.end} · ${lease.charges.map((charge) => `${charge.description || charge.type} ${charge.amount} ${lease.currency} ${charge.frequency}`).join("; ")}${previous ? ". Changes apply to future billing; posted invoices are unchanged." : "."}`);
    this.changed();
    return lease;
  }

  // ---------- Billing ----------

  async billingPreview(workspaceId: string, period: string, invoiceDate?: string) {
    if (!isPeriod(period)) throw new ArError("Choose a billing month (YYYY-MM).");
    const book = await this.book(workspaceId);
    return billingRun({ period, leases: book.leases.filter((lease) => lease.status === "Active"), tenants: book.tenants, invoices: book.invoices, invoiceDate });
  }

  private async draftFrom(workspaceId: string, proposal: ProposedInvoice, user: string, source: Lineage = ESTATECFO): Promise<ArInvoice> {
    const invoice: ArInvoice = {
      id: `${workspaceId}:INV:${uid()}`,
      workspaceId,
      number: await this.next(workspaceId, "invoice"),
      kind: proposal.kind,
      tenantId: proposal.tenantId,
      leaseId: proposal.leaseId,
      entityId: proposal.entityId,
      propertyId: proposal.propertyId,
      unit: proposal.unit,
      invoiceDate: proposal.invoiceDate,
      dueDate: proposal.dueDate,
      periodStart: proposal.periodStart,
      periodEnd: proposal.periodEnd,
      billingPeriod: proposal.billingPeriod,
      currency: proposal.currency,
      lines: proposal.lines,
      total: proposal.total,
      priorCollected: 0,
      billingKeys: proposal.billingKeys,
      status: "Draft",
      source,
      createdBy: user,
      createdAt: now(),
    };
    await this.storage.put("ar_invoices", invoice);
    return invoice;
  }

  /** Re-runs billing at creation time so a charge can never be drafted twice for the same period. */
  async createDrafts(workspaceId: string, period: string, options: { leaseIds?: string[]; invoiceDate?: string; source?: Lineage } = {}): Promise<{ created: ArInvoice[]; skipped: { tenant: string; reason: string }[] }> {
    const { user } = await this.context(workspaceId);
    const run = await this.billingPreview(workspaceId, period, options.invoiceDate);
    const selected = options.leaseIds ? run.proposals.filter((proposal) => proposal.leaseId && options.leaseIds!.includes(proposal.leaseId)) : run.proposals;
    const created: ArInvoice[] = [];
    for (const proposal of selected) created.push(await this.draftFrom(workspaceId, proposal, user, options.source));
    if (created.length) await this.audit(workspaceId, "Billing run", period, `${created.length} draft invoice(s) created for ${period}: ${created.map((invoice) => invoice.number).join(", ")}. ${run.skipped.length} charge(s) skipped.`);
    this.changed();
    return { created, skipped: run.skipped };
  }

  async lateFeePreview(workspaceId: string, asOf: string) {
    const book = await this.book(workspaceId);
    const outstanding = new Map([...balances(book).entries()].map(([id, balance]) => [id, balance.outstanding]));
    return lateFeeRun({ asOf, invoices: book.invoices, outstanding, disputes: book.disputes, tenants: book.tenants, settings: book.settings });
  }

  async createLateFeeDrafts(workspaceId: string, asOf: string, invoiceIds?: string[]): Promise<ArInvoice[]> {
    const { user } = await this.context(workspaceId);
    const run = await this.lateFeePreview(workspaceId, asOf);
    const selected = invoiceIds ? run.proposals.filter((proposal) => invoiceIds.some((id) => proposal.billingKeys.includes(`late|${id}`))) : run.proposals;
    const created: ArInvoice[] = [];
    for (const proposal of selected) created.push(await this.draftFrom(workspaceId, proposal, user));
    if (created.length) await this.audit(workspaceId, "Late payment charges drafted", asOf, `${created.length} late payment charge(s) drafted: ${created.map((invoice) => invoice.number).join(", ")}.`);
    this.changed();
    return created;
  }

  async createManualInvoice(workspaceId: string, input: { tenantId: string; leaseId?: string; invoiceDate: string; dueDate: string; lines: Omit<InvoiceLine, "periodStart" | "periodEnd">[] }): Promise<ArInvoice> {
    const { user } = await this.context(workspaceId);
    const tenant = await this.storage.get<ArTenant>("ar_tenants", input.tenantId);
    if (!tenant) throw new ArError("Choose a tenant.");
    if (!isDate(input.invoiceDate) || !isDate(input.dueDate) || input.dueDate < input.invoiceDate) throw new ArError("Enter an invoice date and a due date on or after it.");
    const lines = input.lines.filter((line) => line.amount);
    if (lines.length === 0 || lines.some((line) => !(line.amount > 0))) throw new ArError("Add at least one line with a positive amount. Use a credit note to reduce an invoice.");
    const lease = input.leaseId ? await this.storage.get<ArLease>("ar_leases", input.leaseId) : undefined;
    const invoice = await this.draftFrom(
      workspaceId,
      {
        kind: "rent",
        leaseId: lease?.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
        entityId: lease?.entityId ?? tenant.entityId,
        propertyId: lease?.propertyId ?? tenant.propertyId,
        unit: lease?.unit ?? tenant.unit,
        currency: lease?.currency ?? tenant.currency,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        periodStart: input.invoiceDate,
        periodEnd: input.invoiceDate,
        billingPeriod: input.invoiceDate.slice(0, 7),
        lines: lines.map((line) => ({ ...line, amount: round2(line.amount), periodStart: input.invoiceDate, periodEnd: input.invoiceDate })),
        total: round2(lines.reduce((sum, line) => sum + line.amount, 0)),
        billingKeys: [],
      },
      user,
    );
    await this.storage.put("ar_invoices", { ...invoice, kind: "manual" });
    await this.audit(workspaceId, "Manual invoice drafted", invoice.number, `${tenant.name} · ${invoice.total} ${invoice.currency}.`);
    this.changed();
    return { ...invoice, kind: "manual" };
  }

  private async invoiceOrThrow(id: string): Promise<ArInvoice> {
    const invoice = await this.storage.get<ArInvoice>("ar_invoices", id);
    if (!invoice) throw new ArError("Invoice not found.");
    return invoice;
  }

  async approveInvoice(id: string): Promise<ArInvoice> {
    const invoice = await this.invoiceOrThrow(id);
    if (invoice.status !== "Draft") throw new ArError(`${invoice.number} is ${invoice.status}; only drafts can be approved.`);
    const { user } = await this.context(invoice.workspaceId);
    const approved: ArInvoice = { ...invoice, status: "Approved", approvedBy: user, approvedAt: now() };
    await this.storage.put("ar_invoices", approved);
    await this.audit(invoice.workspaceId, "Invoice approved", invoice.number, `${invoice.total} ${invoice.currency} approved for posting.`);
    this.changed();
    return approved;
  }

  async postInvoice(id: string, postingDate?: string): Promise<ArInvoice> {
    const invoice = await this.invoiceOrThrow(id);
    const { settings, user, locks } = await this.context(invoice.workspaceId);
    if (invoice.status === "Posted") throw new ArError(`${invoice.number} is already posted.`);
    if (invoice.status === "Draft" && settings.approvals.invoices) throw new ArError(`${invoice.number} must be approved before posting.`);
    if (invoice.status !== "Draft" && invoice.status !== "Approved") throw new ArError(`${invoice.number} is ${invoice.status} and cannot be posted.`);
    const date = postingDate ?? invoice.invoiceDate;
    this.assertOpen(date, locks, `Posting ${invoice.number}`);
    const fx = fxFor(settings, invoice.currency, invoice.entityId, date.slice(0, 7));
    const lines = invoice.kind === "imported" ? openingLines(settings, invoice, fx) : invoiceLines(settings, invoice, fx);
    const journal = await this.postJournal(invoice.workspaceId, { date, entityId: invoice.entityId, propertyId: invoice.propertyId, description: invoice.kind === "imported" ? `Opening balance ${invoice.number} (${invoice.source.system})` : `Invoice ${invoice.number}`, sourceType: invoice.kind === "imported" ? "opening" : "invoice", sourceId: invoice.id, fx }, lines, user);
    const posted: ArInvoice = { ...invoice, status: "Posted", postingDate: date, fx, journalId: journal.id };
    await this.storage.put("ar_invoices", posted);
    await this.audit(invoice.workspaceId, "Invoice posted", invoice.number, `${invoice.total} ${invoice.currency} posted ${date} as ${journal.number}.`);
    this.changed();
    return posted;
  }

  async deleteDraft(id: string): Promise<void> {
    const invoice = await this.invoiceOrThrow(id);
    if (invoice.status !== "Draft" && invoice.status !== "Approved") throw new ArError(`${invoice.number} is ${invoice.status}. Posted invoices are reversed or credited, never deleted.`);
    await this.storage.delete("ar_invoices", id);
    await this.audit(invoice.workspaceId, "Draft invoice deleted", invoice.number, `${invoice.status} invoice for ${invoice.total} ${invoice.currency} deleted before posting.`);
    this.changed();
  }

  async requestInvoiceReversal(id: string, reason: string): Promise<ArInvoice> {
    const invoice = await this.invoiceOrThrow(id);
    if (invoice.status !== "Posted") throw new ArError(`${invoice.number} is ${invoice.status}; only posted invoices can be reversed.`);
    if (!reason.trim()) throw new ArError("Give a reason for the reversal.");
    const book = await this.book(invoice.workspaceId);
    const balance = balances(book).get(id);
    if (balance && (balance.collected > 0 || balance.credited > 0)) throw new ArError(`${invoice.number} has receipts or credit notes applied. Reverse those first, or issue a credit note for the remaining balance.`);
    const requested: ArInvoice = { ...invoice, status: "Reversal requested", reversal: { requestedBy: book.user, requestedAt: now(), reason: reason.trim() } };
    await this.storage.put("ar_invoices", requested);
    await this.audit(invoice.workspaceId, "Invoice reversal requested", invoice.number, reason.trim());
    if (!book.settings.approvals.reversals) return this.approveInvoiceReversal(id, invoice.postingDate ?? invoice.invoiceDate);
    this.changed();
    return requested;
  }

  async approveInvoiceReversal(id: string, date: string): Promise<ArInvoice> {
    const invoice = await this.invoiceOrThrow(id);
    if (invoice.status !== "Reversal requested" || !invoice.reversal || !invoice.journalId) throw new ArError(`${invoice.number} has no pending reversal.`);
    const { user, locks } = await this.context(invoice.workspaceId);
    this.assertOpen(date, locks, `Reversing ${invoice.number}`);
    const journal = await this.reverseJournal(invoice.workspaceId, invoice.journalId, date, invoice.reversal.reason, user);
    const reversed: ArInvoice = { ...invoice, status: "Reversed", reversal: { ...invoice.reversal, approvedBy: user, approvedAt: now(), journalId: journal.id } };
    await this.storage.put("ar_invoices", reversed);
    await this.audit(invoice.workspaceId, "Invoice reversed", invoice.number, `Reversal ${journal.number} dated ${date}. ${invoice.reversal.reason}`);
    this.changed();
    return reversed;
  }

  async cancelInvoiceReversal(id: string): Promise<void> {
    const invoice = await this.invoiceOrThrow(id);
    if (invoice.status !== "Reversal requested") throw new ArError("No pending reversal.");
    await this.storage.put("ar_invoices", { ...invoice, status: "Posted", reversal: undefined });
    await this.audit(invoice.workspaceId, "Invoice reversal rejected", invoice.number, "Reversal request rejected; invoice remains posted.");
    this.changed();
  }

  // ---------- Receipts ----------

  private async validateAllocations(book: ArBook, tenantId: string, currency: string, allocations: { invoiceId: string; amount: number }[], available: number): Promise<{ invoice: ArInvoice; amount: number }[]> {
    const open = balances(book);
    const seen = new Set<string>();
    const result: { invoice: ArInvoice; amount: number }[] = [];
    let total = 0;
    for (const item of allocations) {
      if (!item.amount) continue;
      if (!(item.amount > 0)) throw new ArError("Allocation amounts must be positive.");
      if (seen.has(item.invoiceId)) throw new ArError("Each invoice can appear once per allocation.");
      seen.add(item.invoiceId);
      const balance = open.get(item.invoiceId);
      if (!balance) throw new ArError("Receipts can only be allocated to posted invoices.");
      const { invoice } = balance;
      if (invoice.tenantId !== tenantId) throw new ArError(`${invoice.number} belongs to another tenant.`);
      if (invoice.currency !== currency) throw new ArError(`${invoice.number} is in ${invoice.currency}; this receipt is in ${currency}.`);
      if (round2(item.amount) > balance.outstanding) throw new ArError(`${round2(item.amount)} exceeds the ${balance.outstanding} outstanding on ${invoice.number}.`);
      total = round2(total + item.amount);
      result.push({ invoice, amount: round2(item.amount) });
    }
    if (total > round2(available)) throw new ArError(`Allocations (${total}) exceed the amount available (${round2(available)}).`);
    const entities = new Set(result.map((item) => item.invoice.entityId));
    if (entities.size > 1) throw new ArError("Allocate a receipt to invoices of one legal entity only.");
    return result;
  }

  /** A receipt always creates a payment record and a journal; invoices are never marked paid without one. */
  async recordPayment(workspaceId: string, input: PaymentInput): Promise<ArPayment> {
    const book = await this.book(workspaceId);
    const tenant = book.tenants.find((item) => item.id === input.tenantId);
    if (!tenant) throw new ArError("Choose the paying tenant.");
    if (!(input.amount > 0)) throw new ArError("Receipt amount must be positive.");
    this.assertOpen(input.receivedDate, book.lockedPeriods, "Receipt");
    if (input.bankLineRef && book.payments.some((payment) => payment.bankLineRef === input.bankLineRef && payment.status !== "Reversed")) throw new ArError("This bank line is already matched to a receipt.");
    if (!book.settings.bankAccounts.some((bank) => bank.name === input.bankAccount)) throw new ArError("Choose a bank account from AR Settings.");
    const allocations = await this.validateAllocations(book, tenant.id, input.currency, input.allocations, input.amount);
    const entityId = allocations[0]?.invoice.entityId ?? tenant.entityId;
    const fx = fxFor(book.settings, input.currency, entityId, input.receivedDate.slice(0, 7));
    const id = `${workspaceId}:RCT:${uid()}`;
    const number = await this.next(workspaceId, "receipt");
    const journal = await this.postJournal(workspaceId, { date: input.receivedDate, entityId, propertyId: allocations[0]?.invoice.propertyId ?? tenant.propertyId, description: `Receipt ${number} from ${tenant.name}`, sourceType: "payment", sourceId: id, fx }, receiptLines(book.settings, { tenantId: tenant.id, bankAccount: input.bankAccount, amount: round2(input.amount), fx, allocations }), book.user);
    const payment: ArPayment = {
      id,
      workspaceId,
      number,
      tenantId: tenant.id,
      entityId,
      receivedDate: input.receivedDate,
      amount: round2(input.amount),
      currency: input.currency,
      bankAccount: input.bankAccount,
      method: input.method,
      reference: input.reference,
      allocations: allocations.map((item) => ({ id: uid(), invoiceId: item.invoice.id, amount: item.amount, date: input.receivedDate, journalId: journal.id })),
      status: "Posted",
      fx,
      journalIds: [journal.id],
      bankLineRef: input.bankLineRef,
      source: input.source ?? ESTATECFO,
      createdBy: book.user,
      createdAt: now(),
    };
    await this.storage.put("ar_payments", payment);
    const left = unallocated(payment);
    await this.audit(workspaceId, "Receipt recorded", number, `${tenant.name} · ${payment.amount} ${payment.currency} on ${payment.receivedDate} to ${payment.bankAccount}. Allocated to ${allocations.map((item) => `${item.invoice.number} ${item.amount}`).join(", ") || "nothing"}${left > 0 ? `; ${left} unallocated` : ""}. Journal ${journal.number}.`);
    this.changed();
    return payment;
  }

  async allocate(paymentId: string, allocations: { invoiceId: string; amount: number }[], date: string): Promise<ArPayment> {
    const payment = await this.storage.get<ArPayment>("ar_payments", paymentId);
    if (!payment || payment.status !== "Posted") throw new ArError("Only posted receipts can be allocated.");
    const book = await this.book(payment.workspaceId);
    this.assertOpen(date, book.lockedPeriods, "Allocation");
    if (date < payment.receivedDate) throw new ArError("Allocation date cannot be before the receipt date.");
    const items = await this.validateAllocations(book, payment.tenantId, payment.currency, allocations, unallocated(payment));
    if (items.length === 0) throw new ArError("Enter an amount to allocate.");
    if (items.some((item) => item.invoice.entityId !== payment.entityId)) throw new ArError("Allocate to invoices of the receipt's legal entity.");
    const journal = await this.postJournal(payment.workspaceId, { date, entityId: payment.entityId, propertyId: items[0].invoice.propertyId, description: `Allocation of ${payment.number}`, sourceType: "allocation", sourceId: payment.id, fx: payment.fx }, applyUnappliedLines(book.settings, { tenantId: payment.tenantId, paymentFx: payment.fx, allocations: items }), book.user);
    const updated: ArPayment = { ...payment, allocations: [...payment.allocations, ...items.map((item) => ({ id: uid(), invoiceId: item.invoice.id, amount: item.amount, date, journalId: journal.id }))], journalIds: [...payment.journalIds, journal.id] };
    await this.storage.put("ar_payments", updated);
    await this.audit(payment.workspaceId, "Receipt allocated", payment.number, `${items.map((item) => `${item.invoice.number} ${item.amount}`).join(", ")} on ${date}. Journal ${journal.number}.`);
    this.changed();
    return updated;
  }

  async requestPaymentReversal(id: string, reason: string): Promise<ArPayment> {
    const payment = await this.storage.get<ArPayment>("ar_payments", id);
    if (!payment || payment.status !== "Posted") throw new ArError("Only posted receipts can be reversed.");
    if (!reason.trim()) throw new ArError("Give a reason, for example “cheque returned unpaid”.");
    const { settings, user } = await this.context(payment.workspaceId);
    const requested: ArPayment = { ...payment, status: "Reversal requested", reversal: { requestedBy: user, requestedAt: now(), reason: reason.trim() } };
    await this.storage.put("ar_payments", requested);
    await this.audit(payment.workspaceId, "Receipt reversal requested", payment.number, reason.trim());
    if (!settings.approvals.reversals) return this.approvePaymentReversal(id, payment.receivedDate);
    this.changed();
    return requested;
  }

  async approvePaymentReversal(id: string, date: string): Promise<ArPayment> {
    const payment = await this.storage.get<ArPayment>("ar_payments", id);
    if (!payment || payment.status !== "Reversal requested" || !payment.reversal) throw new ArError("No pending reversal for this receipt.");
    const { user, locks } = await this.context(payment.workspaceId);
    this.assertOpen(date, locks, `Reversing ${payment.number}`);
    const reversals: string[] = [];
    for (const journalId of payment.journalIds) reversals.push((await this.reverseJournal(payment.workspaceId, journalId, date, payment.reversal.reason, user)).id);
    const reversed: ArPayment = { ...payment, status: "Reversed", reversal: { ...payment.reversal, approvedBy: user, approvedAt: now(), journalId: reversals.join(",") } };
    await this.storage.put("ar_payments", reversed);
    await this.audit(payment.workspaceId, "Receipt reversed", payment.number, `${payment.amount} ${payment.currency} reversed on ${date}; allocations removed and invoices reopened. ${payment.reversal.reason}`);
    this.changed();
    return reversed;
  }

  async cancelPaymentReversal(id: string): Promise<void> {
    const payment = await this.storage.get<ArPayment>("ar_payments", id);
    if (!payment || payment.status !== "Reversal requested") throw new ArError("No pending reversal.");
    await this.storage.put("ar_payments", { ...payment, status: "Posted", reversal: undefined });
    await this.audit(payment.workspaceId, "Receipt reversal rejected", payment.number, "Reversal request rejected; receipt remains posted.");
    this.changed();
  }

  // ---------- Credit notes and write-offs ----------

  async createCreditNote(workspaceId: string, input: { invoiceId: string; amount: number; reason: string; type: "credit" | "write_off"; chargeType?: ChargeType; date: string; disputeId?: string; source?: Lineage }): Promise<ArCreditNote> {
    const book = await this.book(workspaceId);
    const balance = balances(book).get(input.invoiceId);
    if (!balance) throw new ArError("Credit notes apply to posted invoices.");
    if (!(input.amount > 0)) throw new ArError("Credit amount must be positive.");
    if (!input.reason.trim()) throw new ArError("Give a reason for the credit.");
    if (!isDate(input.date)) throw new ArError("Enter a valid credit note date.");
    const pending = book.creditNotes.filter((note) => note.invoiceId === input.invoiceId && note.status === "Draft").reduce((sum, note) => sum + note.amount, 0);
    if (round2(input.amount + pending) > balance.outstanding) throw new ArError(`Credits (${round2(input.amount + pending)} including drafts) would exceed the ${balance.outstanding} outstanding on ${balance.invoice.number}.`);
    const note: ArCreditNote = {
      id: `${workspaceId}:CN:${uid()}`,
      workspaceId,
      number: await this.next(workspaceId, "credit"),
      type: input.type,
      invoiceId: input.invoiceId,
      tenantId: balance.invoice.tenantId,
      entityId: balance.invoice.entityId,
      date: input.date,
      amount: round2(input.amount),
      chargeType: input.chargeType ?? balance.invoice.lines[0]?.chargeType ?? "other",
      reason: input.reason.trim(),
      status: "Draft",
      disputeId: input.disputeId,
      requestedBy: book.user,
      requestedAt: now(),
      source: input.source ?? ESTATECFO,
    };
    await this.storage.put("ar_credit_notes", note);
    await this.audit(workspaceId, input.type === "write_off" ? "Write-off requested" : "Credit note requested", note.number, `${note.amount} ${balance.invoice.currency} against ${balance.invoice.number}: ${note.reason}`);
    if (!book.settings.approvals.creditNotes) return this.approveCreditNote(note.id);
    this.changed();
    return note;
  }

  async approveCreditNote(id: string): Promise<ArCreditNote> {
    const note = await this.storage.get<ArCreditNote>("ar_credit_notes", id);
    if (!note || note.status !== "Draft") throw new ArError("Only draft credit notes can be approved.");
    const book = await this.book(note.workspaceId);
    this.assertOpen(note.date, book.lockedPeriods, `Credit note ${note.number}`);
    const balance = balances(book).get(note.invoiceId);
    if (!balance) throw new ArError("The invoice is no longer posted.");
    if (note.amount > balance.outstanding) throw new ArError(`${note.amount} exceeds the ${balance.outstanding} now outstanding on ${balance.invoice.number}.`);
    const fx = balance.invoice.fx ?? fxFor(book.settings, balance.invoice.currency, balance.invoice.entityId, note.date.slice(0, 7));
    const journal = await this.postJournal(note.workspaceId, { date: note.date, entityId: note.entityId, propertyId: balance.invoice.propertyId, description: `${note.type === "write_off" ? "Write-off" : "Credit note"} ${note.number} on ${balance.invoice.number}`, sourceType: note.type === "write_off" ? "write_off" : "credit_note", sourceId: note.id, fx }, creditLines(book.settings, { invoice: balance.invoice, amount: note.amount, type: note.type, chargeType: note.chargeType }), book.user);
    const posted: ArCreditNote = { ...note, status: "Posted", approvedBy: book.user, approvedAt: now(), journalId: journal.id };
    await this.storage.put("ar_credit_notes", posted);
    await this.audit(note.workspaceId, note.type === "write_off" ? "Write-off posted" : "Credit note posted", note.number, `${note.amount} ${balance.invoice.currency} on ${balance.invoice.number}. Journal ${journal.number}.`);
    this.changed();
    return posted;
  }

  async rejectCreditNote(id: string, reason: string): Promise<void> {
    const note = await this.storage.get<ArCreditNote>("ar_credit_notes", id);
    if (!note || note.status !== "Draft") throw new ArError("Only draft credit notes can be rejected.");
    await this.storage.put("ar_credit_notes", { ...note, status: "Rejected" });
    await this.audit(note.workspaceId, "Credit note rejected", note.number, reason || "Rejected.");
    this.changed();
  }

  // ---------- Security deposits (liability, never revenue) ----------

  async recordDeposit(workspaceId: string, input: { tenantId: string; leaseId?: string; amount: number; currency: string; receivedDate: string; bankAccount: string; source?: Lineage }): Promise<ArDeposit> {
    const book = await this.book(workspaceId);
    const tenant = book.tenants.find((item) => item.id === input.tenantId);
    if (!tenant) throw new ArError("Choose a tenant.");
    if (!(input.amount > 0)) throw new ArError("Deposit must be positive.");
    this.assertOpen(input.receivedDate, book.lockedPeriods, "Deposit");
    const fx = fxFor(book.settings, input.currency, tenant.entityId, input.receivedDate.slice(0, 7));
    const id = `${workspaceId}:DEP:${uid()}`;
    const journal = await this.postJournal(workspaceId, { date: input.receivedDate, entityId: tenant.entityId, propertyId: tenant.propertyId, description: `Security deposit from ${tenant.name}`, sourceType: "deposit", sourceId: id, fx }, depositLines(book.settings, { tenantId: tenant.id, bankAccount: input.bankAccount, amount: round2(input.amount), fx, direction: "received" }), book.user);
    const deposit: ArDeposit = { id, workspaceId, tenantId: tenant.id, leaseId: input.leaseId, entityId: tenant.entityId, propertyId: tenant.propertyId, amount: round2(input.amount), currency: input.currency, receivedDate: input.receivedDate, bankAccount: input.bankAccount, status: "Held", fx, journalIds: [journal.id], source: input.source ?? ESTATECFO, createdBy: book.user, createdAt: now() };
    await this.storage.put("ar_deposits", deposit);
    await this.audit(workspaceId, "Security deposit received", tenant.code, `${deposit.amount} ${deposit.currency} held as a liability (journal ${journal.number}).`);
    this.changed();
    return deposit;
  }

  async settleDeposit(id: string, action: { kind: "refund"; date: string } | { kind: "apply"; date: string; invoiceId: string }): Promise<ArDeposit> {
    const deposit = await this.storage.get<ArDeposit>("ar_deposits", id);
    if (!deposit || deposit.status !== "Held") throw new ArError("Only held deposits can be refunded or applied.");
    const book = await this.book(deposit.workspaceId);
    this.assertOpen(action.date, book.lockedPeriods, "Deposit settlement");
    let journal: Journal;
    if (action.kind === "refund") {
      journal = await this.postJournal(deposit.workspaceId, { date: action.date, entityId: deposit.entityId, propertyId: deposit.propertyId, description: "Security deposit refunded", sourceType: "deposit_refund", sourceId: deposit.id, fx: deposit.fx }, depositLines(book.settings, { tenantId: deposit.tenantId, bankAccount: deposit.bankAccount, amount: deposit.amount, fx: deposit.fx, direction: "refunded" }), book.user);
    } else {
      const balance = balances(book).get(action.invoiceId);
      if (!balance || balance.invoice.tenantId !== deposit.tenantId) throw new ArError("Choose a posted invoice of the same tenant.");
      if (balance.invoice.currency !== deposit.currency) throw new ArError("The deposit and invoice currencies differ.");
      if (deposit.amount > balance.outstanding) throw new ArError(`The deposit (${deposit.amount}) is more than the ${balance.outstanding} outstanding. Refund the deposit and record a receipt instead.`);
      journal = await this.postJournal(deposit.workspaceId, { date: action.date, entityId: deposit.entityId, propertyId: deposit.propertyId, description: `Security deposit applied to ${balance.invoice.number}`, sourceType: "deposit_applied", sourceId: deposit.id, fx: deposit.fx }, depositApplyLines(book.settings, { invoice: balance.invoice, amount: deposit.amount, depositFx: deposit.fx }), book.user);
    }
    const settled: ArDeposit = { ...deposit, status: action.kind === "refund" ? "Refunded" : "Applied", settledDate: action.date, appliedInvoiceId: action.kind === "apply" ? action.invoiceId : undefined, journalIds: [...deposit.journalIds, journal.id] };
    await this.storage.put("ar_deposits", settled);
    await this.audit(deposit.workspaceId, action.kind === "refund" ? "Security deposit refunded" : "Security deposit applied", deposit.id, `${deposit.amount} ${deposit.currency} on ${action.date}. Journal ${journal.number}.`);
    this.changed();
    return settled;
  }

  // ---------- Collections and disputes ----------

  async addFollowUp(workspaceId: string, input: { tenantId: string; invoiceId?: string; date: string; type: FollowUpType; note: string; promiseDate?: string; promiseAmount?: number; nextFollowUp?: string }): Promise<ArFollowUp> {
    const { user } = await this.context(workspaceId);
    if (!input.note.trim()) throw new ArError("Add a note describing the follow-up.");
    if (!isDate(input.date)) throw new ArError("Enter a valid follow-up date.");
    if (input.promiseDate && !isDate(input.promiseDate)) throw new ArError("Promise-to-pay date is invalid.");
    const followUp: ArFollowUp = { ...input, id: `${workspaceId}:FU:${uid()}`, workspaceId, note: input.note.trim(), by: user, reminderStatus: input.type === "Reminder" ? "Draft" : undefined };
    await this.storage.put("ar_followups", followUp);
    await this.audit(workspaceId, input.type === "Reminder" ? "Payment reminder drafted" : "Collection follow-up logged", input.tenantId, `${input.type} on ${input.date}${input.promiseDate ? ` · promise to pay by ${input.promiseDate}` : ""}.`);
    this.changed();
    return followUp;
  }

  /** Approval records that a person reviewed the reminder. EstateCFO has no email service, so it is never sent automatically. */
  async approveReminder(id: string): Promise<ArFollowUp> {
    const followUp = await this.storage.get<ArFollowUp>("ar_followups", id);
    if (!followUp || followUp.reminderStatus !== "Draft") throw new ArError("Only draft reminders can be approved.");
    const { user } = await this.context(followUp.workspaceId);
    const approved: ArFollowUp = { ...followUp, reminderStatus: "Approved", approvedBy: user, approvedAt: now() };
    await this.storage.put("ar_followups", approved);
    await this.audit(followUp.workspaceId, "Payment reminder approved", followUp.tenantId, "Approved for sending. Not sent automatically: no email service is configured.");
    this.changed();
    return approved;
  }

  async openDispute(workspaceId: string, input: { invoiceId: string; amount: number; reason: string; owner: string }): Promise<ArDispute> {
    const book = await this.book(workspaceId);
    const balance = balances(book).get(input.invoiceId);
    if (!balance) throw new ArError("Disputes apply to posted invoices.");
    if (!(input.amount > 0) || input.amount > balance.outstanding) throw new ArError(`Disputed amount must be between 0 and the ${balance.outstanding} outstanding.`);
    if (!input.reason.trim()) throw new ArError("Describe what the tenant disputes.");
    if (book.disputes.some((dispute) => dispute.invoiceId === input.invoiceId && (dispute.status === "Open" || dispute.status === "Under review"))) throw new ArError(`${balance.invoice.number} already has an open dispute.`);
    const dispute: ArDispute = { id: `${workspaceId}:DSP:${uid()}`, workspaceId, tenantId: balance.invoice.tenantId, invoiceId: input.invoiceId, amount: round2(input.amount), reason: input.reason.trim(), status: "Open", openedBy: book.user, openedAt: now(), owner: input.owner || book.user, notes: [] };
    await this.storage.put("ar_disputes", dispute);
    await this.audit(workspaceId, "Dispute opened", balance.invoice.number, `${dispute.amount} ${balance.invoice.currency}: ${dispute.reason}`);
    this.changed();
    return dispute;
  }

  async updateDispute(id: string, change: { status?: "Open" | "Under review"; note?: string; owner?: string }): Promise<ArDispute> {
    const dispute = await this.storage.get<ArDispute>("ar_disputes", id);
    if (!dispute) throw new ArError("Dispute not found.");
    if (dispute.status.startsWith("Resolved")) throw new ArError("This dispute is resolved.");
    const { user } = await this.context(dispute.workspaceId);
    const updated: ArDispute = { ...dispute, status: change.status ?? dispute.status, owner: change.owner ?? dispute.owner, notes: change.note?.trim() ? [...dispute.notes, { at: now(), by: user, text: change.note.trim() }] : dispute.notes };
    await this.storage.put("ar_disputes", updated);
    await this.audit(dispute.workspaceId, "Dispute updated", dispute.id, `${updated.status}${change.note ? ` · ${change.note}` : ""}`);
    this.changed();
    return updated;
  }

  async resolveDispute(id: string, outcome: { kind: "reject"; resolution: string } | { kind: "credit"; resolution: string; amount: number; date: string }): Promise<ArDispute> {
    const dispute = await this.storage.get<ArDispute>("ar_disputes", id);
    if (!dispute || dispute.status.startsWith("Resolved")) throw new ArError("Only open disputes can be resolved.");
    if (!outcome.resolution.trim()) throw new ArError("Record the resolution.");
    let creditNoteId: string | undefined;
    if (outcome.kind === "credit") {
      const note = await this.createCreditNote(dispute.workspaceId, { invoiceId: dispute.invoiceId, amount: outcome.amount, reason: `Dispute resolution: ${outcome.resolution.trim()}`, type: "credit", date: outcome.date, disputeId: dispute.id });
      creditNoteId = note.id;
    }
    const resolved: ArDispute = { ...dispute, status: outcome.kind === "credit" ? "Resolved — credit issued" : "Resolved — rejected", resolvedAt: now(), resolution: outcome.resolution.trim(), creditNoteId };
    await this.storage.put("ar_disputes", resolved);
    await this.audit(dispute.workspaceId, "Dispute resolved", dispute.id, `${resolved.status}: ${resolved.resolution}`);
    this.changed();
    return resolved;
  }

  // ---------- Data Integrations ----------

  async importPreview(workspaceId: string) {
    const [book, dataset, master, integrationSettings] = await Promise.all([this.book(workspaceId), this.integration.dataset(workspaceId), this.integration.master(workspaceId), this.integration.settings(workspaceId)]);
    const propertyNames: Record<string, string> = {};
    const propertyEntities: Record<string, string> = {};
    for (const property of master.data.properties) propertyNames[property.id] = property.name;
    for (const [id, values] of Object.entries(master.propertyValues)) if (typeof values.entity_id === "string") propertyEntities[id] = values.entity_id;
    const plan = planImport(book, dataset, { workspaceId, user: book.user, now: now(), groupCurrency: book.settings.groupCurrency, defaultTermsDays: book.settings.defaultTermsDays, propertyNames, propertyEntities, policy: integrationSettings.overwritePolicy });
    return { plan, bankLines: bankLines(book, dataset), ageing: reconcileAgeing(book, dataset), available: { tenants: dataset.tenant_master?.length ?? 0, leases: dataset.lease_register?.length ?? 0, charges: dataset.rent_charges?.length ?? 0, invoices: dataset.accounts_receivable?.length ?? 0, receipts: dataset.ar_payments?.length ?? 0, credits: dataset.credit_notes?.length ?? 0, ageing: dataset.ar_ageing?.length ?? 0, bank: (dataset.cash_transactions ?? []).filter((record) => typeof record.values.amount === "number" && record.values.amount > 0).length } };
  }

  /** Applies the import plan. Imported open invoices are posted as opening balances against the clearing account, dated the cutover date. */
  async bringIn(workspaceId: string, cutoverDate: string): Promise<{ tenants: number; leases: number; invoices: number; creditNotes: number; skipped: number }> {
    const { plan } = await this.importPreview(workspaceId);
    const { locks } = await this.context(workspaceId);
    if (plan.invoices.length) this.assertOpen(cutoverDate, locks, "Opening balances");
    await this.storage.putMany("ar_tenants", [...plan.tenants.add, ...plan.tenants.update]);
    await this.storage.putMany("ar_leases", [...plan.leases.add, ...plan.leases.update]);
    for (const invoice of plan.invoices) {
      const number = invoice.number || (await this.next(workspaceId, "invoice"));
      await this.storage.put("ar_invoices", { ...invoice, number, status: "Approved" });
      await this.postInvoice(invoice.id, cutoverDate);
    }
    await this.storage.putMany("ar_credit_notes", plan.creditNotes);
    await this.audit(workspaceId, "Imported into AR", "Data Integrations", `${plan.tenants.add.length} tenant(s) added, ${plan.tenants.update.length} updated; ${plan.leases.add.length} lease(s) added, ${plan.leases.update.length} updated; ${plan.invoices.length} open invoice(s) posted as opening balances on ${cutoverDate}; ${plan.creditNotes.length} credit note(s) awaiting approval; ${plan.skipped.length} record(s) skipped.`);
    this.changed();
    return { tenants: plan.tenants.add.length + plan.tenants.update.length, leases: plan.leases.add.length + plan.leases.update.length, invoices: plan.invoices.length, creditNotes: plan.creditNotes.length, skipped: plan.skipped.length };
  }

  async matchBankLine(workspaceId: string, line: BankLine, input: { tenantId: string; allocations: { invoiceId: string; amount: number }[]; bankAccount: string }): Promise<ArPayment> {
    const book = await this.book(workspaceId);
    const tenant = book.tenants.find((item) => item.id === input.tenantId);
    if (!tenant) throw new ArError("Choose the paying tenant.");
    return this.recordPayment(workspaceId, { tenantId: tenant.id, receivedDate: line.date, amount: line.amount, currency: tenant.currency, bankAccount: input.bankAccount, method: line.kind === "Receipt export" ? "Imported receipt" : "Bank transfer", reference: line.reference || line.description, allocations: input.allocations, bankLineRef: line.key, source: line.source });
  }

  // ---------- Sample data ----------

  async isEmpty(workspaceId: string): Promise<boolean> {
    for (const store of AR_STORES) {
      if (store === "ar_settings") continue;
      if ((await this.all(store, workspaceId)).length) return false;
    }
    return true;
  }

  async clearSample(workspaceId: string): Promise<void> {
    const book = await this.book(workspaceId);
    const sourced = [...book.tenants, ...book.leases, ...book.invoices, ...book.payments, ...book.deposits, ...book.creditNotes];
    if (sourced.some((record) => record.source.system !== SAMPLE.system)) throw new ArError("The AR ledger contains records that are not sample data, so it cannot be cleared. Posted records are reversed, never deleted.");
    for (const store of AR_STORES) for (const record of await this.all<{ id: string }>(store, workspaceId)) await this.storage.delete(store, record.id);
    await this.audit(workspaceId, "AR sample data removed", "Real Estate AR", `${sourced.length} sample records and their journals removed.`);
    this.changed();
  }
}
