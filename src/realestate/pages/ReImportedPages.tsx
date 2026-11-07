import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArStatementsPanel, EntityReceivables } from "@/ar/ui/embeds";
import { useArBook } from "@/ar/ui/hooks";
import { company } from "@/realestate/data";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageing, balanceSheet, cashFlowStatement, cashSummary, incomeStatement, trialBalance, type Scope } from "@/integrations/engine/metrics";
import { Empty, fmtMoney, inputClass } from "@/integrations/ui/components";
import { ImportedPanel, NotPublished, sourcesLine, usePublished } from "@/integrations/ui/connected";
import { RePage } from "@/realestate/ui";

const MERIDIAN_ENTITY = "MHLP";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ScopePicker({ values, value, onChange, label }: { values: string[]; value?: string; onChange: (value?: string) => void; label: string }) {
  if (values.length < 2) return null;
  return (
    <select aria-label={label} className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)}>
      <option value="">All {label.toLowerCase()}</option>
      {values.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  );
}

export function ReStatementsPage() {
  const { dataset, loading } = usePublished();
  const [tab, setTab] = useState<"Income Statement" | "Balance Sheet" | "Cash Flow" | "Trial Balance" | "Receivables Ledger">("Income Statement");
  const [scope, setScope] = useState<Scope>({});
  if (loading) return null;
  const entities = [...new Set(["income_statement", "balance_sheet", "trial_balance", "cash_transactions", "cash_flow"].flatMap((category) => (dataset[category as "income_statement"] ?? []).map((record) => record.entityId)).filter((value): value is string => Boolean(value)))].sort();
  const is = incomeStatement(dataset, scope);
  const bs = balanceSheet(dataset, scope);
  const tb = trialBalance(dataset, scope);
  const cash = cashSummary(dataset, scope);
  const cashFlow = cashFlowStatement(dataset, scope);

  return (
    <RePage page="Statements" title="Statements" subtitle="Income statement, balance sheet, cash flow, and trial balance from validated imports." right={<ScopePicker label="Entities" values={entities} value={scope.entity} onChange={(entity) => setScope({ ...scope, entity })} />}>
      <div className="flex flex-wrap gap-2">
        {(["Income Statement", "Balance Sheet", "Cash Flow", "Trial Balance", "Receivables Ledger"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>{item}</button>
        ))}
      </div>

      {tab === "Income Statement" ? (
        is ? (
          <ImportedPanel title={`Income statement · ${is.periods.join(", ")}`} subtitle={sourcesLine(dataset.income_statement ?? [])}>
            <table className="data-table max-w-3xl">
              <tbody>
                {(["Revenue", "Other Income", "Operating Expense", "Non-operating Expense"] as const).map((classification) => {
                  const lines = is.lines.filter((line) => line.classification === classification);
                  if (lines.length === 0) return null;
                  return lines.map((line, index) => (
                    <tr key={`${classification}-${index}`}>
                      <td className="text-navy/50">{index === 0 ? classification : ""}</td>
                      <td>{line.line} {line.entity ? <span className="text-navy/40">· {line.entity}</span> : null}</td>
                      <td className="text-right tabular-nums">{fmtMoney(line.amount)}</td>
                    </tr>
                  ));
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Revenue</td><td className="text-right tabular-nums">{fmtMoney(is.revenue)}</td></tr>
                <tr><td colSpan={2}>Net operating income (revenue − operating expenses)</td><td className="text-right tabular-nums">{fmtMoney(is.noi)}</td></tr>
                <tr><td colSpan={2}>Net income</td><td className={`text-right tabular-nums ${is.netIncome < 0 ? "!text-red-700" : ""}`}>{fmtMoney(is.netIncome)}</td></tr>
              </tfoot>
            </table>
            <p className="mt-2 text-xs text-navy/50">Subtotal lines such as “Total” or “Net income” in the file are excluded from the sums; validation compares them with the calculated figures.</p>
          </ImportedPanel>
        ) : (
          <NotPublished what="income statement" category="income_statement" />
        )
      ) : null}

      {tab === "Balance Sheet" ? (
        bs ? (
          <ImportedPanel title={`Balance sheet · ${bs.period}`} subtitle={sourcesLine(dataset.balance_sheet ?? [])}>
            <table className="data-table max-w-3xl">
              <tbody>
                {(["Asset", "Liability", "Equity"] as const).flatMap((section) =>
                  bs.lines.filter((line) => line.section === section).map((line, index) => (
                    <tr key={`${section}-${index}`}>
                      <td className="text-navy/50">{index === 0 ? `${section === "Liability" ? "Liabilities" : section === "Asset" ? "Assets" : "Equity"}` : ""}</td>
                      <td>{line.line} {line.entity ? <span className="text-navy/40">· {line.entity}</span> : null}</td>
                      <td className="text-right tabular-nums">{fmtMoney(line.amount)}</td>
                    </tr>
                  )),
                )}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Total assets</td><td className="text-right tabular-nums">{fmtMoney(bs.assets)}</td></tr>
                <tr><td colSpan={2}>Total liabilities</td><td className="text-right tabular-nums">{fmtMoney(bs.liabilities)}</td></tr>
                <tr><td colSpan={2}>Total equity</td><td className="text-right tabular-nums">{fmtMoney(bs.equity)}</td></tr>
                <tr><td colSpan={2}>Assets − (liabilities + equity)</td><td className={`text-right tabular-nums ${bs.difference ? "!text-red-700" : ""}`}>{fmtMoney(bs.difference)}</td></tr>
              </tfoot>
            </table>
          </ImportedPanel>
        ) : (
          <NotPublished what="balance sheet" category="balance_sheet" />
        )
      ) : null}

      {tab === "Cash Flow" ? (
        cashFlow ? (
          <ImportedPanel title={`Cash flow statement · ${cashFlow.periods.join(", ")}`} subtitle={sourcesLine(dataset.cash_flow ?? [])}>
            <table className="data-table max-w-3xl">
              <tbody>
                {cashFlow.lines.map((line, index) => (
                  <tr key={index}><td className="text-navy/50">{line.activity}</td><td>{line.line} {line.entity ? <span className="text-navy/40">· {line.entity}</span> : null}</td><td className={`text-right tabular-nums ${line.amount < 0 ? "!text-red-700" : ""}`}>{fmtMoney(line.amount)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                {cashFlow.byActivity.map((row) => (
                  <tr key={row.category}><td colSpan={2}>Net {row.category.toLowerCase()} cash flow</td><td className="text-right tabular-nums">{fmtMoney(row.amount)}</td></tr>
                ))}
                <tr><td colSpan={2}>Net change in cash</td><td className="text-right tabular-nums">{fmtMoney(cashFlow.net)}</td></tr>
              </tfoot>
            </table>
          </ImportedPanel>
        ) : cash ? (
          <ImportedPanel title="Cash flow statement" subtitle={<>{sourcesLine(dataset.cash_transactions ?? [])} · from bank transactions grouped by cash flow category</>}>
            <table className="data-table max-w-2xl">
              <tbody>
                {cash.byCategory.map((row) => (
                  <tr key={row.category}><td>{row.category} activities</td><td className={`text-right tabular-nums ${row.amount < 0 ? "!text-red-700" : ""}`}>{fmtMoney(row.amount)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td>Net change in cash</td><td className="text-right tabular-nums">{fmtMoney(cash.net)}</td></tr></tfoot>
            </table>
            {cash.byCategory.some((row) => row.category === "Unclassified") ? <p className="mt-2 text-xs text-amber-800">Some transactions have no cash flow category. Map the category column in the import to classify them.</p> : null}
          </ImportedPanel>
        ) : (
          <NotPublished what="cash transactions" category="cash_transactions" />
        )
      ) : null}

      {tab === "Receivables Ledger" ? <ArStatementsPanel entityId={scope.entity ?? MERIDIAN_ENTITY} /> : null}

      {tab === "Trial Balance" ? (
        tb ? (
          <ImportedPanel title={`Trial balance · ${tb.period}`} subtitle={sourcesLine(dataset.trial_balance ?? [])}>
            <div className="max-h-[32rem] overflow-auto">
              <table className="data-table min-w-[760px] text-xs">
                <thead className="sticky top-0">
                  <tr><th>Entity</th><th>Account</th><th>Description</th><th className="text-right">Period movement</th><th className="text-right">Closing debit</th><th className="text-right">Closing credit</th></tr>
                </thead>
                <tbody>
                  {tb.rows.map((row, index) => (
                    <tr key={`${row.entity}-${row.account}-${index}`}>
                      <td>{row.entity}</td>
                      <td className="font-semibold">{row.account}</td>
                      <td>{row.description}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.movement)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.closingDebit)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.closingCredit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4}>Totals</td><td className="text-right tabular-nums">{fmtMoney(tb.totals.debit)}</td><td className="text-right tabular-nums">{fmtMoney(tb.totals.credit)}</td></tr>
                  <tr><td colSpan={5}>Difference</td><td className={`text-right tabular-nums ${tb.totals.difference ? "!text-red-700" : ""}`}>{fmtMoney(tb.totals.difference)}</td></tr>
                </tfoot>
              </table>
            </div>
          </ImportedPanel>
        ) : (
          <NotPublished what="trial balance" category="trial_balance" />
        )
      ) : null}
    </RePage>
  );
}

function AgeingPage({ kind, lead }: { kind: "accounts_payable" | "accounts_receivable"; lead?: ReactNode }) {
  const { dataset, loading } = usePublished();
  const [asOf, setAsOf] = useState(today());
  const isAp = kind === "accounts_payable";
  const title = isAp ? "Accounts Payable" : "Accounts Receivable";
  if (loading) return null;
  const result = ageing(dataset, kind, asOf);
  const master = isAp ? dataset.vendor_master ?? [] : dataset.tenant_master ?? [];
  const byCounterparty = result
    ? Object.values(
        result.rows.reduce<Record<string, { id: string; name: string; balance: number; count: number }>>((acc, row) => {
          const entry = acc[row.counterpartyId] ?? { id: row.counterpartyId, name: row.counterparty, balance: 0, count: 0 };
          entry.balance = Math.round((entry.balance + row.balance) * 100) / 100;
          entry.count += 1;
          acc[row.counterpartyId] = entry;
          return acc;
        }, {}),
      ).sort((a, b) => b.balance - a.balance)
    : [];

  return (
    <RePage
      page={title}
      title={title}
      subtitle={isAp ? "Vendor invoices, vendor balances, and ageing from validated imports." : "Tenant and customer receivables, outstanding balances, and ageing from validated imports."}
      right={
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-navy/50">
          Ageing as of
          <input type="date" className={inputClass} value={asOf} onChange={(event) => setAsOf(event.target.value || today())} />
        </label>
      }
    >
      {lead}
      {!result ? (
        lead ? null : <NotPublished what={isAp ? "accounts payable" : "accounts receivable"} category={kind} />
      ) : (
        <>
          {lead ? <p className="text-xs text-navy/60">Below: the published source-system receivables file as imported. <Link to="/estate/ar/settings" className="font-semibold underline">Bring open items into the AR ledger</Link> to bill, collect, and age them in EstateCFO.</p> : null}
          <ImportedPanel title={`Ageing · ${fmtMoney(result.total)} outstanding`} subtitle={sourcesLine(dataset[kind] ?? [])}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.buckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value: number) => `$${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => fmtMoney(Number(value))} />
                    <Bar dataKey="amount" fill="#0B1D33" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="data-table">
                <thead><tr><th>Days past due</th><th className="text-right">Invoices</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {result.buckets.map((bucket) => (
                    <tr key={bucket.bucket}><td>{bucket.bucket}</td><td className="text-right">{bucket.count}</td><td className="text-right tabular-nums">{fmtMoney(bucket.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td><td className="text-right">{result.rows.length}</td><td className="text-right tabular-nums">{fmtMoney(result.total)}</td></tr></tfoot>
              </table>
            </div>
          </ImportedPanel>
          <ImportedPanel title={isAp ? "Vendor balances" : "Customer balances"}>
            <table className="data-table min-w-[640px]">
              <thead><tr><th>{isAp ? "Vendor" : "Tenant / customer"}</th><th>ID</th><th className="text-right">Open items</th><th className="text-right">Balance</th></tr></thead>
              <tbody>
                {byCounterparty.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name || master.find((record) => record.values[isAp ? "vendor_id" : "tenant_id"] === row.id)?.values[isAp ? "vendor_name" : "tenant_name"] || "—"}</td>
                    <td>{row.id}</td>
                    <td className="text-right">{row.count}</td>
                    <td className="text-right tabular-nums">{fmtMoney(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ImportedPanel>
          <ImportedPanel title={isAp ? "Vendor invoices" : "Customer receivables"}>
            <div className="max-h-96 overflow-auto">
              <table className="data-table min-w-[960px] text-xs">
                <thead className="sticky top-0">
                  <tr><th>Invoice</th><th>{isAp ? "Vendor" : "Customer"}</th><th>Entity</th><th>Property</th><th>Invoice date</th><th>Due date</th><th className="text-right">Amount</th><th className="text-right">Balance</th><th className="text-right">Days past due</th><th>Bucket</th></tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={`${row.id}-${row.counterpartyId}`}>
                      <td className="font-semibold">{row.id}</td>
                      <td>{row.counterparty}</td>
                      <td>{row.entity}</td>
                      <td>{row.property || "—"}</td>
                      <td>{row.invoiceDate}</td>
                      <td>{row.dueDate}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.amount)}</td>
                      <td className="text-right tabular-nums">{fmtMoney(row.balance)}</td>
                      <td className="text-right">{Math.max(row.daysPastDue, 0)}</td>
                      <td>{row.bucket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ImportedPanel>
        </>
      )}
    </RePage>
  );
}

export function ReAccountsPayablePage() {
  return <AgeingPage kind="accounts_payable" />;
}

export function ReAccountsReceivablePage() {
  return <AgeingPage kind="accounts_receivable" lead={<MeridianLedger />} />;
}

function MeridianLedger() {
  const { book } = useArBook();
  if (!book) return null;
  if (!book.invoices.some((invoice) => invoice.entityId === MERIDIAN_ENTITY)) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-emerald-700/30 bg-emerald-50/30 px-5 py-4 text-sm text-navy/70">
        <span><b className="text-navy">No Meridian Holdings LP invoices in the Real Estate AR ledger yet.</b> Tenants, leases, billing, and receipts for entity {MERIDIAN_ENTITY} are managed in Receivables.</span>
        <Link to="/estate/ar" className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-ivory">Open Receivables</Link>
      </div>
    );
  }
  return <EntityReceivables entityId={MERIDIAN_ENTITY} entityName={company} />;
}

export function ReTreasuryPage() {
  const { dataset, loading } = usePublished();
  if (loading) return null;
  const cash = cashSummary(dataset);
  return (
    <RePage page="Treasury" title="Treasury" subtitle="Bank account movements from validated cash transaction imports.">
      {!cash ? (
        <NotPublished what="cash transactions" category="cash_transactions" />
      ) : cash.byAccount.length === 0 ? (
        <Empty>No bank accounts in the published cash transactions.</Empty>
      ) : (
        <ImportedPanel title={`Net cash movement ${fmtMoney(cash.net)}`} subtitle={sourcesLine(dataset.cash_transactions ?? [])}>
          <table className="data-table min-w-[720px]">
            <thead><tr><th>Bank account</th><th className="text-right">Transactions</th><th className="text-right">Inflows</th><th className="text-right">Outflows</th><th className="text-right">Net</th></tr></thead>
            <tbody>
              {cash.byAccount.map((row) => (
                <tr key={row.account}><td className="font-semibold">{row.account}</td><td className="text-right">{row.count}</td><td className="text-right tabular-nums">{fmtMoney(row.inflow)}</td><td className="text-right tabular-nums">{fmtMoney(row.outflow)}</td><td className={`text-right tabular-nums ${row.net < 0 ? "!text-red-700" : ""}`}>{fmtMoney(row.net)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-navy/50">These are movements in the imported period, not bank balances. Opening balances need a bank balance or balance sheet import.</p>
        </ImportedPanel>
      )}
    </RePage>
  );
}
