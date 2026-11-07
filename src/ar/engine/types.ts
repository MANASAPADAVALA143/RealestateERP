export type ChargeType = "base_rent" | "cam" | "utilities" | "maintenance" | "parking" | "other" | "late_fee";
export type Frequency = "monthly" | "quarterly" | "annual";

export const chargeLabels: Record<ChargeType, string> = {
  base_rent: "Base rent",
  cam: "CAM charges",
  utilities: "Utility recoveries",
  maintenance: "Maintenance recoveries",
  parking: "Parking",
  other: "Other lease charges",
  late_fee: "Late payment charge",
};

export const frequencyMonths: Record<Frequency, number> = { monthly: 1, quarterly: 3, annual: 12 };

/** Where a record came from. EstateCFO-created records use system "EstateCFO". */
export interface Lineage {
  system: string;
  recordId?: string;
  jobId?: string;
  connectionId?: string;
}

export interface ArTenant {
  id: string;
  workspaceId: string;
  code: string;
  name: string;
  entityId: string;
  propertyId: string;
  propertyName: string;
  building: string;
  unit: string;
  contactName: string;
  email: string;
  phone: string;
  billingFrequency: Frequency;
  paymentTermsDays: number;
  currency: string;
  collectionOwner: string;
  status: "Active" | "Inactive";
  source: Lineage;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeSchedule {
  id: string;
  type: ChargeType;
  description: string;
  /** Amount per billing period at the charge's frequency, in the lease currency. */
  amount: number;
  frequency: Frequency;
  start?: string;
  end?: string;
  /** Annual escalation applied on each lease anniversary. */
  escalationPct: number;
}

export interface ArLease {
  id: string;
  workspaceId: string;
  code: string;
  tenantId: string;
  entityId: string;
  propertyId: string;
  propertyName: string;
  building: string;
  unit: string;
  start: string;
  end: string;
  currency: string;
  charges: ChargeSchedule[];
  depositRequired: number;
  status: "Active" | "Ended";
  /** Reference to the same lease in the IFRS 16 application, if it is also a lessee lease there. */
  ifrs16LeaseId?: string;
  source: Lineage;
  createdAt: string;
  updatedAt: string;
}

export interface Fx {
  currency: string;
  functionalCurrency: string;
  groupCurrency: string;
  /** 1 unit of transaction currency in functional currency. */
  rateToFunctional: number;
  /** 1 unit of transaction currency in group reporting currency. */
  rateToGroup: number;
  period: string;
}

export interface InvoiceLine {
  chargeId?: string;
  chargeType: ChargeType;
  description: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  note?: string;
}

export type InvoiceStatus = "Draft" | "Approved" | "Posted" | "Reversal requested" | "Reversed";

export interface ArInvoice {
  id: string;
  workspaceId: string;
  number: string;
  kind: "rent" | "late_fee" | "manual" | "imported";
  tenantId: string;
  leaseId?: string;
  entityId: string;
  propertyId: string;
  unit: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  billingPeriod: string;
  currency: string;
  lines: InvoiceLine[];
  total: number;
  /** Collected in the source system before the invoice was brought into EstateCFO. */
  priorCollected: number;
  billingKeys: string[];
  status: InvoiceStatus;
  fx?: Fx;
  postingDate?: string;
  journalId?: string;
  approvedBy?: string;
  approvedAt?: string;
  reversal?: Approval;
  source: Lineage;
  createdBy: string;
  createdAt: string;
}

export interface Approval {
  requestedBy: string;
  requestedAt: string;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
  journalId?: string;
}

export interface Allocation {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  journalId: string;
}

export interface ArPayment {
  id: string;
  workspaceId: string;
  number: string;
  tenantId: string;
  entityId: string;
  receivedDate: string;
  amount: number;
  currency: string;
  bankAccount: string;
  method: string;
  reference: string;
  allocations: Allocation[];
  status: "Posted" | "Reversal requested" | "Reversed";
  fx: Fx;
  journalIds: string[];
  bankLineRef?: string;
  reversal?: Approval;
  source: Lineage;
  createdBy: string;
  createdAt: string;
}

export interface ArCreditNote {
  id: string;
  workspaceId: string;
  number: string;
  type: "credit" | "write_off";
  invoiceId: string;
  tenantId: string;
  entityId: string;
  date: string;
  amount: number;
  chargeType: ChargeType;
  reason: string;
  status: "Draft" | "Posted" | "Rejected";
  disputeId?: string;
  journalId?: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  source: Lineage;
}

export interface ArDeposit {
  id: string;
  workspaceId: string;
  tenantId: string;
  leaseId?: string;
  entityId: string;
  propertyId: string;
  amount: number;
  currency: string;
  receivedDate: string;
  bankAccount: string;
  status: "Held" | "Refunded" | "Applied";
  settledDate?: string;
  appliedInvoiceId?: string;
  fx: Fx;
  journalIds: string[];
  source: Lineage;
  createdBy: string;
  createdAt: string;
}

export interface JournalLine {
  account: string;
  accountName: string;
  /** Functional currency. */
  debit: number;
  credit: number;
  /** Signed amount in the transaction currency (debit positive). Zero for FX difference lines. */
  txnAmount: number;
  tenantId?: string;
  invoiceId?: string;
}

export type JournalSource = "invoice" | "payment" | "allocation" | "credit_note" | "write_off" | "deposit" | "deposit_refund" | "deposit_applied" | "opening" | "reversal";

export interface Journal {
  id: string;
  workspaceId: string;
  number: string;
  date: string;
  period: string;
  entityId: string;
  propertyId: string;
  description: string;
  sourceType: JournalSource;
  sourceId: string;
  currency: string;
  functionalCurrency: string;
  groupCurrency: string;
  /** 1 unit of functional currency in group currency. */
  functionalToGroup: number;
  lines: JournalLine[];
  reverses?: string;
  reversedBy?: string;
  createdBy: string;
  createdAt: string;
}

export type FollowUpType = "Call" | "Email" | "Letter" | "Meeting" | "Note" | "Reminder";

export interface ArFollowUp {
  id: string;
  workspaceId: string;
  tenantId: string;
  invoiceId?: string;
  date: string;
  type: FollowUpType;
  note: string;
  by: string;
  promiseDate?: string;
  promiseAmount?: number;
  nextFollowUp?: string;
  /** Reminders are drafted, then approved; EstateCFO has no email service, so nothing is sent automatically. */
  reminderStatus?: "Draft" | "Approved";
  approvedBy?: string;
  approvedAt?: string;
}

export interface ArDispute {
  id: string;
  workspaceId: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  reason: string;
  status: "Open" | "Under review" | "Resolved — credit issued" | "Resolved — rejected";
  openedBy: string;
  openedAt: string;
  owner: string;
  notes: { at: string; by: string; text: string }[];
  resolvedAt?: string;
  resolution?: string;
  creditNoteId?: string;
}

export type AccountKey =
  | "receivables"
  | "unapplied"
  | "deposits"
  | "bad_debt"
  | "fx"
  | "opening"
  | ChargeType;

export interface BankAccount {
  name: string;
  code: string;
  currency: string;
}

export interface ArSettings {
  id: string;
  workspaceId: string;
  groupCurrency: string;
  entityCurrencies: Record<string, string>;
  /** 1 unit of currency in group currency for a period (YYYY-MM). */
  fxRates: { currency: string; period: string; rate: number }[];
  accounts: Record<AccountKey, { code: string; name: string }>;
  bankAccounts: BankAccount[];
  defaultTermsDays: number;
  lateFee: { enabled: boolean; graceDays: number; percent: number; flat: number; minimum: number };
  /** Expected loss rate (%) per ageing bucket, used for bad debt exposure. */
  allowance: Record<AgeBucket, number>;
  approvals: { invoices: boolean; creditNotes: boolean; reversals: boolean };
  counters: Record<"invoice" | "receipt" | "credit" | "journal", number>;
}

export type AgeBucket = "Current" | "1–30" | "31–60" | "61–90" | "90+";
export const ageBuckets: AgeBucket[] = ["Current", "1–30", "31–60", "61–90", "90+"];

export interface ArBook {
  workspaceId: string;
  user: string;
  lockedPeriods: string[];
  settings: ArSettings;
  tenants: ArTenant[];
  leases: ArLease[];
  invoices: ArInvoice[];
  payments: ArPayment[];
  creditNotes: ArCreditNote[];
  deposits: ArDeposit[];
  journals: Journal[];
  followUps: ArFollowUp[];
  disputes: ArDispute[];
}

export interface Scope {
  entityId?: string;
  propertyId?: string;
  tenantId?: string;
}
