import { useState } from "react";
import { useParams } from "react-router-dom";
import { ComboChart, Donut, GroupedBars, HBars, LineTrend } from "@/components/charts";
import { CompanyFrame, moneyClass } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { getBook, signedCr } from "@/lib/drillData";
import { BalanceTable } from "@/pages/CompanyDashboardPage";

const tabs = ["Overview", "P&L", "BS", "CF"] as const;

export function CompanySnapshotPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  if (!book) return <CompanyFrame entityId={entityId} page="Financial Snapshot"><p /></CompanyFrame>;
  return (
    <CompanyFrame entityId={entityId} page="Financial Snapshot">
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-navy/50">Net income FY2026 YTD</p>
          <p className={`mt-2 font-serif text-3xl ${moneyClass(book.netIncome)}`}>{signedCr(book.netIncome)}</p>
        </article>
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-navy/50">Equity position</p>
          <p className="mt-2 font-serif text-3xl text-emerald-700">{signedCr(book.entity.equity)}</p>
          <p className="mt-2 text-xs text-navy/60">
            Assets {inrCr(book.entity.assets)} | Liabilities {inrCr(book.entity.debt)} | Debt/Assets {book.debtToAssets.toFixed(1)}%
          </p>
        </article>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Revenue", inrCr(book.entity.revenue)],
          ["Total assets", inrCr(book.entity.assets)],
          ["Total liabilities", inrCr(book.entity.debt)],
          ["Ending cash", inrCr(book.entity.cash)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-navy/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-navy/50">{label}</p>
            <p className="mt-2 font-serif text-2xl text-navy">{value}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="space-y-6">
          <Panel title="Balance sheet ratios">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Ratio label="Current ratio" value={`${book.currentRatio.toFixed(2)}x`} bad={book.currentRatio < 1} />
              <Ratio label="Debt-to-equity" value={`${book.de.toFixed(2)}x`} bad={book.de > 2} />
              <Ratio label="LTV" value={`${book.ltv.toFixed(1)}%`} bad={book.ltv > 65} />
              <Ratio label="Working capital" value={signedCr(book.workingCapital)} bad={book.workingCapital < 0} />
              <Ratio label="Debt yield" value={`${book.debtYield.toFixed(1)}%`} bad={book.debtYield < 8} />
              <Ratio label="Blended cap rate" value={`${book.capRate.toFixed(1)}%`} bad={book.capRate < 4} />
            </div>
          </Panel>
          <Panel title="Assets = Liabilities + Equity">
            <div className="space-y-2">
              <Bar label={`Liabilities ${inrCr(book.entity.debt)}`} width={(book.entity.debt / book.entity.assets) * 100} color="#C79A2B" />
              <Bar label={`Equity ${inrCr(book.entity.equity)}`} width={(book.entity.equity / book.entity.assets) * 100} color="#0B1D33" />
            </div>
          </Panel>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Asset composition">
              <Donut slices={book.composition} />
              <ul className="mt-3 space-y-1 text-sm">
                {book.composition.map((slice) => (
                  <li key={slice.name} className="flex justify-between"><span>{slice.name}</span><span className="tabular-nums">{inrCr(slice.value)}</span></li>
                ))}
              </ul>
            </Panel>
            <Panel title="Capital structure over time" subtitle="Navy is equity. Gold is liabilities.">
              <GroupedBars
                rows={book.years.map((row) => ({
                  label: String(row.year),
                  a: row.equity,
                  b: row.liabilities,
                  aText: inrCr(row.equity),
                  bText: inrCr(row.liabilities),
                }))}
              />
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "P&L" ? (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Ratio label="Gross income" value={inrCr(book.entity.revenue)} />
            <Ratio label="Operating expenses" value={`-${inrCr(book.opex)}`} />
            <Ratio label="NOI" value={signedCr(book.noi)} bad={book.noi < 0} />
            <Ratio label="NOI margin" value={`${((book.noi / book.entity.revenue) * 100).toFixed(1)}%`} />
            <Ratio label="Interest expense" value={inrCr(book.interest)} />
            <Ratio label="Net income" value={signedCr(book.netIncome)} bad={book.netIncome < 0} />
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Income breakdown"><Donut slices={book.incomeMix} /></Panel>
            <Panel title="Expense breakdown"><Donut slices={book.expenseMix} /></Panel>
          </div>
          <Panel title="Top properties by revenue">
            <HBars rows={book.properties.map((row) => ({ label: row.property, value: row.market, text: row.rent }))} />
          </Panel>
          <Panel title="Revenue vs operating expenses">
            <ComboChart points={book.years.map((row) => ({ label: String(row.year), bar: row.revenue, line: row.opex }))} />
          </Panel>
          <Panel title="Net income trend">
            <LineTrend points={book.months.map((row) => ({ label: row.label, value: row.net }))} />
          </Panel>
        </div>
      ) : null}

      {tab === "BS" ? (
        <Panel title="Multi-year balance sheet" bleed>
          <BalanceTable years={book.years} />
        </Panel>
      ) : null}

      {tab === "CF" ? (
        <Panel title="Cash flow" bleed>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="text-right">Operating</th>
                  <th className="text-right">Investing</th>
                  <th className="text-right">Financing</th>
                </tr>
              </thead>
              <tbody>
                {book.years.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className={`text-right tabular-nums ${moneyClass(row.ocf)}`}>{signedCr(row.ocf)}</td>
                    <td className={`text-right tabular-nums ${moneyClass(row.icf)}`}>{signedCr(row.icf)}</td>
                    <td className={`text-right tabular-nums ${moneyClass(row.fcf)}`}>{signedCr(row.fcf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </CompanyFrame>
  );
}

function Ratio({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <article className="rounded-xl border border-navy/10 bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-navy/45">{label}</p>
      <p className={`mt-1 font-serif text-xl ${bad ? "text-red-700" : "text-navy"}`}>{value}</p>
    </article>
  );
}

function Bar({ label, width, color }: { label: string; width: number; color: string }) {
  return (
    <div>
      <p className="mb-1 text-sm">{label}</p>
      <div className="h-3 overflow-hidden rounded-full bg-navy/5">
        <div className="h-full rounded-full" style={{ width: `${Math.min(width, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
