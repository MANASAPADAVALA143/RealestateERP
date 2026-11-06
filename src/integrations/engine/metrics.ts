import { normalizeId } from "./matching.ts";
import { TOTAL_LINE } from "./validate.ts";
import type { CategoryId, StoredRecord } from "./types.ts";

export type Dataset = Partial<Record<CategoryId, StoredRecord[]>>;

export interface Scope {
  entity?: string;
  property?: string;
  period?: string;
}

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const round = (value: number) => Math.round(value * 100) / 100;
const text = (value: unknown) => (typeof value === "string" ? value : "");

export function inScope(record: StoredRecord, scope: Scope): boolean {
  if (scope.entity && normalizeId(record.entityId ?? text(record.values.entity_id)) !== normalizeId(scope.entity)) return false;
  if (scope.property && normalizeId(record.propertyId ?? text(record.values.property_id)) !== normalizeId(scope.property)) return false;
  if (scope.period && record.period && !record.period.startsWith(scope.period) && !scope.period.startsWith(record.period)) return false;
  return true;
}

function rows(dataset: Dataset, category: CategoryId, scope: Scope = {}): StoredRecord[] {
  return (dataset[category] ?? []).filter((record) => inScope(record, scope));
}

export function periodsOf(records: StoredRecord[]): string[] {
  return [...new Set(records.map((record) => record.period).filter((period): period is string => Boolean(period)))].sort();
}

export function latestPeriod(records: StoredRecord[]): string | null {
  const periods = periodsOf(records);
  return periods.length ? periods[periods.length - 1] : null;
}

export function monthsInPeriods(periods: string[]): number {
  let months = 0;
  for (const period of periods) {
    if (/^\d{4}$/.test(period)) months += 12;
    else if (/^\d{4}-Q[1-4]$/.test(period)) months += 3;
    else if (/^\d{4}-\d{2}$/.test(period)) months += 1;
  }
  return months;
}

export function accountIndex(dataset: Dataset): Map<string, { type: string; subtype: string; description: string }> {
  const map = new Map<string, { type: string; subtype: string; description: string }>();
  for (const record of dataset.chart_of_accounts ?? []) {
    map.set(normalizeId(text(record.values.account_code)), {
      type: text(record.values.account_type),
      subtype: text(record.values.account_subtype),
      description: text(record.values.account_description),
    });
  }
  return map;
}

export interface BalanceSheetSummary {
  period: string | null;
  assets: number;
  liabilities: number;
  equity: number;
  cash: number | null;
  difference: number;
  lines: { section: string; line: string; amount: number; entity: string }[];
  sources: string[];
}

export function balanceSheet(dataset: Dataset, scope: Scope = {}): BalanceSheetSummary | null {
  const all = rows(dataset, "balance_sheet", { entity: scope.entity, property: scope.property });
  if (all.length === 0) return null;
  const period = scope.period ?? latestPeriod(all);
  const selected = all.filter((record) => record.period === period && !TOTAL_LINE.test(text(record.values.line_item)));
  const by = (section: string) => round(selected.filter((record) => record.values.section === section).reduce((total, record) => total + num(record.values.amount), 0));
  const accounts = accountIndex(dataset);
  const cashLines = selected.filter((record) => {
    if (record.values.section !== "Asset") return false;
    const account = accounts.get(normalizeId(text(record.values.account_code)));
    return account?.subtype === "Cash" || /\bcash\b/i.test(text(record.values.line_item));
  });
  const assets = by("Asset");
  const liabilities = by("Liability");
  const equity = by("Equity");
  return {
    period,
    assets,
    liabilities,
    equity,
    cash: cashLines.length ? round(cashLines.reduce((total, record) => total + num(record.values.amount), 0)) : null,
    difference: round(assets - liabilities - equity),
    lines: selected.map((record) => ({ section: text(record.values.section), line: text(record.values.line_item), amount: num(record.values.amount), entity: record.entityId ?? "" })),
    sources: [...new Set(selected.map((record) => record.jobId))],
  };
}

export interface IncomeSummary {
  periods: string[];
  months: number;
  revenue: number;
  rentalIncome: number;
  operatingExpenses: number;
  noi: number;
  nonOperating: number;
  otherIncome: number;
  netIncome: number;
  lines: { classification: string; line: string; amount: number; entity: string; period: string }[];
  sources: string[];
}

