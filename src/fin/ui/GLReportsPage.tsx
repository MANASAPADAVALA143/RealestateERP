import { useState } from "react";
import { usePeriods, useTrialBalance, usePnL, useBalanceSheet } from "../hooks.ts";
import { LoadingSpinner, inr, AmountCell, SectionCard } from "./shared.tsx";

// ─── Shared period selector ───────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: periods } = usePeriods();
  return (
    <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All Periods (YTD)</option>
      {(periods ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
    </select>
  );
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export function TrialBalancePage() {
  const [periodId, setPeriodId] = useState("");
  const { data: lines, loading } = useTrialBalance(periodId || undefined);

  const totalOpeningDebit = lines?.reduce((s, l) => s + l.openingDebit, 0) ?? 0;
  const totalOpeningCredit = lines?.reduce((s, l) => s + l.openingCredit, 0) ?? 0;
  const totalPeriodDebit = lines?.reduce((s, l) => s + l.periodDebit, 0) ?? 0;
  const totalPeriodCredit = lines?.reduce((s, l) => s + l.periodCredit, 0) ?? 0;
  const totalClosingDebit = lines?.reduce((s, l) => s + l.closingDebit, 0) ?? 0;
  const totalClosingCredit = lines?.reduce((s, l) => s + l.closingCredit, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#0A1628]">Trial Balance</h2>
        <PeriodSelector value={periodId} onChange={setPeriodId} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">Account</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy/50 text-right" colSpan={2}>Opening Balance</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy/50 text-right" colSpan={2}>Period Movement</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-navy/50 text-right" colSpan={2}>Closing Balance</th>
                </tr>
                <tr className="border-b border-navy/10">
                  <th className="px-4 pb-2 text-left text-xs text-navy/40"></th>
                  {["Dr", "Cr", "Dr", "Cr", "Dr", "Cr"].map((h, i) => <th key={i} className="px-4 pb-2 text-right text-xs text-navy/40">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {(lines ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-navy/40">No transactions posted yet. Create and post journal entries to see the trial balance.</td></tr>
                ) : (lines ?? []).map((l) => (
                  <tr key={l.accountCode} className="hover:bg-[#F8F6F0]/60">
                    <td className="px-4 py-2 text-xs">
                      <span className="font-mono text-navy/50">{l.accountCode}</span>
                      <span className="ml-2 text-navy">{l.accountName}</span>
                      <span className="ml-1 text-xs text-navy/30">({l.type})</span>
                    </td>
                    <td className="px-4 py-2 text-right"><AmountCell amount={l.openingDebit} /></td>
                    <td className="px-4 py-2 text-right"><AmountCell amount={l.openingCredit} credit /></td>
                    <td className="px-4 py-2 text-right"><AmountCell amount={l.periodDebit} /></td>
                    <td className="px-4 py-2 text-right"><AmountCell amount={l.periodCredit} credit /></td>
                    <td className="px-4 py-2 text-right font-semibold"><AmountCell amount={l.closingDebit} /></td>
                    <td className="px-4 py-2 text-right font-semibold"><AmountCell amount={l.closingCredit} credit /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-navy/20">
                <tr className="font-bold">
                  <td className="px-4 py-3 text-sm text-navy">Total</td>
                  <td className="px-4 py-3 text-right text-navy">{inr(totalOpeningDebit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{inr(totalOpeningCredit)}</td>
                  <td className="px-4 py-3 text-right text-navy">{inr(totalPeriodDebit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{inr(totalPeriodCredit)}</td>
                  <td className="px-4 py-3 text-right text-navy">{inr(totalClosingDebit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{inr(totalClosingCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── P&L ──────────────────────────────────────────────────────────────────────

export function PnLPage() {
  const { data: periods } = usePeriods();
  const [fromPeriodId, setFromPeriodId] = useState("");
  const [toPeriodId, setToPeriodId] = useState("");

  const fromDate = fromPeriodId ? periods?.find((p) => p.id === fromPeriodId)?.startDate : undefined;
  const toDate = toPeriodId ? periods?.find((p) => p.id === toPeriodId)?.endDate : undefined;

  const { data: pnl, loading } = usePnL(fromDate, toDate);

  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-serif text-2xl text-[#0A1628]">Profit & Loss Statement</h2>
        <div className="flex gap-3">
          <div>
            <label className="block text-xs text-navy/50 mb-1">From Period</label>
            <PeriodSelector value={fromPeriodId} onChange={setFromPeriodId} />
          </div>
          <div>
            <label className="block text-xs text-navy/50 mb-1">To Period</label>
            <PeriodSelector value={toPeriodId} onChange={setToPeriodId} />
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !pnl ? null : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Revenue */}
          <SectionCard title="Revenue">
            {pnl.revenue.length === 0 ? <p className="text-sm text-navy/40">No revenue transactions posted.</p> : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-navy/5">
                  {pnl.revenue.map((l) => (
                    <tr key={l.accountCode}>
                      <td className="py-2 text-navy">{l.accountName}</td>
                      <td className="py-2 text-right font-semibold text-emerald-700">{inr(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-navy/10 font-bold">
                    <td className="pt-3 text-sm text-navy">Total Revenue</td>
                    <td className="pt-3 text-right text-emerald-700">{inr(pnl.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </SectionCard>

          {/* Expenses */}
          <SectionCard title="Expenses">
            {pnl.expenses.length === 0 ? <p className="text-sm text-navy/40">No expense transactions posted.</p> : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-navy/5">
                  {pnl.expenses.map((l) => (
                    <tr key={l.accountCode}>
                      <td className="py-2 text-navy">{l.accountName}</td>
                      <td className="py-2 text-right font-semibold text-red-700">{inr(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-navy/10 font-bold">
                    <td className="pt-3 text-sm text-navy">Total Expenses</td>
                    <td className="pt-3 text-right text-red-700">{inr(pnl.totalExpenses)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </SectionCard>

          {/* Net Income */}
          <div className="lg:col-span-2">
            <div className={`rounded-2xl p-6 text-center ${pnl.netIncome >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <p className="text-sm font-semibold text-navy/60 mb-1">Net Income</p>
              <p className={`text-4xl font-bold ${pnl.netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}>{inr(Math.abs(pnl.netIncome))}</p>
              {pnl.netIncome < 0 && <p className="text-sm text-red-600 mt-1">Net Loss</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export function BalanceSheetPage() {
  const { data: periods } = usePeriods();
  const [asOfPeriodId, setAsOfPeriodId] = useState("");
  const asOfDate = asOfPeriodId ? periods?.find((p) => p.id === asOfPeriodId)?.endDate : undefined;
  const { data: bs, loading } = useBalanceSheet(asOfDate);

  function BSSection({ title, lines, total, colorClass }: { title: string; lines: { accountCode: string; accountName: string; balance: number }[]; total: number; colorClass: string }) {
    return (
      <SectionCard title={title}>
        {lines.length === 0 ? <p className="text-sm text-navy/40">No balances.</p> : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-navy/5">
              {lines.map((l) => (
                <tr key={l.accountCode}>
                  <td className="py-2 text-xs font-mono text-navy/40">{l.accountCode}</td>
                  <td className="py-2 text-navy">{l.accountName}</td>
                  <td className={`py-2 text-right font-semibold ${colorClass}`}>{inr(l.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-navy/10 font-bold">
                <td colSpan={2} className="pt-3 text-sm text-navy">Total {title}</td>
                <td className={`pt-3 text-right ${colorClass}`}>{inr(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#0A1628]">Balance Sheet</h2>
        <div>
          <label className="block text-xs text-navy/50 mb-1">As of Period</label>
          <PeriodSelector value={asOfPeriodId} onChange={setAsOfPeriodId} />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !bs ? null : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <BSSection title="Assets" lines={bs.assets} total={bs.totalAssets} colorClass="text-navy" />
            <div className="space-y-5">
              <BSSection title="Liabilities" lines={bs.liabilities} total={bs.totalLiabilities} colorClass="text-red-700" />
              <BSSection title="Equity" lines={bs.equity} total={bs.totalEquity} colorClass="text-emerald-700" />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-white p-6">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-navy">Total Assets</span>
              <span className="font-bold text-navy">{inr(bs.totalAssets)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="font-semibold text-navy/70">Total Liabilities + Equity</span>
              <span className={`font-bold ${Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity)) < 1 ? "text-emerald-700" : "text-red-600"}`}>{inr(bs.totalLiabilities + bs.totalEquity)}</span>
            </div>
            {Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity)) >= 1 && (
              <p className="mt-2 text-xs text-red-500">⚠ Balance sheet does not balance — check opening balances and journal entries.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
