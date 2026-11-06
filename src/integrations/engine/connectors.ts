import { normalizeHeader, parseNumber } from "./parse.ts";
import type { CategoryId, CellValue } from "./types.ts";

export type ConnectorId = "excel" | "yardi_voyager_8" | "sap_s4hana" | "sap_business_one" | "oracle_fusion" | "oracle_netsuite" | "dynamics_365";
export type ConnectorFamily = "Excel" | "Yardi" | "ERP";
export type ConnectionMode = "file" | "api";

export interface ApiRequirement {
  id: string;
  label: string;
}

export interface ConnectorDefinition {
  id: ConnectorId;
  name: string;
  vendor: string;
  family: ConnectorFamily;
  modes: ConnectionMode[];
  fileNote: string;
  apiNote: string;
  aliases: Partial<Record<CategoryId, Record<string, string[]>>>;
  derive?: (category: CategoryId, headers: string[], rows: { row: number; cells: CellValue[] }[]) => Derivation | null;
}

export interface Derivation {
  headers: string[];
  rows: { row: number; cells: CellValue[] }[];
  notes: string[];
}

/** Checks every API-based connection must pass before EstateCFO may call it "connected". */
export const apiRequirements: ApiRequirement[] = [
  { id: "product", label: "Customer’s product, edition, and version recorded" },
  { id: "interface", label: "Approved API or integration interface identified in the vendor’s documentation" },
  { id: "authorization", label: "Customer’s written authorization to access the data obtained" },
  { id: "auth", label: "Authentication method agreed; credentials held only in the server-side secret store" },
  { id: "permissions", label: "Data access permissions scoped to the required entities, properties, and objects" },
  { id: "endpoints", label: "Endpoints, objects, and fields documented from the customer’s environment" },
  { id: "limits", label: "Rate limits, batch sizes, and synchronization windows documented" },
  { id: "tested", label: "Test extraction run on the server and reconciled to a source report" },
];

const DEBIT_HEADERS = ["debit", "debit amount", "dr", "debits", "entered dr", "accounted dr", "debit amount in accounting currency"];
const CREDIT_HEADERS = ["credit", "credit amount", "cr", "credits", "entered cr", "accounted cr", "credit amount in accounting currency"];

function findHeader(headers: string[], candidates: string[]): number {
  const wanted = candidates.map(normalizeHeader);
  return headers.findIndex((header) => wanted.includes(normalizeHeader(header)));
}

function hasDebitCredit(headers: string[]): boolean {
  return findHeader(headers, DEBIT_HEADERS) >= 0 && findHeader(headers, CREDIT_HEADERS) >= 0;
}

/**
 * Adds "Debit (derived)" and "Credit (derived)" columns from an amount column plus an optional
 * debit/credit indicator. The original columns are kept unchanged and the derivation is reported.
 */
function deriveDebitCredit(
  headers: string[],
  rows: { row: number; cells: CellValue[] }[],
  options: { amount: string[]; indicator?: string[]; debitCodes?: string[]; creditCodes?: string[]; signedRule: string; source: string },
): Derivation | null {
  if (hasDebitCredit(headers)) return null;
  const amountIndex = findHeader(headers, options.amount);
  if (amountIndex < 0) return null;
  const indicatorIndex = options.indicator ? findHeader(headers, options.indicator) : -1;
  const debitCodes = (options.debitCodes ?? []).map((code) => code.toUpperCase());
  const creditCodes = (options.creditCodes ?? []).map((code) => code.toUpperCase());
  let unknownIndicators = 0;
  const derivedRows = rows.map(({ row, cells }) => {
    const amount = parseNumber(cells[amountIndex] ?? null);
    let debit: number | null = null;
    let credit: number | null = null;
    if (amount !== null) {
      if (indicatorIndex >= 0) {
        const code = String(cells[indicatorIndex] ?? "").trim().toUpperCase();
        if (debitCodes.includes(code)) debit = Math.abs(amount);
        else if (creditCodes.includes(code)) credit = Math.abs(amount);
        else unknownIndicators += 1;
      } else if (amount >= 0) debit = amount;
      else credit = -amount;
    }
    return { row, cells: [...cells, debit, credit] };
  });
  const notes =
    indicatorIndex >= 0
      ? [
          `${options.source}: “Debit (derived)” and “Credit (derived)” were added from “${headers[amountIndex]}” and “${headers[indicatorIndex]}” (${debitCodes.join("/")} = debit, ${creditCodes.join("/")} = credit). The original columns are unchanged.`,
          ...(unknownIndicators ? [`${unknownIndicators} row(s) have an indicator that is not ${[...debitCodes, ...creditCodes].join("/")}; their derived debit and credit are left blank.`] : []),
        ]
      : [`${options.source}: “Debit (derived)” and “Credit (derived)” were added from the signed “${headers[amountIndex]}” column, ${options.signedRule}. Confirm this matches your export before importing.`];
  return { headers: [...headers, "Debit (derived)", "Credit (derived)"], rows: derivedRows, notes };
}