export function incomeStatement(dataset: Dataset, scope: Scope = {}): IncomeSummary | null {
  const all = rows(dataset, "income_statement", scope).filter((record) => !TOTAL_LINE.test(text(record.values.line_item)));
  if (all.length === 0) return null;
  const by = (classification: string) => round(all.filter((record) => record.values.classification === classification).reduce((total, record) => total + num(record.values.amount), 0));
  const revenue = by("Revenue");
  const operatingExpenses = by("Operating Expense");
  const nonOperating = by("Non-operating Expense");
  const otherIncome = by("Other Income");
  const periods = periodsOf(all);
  return {
    periods,
    months: monthsInPeriods(periods),
    revenue,
    rentalIncome: round(all.filter((record) => record.values.classification === "Revenue" && /rent/i.test(text(record.values.line_item))).reduce((total, record) => total + num(record.values.amount), 0)),
    operatingExpenses,
    noi: round(revenue - operatingExpenses),
    nonOperating,
    otherIncome,
    netIncome: round(revenue + otherIncome - operatingExpenses - nonOperating),
    lines: all.map((record) => ({ classification: text(record.values.classification), line: text(record.values.line_item), amount: num(record.values.amount), entity: record.entityId ?? "", period: record.period ?? "" })),
    sources: [...new Set(all.map((record) => record.jobId))],
  };
}

export interface LoanSummary {
  count: number;
  balance: number;
  monthlyPayment: number;
  interestExpense: number;
  principalRepaid: number;
  loans: { id: string; lender: string; entity: string; property: string; balance: number; rate: number; monthly: number; interest: number; principal: number; maturity: string; collateral: number | null; ltv: number | null }[];
  sources: string[];
}

export function loanSummary(dataset: Dataset, scope: Scope = {}, propertyValues: Map<string, number> = new Map()): LoanSummary | null {
  const all = rows(dataset, "loan_register", scope);
  if (all.length === 0) return null;
  const loans = all.map((record) => {
    const property = record.propertyId ?? text(record.values.property_id);
    const collateral = record.values.collateral_value !== null && record.values.collateral_value !== undefined ? num(record.values.collateral_value) : propertyValues.get(normalizeId(property)) ?? null;
    const balance = num(record.values.current_balance);
    return {
      id: text(record.values.loan_id),
      lender: text(record.values.lender),
      entity: record.entityId ?? text(record.values.entity_id),
      property,
      balance,
      rate: num(record.values.interest_rate),
      monthly: num(record.values.monthly_payment),
      interest: num(record.values.interest_expense),
      principal: num(record.values.principal_repaid),
      maturity: text(record.values.maturity_date),
      collateral,
      ltv: collateral ? Math.round((balance / collateral) * 1000) / 10 : null,
    };
  });
  const total = (key: "balance" | "monthly" | "interest" | "principal") => round(loans.reduce((sum, loan) => sum + loan[key], 0));
  return { count: loans.length, balance: total("balance"), monthlyPayment: total("monthly"), interestExpense: total("interest"), principalRepaid: total("principal"), loans, sources: [...new Set(all.map((record) => record.jobId))] };
}

export function propertyValues(dataset: Dataset): Map<string, number> {
  const map = new Map<string, number>();
  for (const record of dataset.property_master ?? []) {
    const id = normalizeId(record.propertyId ?? text(record.values.property_id));
    if (record.values.market_value !== null && record.values.market_value !== undefined) map.set(id, num(record.values.market_value));
  }
  return map;
}

export interface PropertyPnl {
  property: string;
  name: string;
  revenue: number;
  rentalRevenue: number;
  operatingExpenses: number;
  nonOperating: number;
  noi: number;
  net: number;
  byPeriod: Map<string, { revenue: number; rentalRevenue: number; operatingExpenses: number; noi: number }>;
}

