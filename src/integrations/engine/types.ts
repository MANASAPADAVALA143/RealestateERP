export type FieldType = "string" | "number" | "date" | "period" | "enum";

export interface TargetField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  synonyms: string[];
  options?: string[];
  description?: string;
}

export type CategoryGroup = "Property and Entity Data" | "Financial Data" | "Property Operations" | "Other Data" | "IFRS 16 Engine";

export type CategoryId =
  | "property_master"
  | "entity_master"
  | "ownership"
  | "property_classification"
  | "chart_of_accounts"
  | "gl_transactions"
  | "trial_balance"
  | "income_statement"
  | "balance_sheet"
  | "budget_vs_actual"
  | "rent_roll"
  | "lease_register"
  | "tenant_master"
  | "vendor_master"
  | "accounts_payable"
  | "accounts_receivable"
  | "loan_register"
  | "cash_transactions"
  | "property_expenses"
  | "capex"
  | "insurance_schedule"
  | "cash_flow"
  | "fixed_assets"
  | "ifrs16_results";

export type CheckId = "gl_debit_credit" | "tb_balance" | "is_classification" | "bs_equation" | "ownership_pct" | "date_order";

export interface ImportCategory {
  id: CategoryId;
  label: string;
  group: CategoryGroup;
  description: string;
  fields: TargetField[];
  keyFields: string[];
  checks: CheckId[];
  sampleRows: Record<string, string | number>[];
}

export type CellValue = string | number | boolean | Date | null;

export interface ParsedSheet {
  name: string;
  rows: CellValue[][];
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

export type DateOrder = "auto" | "MDY" | "DMY" | "YMD";

export interface ColumnProfile {
  index: number;
  header: string;
  detected: FieldType;
  dateOrder?: Exclude<DateOrder, "auto"> | "ambiguous";
  sample: string[];
  emptyCount: number;
}

export interface MappingSuggestion {
  column: number;
  target: string | null;
  confidence: number;
}

export interface FieldMapping {
  [targetKey: string]: number | null;
}

export interface MappingTemplate {
  id: string;
  tenantId: string;
  name: string;
  profile: string;
  category: CategoryId;
  headers: string[];
  mapping: Record<string, string>;
  dateOrder: DateOrder;
  aliases: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export type Severity = "error" | "warning";

export interface RowIssue {
  row: number;
  field?: string;
  column?: string;
  value?: string;
  rule: string;
  severity: Severity;
  message: string;
}

export type RowStatus = "valid" | "warning" | "error" | "duplicate";

export interface NormalizedRow {
  row: number;
  values: Record<string, string | number | null>;
  raw: Record<string, string>;
  status: RowStatus;
  issues: RowIssue[];
}

export interface FileCheck {
  id: CheckId;
  label: string;
  passed: boolean;
  material: boolean;
  details: { label: string; value: number | string }[];
  difference?: number;
  message: string;
}

export interface MatchResult {
  kind: "property" | "entity";
  sourceId: string;
  sourceName?: string;
  status: "matched" | "alias" | "possible" | "new" | "unmatched";
  masterId?: string;
  masterName?: string;
  note: string;
}

export interface ValidationReport {
  rows: NormalizedRow[];
  fileChecks: FileCheck[];
  matches: MatchResult[];
  counts: { total: number; valid: number; warning: number; error: number; duplicate: number };
}

export interface MasterRecord {
  id: string;
  name: string;
  aliases: string[];
  source: string;
}

export interface MasterData {
  properties: MasterRecord[];
  entities: MasterRecord[];
  accounts: { code: string; type: string; subtype?: string; description?: string }[];
}

export type JobStatus = "Failed" | "Imported" | "Imported - exceptions open" | "Published" | "Withdrawn";

export type SourceSystem = string;

export type SyncMode = "incremental" | "full_refresh";

export interface ImportJob {
  id: string;
  tenantId: string;
  source: SourceSystem;
  connectionId: string;
  syncMode: SyncMode;
  category: CategoryId;
  fileName: string;
  fileSize: number;
  sheetName: string;
  headerRow: number;
  entityIds: string[];
  propertyIds: string[];
  periods: string[];
  uploadedBy: string;
  uploadedAt: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  warningRecords: number;
  status: JobStatus;
  templateId?: string;
  mapping: Record<string, string>;
  dateOrders: Record<string, DateOrder>;
  fileChecks: FileCheck[];
  acknowledgements: { checkId: string; note: string; by: string; at: string }[];
  error?: string;
}

export interface StoredRecord {
  id: string;
  tenantId: string;
  jobId: string;
  connectionId: string;
  category: CategoryId;
  row: number;
  status: RowStatus | "imported";
  sourceSystem: SourceSystem;
  sourceRecordId: string;
  entityId: string | null;
  propertyId: string | null;
  period: string | null;
  values: Record<string, string | number | null>;
  raw: Record<string, string>;
  issues: RowIssue[];
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  at: string;
  by: string;
  action: string;
  target: string;
  detail: string;
}
