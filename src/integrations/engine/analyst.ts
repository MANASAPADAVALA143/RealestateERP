import { normalizeId } from "./matching.ts";
import { accountIndex, inScope, loanSummary, portfolioKpis, propertyPnl, propertyValues, type Dataset, type Scope } from "./metrics.ts";
import type { CategoryId, StoredRecord } from "./types.ts";

export interface AnalystAnswer {
  intent: string;
  title: string;
  answer: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  basis: string;
  sources: { categories: CategoryId[]; jobs: string[]; periods: string[]; entities: string[]; properties: string[] };
  supported: boolean;
}

export const supportedQuestions = [
  "Which property generated the highest NOI?",
  "Why did operating expenses increase?",
  "Which properties have negative cash flow?",
  "Which GL accounts have unusual movements?",
  "Which entities have the highest debt?",
  "What is the portfolio DSCR?",
  "Which properties have declining rental income?",
  "Compare the current quarter with the previous quarter.",
  "Identify unusual journal entries.",
];

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const round = (value: number) => Math.round(value * 100) / 100;

export function money(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function quarterOf(period: string): string | null {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return /^\d{4}-Q[1-4]$/.test(period) ? period : null;
  return `${match[1]}-Q${Math.ceil(Number(match[2]) / 3)}`;
}

function sourcesOf(records: StoredRecord[], categories: CategoryId[]): AnalystAnswer["sources"] {
  const uniq = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return {
    categories,
    jobs: uniq(records.map((record) => record.jobId)),
    periods: uniq(records.map((record) => record.period)),
    entities: uniq(records.map((record) => record.entityId)),
    properties: uniq(records.map((record) => record.propertyId)),
  };
}

function missing(intent: string, title: string, needed: string): AnalystAnswer {
  return {
    intent,
    title,
    answer: `I cannot answer this from validated data yet. ${needed}`,
    basis: "No calculation was run.",
    sources: { categories: [], jobs: [], periods: [], entities: [], properties: [] },
    supported: true,
  };
}

function glRecords(dataset: Dataset, scope: Scope): StoredRecord[] {
  return (dataset.gl_transactions ?? []).filter((record) => inScope(record, scope));
}

function highestNoi(dataset: Dataset, scope: Scope): AnalystAnswer {
  const pnl = propertyPnl(dataset, scope);
  if (!pnl || pnl.properties.length === 0) return missing("highest_noi", "Highest NOI by property", "Publish a General Ledger and a Chart of Accounts so revenue and expense accounts can be classified by property.");
  const sorted = [...pnl.properties].sort((a, b) => b.noi - a.noi);
  const top = sorted[0];
  const records = glRecords(dataset, scope);
  return {
    intent: "highest_noi",
    title: "Highest NOI by property",
    answer: `${top.name} (${top.property}) generated the highest NOI: ${money(top.noi)}, from revenue of ${money(top.revenue)} less operating expenses of ${money(top.operatingExpenses)}.${pnl.unclassified.length ? ` ${pnl.unclassified.length} GL account(s) are not in the chart of accounts and were left out.` : ""}`,
    table: { columns: ["Property", "Revenue", "Operating expenses", "NOI"], rows: sorted.map((row) => [`${row.name} (${row.property})`, money(row.revenue), money(row.operatingExpenses), money(row.noi)]) },
    basis: "NOI = revenue accounts (credit − debit) − operating expense accounts (debit − credit), from published GL lines classified by the chart of accounts.",
    sources: sourcesOf(records, ["gl_transactions", "chart_of_accounts"]),
    supported: true,
  };
}

function expenseMovements(dataset: Dataset, scope: Scope): AnalystAnswer {
  const records = glRecords(dataset, scope);
  const accounts = accountIndex(dataset);
  if (records.length === 0 || accounts.size === 0) return missing("opex_change", "Operating expense change", "Publish a General Ledger and a Chart of Accounts.");
  const opex = records.filter((record) => {
    const account = accounts.get(normalizeId(text(record.values.account_code)));
    return account?.type === "Expense" && account.subtype !== "Non-operating Expense" && account.subtype !== "Interest Expense";
  });
  const periods = [...new Set(opex.map((record) => record.period).filter((period): period is string => Boolean(period)))].sort();
  if (periods.length < 2) return missing("opex_change", "Operating expense change", "At least two periods of operating expense postings are needed to compare.");
  const [previous, current] = periods.slice(-2);
  const byAccount = new Map<string, { previous: number; current: number; description: string }>();
  for (const record of opex) {
    if (record.period !== previous && record.period !== current) continue;
    const code = text(record.values.account_code);
    const entry = byAccount.get(code) ?? { previous: 0, current: 0, description: accounts.get(normalizeId(code))?.description ?? code };
    const amount = num(record.values.debit) - num(record.values.credit);
    if (record.period === previous) entry.previous += amount;
    else entry.current += amount;
    byAccount.set(code, entry);
  }
  const rows = [...byAccount.entries()].map(([code, entry]) => ({ code, ...entry, change: round(entry.current - entry.previous) })).sort((a, b) => b.change - a.change);
  const totalPrevious = round(rows.reduce((total, row) => total + row.previous, 0));
  const totalCurrent = round(rows.reduce((total, row) => total + row.current, 0));
  const change = round(totalCurrent - totalPrevious);
  const drivers = rows.filter((row) => row.change > 0).slice(0, 3);
  return {
    intent: "opex_change",
    title: `Operating expenses ${previous} vs ${current}`,
    answer:
      change > 0
        ? `Operating expenses rose ${money(change)} from ${money(totalPrevious)} in ${previous} to ${money(totalCurrent)} in ${current}. The largest increases: ${drivers.map((row) => `${row.description} (${row.code}) +${money(row.change)}`).join("; ")}.`
        : `Operating expenses did not increase. They moved ${money(change)} from ${money(totalPrevious)} in ${previous} to ${money(totalCurrent)} in ${current}.`,
    table: { columns: ["Account", previous, current, "Change"], rows: rows.map((row) => [`${row.code} ${row.description}`, money(row.previous), money(row.current), money(row.change)]) },
    basis: "Operating expense accounts (debit − credit) from published GL lines, grouped by account for the two most recent periods.",
    sources: sourcesOf(opex, ["gl_transactions", "chart_of_accounts"]),
    supported: true,
  };
}

function negativeCashFlow(dataset: Dataset, scope: Scope): AnalystAnswer {
  const cash = (dataset.cash_transactions ?? []).filter((record) => inScope(record, scope) && record.propertyId);
  if (cash.length > 0) {
    const byProperty = new Map<string, number>();
    for (const record of cash) byProperty.set(record.propertyId as string, round((byProperty.get(record.propertyId as string) ?? 0) + num(record.values.amount)));
    const negative = [...byProperty.entries()].filter(([, net]) => net < 0).sort((a, b) => a[1] - b[1]);
    return {
      intent: "negative_cash_flow",
      title: "Properties with negative cash flow",
      answer: negative.length ? `${negative.length} property(ies) had net cash outflow: ${negative.map(([property, net]) => `${property} ${money(net)}`).join("; ")}.` : "No property had a net cash outflow in the published cash transactions.",
      table: { columns: ["Property", "Net cash flow"], rows: [...byProperty.entries()].sort((a, b) => a[1] - b[1]).map(([property, net]) => [property, money(net)]) },
      basis: "Sum of signed bank transaction amounts per property from published cash transactions.",
      sources: sourcesOf(cash, ["cash_transactions"]),
      supported: true,
    };
  }
  const pnl = propertyPnl(dataset, scope);
  if (!pnl) return missing("negative_cash_flow", "Properties with negative cash flow", "Publish Cash Transactions with a property code, or a General Ledger with a Chart of Accounts.");
  const negative = pnl.properties.filter((row) => row.net < 0).sort((a, b) => a.net - b.net);
  return {
    intent: "negative_cash_flow",
    title: "Properties with negative operating result",
    answer: `No cash transactions are published, so this uses the GL result after all expenses as a proxy. ${negative.length ? `${negative.length} property(ies) are negative: ${negative.map((row) => `${row.name} ${money(row.net)}`).join("; ")}.` : "No property is negative."}`,
    table: { columns: ["Property", "Revenue", "All expenses", "Result"], rows: pnl.properties.map((row) => [row.name, money(row.revenue), money(row.operatingExpenses + row.nonOperating), money(row.net)]) },
    basis: "Revenue − operating and non-operating expenses per property from published GL lines. This is an accrual result, not cash.",
    sources: sourcesOf(glRecords(dataset, scope), ["gl_transactions", "chart_of_accounts"]),
    supported: true,
  };
}

function unusualAccounts(dataset: Dataset, scope: Scope): AnalystAnswer {
  const records = glRecords(dataset, scope);
  if (records.length === 0) return missing("unusual_accounts", "Unusual GL account movements", "Publish a General Ledger.");
  const periods = [...new Set(records.map((record) => record.period).filter((period): period is string => Boolean(period)))].sort();
  if (periods.length < 3) return missing("unusual_accounts", "Unusual GL account movements", "At least three periods of GL postings are needed to compare the latest movement with earlier ones.");
  const current = periods[periods.length - 1];
  const byAccount = new Map<string, Map<string, number>>();
  for (const record of records) {
    const code = text(record.values.account_code);
    const map = byAccount.get(code) ?? new Map<string, number>();
    map.set(record.period ?? "", (map.get(record.period ?? "") ?? 0) + num(record.values.debit) - num(record.values.credit));
    byAccount.set(code, map);
  }
  const flagged: { code: string; current: number; average: number; change: number }[] = [];
  for (const [code, map] of byAccount) {
    const prior = periods.slice(0, -1).map((period) => map.get(period) ?? 0);
    const average = prior.reduce((total, value) => total + value, 0) / prior.length;
    const value = map.get(current) ?? 0;
    const change = average === 0 ? (value === 0 ? 0 : Infinity) : (value - average) / Math.abs(average);
    if (Math.abs(value - average) >= 1000 && Math.abs(change) >= 0.5) flagged.push({ code, current: round(value), average: round(average), change });
  }
  flagged.sort((a, b) => Math.abs(b.current - b.average) - Math.abs(a.current - a.average));
  return {
    intent: "unusual_accounts",
    title: `GL accounts with unusual movement in ${current}`,
    answer: flagged.length ? `${flagged.length} account(s) moved at least 50% and $1,000 away from their average of the earlier ${periods.length - 1} periods. Largest: ${flagged.slice(0, 3).map((row) => `${row.code} ${money(row.current)} vs average ${money(row.average)}`).join("; ")}.` : `No account moved at least 50% and $1,000 away from its earlier average in ${current}.`,
    table: { columns: ["Account", `${current} net movement`, "Earlier average", "Change"], rows: flagged.map((row) => [row.code, money(row.current), money(row.average), Number.isFinite(row.change) ? `${Math.round(row.change * 100)}%` : "new"]) },
    basis: "Net movement (debit − credit) per account in the latest period compared with the mean of earlier periods. Threshold: ≥50% and ≥$1,000.",
    sources: sourcesOf(records, ["gl_transactions"]),
    supported: true,
  };
}

function highestDebt(dataset: Dataset, scope: Scope): AnalystAnswer {
  const loans = loanSummary(dataset, scope, propertyValues(dataset));
  if (!loans) return missing("highest_debt", "Debt by entity", "Publish a Loan Register.");
  const byEntity = new Map<string, number>();
  for (const loan of loans.loans) byEntity.set(loan.entity || "Unassigned", round((byEntity.get(loan.entity || "Unassigned") ?? 0) + loan.balance));
  const sorted = [...byEntity.entries()].sort((a, b) => b[1] - a[1]);
  const records = (dataset.loan_register ?? []).filter((record) => inScope(record, scope));
  return {
    intent: "highest_debt",
    title: "Debt by entity",
    answer: `${sorted[0][0]} carries the most debt: ${money(sorted[0][1])} of ${money(loans.balance)} across ${loans.count} loan(s).`,
    table: { columns: ["Entity", "Loan balance", "Share"], rows: sorted.map(([entity, balance]) => [entity, money(balance), `${Math.round((balance / loans.balance) * 1000) / 10}%`]) },
    basis: "Sum of current balance per entity from the published loan register.",
    sources: sourcesOf(records, ["loan_register"]),
    supported: true,
  };
}

function dscr(dataset: Dataset, scope: Scope): AnalystAnswer {
  const kpi = portfolioKpis(dataset, scope).find((item) => item.key === "dscr");
  const noi = portfolioKpis(dataset, scope).find((item) => item.key === "noi");
  if (!kpi || kpi.value === null) return missing("dscr", "Portfolio DSCR", kpi?.missing ?? "Publish an Income Statement and a Loan Register.");
  const records = [...(dataset.income_statement ?? []), ...(dataset.loan_register ?? [])].filter((record) => inScope(record, scope));
  return {
    intent: "dscr",
    title: "Portfolio DSCR",
    answer: `Portfolio DSCR is ${kpi.value.toFixed(2)}x. NOI is ${money(noi?.value ?? 0)}. ${kpi.value < 1 ? "NOI does not cover scheduled debt service." : kpi.value < 1.25 ? "NOI covers debt service, but below a typical 1.25x lender covenant." : "NOI covers debt service with headroom."}`,
    basis: kpi.basis,
    sources: sourcesOf(records, ["income_statement", "loan_register"]),
    supported: true,
  };
}

function decliningRent(dataset: Dataset, scope: Scope): AnalystAnswer {
  const pnl = propertyPnl(dataset, scope);
  if (!pnl) return missing("declining_rent", "Declining rental income", "Publish a General Ledger and a Chart of Accounts with rental revenue accounts.");
  const rows: (string | number)[][] = [];
  const declining: string[] = [];
  for (const property of pnl.properties) {
    const periods = [...property.byPeriod.keys()].filter(Boolean).sort();
    if (periods.length < 2) continue;
    const [previous, current] = periods.slice(-2);
    const a = round(property.byPeriod.get(previous)?.rentalRevenue ?? 0);
    const b = round(property.byPeriod.get(current)?.rentalRevenue ?? 0);
    rows.push([property.name, previous, money(a), current, money(b), money(round(b - a))]);
    if (b < a) declining.push(`${property.name} ${money(round(b - a))} (${previous} → ${current})`);
  }
  if (rows.length === 0) return missing("declining_rent", "Declining rental income", "At least two periods of rental revenue per property are needed.");
  return {
    intent: "declining_rent",
    title: "Rental income by property, last two periods",
    answer: declining.length ? `${declining.length} property(ies) have declining rental income: ${declining.join("; ")}.` : "No property has lower rental income in its latest period than in the period before.",
    table: { columns: ["Property", "Previous", "Rent", "Latest", "Rent", "Change"], rows },
    basis: "Rental revenue accounts (credit − debit) per property for each property’s two most recent periods.",
    sources: sourcesOf(glRecords(dataset, scope), ["gl_transactions", "chart_of_accounts"]),
    supported: true,
  };
}

function quarterCompare(dataset: Dataset, scope: Scope): AnalystAnswer {
  const records = glRecords(dataset, scope);
  const accounts = accountIndex(dataset);
  if (records.length === 0 || accounts.size === 0) return missing("quarter_compare", "Quarter comparison", "Publish a General Ledger and a Chart of Accounts.");
  const byQuarter = new Map<string, { revenue: number; opex: number }>();
  for (const record of records) {
    const quarter = quarterOf(record.period ?? "");
    const account = accounts.get(normalizeId(text(record.values.account_code)));
    if (!quarter || !account) continue;
    const entry = byQuarter.get(quarter) ?? { revenue: 0, opex: 0 };
    const net = num(record.values.debit) - num(record.values.credit);
    if (account.type === "Revenue") entry.revenue -= net;
    if (account.type === "Expense" && account.subtype !== "Non-operating Expense" && account.subtype !== "Interest Expense") entry.opex += net;
    byQuarter.set(quarter, entry);
  }
  const quarters = [...byQuarter.keys()].sort();
  if (quarters.length < 2) return missing("quarter_compare", "Quarter comparison", "GL postings in at least two quarters are needed.");
  const [previous, current] = quarters.slice(-2);
  const a = byQuarter.get(previous) as { revenue: number; opex: number };
  const b = byQuarter.get(current) as { revenue: number; opex: number };
  const noiA = round(a.revenue - a.opex);
  const noiB = round(b.revenue - b.opex);
  return {
    intent: "quarter_compare",
    title: `${current} vs ${previous}`,
    answer: `NOI was ${money(noiB)} in ${current} against ${money(noiA)} in ${previous}, a change of ${money(round(noiB - noiA))}. Revenue moved ${money(round(b.revenue - a.revenue))} and operating expenses moved ${money(round(b.opex - a.opex))}.${/Q\d$/.test(current) ? " A quarter is included only for the months that have postings." : ""}`,
    table: {
      columns: ["Measure", previous, current, "Change"],
      rows: [
        ["Revenue", money(round(a.revenue)), money(round(b.revenue)), money(round(b.revenue - a.revenue))],
        ["Operating expenses", money(round(a.opex)), money(round(b.opex)), money(round(b.opex - a.opex))],
        ["NOI", money(noiA), money(noiB), money(round(noiB - noiA))],
      ],
    },
    basis: "Published GL lines grouped by calendar quarter of their period and classified by the chart of accounts.",
    sources: sourcesOf(records, ["gl_transactions", "chart_of_accounts"]),
    supported: true,
  };
}

function unusualJournals(dataset: Dataset, scope: Scope): AnalystAnswer {
  const records = glRecords(dataset, scope);
  if (records.length === 0) return missing("unusual_journals", "Unusual journal entries", "Publish a General Ledger.");
  const byAccount = new Map<string, number[]>();
  for (const record of records) {
    const amount = Math.abs(num(record.values.debit) - num(record.values.credit));
    byAccount.set(text(record.values.account_code), [...(byAccount.get(text(record.values.account_code)) ?? []), amount]);
  }
  const stats = new Map<string, { mean: number; sd: number }>();
  for (const [code, amounts] of byAccount) {
    const mean = amounts.reduce((total, value) => total + value, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((total, value) => total + (value - mean) ** 2, 0) / amounts.length);
    stats.set(code, { mean, sd });
  }
  const flagged: { record: StoredRecord; reasons: string[] }[] = [];
  for (const record of records) {
    const amount = Math.abs(num(record.values.debit) - num(record.values.credit));
    const stat = stats.get(text(record.values.account_code));
    const reasons: string[] = [];
    const enough = (byAccount.get(text(record.values.account_code))?.length ?? 0) >= 5;
    if (stat && stat.sd > 0 && enough && amount > stat.mean + 3 * stat.sd) reasons.push("more than 3 standard deviations above the account average");
    const date = text(record.values.transaction_date);
    const large = amount >= 10000 || Boolean(stat && stat.sd > 0 && enough && amount > stat.mean + 2 * stat.sd);
    if (date && large) {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (day === 0 || day === 6) reasons.push("large amount posted on a weekend");
    }
    if (amount >= 10000 && amount % 1000 === 0) reasons.push("large round amount");
    if (!text(record.values.reference) && !text(record.values.description)) reasons.push("no reference or description");
    if (reasons.length) flagged.push({ record, reasons });
  }
  flagged.sort((a, b) => b.reasons.length - a.reasons.length);
  return {
    intent: "unusual_journals",
    title: "Unusual journal entries",
    answer: flagged.length ? `${flagged.length} journal line(s) meet at least one review rule. They are flagged for review, not confirmed as errors.` : "No journal line met the review rules.",
    table: {
      columns: ["Transaction", "Date", "Entity", "Property", "Account", "Amount", "Why flagged"],
      rows: flagged.slice(0, 50).map(({ record, reasons }) => [text(record.values.transaction_id) || `row ${record.row}`, text(record.values.transaction_date), record.entityId ?? "", record.propertyId ?? "", text(record.values.account_code), money(num(record.values.debit) - num(record.values.credit)), reasons.join("; ")]),
    },
    basis: "Rules: amount above account mean + 3σ (accounts with ≥5 lines); weekend posting of an amount ≥ $10,000 or above mean + 2σ; round amount ≥ $10,000; missing reference and description.",
    sources: sourcesOf(records, ["gl_transactions"]),
    supported: true,
  };
}

const intents: { pattern: RegExp; run: (dataset: Dataset, scope: Scope) => AnalystAnswer }[] = [
  { pattern: /(highest|top|best|most).*(noi|net operating)|noi.*(highest|top|best)/i, run: highestNoi },
  { pattern: /(operat\w* expense|opex|expenses?).*(increase|rise|rose|go up|went up|grow|change)|why.*(operat\w* expense|opex)/i, run: expenseMovements },
  { pattern: /negative cash|cash flow.*negative|cash burn/i, run: negativeCashFlow },
  { pattern: /(unusual|abnormal|large).*(movement|account)|accounts?.*unusual/i, run: unusualAccounts },
  { pattern: /(highest|most|largest).*debt|debt.*(highest|most|largest|by entity)/i, run: highestDebt },
  { pattern: /dscr|debt service coverage/i, run: dscr },
  { pattern: /declin\w*.*rent|rent\w*.*(declin|drop|fall|lower)/i, run: decliningRent },
  { pattern: /quarter/i, run: quarterCompare },
  { pattern: /(unusual|suspicious|anomal|odd).*(journal|entr|posting)|journal.*(unusual|anomal)/i, run: unusualJournals },
];

export function ask(question: string, dataset: Dataset, scope: Scope = {}): AnalystAnswer {
  const intent = intents.find((item) => item.pattern.test(question));
  if (!intent) {
    return {
      intent: "unsupported",
      title: "Question not supported yet",
      answer: `I only answer questions I can calculate from validated records. Try one of: ${supportedQuestions.join(" · ")}`,
      basis: "No calculation was run.",
      sources: { categories: [], jobs: [], periods: [], entities: [], properties: [] },
      supported: false,
    };
  }
  return intent.run(dataset, scope);
}
