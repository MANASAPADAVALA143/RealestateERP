import { matchRecord, normalizeId, type MatchContext } from "./matching.ts";
import { cellText, isEmpty, parseDate, parseNumber, parsePeriod } from "./parse.ts";
import type {
  CellValue,
  DateOrder,
  FieldMapping,
  FileCheck,
  ImportCategory,
  MasterData,
  MatchResult,
  NormalizedRow,
  RowIssue,
  TargetField,
  ValidationReport,
} from "./types.ts";

export interface ValidationContext {
  master: MasterData;
  propertyAliases: Record<string, string[]>;
  entityAliases: Record<string, string[]>;
  confirmedNew: string[];
  existingKeys: Map<string, ExistingKey>;
  materiality: number;
  dateOrders: Record<number, DateOrder>;
  connectionId?: string;
  lockedPeriods?: string[];
}

export interface ExistingKey {
  jobId: string;
  connectionId: string;
  source: string;
}

export function periodLocked(period: string | null | undefined, locked: string[] = []): string | null {
  if (!period) return null;
  return locked.find((item) => period === item || period.startsWith(`${item}-`) || item.startsWith(`${period}-`) || (item.length === 4 && period.startsWith(item))) ?? null;
}

const ENUM_ALIASES: Record<string, string[]> = {
  Asset: ["asset", "assets"],
  Liability: ["liability", "liabilities"],
  Equity: ["equity", "capital", "partners equity", "owners equity", "members equity"],
  Revenue: ["revenue", "revenues", "income", "rental income", "rent", "sales", "operating revenue"],
  Expense: ["expense", "expenses"],
  "Operating Expense": ["operating expense", "operating expenses", "opex", "property expense", "property expenses", "operating"],
  "Non-operating Expense": ["non-operating expense", "non operating expense", "non-operating", "nonoperating", "finance cost", "interest expense", "below the line"],
  "Other Income": ["other income", "non-operating income", "interest income"],
  Debit: ["debit", "dr", "d"],
  Credit: ["credit", "cr", "c"],
  Monthly: ["monthly", "month", "m"],
  Quarterly: ["quarterly", "quarter", "q"],
  Annual: ["annual", "annually", "yearly", "year", "a"],
  Operating: ["operating", "operations", "operating activities"],
  Investing: ["investing", "investing activities", "capex"],
  Financing: ["financing", "financing activities"],
  Lessor: ["lessor", "landlord"],
  Lessee: ["lessee", "tenant"],
};

function enumValue(field: TargetField, text: string): string | null {
  const lower = text.trim().toLowerCase();
  for (const option of field.options ?? []) {
    if (option.toLowerCase() === lower) return option;
    if ((ENUM_ALIASES[option] ?? []).includes(lower)) return option;
  }
  return null;
}

export const TOTAL_LINE = /^(total|net|grand total)\b/i;

function rowKey(category: ImportCategory, values: Record<string, string | number | null>): string | null {
  const parts = category.keyFields.map((key) => values[key]);
  if (parts.every((part) => part === null || part === undefined || part === "")) return null;
  return `${category.id}|${parts.map((part) => (part === null || part === undefined ? "" : typeof part === "number" ? part.toFixed(2) : normalizeId(String(part)))).join("|")}`;
}

export function recordKey(category: ImportCategory, values: Record<string, string | number | null>): string | null {
  return rowKey(category, values);
}

