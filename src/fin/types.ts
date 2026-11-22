// ─── Phase 6: Finance & Accounting OS — Type Definitions ─────────────────────

export type FinId = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export interface AuditStamp {
  createdBy: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Chart of Accounts ────────────────────────────────────────────────────────

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
export type AccountNature = "Debit" | "Credit"; // normal balance side
export type AccountSubType =
  | "Current Asset" | "Fixed Asset" | "Other Asset"
  | "Current Liability" | "Long-term Liability"
  | "Owner Equity" | "Retained Earnings"
  | "Operating Revenue" | "Other Revenue"
  | "Cost of Revenue" | "Operating Expense" | "Other Expense" | "Tax Expense";

export interface Account {
  id: FinId;
  workspaceId: string;
  code: string;         // e.g. "1001"
  name: string;
  type: AccountType;
  subType: AccountSubType;
  nature: AccountNature;
  parentCode?: string;  // for sub-accounts
  description?: string;
  isControl: boolean;   // control account — no direct posting
  isActive: boolean;
  openingBalance: number;
  audit: AuditStamp;
}

// ─── Accounting Periods ───────────────────────────────────────────────────────

export type PeriodStatus = "Open" | "Closed" | "Locked";

export interface AccountingPeriod {
  id: FinId;
  workspaceId: string;
  name: string;         // e.g. "Apr 2026"
  startDate: ISODate;
  endDate: ISODate;
  fiscalYear: number;   // e.g. 2026
  status: PeriodStatus;
  closedBy?: string;
  closedAt?: ISODateTime;
  audit: AuditStamp;
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export type JournalType =
  | "Manual" | "AP Invoice" | "AP Payment" | "AP Adjustment"
  | "AR Invoice" | "AR Receipt"
  | "Depreciation" | "Accrual" | "Prepaid" | "Payroll"
  | "Opening" | "Closing" | "Reversal";

export type JournalStatus = "Draft" | "Posted" | "Reversed";

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  costCentre?: string;
  propertyId?: string;
}

export interface JournalEntry {
  id: FinId;
  workspaceId: string;
  entryNumber: string;  // JE-NNNN
  date: ISODate;
  periodId: string;
  type: JournalType;
  reference?: string;   // source doc number (INV-0001, PO-0001, etc.)
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: JournalStatus;
  reversalOf?: string;  // id of entry being reversed
  postedBy?: string;
  postedAt?: ISODateTime;
  audit: AuditStamp;
}

// ─── AP — Vendor Invoices ─────────────────────────────────────────────────────

export type InvoiceStatus =
  | "Draft" | "Submitted" | "Under Review" | "Approved"
  | "Partially Paid" | "Paid" | "Disputed" | "Cancelled";

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  taxPct: number;
  amount: number;        // before tax
  taxAmount: number;
  totalAmount: number;
  accountCode: string;
  accountName: string;
  grLineRef?: string;    // GRN line id for 3-way match
  poLineRef?: string;    // PO line id
}

export interface VendorInvoice {
  id: FinId;
  workspaceId: string;
  invoiceNumber: string;    // INV-NNNN (internal)
  vendorInvoiceRef: string; // vendor's own invoice number
  vendorId: string;
  vendorName: string;
  poId?: string;
  poNumber?: string;
  grnId?: string;
  grnNumber?: string;
  invoiceDate: ISODate;
  dueDate: ISODate;
  lines: InvoiceLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  threeWayMatchStatus: "Not Checked" | "Matched" | "Variance" | "Disputed";
  threeWayMatchNotes?: string;
  status: InvoiceStatus;
  journalEntryId?: string;
  audit: AuditStamp;
}

// ─── AP — Payments ────────────────────────────────────────────────────────────

export type PaymentMode = "NEFT" | "RTGS" | "Cheque" | "UPI" | "Cash" | "Credit Note";
export type PaymentStatus = "Draft" | "Approved" | "Processed" | "Bounced" | "Cancelled";

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amountAllocated: number;
}

export interface APPayment {
  id: FinId;
  workspaceId: string;
  paymentNumber: string;   // PAY-NNNN
  vendorId: string;
  vendorName: string;
  paymentDate: ISODate;
  mode: PaymentMode;
  bankAccountId?: string;
  referenceNumber?: string;  // cheque/UTR number
  amount: number;
  allocations: PaymentAllocation[];
  status: PaymentStatus;
  journalEntryId?: string;
  audit: AuditStamp;
}

// ─── Bank Accounts & Reconciliation ──────────────────────────────────────────

export type BankAccountType = "Current" | "Savings" | "Overdraft" | "FD";

export interface BankAccount {
  id: FinId;
  workspaceId: string;
  accountCode: string;    // links to Chart of Accounts
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
  currency: string;
  openingBalance: number;
  isActive: boolean;
  audit: AuditStamp;
}

export type BankLineStatus = "Unmatched" | "Matched" | "Suggested";

export interface BankStatement {
  id: FinId;
  workspaceId: string;
  bankAccountId: string;
  statementDate: ISODate;
  openingBalance: number;
  closingBalance: number;
  lines: BankStatementLine[];
  audit: AuditStamp;
}

export interface BankStatementLine {
  id: string;
  date: ISODate;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference?: string;
  status: BankLineStatus;
  matchedJournalLineId?: string;
}

export interface BankReconciliation {
  id: FinId;
  workspaceId: string;
  bankAccountId: string;
  periodId: string;
  statementDate: ISODate;
  statementClosingBalance: number;
  bookBalance: number;
  outstandingDeposits: number;
  outstandingPayments: number;
  reconciledBalance: number;
  difference: number;
  status: "In Progress" | "Reconciled" | "Approved";
  audit: AuditStamp;
}

// ─── GL Reporting structures (computed, not stored) ──────────────────────────

export interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  type: AccountType;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface PnLLine {
  accountCode: string;
  accountName: string;
  subType: AccountSubType;
  amount: number;        // positive = revenue/expense
}

export interface BalanceSheetLine {
  accountCode: string;
  accountName: string;
  subType: AccountSubType;
  balance: number;
}

// ─── Store names ──────────────────────────────────────────────────────────────

export type FinStoreName =
  | "fin_accounts"
  | "fin_periods"
  | "fin_journals"
  | "fin_vendor_invoices"
  | "fin_ap_payments"
  | "fin_bank_accounts"
  | "fin_bank_statements"
  | "fin_bank_reconciliations";

export const FIN_STORES: FinStoreName[] = [
  "fin_accounts",
  "fin_periods",
  "fin_journals",
  "fin_vendor_invoices",
  "fin_ap_payments",
  "fin_bank_accounts",
  "fin_bank_statements",
  "fin_bank_reconciliations",
];