export function propertyPnl(dataset: Dataset, scope: Scope = {}): { properties: PropertyPnl[]; unclassified: { account: string; amount: number }[]; sources: string[] } | null {
  const gl = rows(dataset, "gl_transactions", scope);
  if (gl.length === 0) return null;
  const accounts = accountIndex(dataset);
  const names = new Map((dataset.property_master ?? []).map((record) => [normalizeId(record.propertyId ?? text(record.values.property_id)), text(record.values.property_name)]));
  const byProperty = new Map<string, PropertyPnl>();
  const unclassified = new Map<string, number>();
  for (const record of gl) {
    const account = accounts.get(normalizeId(text(record.values.account_code)));
    const net = num(record.values.debit) - num(record.values.credit);
    if (!account) {
      unclassified.set(text(record.values.account_code), round((unclassified.get(text(record.values.account_code)) ?? 0) + net));
      continue;
    }
    if (account.type !== "Revenue" && account.type !== "Expense") continue;
    const property = record.propertyId ?? text(record.values.property_id);
    const key = normalizeId(property);
    const entry =
      byProperty.get(key) ??
      { property, name: names.get(key) ?? property, revenue: 0, rentalRevenue: 0, operatingExpenses: 0, nonOperating: 0, noi: 0, net: 0, byPeriod: new Map() };
    const period = record.period ?? "";
    const bucket = entry.byPeriod.get(period) ?? { revenue: 0, rentalRevenue: 0, operatingExpenses: 0, noi: 0 };
    if (account.type === "Revenue") {
      entry.revenue -= net;
      bucket.revenue -= net;
      if (account.subtype === "Rental Revenue" || /rent/i.test(account.description)) {
        entry.rentalRevenue -= net;
        bucket.rentalRevenue -= net;
      }
    } else if (account.subtype === "Non-operating Expense" || account.subtype === "Interest Expense") {
      entry.nonOperating += net;
    } else {
      entry.operatingExpenses += net;
      bucket.operatingExpenses += net;
    }
    bucket.noi = round(bucket.revenue - bucket.operatingExpenses);
    entry.byPeriod.set(period, bucket);
    byProperty.set(key, entry);
  }
  const properties = [...byProperty.values()].map((entry) => ({
    ...entry,
    revenue: round(entry.revenue),
    rentalRevenue: round(entry.rentalRevenue),
    operatingExpenses: round(entry.operatingExpenses),
    nonOperating: round(entry.nonOperating),
    noi: round(entry.revenue - entry.operatingExpenses),
    net: round(entry.revenue - entry.operatingExpenses - entry.nonOperating),
  }));
  return { properties, unclassified: [...unclassified.entries()].map(([account, amount]) => ({ account, amount })), sources: [...new Set(gl.map((record) => record.jobId))] };
}

export interface AgeingRow {
  id: string;
  counterparty: string;
  counterpartyId: string;
  entity: string;
  property: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  balance: number;
  daysPastDue: number;
  bucket: string;
}

export const AGEING_BUCKETS = ["Current", "1–30", "31–60", "61–90", "90+"];

function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function ageing(dataset: Dataset, category: "accounts_payable" | "accounts_receivable", asOf: string, scope: Scope = {}): { rows: AgeingRow[]; buckets: { bucket: string; amount: number; count: number }[]; total: number; sources: string[] } | null {
  const all = rows(dataset, category, scope);
  if (all.length === 0) return null;
  const isAp = category === "accounts_payable";
  const out = all.map((record) => {
    const amount = num(record.values.amount);
    const settled = num(record.values[isAp ? "amount_paid" : "amount_received"]);
    const balance = record.values.balance !== null && record.values.balance !== undefined ? num(record.values.balance) : round(amount - settled);
    const invoiceDate = text(record.values.invoice_date);
    const dueDate = text(record.values.due_date) || invoiceDate;
    const daysPastDue = dueDate ? daysBetween(dueDate, asOf) : 0;
    const bucket = daysPastDue <= 0 ? "Current" : daysPastDue <= 30 ? "1–30" : daysPastDue <= 60 ? "31–60" : daysPastDue <= 90 ? "61–90" : "90+";
    return {
      id: text(record.values.invoice_id),
      counterparty: text(record.values[isAp ? "vendor_name" : "customer_name"]) || text(record.values[isAp ? "vendor_id" : "customer_id"]),
      counterpartyId: text(record.values[isAp ? "vendor_id" : "customer_id"]),
      entity: record.entityId ?? text(record.values.entity_id),
      property: record.propertyId ?? text(record.values.property_id),
      invoiceDate,
      dueDate,
      amount,
      balance,
      daysPastDue,
      bucket,
    };
  });
  const buckets = AGEING_BUCKETS.map((bucket) => {
    const items = out.filter((row) => row.bucket === bucket);
    return { bucket, amount: round(items.reduce((total, row) => total + row.balance, 0)), count: items.length };
  });
  return { rows: out, buckets, total: round(out.reduce((total, row) => total + row.balance, 0)), sources: [...new Set(all.map((record) => record.jobId))] };
}