export function validateRows(
  category: ImportCategory,
  headers: string[],
  rows: { row: number; cells: CellValue[] }[],
  mapping: FieldMapping,
  context: ValidationContext,
): ValidationReport {
  const propertyContext: MatchContext = {
    master: context.master.properties.map((record) => ({ ...record, aliases: [...record.aliases, ...(context.propertyAliases[record.id] ?? [])] })),
    confirmedNew: new Set(context.confirmedNew.map(normalizeId)),
  };
  const entityContext: MatchContext = {
    master: context.master.entities.map((record) => ({ ...record, aliases: [...record.aliases, ...(context.entityAliases[record.id] ?? [])] })),
    confirmedNew: new Set(context.confirmedNew.map(normalizeId)),
  };
  const accounts = new Set(context.master.accounts.map((account) => normalizeId(account.code)));
  const matches = new Map<string, MatchResult>();
  const seen = new Map<string, number>();
  const out: NormalizedRow[] = [];

  for (const { row, cells } of rows) {
    const issues: RowIssue[] = [];
    const values: Record<string, string | number | null> = {};
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = cellText(cells[index] ?? null);
    });

    for (const field of category.fields) {
      const column = mapping[field.key];
      const cell = column === null || column === undefined ? null : cells[column] ?? null;
      const columnName = column === null || column === undefined ? undefined : headers[column];
      const text = cellText(cell);
      const issue = (rule: string, severity: RowIssue["severity"], message: string) =>
        issues.push({ row, field: field.key, column: columnName, value: text, rule, severity, message });

      if (isEmpty(cell)) {
        values[field.key] = null;
        if (field.required && !(field.key === "period" && mapping.transaction_date !== undefined && mapping.transaction_date !== null)) {
          issue("required", "error", `${field.label} is required.`);
        }
        continue;
      }
      if (field.type === "number") {
        const parsed = parseNumber(cell);
        if (parsed === null) issue("number", "error", `${field.label} "${text}" is not a number.`);
        values[field.key] = parsed;
      } else if (field.type === "date") {
        const order = column === null || column === undefined ? "auto" : context.dateOrders[column] ?? "auto";
        const parsed = parseDate(cell, order);
        if (!parsed.iso) issue("date", "error", `${field.label} "${text}" is not a recognised date.`);
        else if (parsed.ambiguous) issue("date_ambiguous", "warning", `${field.label} "${text}" could be month-first or day-first. Read as month-first; set the date format in mapping to confirm.`);
        values[field.key] = parsed.iso;
      } else if (field.type === "period") {
        const parsed = parsePeriod(cell);
        if (!parsed) issue("period", "error", `${field.label} "${text}" is not a recognised period. Use YYYY-MM, YYYY, or YYYY-Qn.`);
        values[field.key] = parsed;
      } else if (field.type === "enum") {
        const parsed = enumValue(field, text);
        if (!parsed) issue("enum", "error", `${field.label} "${text}" must be one of: ${(field.options ?? []).join(", ")}.`);
        values[field.key] = parsed;
      } else {
        values[field.key] = text.trim();
      }
    }

    if (category.fields.some((field) => field.key === "period") && values.period == null && typeof values.transaction_date === "string") {
      values.period = values.transaction_date.slice(0, 7);
    }

    const isPropertyMaster = category.id === "property_master";
    const isEntityMaster = category.id === "entity_master";
    if (typeof values.property_id === "string" && values.property_id) {
      const name = isPropertyMaster && typeof values.property_name === "string" ? values.property_name : undefined;
      const key = `property|${normalizeId(values.property_id)}`;
      const result = matches.get(key) ?? matchRecord("property", values.property_id, name, propertyContext, isPropertyMaster);
      matches.set(key, result);
      if (result.status === "unmatched") issues.push({ row, field: "property_id", value: values.property_id, rule: "property_unmatched", severity: "error", message: result.note });
      if (result.status === "possible") issues.push({ row, field: "property_id", value: values.property_id, rule: "property_possible_duplicate", severity: "error", message: result.note });
      if (isPropertyMaster && result.status === "matched") {
        issues.push({ row, field: "property_id", value: values.property_id, rule: "property_existing", severity: "warning", message: `${values.property_id} already exists in EstateCFO. Publishing updates it only after you confirm the overwrite.` });
      }
    }
    if (typeof values.entity_id === "string" && values.entity_id && !isEntityMaster) {
      const key = `entity|${normalizeId(values.entity_id)}`;
      const result = matches.get(key) ?? matchRecord("entity", values.entity_id, undefined, entityContext, false);
      matches.set(key, result);
      if (result.status === "unmatched" || result.status === "possible") issues.push({ row, field: "entity_id", value: values.entity_id, rule: "entity_unmatched", severity: "error", message: result.note });
    }
    if (isEntityMaster && typeof values.entity_id === "string" && values.entity_id) {
      const name = typeof values.entity_name === "string" ? values.entity_name : undefined;
      const key = `entity|${normalizeId(values.entity_id)}`;
      const result = matches.get(key) ?? matchRecord("entity", values.entity_id, name, entityContext, true);
      matches.set(key, result);
      if (result.status === "possible") issues.push({ row, field: "entity_id", value: values.entity_id, rule: "entity_possible_duplicate", severity: "error", message: result.note });
      if (result.status === "matched") issues.push({ row, field: "entity_id", value: values.entity_id, rule: "entity_existing", severity: "warning", message: `${values.entity_id} already exists in EstateCFO. Publishing updates it only after you confirm the overwrite.` });
    }

    if (category.id !== "chart_of_accounts" && typeof values.account_code === "string" && values.account_code) {
      if (accounts.size === 0) {
        issues.push({ row, field: "account_code", value: values.account_code, rule: "account_unvalidated", severity: "warning", message: "No chart of accounts has been imported, so the account code cannot be validated." });
      } else if (!accounts.has(normalizeId(values.account_code))) {
        issues.push({ row, field: "account_code", value: values.account_code, rule: "account_unmapped", severity: "warning", message: `GL account ${values.account_code} is not in the chart of accounts. Add it to the chart of accounts before relying on classified reports.` });
      }
    }

    if (category.checks.includes("gl_debit_credit")) {
      const debit = typeof values.debit === "number" ? values.debit : 0;
      const credit = typeof values.credit === "number" ? values.credit : 0;
      if (debit !== 0 && credit !== 0) issues.push({ row, field: "debit", rule: "gl_both_sides", severity: "error", message: "The line has both a debit and a credit amount." });
      if (debit === 0 && credit === 0) issues.push({ row, field: "debit", rule: "gl_zero", severity: "warning", message: "The line has no debit or credit amount." });
      if (debit < 0 || credit < 0) issues.push({ row, field: debit < 0 ? "debit" : "credit", rule: "gl_negative", severity: "warning", message: "Negative debit or credit amount. Confirm the sign convention of this export." });
      if (!values.reference && !values.description) issues.push({ row, field: "reference", rule: "gl_reference", severity: "warning", message: "No reference or description on this journal line." });
    }

    if (category.checks.includes("tb_balance")) {
      const n = (key: string) => (typeof values[key] === "number" ? (values[key] as number) : 0);
      const expected = n("opening_debit") - n("opening_credit") + n("period_debit") - n("period_credit");
      const closing = n("closing_debit") - n("closing_credit");
      const hasClosing = values.closing_debit !== null || values.closing_credit !== null;
      if (hasClosing && Math.abs(expected - closing) > context.materiality) {
        issues.push({ row, field: "closing_debit", rule: "tb_row_roll", severity: "warning", message: `Opening plus movement is ${expected.toFixed(2)} but closing is ${closing.toFixed(2)}.` });
      }
    }

    if (category.checks.includes("date_order")) {
      const pairs: [string, string][] = [["lease_start", "lease_end"], ["commencement_date", "expiry_date"], ["start_date", "completion_date"]];
      for (const [from, to] of pairs) {
        if (typeof values[from] === "string" && typeof values[to] === "string" && (values[to] as string) < (values[from] as string)) {
          issues.push({ row, field: to, rule: "date_order", severity: "error", message: `${to.replace(/_/g, " ")} is before ${from.replace(/_/g, " ")}.` });
        }
      }
    }

    const locked = periodLocked(typeof values.period === "string" ? values.period : null, context.lockedPeriods);
    if (locked) issues.push({ row, field: "period", value: String(values.period), rule: "period_locked", severity: "error", message: `Reporting period ${values.period} is locked (${locked}). Unlock it in Integration Settings before importing changes.` });

    let status: NormalizedRow["status"] = issues.some((issue) => issue.severity === "error") ? "error" : issues.length > 0 ? "warning" : "valid";
    const key = rowKey(category, values);
    if (key && status !== "error") {
      const firstRow = seen.get(key);
      const existing = context.existingKeys.get(key);
      if (firstRow !== undefined) {
        issues.push({ row, rule: "duplicate_in_file", severity: "error", message: `Duplicate of row ${firstRow} in this file.` });
        status = "duplicate";
      } else if (existing && (!context.connectionId || existing.connectionId === context.connectionId)) {
        issues.push({ row, rule: "duplicate_existing", severity: "error", message: `Already imported from this source in ${existing.jobId}.` });
        status = "duplicate";
      } else {
        if (existing) {
          issues.push({
            row,
            rule: "cross_source_conflict",
            severity: "warning",
            message: `Same identifiers as a record from ${existing.source} (${existing.jobId}). Not treated as the same record; publishing asks you to resolve the overlap.`,
          });
          if (status === "valid") status = "warning";
        }
        seen.set(key, row);
      }
    }
    out.push({ row, values, raw, status, issues });
  }

  const usable = out.filter((row) => row.status === "valid" || row.status === "warning");
  const report: ValidationReport = {
    rows: out,
    fileChecks: fileChecks(category, usable, context.materiality),
    matches: [...matches.values()],
    counts: {
      total: out.length,
      valid: out.filter((row) => row.status === "valid").length,
      warning: out.filter((row) => row.status === "warning").length,
      error: out.filter((row) => row.status === "error").length,
      duplicate: out.filter((row) => row.status === "duplicate").length,
    },
  };
  return report;
}

