// Phase 9 — Budgeting, Forecasting & Multi-entity types

export type ISODate = string;
export type ISODateTime = string;

// ─── Legal Entity ─────────────────────────────────────────────────────────────

export type EntityStatus = "Active" | "Inactive" | "Dissolved";
export type EntityType = "Private Limited" | "LLP" | "Public Limited" | "Partnership" | "Sole Proprietorship" | "Trust" | "Other";

export interface LegalEntity {
  id: string;             // e.g. "GNV-RE"
  workspaceId: string;
  code: string;           // short code, unique in workspace
  name: string;           // full legal name
  type: EntityType;
  currency: string;       // functional currency (ISO 4217, e.g. "INR")
  country: string;
  registrationNumber?: string;
  taxId?: string;         // GSTIN / PAN / TRN
  fiscalYearStartMonth: number; // 1–12 (4 = April for Indian FY)
  consolidationGroup?: string;  // parent group name, for display
  isHoldingCompany: boolean;
  status: EntityStatus;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type BudgetStatus = "Draft" | "Under Review" | "Approved" | "Locked";
export type BudgetType = "Annual" | "Revised" | "Supplementary";

export interface Budget {
  id: string;
  workspaceId: string;
  entityId: string;
  entityName: string;
  budgetNumber: string;   // BUD-NNNN
  name: string;           // e.g. "FY2026-27 Annual Budget"
  fiscalYear: number;     // e.g. 2026 (starting year)
  type: BudgetType;
  status: BudgetStatus;
  startDate: ISODate;
  endDate: ISODate;
  totalRevenueBudget: number;
  totalExpenseBudget: number;
  totalNoiBudget: number;
  approvedBy?: string;
  approvedAt?: ISODateTime;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface BudgetLine {
  id: string;
  workspaceId: string;
  budgetId: string;
  entityId: string;
  accountCode: string;
  accountName: string;
  propertyId?: string;
  propertyName?: string;
  costCentre?: string;
  month: ISODate;         // first day of month: "2026-04-01"
  amount: number;         // positive for both revenue and expense
  notes?: string;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export type ForecastType = "RentalIncome" | "OpEx" | "CAPEX" | "NOI" | "CashFlow";
export type ForecastBasis = "Lease-derived" | "Historical average" | "Manual" | "Budget-linked";

export interface Forecast {
  id: string;
  workspaceId: string;
  entityId: string;
  entityName: string;
  forecastNumber: string; // FCT-NNNN
  name: string;
  type: ForecastType;
  fiscalYear: number;
  startDate: ISODate;
  endDate: ISODate;
  basis: ForecastBasis;
  totalProjected: number;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ForecastLine {
  id: string;
  workspaceId: string;
  forecastId: string;
  entityId: string;
  propertyId?: string;
  propertyName?: string;
  month: ISODate;
  projected: number;
  actual?: number;        // filled in as actuals become available
  variance?: number;      // actual - projected
  basisDetail?: string;   // e.g. "Lease LSE-001: ₹2.5L/month"
  isManualOverride: boolean;
}

// ─── Intercompany Transactions & Eliminations ─────────────────────────────────

export type ICStatus = "Open" | "Matched" | "Eliminated";
export type ICTransactionType = "Loan" | "Management Fee" | "Recharge" | "Dividend" | "Other";

export interface ICTransaction {
  id: string;
  workspaceId: string;
  icNumber: string;        // IC-NNNN
  fromEntityId: string;
  fromEntityName: string;
  toEntityId: string;
  toEntityName: string;
  type: ICTransactionType;
  description: string;
  amount: number;
  date: ISODate;
  fromAccountCode: string; // e.g. "1310" (IC Receivable on from side)
  fromAccountName: string;
  toAccountCode: string;   // e.g. "2310" (IC Payable on to side)
  toAccountName: string;
  status: ICStatus;
  eliminationId?: string;  // set once eliminated
  reference?: string;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ICElimination {
  id: string;
  workspaceId: string;
  icTransactionId: string;
  fiscalYear: number;
  eliminationDate: ISODate;
  description: string;
  // elimination reverses both sides: debit IC Payable, credit IC Receivable
  entries: Array<{
    entityId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  createdAt: ISODateTime;
}

// ─── Variance (computed, not stored) ─────────────────────────────────────────

export interface VarianceRow {
  accountCode: string;
  accountName: string;
  propertyId?: string;
  propertyName?: string;
  costCentre?: string;
  month: ISODate;
  budget: number;
  actual: number;
  variance: number;       // actual - budget
  variancePct: number | null;
  isFavourable: boolean;  // for revenue: actual > budget; for expense: actual < budget
  accountType: "Revenue" | "Expense";
}