export function cashSummary(dataset: Dataset, scope: Scope = {}): { byAccount: { account: string; net: number; inflow: number; outflow: number; count: number }[]; byCategory: { category: string; amount: number }[]; net: number; sources: string[] } | null {
  const all = rows(dataset, "cash_transactions", scope);
  if (all.length === 0) return null;
  const accounts = new Map<string, { account: string; net: number; inflow: number; outflow: number; count: number }>();
  const categories = new Map<string, number>();
  for (const record of all) {
    const amount = num(record.values.amount);
    const account = text(record.values.bank_account);
    const entry = accounts.get(account) ?? { account, net: 0, inflow: 0, outflow: 0, count: 0 };
    entry.net = round(entry.net + amount);
    if (amount >= 0) entry.inflow = round(entry.inflow + amount);
    else entry.outflow = round(entry.outflow + amount);
    entry.count += 1;
    accounts.set(account, entry);
    const category = text(record.values.cash_flow_category) || "Unclassified";
    categories.set(category, round((categories.get(category) ?? 0) + amount));
  }
  return {
    byAccount: [...accounts.values()],
    byCategory: ["Operating", "Investing", "Financing", "Unclassified"].filter((category) => categories.has(category)).map((category) => ({ category, amount: categories.get(category) ?? 0 })),
    net: round(all.reduce((total, record) => total + num(record.values.amount), 0)),
    sources: [...new Set(all.map((record) => record.jobId))],
  };
}

export function cashFlowStatement(dataset: Dataset, scope: Scope = {}): { lines: { activity: string; line: string; amount: number; entity: string }[]; byActivity: { category: string; amount: number }[]; net: number; periods: string[]; sources: string[] } | null {
  const all = rows(dataset, "cash_flow", scope);
  if (all.length === 0) return null;
  const totals = new Map<string, number>();
  for (const record of all) totals.set(text(record.values.activity), round((totals.get(text(record.values.activity)) ?? 0) + num(record.values.amount)));
  return {
    lines: all.map((record) => ({ activity: text(record.values.activity), line: text(record.values.line_item), amount: num(record.values.amount), entity: record.entityId ?? "" })),
    byActivity: ["Operating", "Investing", "Financing"].filter((activity) => totals.has(activity)).map((activity) => ({ category: activity, amount: totals.get(activity) ?? 0 })),
    net: round(all.reduce((total, record) => total + num(record.values.amount), 0)),
    periods: periodsOf(all),
    sources: [...new Set(all.map((record) => record.jobId))],
  };
}

export function trialBalance(dataset: Dataset, scope: Scope = {}): { period: string | null; rows: { account: string; description: string; entity: string; closingDebit: number; closingCredit: number; movement: number }[]; totals: { debit: number; credit: number; difference: number }; sources: string[] } | null {
  const all = rows(dataset, "trial_balance", { entity: scope.entity, property: scope.property });
  if (all.length === 0) return null;
  const period = scope.period ?? latestPeriod(all);
  const selected = all.filter((record) => record.period === period);
  const out = selected.map((record) => ({
    account: text(record.values.account_code),
    description: text(record.values.account_description),
    entity: record.entityId ?? "",
    closingDebit: num(record.values.closing_debit),
    closingCredit: num(record.values.closing_credit),
    movement: round(num(record.values.period_debit) - num(record.values.period_credit)),
  }));
  const debit = round(out.reduce((total, row) => total + row.closingDebit, 0));
  const credit = round(out.reduce((total, row) => total + row.closingCredit, 0));
  return { period, rows: out, totals: { debit, credit, difference: round(debit - credit) }, sources: [...new Set(selected.map((record) => record.jobId))] };
}