function sum(rows: NormalizedRow[], key: string): number {
  return Math.round(rows.reduce((total, row) => total + (typeof row.values[key] === "number" ? (row.values[key] as number) : 0), 0) * 100) / 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function fileChecks(category: ImportCategory, rows: NormalizedRow[], materiality: number): FileCheck[] {
  const checks: FileCheck[] = [];

  if (category.checks.includes("gl_debit_credit")) {
    const groups = new Map<string, NormalizedRow[]>();
    for (const row of rows) {
      const key = `${row.values.entity_id ?? "—"} · ${row.values.period ?? "—"}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    const debit = sum(rows, "debit");
    const credit = sum(rows, "credit");
    const unbalanced = [...groups.entries()]
      .map(([key, group]) => ({ key, difference: round(sum(group, "debit") - sum(group, "credit")) }))
      .filter((item) => Math.abs(item.difference) > materiality);
    checks.push({
      id: "gl_debit_credit",
      label: "Debits equal credits",
      passed: Math.abs(debit - credit) <= materiality && unbalanced.length === 0,
      material: Math.abs(debit - credit) > materiality || unbalanced.length > 0,
      difference: round(debit - credit),
      details: [
        { label: "Total debits", value: debit },
        { label: "Total credits", value: credit },
        { label: "Difference", value: round(debit - credit) },
        ...unbalanced.slice(0, 10).map((item) => ({ label: `Out of balance: ${item.key}`, value: item.difference })),
      ],
      message:
        Math.abs(debit - credit) <= materiality && unbalanced.length === 0
          ? "Debits equal credits for every entity and period."
          : `Debits and credits differ by ${round(debit - credit).toFixed(2)} in total, with ${unbalanced.length} entity-period group(s) out of balance.`,
    });
  }

  if (category.checks.includes("tb_balance")) {
    const od = sum(rows, "opening_debit");
    const oc = sum(rows, "opening_credit");
    const pd = sum(rows, "period_debit");
    const pc = sum(rows, "period_credit");
    const cd = sum(rows, "closing_debit");
    const cc = sum(rows, "closing_credit");
    const differences = [round(od - oc), round(pd - pc), round(cd - cc)];
    const passed = differences.every((difference) => Math.abs(difference) <= materiality);
    checks.push({
      id: "tb_balance",
      label: "Trial balance: total debits equal total credits",
      passed,
      material: !passed,
      difference: differences[2],
      details: [
        { label: "Opening debit balance", value: od },
        { label: "Opening credit balance", value: oc },
        { label: "Period debit movement", value: pd },
        { label: "Period credit movement", value: pc },
        { label: "Closing debit balance", value: cd },
        { label: "Closing credit balance", value: cc },
        { label: "Opening difference", value: differences[0] },
        { label: "Movement difference", value: differences[1] },
        { label: "Closing difference", value: differences[2] },
      ],
      message: passed ? "Opening, movement, and closing debits equal credits." : `The trial balance does not balance. Closing difference ${differences[2].toFixed(2)}.`,
    });
  }

  if (category.checks.includes("is_classification")) {
    const lines = rows.filter((row) => !TOTAL_LINE.test(String(row.values.line_item ?? "")));
    const totals = rows.filter((row) => TOTAL_LINE.test(String(row.values.line_item ?? "")));
    const by = (classification: string) => sum(lines.filter((row) => row.values.classification === classification), "amount");
    const revenue = by("Revenue");
    const opex = by("Operating Expense");
    const nonOperating = by("Non-operating Expense");
    const otherIncome = by("Other Income");
    const noi = round(revenue - opex);
    const net = round(revenue + otherIncome - opex - nonOperating);
    const reportedNet = totals.find((row) => /net (income|loss|profit)/i.test(String(row.values.line_item)));
    const reported = reportedNet && typeof reportedNet.values.amount === "number" ? reportedNet.values.amount : null;
    const difference = reported === null ? 0 : round(reported - net);
    const passed = Math.abs(difference) <= materiality;
    checks.push({
      id: "is_classification",
      label: "Income statement classification and net income",
      passed,
      material: !passed,
      difference,
      details: [
        { label: "Revenue", value: revenue },
        { label: "Operating expenses", value: opex },
        { label: "NOI (revenue − operating expenses)", value: noi },
        { label: "Non-operating expenses", value: nonOperating },
        { label: "Other income", value: otherIncome },
        { label: "Net income (calculated)", value: net },
        { label: "Net income (reported in file)", value: reported === null ? "Not in file" : reported },
        { label: "Subtotal lines excluded from sums", value: totals.length },
      ],
      message:
        reported === null
          ? `Net income calculates to ${net.toFixed(2)}. The file has no reported net income line to compare.`
          : passed
            ? "Reported net income agrees with the classified lines."
            : `Reported net income ${reported.toFixed(2)} differs from the classified lines (${net.toFixed(2)}) by ${difference.toFixed(2)}.`,
    });
  }

  if (category.checks.includes("bs_equation")) {
    const lines = rows.filter((row) => !TOTAL_LINE.test(String(row.values.line_item ?? "")));
    const by = (section: string) => sum(lines.filter((row) => row.values.section === section), "amount");
    const assets = by("Asset");
    const liabilities = by("Liability");
    const equity = by("Equity");
    const difference = round(assets - liabilities - equity);
    const passed = Math.abs(difference) <= materiality;
    checks.push({
      id: "bs_equation",
      label: "Assets = Liabilities + Equity",
      passed,
      material: !passed,
      difference,
      details: [
        { label: "Assets", value: assets },
        { label: "Liabilities", value: liabilities },
        { label: "Equity", value: equity },
        { label: "Liabilities + Equity", value: round(liabilities + equity) },
        { label: "Difference", value: difference },
      ],
      message: passed ? "Assets equal liabilities plus equity." : `Assets differ from liabilities plus equity by ${difference.toFixed(2)}.`,
    });
  }

  if (category.checks.includes("ownership_pct")) {
    const byProperty = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.values.property_id ?? "—");
      byProperty.set(key, (byProperty.get(key) ?? 0) + (typeof row.values.ownership_pct === "number" ? row.values.ownership_pct : 0));
    }
    const over = [...byProperty.entries()].filter(([, total]) => total > 100.0001);
    const under = [...byProperty.entries()].filter(([, total]) => total < 99.9999);
    checks.push({
      id: "ownership_pct",
      label: "Ownership adds up to 100% per property",
      passed: over.length === 0 && under.length === 0,
      material: over.length > 0,
      details: [...byProperty.entries()].map(([property, total]) => ({ label: property, value: `${round(total)}%` })),
      message:
        over.length > 0
          ? `${over.length} property(ies) exceed 100% ownership.`
          : under.length > 0
            ? `${under.length} property(ies) total less than 100%. This can be correct if other owners are not in the file.`
            : "Every property totals 100%.",
    });
  }

  return checks;
}