export const connectors: ConnectorDefinition[] = [
  {
    id: "excel",
    name: "Excel / CSV",
    vendor: "Any system",
    family: "Excel",
    modes: ["file"],
    fileNote: "Upload .xlsx, .xls, or .csv files with any layout. Columns are mapped per customer template.",
    apiNote: "Not applicable.",
    aliases: {},
  },
  {
    id: "yardi_voyager_8",
    name: "Yardi Voyager 8",
    vendor: "Yardi Systems",
    family: "Yardi",
    modes: ["file", "api"],
    fileNote: "Upload Excel or CSV reports exported from Voyager (for example GL detail, trial balance, rent roll, aging).",
    apiNote: "Direct access needs the customer’s approved Yardi interface and written authorization. Endpoints are taken from that documentation, not assumed.",
    aliases: {
      gl_transactions: { transaction_id: ["Control", "Batch", "Ctrl"], property_id: ["Property", "Prop"], period: ["Post Month", "Book Period"], description: ["Remarks", "Notes"] },
      trial_balance: { property_id: ["Property"], account_code: ["Account"], period: ["Post Month"] },
      accounts_receivable: { customer_id: ["Resident", "Tenant Code", "Person"] },
      accounts_payable: { vendor_id: ["Vendor", "Payee"] },
      rent_roll: { unit_id: ["Unit"], tenant_name: ["Resident", "Name"] },
    },
  },
  {
    id: "sap_s4hana",
    name: "SAP S/4HANA",
    vendor: "SAP",
    family: "ERP",
    modes: ["file", "api"],
    fileNote: "Upload line-item or balance reports exported from S/4HANA (for example journal entry line items or G/L balances).",
    apiNote: "Direct access needs the customer’s released OData or SOAP services, a communication arrangement, and authorization. Service names are confirmed per customer.",
    aliases: {
      gl_transactions: {
        entity_id: ["Company Code", "CoCd"],
        account_code: ["G/L Account", "G/L Acct", "GL Account"],
        transaction_date: ["Posting Date", "Pstng Date"],
        transaction_id: ["Journal Entry", "Document Number", "DocumentNo", "Accounting Document"],
        property_id: ["Profit Center", "WBS Element", "Business Entity", "Real Estate Object"],
        description: ["Item Text", "Text"],
        reference: ["Reference", "Reference Document"],
      },
      trial_balance: { entity_id: ["Company Code"], account_code: ["G/L Account"], property_id: ["Profit Center"] },
      accounts_payable: { vendor_id: ["Supplier", "Vendor"], invoice_id: ["Document Number", "Journal Entry"], invoice_date: ["Document Date"], due_date: ["Net Due Date"], entity_id: ["Company Code"] },
      accounts_receivable: { customer_id: ["Customer"], invoice_id: ["Document Number", "Journal Entry"], invoice_date: ["Document Date"], due_date: ["Net Due Date"], entity_id: ["Company Code"] },
      fixed_assets: { asset_id: ["Main Asset Number", "Asset"], entity_id: ["Company Code"], acquisition_date: ["Capitalization Date"], cost: ["Acquisition Value", "APC"], net_book_value: ["Net Book Value"] },
      entity_master: { entity_id: ["Company Code"], entity_name: ["Company Name"] },
    },
    derive: (category, headers, rows) =>
      category === "gl_transactions"
        ? deriveDebitCredit(headers, rows, {
            amount: ["Amount in Company Code Currency", "Amount in Local Currency", "Amt in loc.cur.", "Amount in LC", "Amount"],
            indicator: ["Debit/Credit Ind.", "Debit/Credit Indicator", "D/C", "D/C Ind."],
            debitCodes: ["S"],
            creditCodes: ["H"],
            signedRule: "positive = debit, negative = credit (SAP sign convention)",
            source: "SAP S/4HANA adapter",
          })
        : null,
  },
  {
    id: "sap_business_one",
    name: "SAP Business One",
    vendor: "SAP",
    family: "ERP",
    modes: ["file", "api"],
    fileNote: "Upload journal entry or account balance reports exported from Business One.",
    apiNote: "Direct access needs the customer’s Service Layer or DI API set up on their server, a licensed user, and authorization.",
    aliases: {
      gl_transactions: {
        transaction_id: ["TransId", "Trans. No.", "Journal Entry No.", "Number"],
        account_code: ["G/L Acct/BP Code", "Account Code", "Account"],
        transaction_date: ["Posting Date", "Doc. Date"],
        property_id: ["Project", "Distr. Rule", "Profit Center", "Cost Center"],
        description: ["Remarks", "Details"],
        reference: ["Ref. 1", "Ref1", "Reference 1"],
      },
      accounts_payable: { vendor_id: ["BP Code", "Vendor Code"], vendor_name: ["BP Name", "Vendor Name"], invoice_id: ["Doc. No.", "Document Number"], balance: ["Balance Due"] },
      accounts_receivable: { customer_id: ["BP Code", "Customer Code"], customer_name: ["BP Name", "Customer Name"], invoice_id: ["Doc. No.", "Document Number"], balance: ["Balance Due"] },
    },
  },
  {
    id: "oracle_fusion",
    name: "Oracle Fusion Cloud ERP",
    vendor: "Oracle",
    family: "ERP",
    modes: ["file", "api"],
    fileNote: "Upload journal line, trial balance, or payables and receivables reports exported from Fusion (for example from OTBI or BI Publisher).",
    apiNote: "Direct access needs the customer’s approved REST resources or BI Publisher reports, an integration user, and authorization.",
    aliases: {
      gl_transactions: {
        entity_id: ["Legal Entity", "Ledger", "Balancing Segment", "Company"],
        account_code: ["Natural Account", "Account"],
        transaction_date: ["Accounting Date", "GL Date", "Effective Date"],
        transaction_id: ["Journal Line", "Journal", "Journal Name", "Line Number"],
        property_id: ["Cost Center", "Project", "Location"],
        debit: ["Accounted Dr", "Entered Dr"],
        credit: ["Accounted Cr", "Entered Cr"],
        description: ["Line Description", "Journal Description"],
      },
      accounts_payable: { vendor_id: ["Supplier Number", "Supplier"], vendor_name: ["Supplier Name"], invoice_id: ["Invoice Number"], amount: ["Invoice Amount"], balance: ["Amount Remaining", "Remaining Amount"], entity_id: ["Business Unit", "Legal Entity"] },
      accounts_receivable: { customer_id: ["Customer Account Number", "Customer Number"], customer_name: ["Customer Name"], invoice_id: ["Transaction Number"], balance: ["Amount Due Remaining", "Balance Due"], entity_id: ["Business Unit", "Legal Entity"] },
    },
  },
  {
    id: "oracle_netsuite",
    name: "Oracle NetSuite",
    vendor: "Oracle",
    family: "ERP",
    modes: ["file", "api"],
    fileNote: "Upload saved search or report exports from NetSuite (for example General Ledger, Trial Balance, A/P Aging).",
    apiNote: "Direct access needs the customer’s SuiteTalk REST or SOAP access, an integration record with token-based authentication, and role permissions.",
    aliases: {
      gl_transactions: {
        entity_id: ["Subsidiary"],
        account_code: ["Account Number", "Account"],
        transaction_date: ["Date"],
        transaction_id: ["Internal ID", "Document Number", "Transaction Number"],
        property_id: ["Location", "Class", "Department"],
        description: ["Memo"],
      },
      accounts_payable: { vendor_id: ["Vendor"], invoice_id: ["Document Number"], balance: ["Amount Remaining", "Open Balance"], entity_id: ["Subsidiary"] },
      accounts_receivable: { customer_id: ["Customer"], invoice_id: ["Document Number"], balance: ["Amount Remaining", "Open Balance"], entity_id: ["Subsidiary"] },
    },
  },
  {
    id: "dynamics_365",
    name: "Microsoft Dynamics 365",
    vendor: "Microsoft",
    family: "ERP",
    modes: ["file", "api"],
    fileNote: "Upload exports from Dynamics 365 Finance or Business Central (for example voucher transactions or trial balance).",
    apiNote: "Direct access needs an app registration in the customer’s Microsoft Entra tenant with admin consent, and the customer’s approved data entities or APIs.",
    aliases: {
      gl_transactions: {
        entity_id: ["Legal entity", "Company", "dataAreaId"],
        account_code: ["Main account", "Ledger account", "G/L Account No."],
        transaction_date: ["Date", "Accounting date", "Posting Date"],
        transaction_id: ["Voucher", "Document No.", "Entry No."],
        property_id: ["Business unit", "Cost center", "Department", "Financial dimension"],
        description: ["Description", "Transaction text"],
        debit: ["Debit amount", "Debit Amount"],
        credit: ["Credit amount", "Credit Amount"],
      },
      accounts_payable: { vendor_id: ["Vendor account", "Vendor No."], invoice_id: ["Invoice", "Document No."], balance: ["Balance", "Remaining Amount"], entity_id: ["Company", "Legal entity"] },
      accounts_receivable: { customer_id: ["Customer account", "Customer No."], invoice_id: ["Invoice", "Document No."], balance: ["Balance", "Remaining Amount"], entity_id: ["Company", "Legal entity"] },
    },
    derive: (category, headers, rows) =>
      category === "gl_transactions"
        ? deriveDebitCredit(headers, rows, {
            amount: ["Amount in accounting currency", "Accounting currency amount", "Amount"],
            signedRule: "positive = debit, negative = credit",
            source: "Dynamics 365 adapter",
          })
        : null,
  },
];

