import type { CategoryId } from "./types.ts";

/** EstateCFO Common Data Model: the shared entities every adapter transforms into. */
export const commonDataModel: { entity: string; categories: CategoryId[]; feeds: string }[] = [
  { entity: "Properties", categories: ["property_master", "property_classification", "ownership"], feeds: "Property master, Properties, Insurance mapping" },
  { entity: "Legal Entities", categories: ["entity_master"], feeds: "Entity matching and multi-entity filters" },
  { entity: "Chart of Accounts", categories: ["chart_of_accounts"], feeds: "Classification for property P&L and analyst" },
  { entity: "General Ledger", categories: ["gl_transactions"], feeds: "Property P&L, reconciliation, analyst" },
  { entity: "Trial Balance", categories: ["trial_balance"], feeds: "Statements · Trial Balance, reconciliation" },
  { entity: "Income Statement", categories: ["income_statement"], feeds: "Company Dashboard KPIs, Statements" },
  { entity: "Balance Sheet", categories: ["balance_sheet"], feeds: "Company Dashboard KPIs, Statements" },
  { entity: "Cash Flow", categories: ["cash_flow", "cash_transactions"], feeds: "Statements · Cash Flow, Treasury" },
  { entity: "Accounts Payable", categories: ["accounts_payable"], feeds: "Accounts Payable ageing" },
  { entity: "Accounts Receivable", categories: ["accounts_receivable"], feeds: "Real Estate AR open items, Accounts Receivable ageing" },
  { entity: "Rent Charges", categories: ["rent_charges"], feeds: "Real Estate AR · Lease Receivables and Rental Billing" },
  { entity: "Receipts", categories: ["ar_payments"], feeds: "Real Estate AR · Payment Allocation (bank matching)" },
  { entity: "Credit Notes", categories: ["credit_notes"], feeds: "Real Estate AR · credit notes for approval" },
  { entity: "AR Ageing", categories: ["ar_ageing"], feeds: "Real Estate AR · ageing reconciliation" },
  { entity: "Vendors", categories: ["vendor_master"], feeds: "Vendor names on payables" },
  { entity: "Tenants", categories: ["tenant_master", "rent_roll"], feeds: "Real Estate AR · Tenant Register" },
  { entity: "Lease Register", categories: ["lease_register"], feeds: "Real Estate AR · Lease Receivables (lessor), IFRS 16 engine exchange (lessee)" },
  { entity: "Loans", categories: ["loan_register"], feeds: "Loans & Notes, DSCR, LTV" },
  { entity: "Fixed Assets", categories: ["fixed_assets"], feeds: "Asset register" },
  { entity: "Budgets", categories: ["budget_vs_actual"], feeds: "Budget vs actual" },
  { entity: "Capital Expenditure", categories: ["capex"], feeds: "Capital projects" },
];

export const lineageFields = ["source system", "source record ID", "import batch ID", "connection ID", "legal entity", "property", "reporting period"];