export interface PortfolioKpi {
  key: string;
  label: string;
  value: number | null;
  format: "usd" | "ratio" | "pct";
  basis: string;
  missing?: string;
}

export function portfolioKpis(dataset: Dataset, scope: Scope = {}): PortfolioKpi[] {
  const bs = balanceSheet(dataset, scope);
  const is = incomeStatement(dataset, scope);
  const values = propertyValues(dataset);
  const scopedValues = (dataset.property_master ?? []).filter((record) => inScope(record, { entity: scope.entity, property: scope.property }));
  const portfolio = scopedValues.length ? round(scopedValues.reduce((total, record) => total + num(record.values.market_value), 0)) : null;
  const loans = loanSummary(dataset, scope, values);
  const debtService = loans && is && is.months > 0 ? round(loans.monthlyPayment * is.months) : null;
  const isEntities = [...new Set(is?.lines.map((line) => line.entity).filter(Boolean) ?? [])].sort();
  const loanEntities = [...new Set(loans?.loans.map((loan) => loan.entity).filter(Boolean) ?? [])].sort();
  const coverageGap = is && loans && isEntities.join(",") !== loanEntities.join(",") ? ` · Entities differ: income statement ${isEntities.join(", ") || "—"}, loans ${loanEntities.join(", ") || "—"}. Filter by entity for a like-for-like ratio.` : "";
  const bsBasis = bs ? `Balance sheet ${bs.period}` : "";
  return [
    { key: "assets", label: "Total assets", value: bs?.assets ?? null, format: "usd", basis: bsBasis, missing: bs ? undefined : "Import and publish a Balance Sheet." },
    { key: "liabilities", label: "Total liabilities", value: bs?.liabilities ?? null, format: "usd", basis: bsBasis, missing: bs ? undefined : "Import and publish a Balance Sheet." },
    { key: "net_worth", label: "Net worth", value: bs ? round(bs.assets - bs.liabilities) : null, format: "usd", basis: bs ? `${bsBasis} · assets − liabilities` : "", missing: bs ? undefined : "Import and publish a Balance Sheet." },
    { key: "cash", label: "Cash and cash equivalents", value: bs?.cash ?? null, format: "usd", basis: bs ? `${bsBasis} · cash lines` : "", missing: !bs ? "Import and publish a Balance Sheet." : bs.cash === null ? "No balance sheet line is classified as cash." : undefined },
    { key: "portfolio_value", label: "Property portfolio value", value: portfolio, format: "usd", basis: portfolio !== null ? `Property master market value · ${scopedValues.length} properties` : "", missing: portfolio === null ? "Import and publish a Property Master with market values." : undefined },
    { key: "noi", label: "Portfolio NOI", value: is?.noi ?? null, format: "usd", basis: is ? `Income statement ${is.periods.join(", ")} · revenue − operating expenses` : "", missing: is ? undefined : "Import and publish an Income Statement." },
    { key: "rental_income", label: "Rental income", value: is?.rentalIncome ?? null, format: "usd", basis: is ? `Income statement revenue lines containing "rent"` : "", missing: is ? undefined : "Import and publish an Income Statement." },
    { key: "opex", label: "Operating expenses", value: is?.operatingExpenses ?? null, format: "usd", basis: is ? `Income statement ${is.periods.join(", ")}` : "", missing: is ? undefined : "Import and publish an Income Statement." },
    {
      key: "dscr",
      label: "Portfolio DSCR",
      value: is && debtService ? round(is.noi / debtService) : null,
      format: "ratio",
      basis: is && debtService ? `NOI ÷ (monthly debt service × ${is.months} months)${coverageGap}` : "",
      missing: !is ? "Import and publish an Income Statement." : !loans ? "Import and publish a Loan Register." : !debtService ? "The loan register has no monthly payments, or the income statement period is not recognised." : undefined,
    },
    {
      key: "ltv",
      label: "Portfolio LTV",
      value: loans && portfolio ? Math.round((loans.balance / portfolio) * 1000) / 10 : null,
      format: "pct",
      basis: loans && portfolio ? "Loan balances ÷ property market value" : "",
      missing: !loans ? "Import and publish a Loan Register." : !portfolio ? "Import and publish a Property Master with market values." : undefined,
    },
  ];
}
