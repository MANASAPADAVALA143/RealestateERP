import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ComboChart, Donut } from "@/components/charts";
import { Attention, CompanyFrame, moneyClass } from "@/components/drill";
import { KpiCard, Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { entityLoans, getBook, signedCr } from "@/lib/drillData";

export function CompanyDashboardPage() {
  const { entityId = "" } = useParams();
  const book = getBook(entityId);
  const [annual, setAnnual] = useState(true);
  if (!book) return <CompanyFrame entityId={entityId} page="Company Dashboard"><p /></CompanyFrame>;
  const points = annual
    ? book.years.map((row) => ({ label: String(row.year), bar: row.revenue, line: row.noi }))
    : book.quarters.map((row) => ({ label: row.label, bar: row.revenue, line: row.noi }));
  const loans = entityLoans(book.entity.id);
  const missing = book.properties.filter((row) => row.market <= 0).map((row) => row.property);

  return (
    <CompanyFrame entityId={entityId} page="Company Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy">CFO Financial Analysis</p>
        <div className="flex gap-2 text-xs font-semibold">
          {["Operating Performance", "Profitability", "Cash Movement", "Expense Mix"].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, "-")}`} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-inset ring-navy/10">
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Revenue and NOI trend" subtitle="Navy bars are revenue. The gold line is NOI.">
          <div id="operating-performance" className="mb-3 flex gap-2">
            <button type="button" onClick={() => setAnnual(true)} className={`rounded-full px-3 py-1 text-xs font-semibold ${annual ? "bg-navy text-ivory" : "bg-navy/5"}`}>Annual</button>
            <button type="button" onClick={() => setAnnual(false)} className={`rounded-full px-3 py-1 text-xs font-semibold ${annual ? "bg-navy/5" : "bg-navy text-ivory"}`}>Quarterly</button>
          </div>
          <ComboChart points={points} />
        </Panel>
        <Panel title="Profitability">
          <div id="profitability" className="space-y-3 text-sm">
            <Row label="Revenue" value={inrCr(book.entity.revenue)} />
            <Row label="Operating expenses" value={`-${inrCr(book.opex)}`} />
            <Row label="NOI" value={signedCr(book.noi)} className={moneyClass(book.noi)} />
            <Row label="Net income" value={signedCr(book.netIncome)} className={moneyClass(book.netIncome)} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Cash movement">
          <div id="cash-movement" className="space-y-3 text-sm">
            <Row label="Operating cash flow" value={signedCr(book.ocf)} className={moneyClass(book.ocf)} />
            <Row label="Financing cash flow" value={signedCr(book.financing)} className={moneyClass(book.financing)} />
            <Row label="Net cash change" value={signedCr(book.netCash)} className={moneyClass(book.netCash)} />
          </div>
        </Panel>
        <Panel title="Expense mix">
          <div id="expense-mix">
            <Donut slices={book.expenseMix} />
            <ul className="mt-3 space-y-1 text-sm">
              {book.expenseMix.map((slice) => (
                <li key={slice.name} className="flex justify-between"><span>{slice.name}</span><span className="tabular-nums">{inrCr(slice.value)}</span></li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel title="Loans and notes" subtitle={`${loans.length} facilities on this entity`}>
        <Link to={`/companies/${book.entity.id}/loans`} className="text-sm font-semibold text-navy underline-offset-2 hover:underline">
          View all loans
        </Link>
      </Panel>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Capital invested" value={inrCr(book.capitalInvested)} hint="Cost basis of the property rows" />
        <KpiCard label="Investment value" value={inrCr(book.investmentValue)} hint="Market value of the same rows" accent="gold" />
        <KpiCard label="Investment returns" value={signedCr(book.investmentReturn)} hint="Market minus cost" />
        <KpiCard label="Ownership" value={String(book.partners.length)} hint="Partner records on this entity" />
      </section>

      <Panel title="Property performance" bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Property</th>
                <th className="text-right">Land cost</th>
                <th className="text-right">Market value</th>
                <th className="text-right">Unrealized G/L</th>
                <th className="text-right">ROI</th>
                <th className="text-right">Units</th>
                <th className="text-right">Occupancy</th>
                <th className="text-right">Monthly rent</th>
              </tr>
            </thead>
            <tbody>
              {book.properties.map((row) => (
                <tr key={row.property}>
                  <td className="font-medium">{row.property}</td>
                  <td className="text-right tabular-nums">{inrCr(row.landCost)}</td>
                  <td className="text-right tabular-nums">{inrCr(row.market)}</td>
                  <td className={`text-right tabular-nums ${moneyClass(row.gl)}`}>{signedCr(row.gl)}</td>
                  <td className="text-right tabular-nums">{row.roi.toFixed(1)}%</td>
                  <td className="text-right tabular-nums">{row.units}</td>
                  <td className="text-right tabular-nums">{row.occupancy.toFixed(1)}%</td>
                  <td className="text-right">{row.rent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Accounts receivable"><p className="text-sm text-navy/60">Upload balance sheet to see data</p></Panel>
        <Panel title="Accounts payable"><p className="text-sm text-navy/60">Upload balance sheet to see data</p></Panel>
      </div>

      <Panel title="Multi-year balance sheet trends" bleed>
        <BalanceTable years={book.years} />
      </Panel>

      <Panel title="Needs attention">
        <Attention
          items={[
            book.lowCash ? { text: "Cash cover is thin against current liabilities", value: inrCr(book.entity.cash) } : { text: "Cash ratio is inside the watch band" },
            ...(missing.length ? [{ text: `Missing market value: ${missing.join(", ")}` }] : []),
            book.netIncome < 0 ? { text: "Net income is negative after interest", value: signedCr(book.netIncome) } : { text: "Net income covers the interest line" },
          ]}
        />
      </Panel>
    </CompanyFrame>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-navy/60">{label}</span>
      <span className={`font-semibold tabular-nums ${className}`}>{value}</span>
    </p>
  );
}

export function BalanceTable({ years }: { years: { year: number; assets: number; liabilities: number; equity: number; bank: number; currentAssets: number; currentLiabilities: number; currentRatio: number; de: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[980px]">
        <thead>
          <tr>
            <th>Year</th>
            <th className="text-right">Total assets</th>
            <th className="text-right">Total liabilities</th>
            <th className="text-right">Equity</th>
            <th className="text-right">Bank</th>
            <th className="text-right">Current assets</th>
            <th className="text-right">Current liabilities</th>
            <th className="text-right">Current ratio</th>
            <th className="text-right">D/E</th>
          </tr>
        </thead>
        <tbody>
          {years.map((row) => (
            <tr key={row.year}>
              <td className="font-semibold">{row.year}</td>
              <td className="text-right tabular-nums">{inrCr(row.assets)}</td>
              <td className="text-right tabular-nums">{inrCr(row.liabilities)}</td>
              <td className="text-right tabular-nums">{inrCr(row.equity)}</td>
              <td className="text-right tabular-nums">{inrCr(row.bank)}</td>
              <td className="text-right tabular-nums">{inrCr(row.currentAssets)}</td>
              <td className="text-right tabular-nums">{inrCr(row.currentLiabilities)}</td>
              <td className={`text-right tabular-nums ${row.currentRatio < 1 ? "text-red-700" : ""}`}>{row.currentRatio.toFixed(2)}x</td>
              <td className={`text-right tabular-nums ${row.de > 2 ? "text-red-700" : ""}`}>{row.de.toFixed(2)}x</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
