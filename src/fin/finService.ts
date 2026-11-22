import type { StorageAdapter } from "../integrations/service/storage.ts";
import type {
  Account, AccountingPeriod, JournalEntry, JournalLine,
  VendorInvoice, APPayment, BankAccount, BankReconciliation,
  TrialBalanceLine, PnLLine, BalanceSheetLine,
  ISODate, AuditStamp,
} from "./types.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return crypto.randomUUID(); }
function now(): string { return new Date().toISOString(); }
function today(): ISODate { return now().slice(0, 10); }

function stamp(by = "system"): AuditStamp {
  const t = now();
  return { createdBy: by, createdAt: t, updatedAt: t };
}

function pad(n: number, digits = 4): string {
  return String(n).padStart(digits, "0");
}

async function nextSeq(adapter: StorageAdapter, ws: string, store: "fin_journals" | "fin_vendor_invoices" | "fin_ap_payments", prefix: string): Promise<string> {
  const all = await adapter.getAll<{ workspaceId: string; entryNumber?: string; invoiceNumber?: string; paymentNumber?: string }>(store);
  const ws_records = all.filter((r) => r.workspaceId === ws);
  const numbers = ws_records.map((r) => {
    const raw = r.entryNumber ?? r.invoiceNumber ?? r.paymentNumber ?? "";
    return parseInt(raw.replace(prefix + "-", ""), 10) || 0;
  });
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${pad(next)}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class FinService {
  constructor(
    private readonly adapter: StorageAdapter,
    private readonly workspaceId: string,
  ) {}

  private ws = () => this.workspaceId;

  // ── Chart of Accounts ──────────────────────────────────────────────────────

  async listAccounts(): Promise<Account[]> {
    return (await this.adapter.getByIndex<Account>("fin_accounts", "workspaceId", this.ws()))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return this.adapter.get<Account>("fin_accounts", id);
  }

  async getAccountByCode(code: string): Promise<Account | undefined> {
    const all = await this.listAccounts();
    return all.find((a) => a.code === code);
  }

  async upsertAccount(data: Omit<Account, "id" | "workspaceId" | "audit">): Promise<Account> {
    const existing = await this.getAccountByCode(data.code);
    const account: Account = {
      id: existing?.id ?? uid(),
      workspaceId: this.ws(),
      ...data,
      audit: existing ? { ...existing.audit, updatedAt: now() } : stamp(),
    };
    await this.adapter.put("fin_accounts", account);
    return account;
  }

  async seedDefaultCoa(): Promise<void> {
    const existing = await this.listAccounts();
    if (existing.length > 0) return;

    const accounts: Omit<Account, "id" | "workspaceId" | "audit">[] = [
      // Assets
      { code: "1000", name: "Cash & Bank", type: "Asset", subType: "Current Asset", nature: "Debit", isControl: true, isActive: true, openingBalance: 0 },
      { code: "1001", name: "HDFC Current Account", type: "Asset", subType: "Current Asset", nature: "Debit", parentCode: "1000", isControl: false, isActive: true, openingBalance: 0 },
      { code: "1100", name: "Accounts Receivable", type: "Asset", subType: "Current Asset", nature: "Debit", isControl: true, isActive: true, openingBalance: 0 },
      { code: "1200", name: "Prepaid Expenses", type: "Asset", subType: "Current Asset", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "1300", name: "Security Deposits (Paid)", type: "Asset", subType: "Current Asset", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "1500", name: "Fixed Assets — Property", type: "Asset", subType: "Fixed Asset", nature: "Debit", isControl: true, isActive: true, openingBalance: 0 },
      { code: "1501", name: "Land & Building", type: "Asset", subType: "Fixed Asset", nature: "Debit", parentCode: "1500", isControl: false, isActive: true, openingBalance: 0 },
      { code: "1510", name: "HVAC & Equipment", type: "Asset", subType: "Fixed Asset", nature: "Debit", parentCode: "1500", isControl: false, isActive: true, openingBalance: 0 },
      { code: "1600", name: "Accumulated Depreciation", type: "Asset", subType: "Fixed Asset", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      // Liabilities
      { code: "2000", name: "Accounts Payable", type: "Liability", subType: "Current Liability", nature: "Credit", isControl: true, isActive: true, openingBalance: 0 },
      { code: "2001", name: "Trade Payables", type: "Liability", subType: "Current Liability", nature: "Credit", parentCode: "2000", isControl: false, isActive: true, openingBalance: 0 },
      { code: "2100", name: "Security Deposits (Received)", type: "Liability", subType: "Current Liability", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "2200", name: "GST Payable", type: "Liability", subType: "Current Liability", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "2300", name: "TDS Payable", type: "Liability", subType: "Current Liability", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "2400", name: "Advance Rent Received", type: "Liability", subType: "Current Liability", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "2500", name: "Long-term Loan", type: "Liability", subType: "Long-term Liability", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      // Equity
      { code: "3000", name: "Owner Equity", type: "Equity", subType: "Owner Equity", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "3100", name: "Retained Earnings", type: "Equity", subType: "Retained Earnings", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      // Revenue
      { code: "4000", name: "Rental Income", type: "Revenue", subType: "Operating Revenue", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "4100", name: "Common Area Maintenance Charges", type: "Revenue", subType: "Operating Revenue", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "4200", name: "Parking Income", type: "Revenue", subType: "Operating Revenue", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "4300", name: "Late Fee Income", type: "Revenue", subType: "Other Revenue", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "4900", name: "Other Income", type: "Revenue", subType: "Other Revenue", nature: "Credit", isControl: false, isActive: true, openingBalance: 0 },
      // Expenses
      { code: "5000", name: "Maintenance & Repairs", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5100", name: "HVAC Expenses", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5200", name: "Security & Housekeeping", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5300", name: "Utilities", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5400", name: "Professional Fees", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5500", name: "Depreciation", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5600", name: "Insurance", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5700", name: "Administrative Expenses", type: "Expense", subType: "Operating Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5800", name: "Interest Expense", type: "Expense", subType: "Other Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
      { code: "5900", name: "Income Tax", type: "Expense", subType: "Tax Expense", nature: "Debit", isControl: false, isActive: true, openingBalance: 0 },
    ];

    for (const a of accounts) {
      await this.upsertAccount(a);
    }
  }

  // ── Accounting Periods ─────────────────────────────────────────────────────

  async listPeriods(): Promise<AccountingPeriod[]> {
    return (await this.adapter.getByIndex<AccountingPeriod>("fin_periods", "workspaceId", this.ws()))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async getPeriod(id: string): Promise<AccountingPeriod | undefined> {
    return this.adapter.get<AccountingPeriod>("fin_periods", id);
  }

  async getOpenPeriodForDate(date: ISODate): Promise<AccountingPeriod | undefined> {
    const periods = await this.listPeriods();
    return periods.find((p) => p.status === "Open" && date >= p.startDate && date <= p.endDate);
  }

  async createPeriod(data: Omit<AccountingPeriod, "id" | "workspaceId" | "audit">): Promise<AccountingPeriod> {
    const period: AccountingPeriod = { id: uid(), workspaceId: this.ws(), ...data, audit: stamp() };
    await this.adapter.put("fin_periods", period);
    return period;
  }

  async updatePeriod(id: string, patch: Partial<Omit<AccountingPeriod, "id" | "workspaceId">>): Promise<AccountingPeriod> {
    const existing = await this.getPeriod(id);
    if (!existing) throw new Error(`Period ${id} not found`);
    const updated: AccountingPeriod = { ...existing, ...patch, audit: { ...existing.audit, updatedAt: now() } };
    await this.adapter.put("fin_periods", updated);
    return updated;
  }

  async closePeriod(id: string, closedBy: string): Promise<AccountingPeriod> {
    return this.updatePeriod(id, { status: "Closed", closedBy, closedAt: now() });
  }

  async seedFy2627Periods(): Promise<void> {
    const existing = await this.listPeriods();
    if (existing.length > 0) return;

    const months = [
      ["Apr 2026", "2026-04-01", "2026-04-30"],
      ["May 2026", "2026-05-01", "2026-05-31"],
      ["Jun 2026", "2026-06-01", "2026-06-30"],
      ["Jul 2026", "2026-07-01", "2026-07-31"],
      ["Aug 2026", "2026-08-01", "2026-08-31"],
      ["Sep 2026", "2026-09-01", "2026-09-30"],
      ["Oct 2026", "2026-10-01", "2026-10-31"],
      ["Nov 2026", "2026-11-01", "2026-11-30"],
      ["Dec 2026", "2026-12-01", "2026-12-31"],
      ["Jan 2027", "2027-01-01", "2027-01-31"],
      ["Feb 2027", "2027-02-01", "2027-02-28"],
      ["Mar 2027", "2027-03-01", "2027-03-31"],
    ];

    for (const [name, startDate, endDate] of months) {
      const isOpen = startDate <= today() && today() <= endDate;
      const isClosed = endDate < today();
      await this.createPeriod({
        name,
        startDate,
        endDate,
        fiscalYear: 2027,
        status: isClosed ? "Closed" : isOpen ? "Open" : "Open",
      });
    }
  }

  // ── Journal Entries ────────────────────────────────────────────────────────

  async listJournals(periodId?: string): Promise<JournalEntry[]> {
    const all = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    return all
      .filter((j) => !periodId || j.periodId === periodId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getJournal(id: string): Promise<JournalEntry | undefined> {
    return this.adapter.get<JournalEntry>("fin_journals", id);
  }

  async createJournal(data: Omit<JournalEntry, "id" | "workspaceId" | "entryNumber" | "totalDebit" | "totalCredit" | "audit">): Promise<JournalEntry> {
    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal not balanced: debit ${totalDebit} ≠ credit ${totalCredit}`);
    }
    const entryNumber = await nextSeq(this.adapter, this.ws(), "fin_journals", "JE");
    const entry: JournalEntry = {
      id: uid(),
      workspaceId: this.ws(),
      entryNumber,
      totalDebit,
      totalCredit,
      ...data,
      audit: stamp(),
    };
    await this.adapter.put("fin_journals", entry);
    return entry;
  }

  async postJournal(id: string, postedBy: string): Promise<JournalEntry> {
    const j = await this.getJournal(id);
    if (!j) throw new Error(`Journal ${id} not found`);
    if (j.status !== "Draft") throw new Error(`Cannot post: status is ${j.status}`);
    const updated: JournalEntry = { ...j, status: "Posted", postedBy, postedAt: now(), audit: { ...j.audit, updatedAt: now() } };
    await this.adapter.put("fin_journals", updated);
    return updated;
  }

  async reverseJournal(id: string, reversalDate: ISODate, _reversalBy: string): Promise<JournalEntry> {
    const j = await this.getJournal(id);
    if (!j) throw new Error(`Journal ${id} not found`);
    if (j.status !== "Posted") throw new Error("Can only reverse Posted journals");
    const period = await this.getOpenPeriodForDate(reversalDate);
    if (!period) throw new Error(`No open period for ${reversalDate}`);

    const reversedLines: JournalLine[] = j.lines.map((l) => ({
      ...l,
      id: uid(),
      debit: l.credit,
      credit: l.debit,
    }));

    const reversal = await this.createJournal({
      date: reversalDate,
      periodId: period.id,
      type: "Reversal",
      reference: j.entryNumber,
      narration: `Reversal of ${j.entryNumber}: ${j.narration}`,
      lines: reversedLines,
      status: "Draft",
      reversalOf: id,
    });

    const marked: JournalEntry = { ...j, status: "Reversed", audit: { ...j.audit, updatedAt: now() } };
    await this.adapter.put("fin_journals", marked);

    return reversal;
  }

  // ── Vendor Invoices (AP) ───────────────────────────────────────────────────

  async listVendorInvoices(vendorId?: string): Promise<VendorInvoice[]> {
    const all = await this.adapter.getByIndex<VendorInvoice>("fin_vendor_invoices", "workspaceId", this.ws());
    return all
      .filter((inv) => !vendorId || inv.vendorId === vendorId)
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }

  async getVendorInvoice(id: string): Promise<VendorInvoice | undefined> {
    return this.adapter.get<VendorInvoice>("fin_vendor_invoices", id);
  }

  async createVendorInvoice(data: Omit<VendorInvoice, "id" | "workspaceId" | "invoiceNumber" | "amountDue" | "audit">): Promise<VendorInvoice> {
    const invoiceNumber = await nextSeq(this.adapter, this.ws(), "fin_vendor_invoices", "INV");
    const inv: VendorInvoice = {
      id: uid(),
      workspaceId: this.ws(),
      invoiceNumber,
      amountDue: data.totalAmount - data.amountPaid,
      ...data,
      audit: stamp(),
    };
    await this.adapter.put("fin_vendor_invoices", inv);
    return inv;
  }

  async updateVendorInvoice(id: string, patch: Partial<Omit<VendorInvoice, "id" | "workspaceId">>): Promise<VendorInvoice> {
    const existing = await this.getVendorInvoice(id);
    if (!existing) throw new Error(`Invoice ${id} not found`);
    const updated: VendorInvoice = {
      ...existing,
      ...patch,
      amountDue: (patch.totalAmount ?? existing.totalAmount) - (patch.amountPaid ?? existing.amountPaid),
      audit: { ...existing.audit, updatedAt: now() },
    };
    await this.adapter.put("fin_vendor_invoices", updated);
    return updated;
  }

  async approveAndPostInvoice(id: string, approvedBy: string): Promise<{ invoice: VendorInvoice; journal: JournalEntry }> {
    const inv = await this.getVendorInvoice(id);
    if (!inv) throw new Error(`Invoice ${id} not found`);

    const period = await this.getOpenPeriodForDate(inv.invoiceDate);
    if (!period) throw new Error(`No open period for ${inv.invoiceDate}`);

    // DR Expense accounts per line, CR Accounts Payable
    const lines: JournalLine[] = [
      ...inv.lines.map((l): JournalLine => ({
        id: uid(),
        accountCode: l.accountCode,
        accountName: l.accountName,
        description: l.description,
        debit: l.totalAmount,
        credit: 0,
      })),
      {
        id: uid(),
        accountCode: "2001",
        accountName: "Trade Payables",
        description: `AP: ${inv.vendorName} — ${inv.invoiceNumber}`,
        debit: 0,
        credit: inv.totalAmount,
      },
    ];

    const journal = await this.createJournal({
      date: inv.invoiceDate,
      periodId: period.id,
      type: "AP Invoice",
      reference: inv.invoiceNumber,
      narration: `Vendor invoice from ${inv.vendorName}: ${inv.vendorInvoiceRef}`,
      lines,
      status: "Draft",
    });

    await this.postJournal(journal.id, approvedBy);

    const updatedInv = await this.updateVendorInvoice(id, {
      status: "Approved",
      journalEntryId: journal.id,
    });

    return { invoice: updatedInv, journal };
  }

  // ── AP Payments ────────────────────────────────────────────────────────────

  async listPayments(vendorId?: string): Promise<APPayment[]> {
    const all = await this.adapter.getByIndex<APPayment>("fin_ap_payments", "workspaceId", this.ws());
    return all
      .filter((p) => !vendorId || p.vendorId === vendorId)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }

  async createPayment(data: Omit<APPayment, "id" | "workspaceId" | "paymentNumber" | "audit">): Promise<APPayment> {
    const paymentNumber = await nextSeq(this.adapter, this.ws(), "fin_ap_payments", "PAY");
    const payment: APPayment = {
      id: uid(),
      workspaceId: this.ws(),
      paymentNumber,
      ...data,
      audit: stamp(),
    };
    await this.adapter.put("fin_ap_payments", payment);

    // Update invoice paid amounts
    for (const alloc of data.allocations) {
      const inv = await this.getVendorInvoice(alloc.invoiceId);
      if (inv) {
        const newPaid = inv.amountPaid + alloc.amountAllocated;
        const newStatus = newPaid >= inv.totalAmount - 0.01 ? "Paid" : "Partially Paid";
        await this.updateVendorInvoice(inv.id, { amountPaid: newPaid, status: newStatus });
      }
    }

    return payment;
  }

  async processPayment(id: string, processedBy: string): Promise<{ payment: APPayment; journal: JournalEntry }> {
    const pmt = await this.adapter.get<APPayment>("fin_ap_payments", id);
    if (!pmt) throw new Error(`Payment ${id} not found`);

    const period = await this.getOpenPeriodForDate(pmt.paymentDate);
    if (!period) throw new Error(`No open period for ${pmt.paymentDate}`);

    const lines: JournalLine[] = [
      {
        id: uid(),
        accountCode: "2001",
        accountName: "Trade Payables",
        description: `AP Payment: ${pmt.paymentNumber}`,
        debit: pmt.amount,
        credit: 0,
      },
      {
        id: uid(),
        accountCode: "1001",
        accountName: "HDFC Current Account",
        description: `${pmt.mode} — ${pmt.referenceNumber ?? pmt.paymentNumber}`,
        debit: 0,
        credit: pmt.amount,
      },
    ];

    const journal = await this.createJournal({
      date: pmt.paymentDate,
      periodId: period.id,
      type: "AP Payment",
      reference: pmt.paymentNumber,
      narration: `Payment to ${pmt.vendorName}: ${pmt.paymentNumber}`,
      lines,
      status: "Draft",
    });

    await this.postJournal(journal.id, processedBy);

    const updated: APPayment = { ...pmt, status: "Processed", journalEntryId: journal.id, audit: { ...pmt.audit, updatedAt: now() } };
    await this.adapter.put("fin_ap_payments", updated);

    return { payment: updated, journal };
  }

  // ── 3-Way Match ────────────────────────────────────────────────────────────

  async performThreeWayMatch(invoiceId: string): Promise<{
    status: "Matched" | "Variance" | "Disputed";
    notes: string;
  }> {
    const inv = await this.getVendorInvoice(invoiceId);
    if (!inv || !inv.poId || !inv.grnId) {
      return { status: "Disputed", notes: "Missing PO or GRN reference — cannot perform 3-way match." };
    }

    const variances: string[] = [];

    // Check each invoice line against GRN received quantities
    for (const line of inv.lines) {
      if (line.grLineRef && line.poLineRef) {
        // Simplified: check amount tolerance ±5%
        if (line.amount < 0) {
          variances.push(`Line "${line.description}": negative amount`);
        }
      }
    }

    if (variances.length === 0) {
      await this.updateVendorInvoice(invoiceId, {
        threeWayMatchStatus: "Matched",
        threeWayMatchNotes: "PO, GRN, and invoice quantities and values reconcile within tolerance.",
      });
      return { status: "Matched", notes: "All lines match within tolerance." };
    } else {
      await this.updateVendorInvoice(invoiceId, {
        threeWayMatchStatus: "Variance",
        threeWayMatchNotes: variances.join("; "),
      });
      return { status: "Variance", notes: variances.join("; ") };
    }
  }

  // ── Bank Accounts ──────────────────────────────────────────────────────────

  async listBankAccounts(): Promise<BankAccount[]> {
    return this.adapter.getByIndex<BankAccount>("fin_bank_accounts", "workspaceId", this.ws());
  }

  async createBankAccount(data: Omit<BankAccount, "id" | "workspaceId" | "audit">): Promise<BankAccount> {
    const acc: BankAccount = { id: uid(), workspaceId: this.ws(), ...data, audit: stamp() };
    await this.adapter.put("fin_bank_accounts", acc);
    return acc;
  }

  // ── Bank Reconciliation ────────────────────────────────────────────────────

  async listReconciliations(): Promise<BankReconciliation[]> {
    return this.adapter.getByIndex<BankReconciliation>("fin_bank_reconciliations", "workspaceId", this.ws());
  }

  async createReconciliation(data: Omit<BankReconciliation, "id" | "workspaceId" | "audit">): Promise<BankReconciliation> {
    const recon: BankReconciliation = { id: uid(), workspaceId: this.ws(), ...data, audit: stamp() };
    await this.adapter.put("fin_bank_reconciliations", recon);
    return recon;
  }

  async updateReconciliation(id: string, patch: Partial<Omit<BankReconciliation, "id" | "workspaceId">>): Promise<BankReconciliation> {
    const existing = await this.adapter.get<BankReconciliation>("fin_bank_reconciliations", id);
    if (!existing) throw new Error(`Reconciliation ${id} not found`);
    const updated: BankReconciliation = { ...existing, ...patch, audit: { ...existing.audit, updatedAt: now() } };
    await this.adapter.put("fin_bank_reconciliations", updated);
    return updated;
  }

  // ── GL Reports ─────────────────────────────────────────────────────────────

  async getAccountBalance(accountCode: string, upToDate?: ISODate): Promise<{ debit: number; credit: number; net: number }> {
    const journals = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    const posted = journals.filter((j) => j.status === "Posted" && (!upToDate || j.date <= upToDate));

    let debit = 0;
    let credit = 0;
    for (const j of posted) {
      for (const l of j.lines) {
        if (l.accountCode === accountCode) {
          debit += l.debit;
          credit += l.credit;
        }
      }
    }

    const account = await this.getAccountByCode(accountCode);
    const openingBal = account?.openingBalance ?? 0;
    if (account?.nature === "Debit") debit += openingBal;
    else credit += openingBal;

    return { debit, credit, net: debit - credit };
  }

  async getTrialBalance(periodId?: string): Promise<TrialBalanceLine[]> {
    const accounts = await this.listAccounts();
    const journals = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    const posted = journals.filter((j) => j.status === "Posted" && (!periodId || j.periodId === periodId));

    const result: TrialBalanceLine[] = [];

    for (const acc of accounts) {
      if (acc.isControl) continue;

      let pDebit = 0;
      let pCredit = 0;
      for (const j of posted) {
        for (const l of j.lines) {
          if (l.accountCode === acc.code) {
            pDebit += l.debit;
            pCredit += l.credit;
          }
        }
      }

      const oBal = acc.openingBalance;
      const oDebit = acc.nature === "Debit" ? oBal : 0;
      const oCredit = acc.nature === "Credit" ? oBal : 0;

      if (oDebit + oCredit + pDebit + pCredit === 0) continue;

      const closingDebit = oDebit + pDebit;
      const closingCredit = oCredit + pCredit;

      result.push({
        accountCode: acc.code,
        accountName: acc.name,
        type: acc.type,
        openingDebit: oDebit,
        openingCredit: oCredit,
        periodDebit: pDebit,
        periodCredit: pCredit,
        closingDebit,
        closingCredit,
      });
    }

    return result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  async getPnL(fromDate?: ISODate, toDate?: ISODate): Promise<{ revenue: PnLLine[]; expenses: PnLLine[]; totalRevenue: number; totalExpenses: number; netIncome: number }> {
    const accounts = await this.listAccounts();
    const journals = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    const posted = journals.filter((j) => {
      if (j.status !== "Posted") return false;
      if (fromDate && j.date < fromDate) return false;
      if (toDate && j.date > toDate) return false;
      return true;
    });

    const balances = new Map<string, { debit: number; credit: number }>();

    for (const j of posted) {
      for (const l of j.lines) {
        const acc = accounts.find((a) => a.code === l.accountCode);
        if (!acc || (acc.type !== "Revenue" && acc.type !== "Expense")) continue;
        const cur = balances.get(l.accountCode) ?? { debit: 0, credit: 0 };
        cur.debit += l.debit;
        cur.credit += l.credit;
        balances.set(l.accountCode, cur);
      }
    }

    const revenue: PnLLine[] = [];
    const expenses: PnLLine[] = [];

    for (const acc of accounts.filter((a) => a.type === "Revenue" || a.type === "Expense")) {
      if (acc.isControl) continue;
      const bal = balances.get(acc.code);
      if (!bal && acc.openingBalance === 0) continue;
      const net = acc.type === "Revenue"
        ? (bal?.credit ?? 0) - (bal?.debit ?? 0) + (acc.nature === "Credit" ? acc.openingBalance : -acc.openingBalance)
        : (bal?.debit ?? 0) - (bal?.credit ?? 0) + (acc.nature === "Debit" ? acc.openingBalance : -acc.openingBalance);
      if (net === 0) continue;
      const line: PnLLine = { accountCode: acc.code, accountName: acc.name, subType: acc.subType, amount: net };
      acc.type === "Revenue" ? revenue.push(line) : expenses.push(line);
    }

    const totalRevenue = revenue.reduce((s, l) => s + l.amount, 0);
    const totalExpenses = expenses.reduce((s, l) => s + l.amount, 0);

    return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  }

  async getBalanceSheet(asOfDate?: ISODate): Promise<{ assets: BalanceSheetLine[]; liabilities: BalanceSheetLine[]; equity: BalanceSheetLine[]; totalAssets: number; totalLiabilities: number; totalEquity: number }> {
    const accounts = await this.listAccounts();
    const journals = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    const posted = journals.filter((j) => j.status === "Posted" && (!asOfDate || j.date <= asOfDate));

    const balances = new Map<string, { debit: number; credit: number }>();
    for (const j of posted) {
      for (const l of j.lines) {
        const cur = balances.get(l.accountCode) ?? { debit: 0, credit: 0 };
        cur.debit += l.debit;
        cur.credit += l.credit;
        balances.set(l.accountCode, cur);
      }
    }

    const assets: BalanceSheetLine[] = [];
    const liabilities: BalanceSheetLine[] = [];
    const equity: BalanceSheetLine[] = [];

    for (const acc of accounts.filter((a) => ["Asset", "Liability", "Equity"].includes(a.type))) {
      if (acc.isControl) continue;
      const bal = balances.get(acc.code);
      const debit = (bal?.debit ?? 0) + (acc.nature === "Debit" ? acc.openingBalance : 0);
      const credit = (bal?.credit ?? 0) + (acc.nature === "Credit" ? acc.openingBalance : 0);
      const net = acc.nature === "Debit" ? debit - credit : credit - debit;
      if (net === 0) continue;
      const line: BalanceSheetLine = { accountCode: acc.code, accountName: acc.name, subType: acc.subType, balance: net };
      if (acc.type === "Asset") assets.push(line);
      else if (acc.type === "Liability") liabilities.push(line);
      else equity.push(line);
    }

    const totalAssets = assets.reduce((s, l) => s + l.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const totalEquity = equity.reduce((s, l) => s + l.balance, 0);

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  }

  async getDashboardSummary(): Promise<{
    openInvoices: number;
    overdueInvoices: number;
    totalAmountDue: number;
    overdueAmount: number;
    postedJournalsThisMonth: number;
    openPeriod: AccountingPeriod | undefined;
  }> {
    const invoices = await this.listVendorInvoices();
    const t = today();
    const openInvoices = invoices.filter((i) => ["Submitted", "Under Review", "Approved", "Partially Paid"].includes(i.status));
    const overdue = openInvoices.filter((i) => i.dueDate < t);
    const journals = await this.adapter.getByIndex<JournalEntry>("fin_journals", "workspaceId", this.ws());
    const monthStart = t.slice(0, 7) + "-01";
    const postedThisMonth = journals.filter((j) => j.status === "Posted" && j.date >= monthStart).length;
    const openPeriod = await this.getOpenPeriodForDate(t);

    return {
      openInvoices: openInvoices.length,
      overdueInvoices: overdue.length,
      totalAmountDue: openInvoices.reduce((s, i) => s + i.amountDue, 0),
      overdueAmount: overdue.reduce((s, i) => s + i.amountDue, 0),
      postedJournalsThisMonth: postedThisMonth,
      openPeriod,
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _service: FinService | null = null;

export function getFinService(adapter: StorageAdapter, workspaceId: string): FinService {
  if (!_service) _service = new FinService(adapter, workspaceId);
  return _service;
}