export function connectorById(id: string): ConnectorDefinition {
  return connectors.find((connector) => connector.id === id) ?? connectors[0];
}

export function adapterAliases(connectorId: string, category: CategoryId): Record<string, string[]> {
  return connectorById(connectorId).aliases[category] ?? {};
}

export function applyAdapter(connectorId: string, category: CategoryId, headers: string[], rows: { row: number; cells: CellValue[] }[]): Derivation {
  const derived = connectorById(connectorId).derive?.(category, headers, rows);
  return derived ?? { headers, rows, notes: [] };
}

export interface ConnectionState {
  state: "ready" | "not_configured" | "awaiting_verification" | "verified";
  label: string;
  detail: string;
}

/**
 * The only path to "verified" is a server-side connector that has run a tested extraction.
 * This deployment has no server connector, so API connections never report as connected.
 */
export function connectionState(mode: ConnectionMode, verification: Record<string, boolean>, serverConnectorConfigured: boolean): ConnectionState {
  if (mode === "file") return { state: "ready", label: "Ready for file import", detail: "Files are uploaded manually and processed through the adapter." };
  const done = apiRequirements.filter((item) => verification[item.id]).length;
  if (!serverConnectorConfigured) {
    return {
      state: done === 0 ? "not_configured" : "awaiting_verification",
      label: "Not connected",
      detail: `API access is not configured: no server-side connector is deployed. Checklist ${done} of ${apiRequirements.length} complete.`,
    };
  }
  if (done < apiRequirements.length || !verification.tested) {
    return { state: "awaiting_verification", label: "Not connected", detail: `Server connector present, verification ${done} of ${apiRequirements.length} complete.` };
  }
  return { state: "verified", label: "Connected (verified)", detail: "Authentication and a test extraction were verified on the server." };
}
