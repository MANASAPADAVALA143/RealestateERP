import { useState } from "react";
import { ArrowUp, PlusCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  AllocationCard,
  BalanceTrend,
  Card,
  DemoButton,
  DonutChart,
  Kpi,
  Line,
  RePage,
  Toggle,
  YearSelect,
} from "@/realestate/ui";
import { balance, cashFlow, pnl, usd, usdSigned } from "@/realestate/data";

const tabs = ["Overview", "P&L", "BS", "CF"] as const;
type Tab = (typeof tabs)[number];

export function ReSnapshotPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  return (
    <RePage
      page="Financial Snapshot"
      title="Financial Snapshot"
      subtitle="Income, profitability, financial position and cash flow"
      right={
        <>
          <Toggle options={["Yearly", "Monthly"]} />
          <YearSelect />
          <DemoButton primary>Upload</DemoButton>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === item ? "bg-navy text-ivory" : "bg-white ring-1 ring-inset ring-navy/10"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <Overview onOpen={setTab} /> : null}
      {tab === "P&L" ? <PnlTab /> : null}
      {tab === "BS" ? <BalanceTab /> : null}
      {tab === "CF" ? <CashTab /> : null}
    </RePage>
  );
}

function Overview({ onOpen }: { onOpen: (tab: Tab) => void }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/50">Net income — FY2026 (YTD)</p>
          <p className="mt-2 font-serif text-4xl text-red-700">{usd(pnl.net)}</p>
          <p className="mt-2 text-sm text-navy/60">After $109,150 interest expense · -95.8% net margin</p>
        </article>
        <article className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.14em] text-navy/50">Equity position</p>
          <p className="mt-2 font-serif text-4xl text-blue-700">{usdSigned(balance.equity)}</p>
          <div className="mt-3 flex flex-wrap gap-5 text-sm">
            <span>Assets <b className="tabular-nums">{usd(balance.assets)}</b></span>
            <span>Liabilities <b className="tabular-nums">{usd(balance.liabilities)}</b></span>
            <span>Debt/Assets <b>{balance.debtToAssets}%</b></span>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Revenue" value={usd(pnl.revenue)} hint="Rental income" />
        <Kpi label="Total assets" value={usd(balance.assets)} />
        <Kpi label="Total liabilities" value={usd(balance.liabilities)} />
        <Kpi label="Ending cash" value={usd(balance.cash)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="P&L summary" right={<OpenLink onClick={() => onOpen("P&L")}>View P&L →</OpenLink>}>
          <dl className="space-y-2 text-sm">
            <Line label="Rental income" value={usd(pnl.revenue)} />
            <Line label="Operating expenses" value={usd(pnl.opex)} />
            <Line label="NOI (before int.)" value={usd(pnl.noi)} red />
            <Line label="Interest expense" value={usd(pnl.interest)} />
            <Line label="Net income" value={usd(pnl.net)} red bold />
            <Line label="Net margin" value={`${pnl.margin}%`} />
          </dl>
        </Card>
        <Card title="Balance sheet summary" right={<OpenLink onClick={() => onOpen("BS")}>View BS →</OpenLink>}>
          <dl className="space-y-2 text-sm">
            <Line label="Total assets" value={usd(balance.assets)} />
            <Line label="Current assets" value={usd(balance.currentAssets)} />
            <Line label="Non-current assets" value={usd(balance.nonCurrentAssets)} />
            <Line label="Total liabilities" value={usd(balance.liabilities)} />
            <Line label="Equity" value={usdSigned(balance.equity)} blue bold />
            <Line label="Debt/Assets" value={`${balance.debtToAssets}%`} />
          </dl>
        </Card>
        <Card title="Cash flow summary" right={<OpenLink onClick={() => onOpen("CF")}>View CF →</OpenLink>}>
          <dl className="space-y-2 text-sm">
            <Line label="Operating CF" value={usd(cashFlow.operating)} />
            <Line label="Investing CF" value={usd(cashFlow.investing)} />
            <Line label="Financing CF" value={usd(cashFlow.financing)} />
            <Line label="Net change" value={usd(cashFlow.net)} red bold />
          </dl>
          <p className="mt-3 text-xs text-navy/50">From uploaded CF statement</p>
        </Card>
      </section>
    </div>
  );
}

function PnlTab() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/60">
          Operating performance · Profitability · Cash movement · Expense mix
        </p>
        <span className="text-sm font-semibold text-blue-700">Upload financial statements →</span>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue & NOI trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "2026", Revenue: 0, NOI: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 1]} tickFormatter={() => "$0"} />
                <Bar dataKey="Revenue" fill="#2563EB" />
                <Bar dataKey="NOI" fill="#16A34A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-navy/50">Revenue $0 · NOI $0</p>
        </Card>
        <Card title="Profitability">
          <dl className="space-y-2 text-sm">
            <Line label="Revenue ↓" value="$0" blue />
            <Line label="Operating exp ↓" value="-$213.8K" />
            <Line label="NOI" value="-$213.8K" red />
            <Line label="Net income" value="-$104.6K" red bold />
          </dl>
        </Card>
        <Card title="Cash movement">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-emerald-700" /> Operating cash flow</span><b>+$0</b></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-emerald-700" /> Financing cash flow</span><b>+$0</b></li>
            <li className="flex items-center justify-between border-t border-navy/10 pt-3"><span className="flex items-center gap-2"><PlusCircle className="h-4 w-4 text-navy" /> Net cash change</span><b>+$0</b></li>
          </ul>
        </Card>
        <Card title="Expense mix">
          <DonutChart center="$213.8K" centerSub="Total" slices={[{ name: "Operating expenses", value: 213_832, color: "#1E3A8A", label: "$213.8K · 100%" }]} />
        </Card>
      </section>

      <Card title="Multi-year">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Net income</th>
                <th className="text-right">Total assets</th>
                <th className="text-right">Total liabilities</th>
                <th className="text-right">Equity</th>
                <th className="text-right">Operating CF</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026 (YTD)</td>
                <td className="text-right tabular-nums">{usd(pnl.revenue)}</td>
                <td className="text-right tabular-nums text-red-700">{usd(pnl.net)}</td>
                <td className="text-right tabular-nums">{usd(balance.assets)}</td>
                <td className="text-right tabular-nums">{usd(balance.liabilities)}</td>
                <td className="text-right tabular-nums text-blue-700">{usdSigned(balance.equity)}</td>
                <td className="text-right tabular-nums">{usd(cashFlow.operating)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-navy/50">1 period · sourced from uploaded statements</p>
      </Card>

      <BalanceTrend />
      <AllocationCard />
    </div>
  );
}

function BalanceTab() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="Balance sheet — 2026">
          <dl className="space-y-2 text-sm">
            <Line label="Current assets" value={usd(balance.currentAssets)} />
            <Line label="Non-current assets" value={usd(balance.nonCurrentAssets)} />
            <Line label="Total assets" value={usd(balance.assets)} bold />
            <Line label="Total liabilities" value={usd(balance.liabilities)} red />
            <Line label="Equity" value={usdSigned(balance.equity)} blue bold />
            <Line label="Debt/Assets" value={`${balance.debtToAssets}%`} />
            <Line label="D/E ratio" value={`${balance.deRatio}x`} />
          </dl>
        </Card>
        <Card title="Assets vs liabilities">
          <DonutChart
            center="$4,792,100"
            centerSub="Total assets"
            slices={[
              { name: "Equity", value: balance.equity, color: "#2563EB", label: usd(balance.equity) },
              { name: "Liabilities", value: balance.liabilities, color: "#0B1D33", label: usd(balance.liabilities) },
            ]}
          />
        </Card>
      </section>
      <BalanceTrend />
    </div>
  );
}

function CashTab() {
  return (
    <Card title="Cash flow — 2026">
      <dl className="max-w-xl space-y-2 text-sm">
        <Line label="Operating cash flow" value={usd(cashFlow.operating)} />
        <Line label="Investing cash flow" value={usd(cashFlow.investing)} />
        <Line label="Financing cash flow" value={usd(cashFlow.financing)} />
        <Line label="Net change in cash" value={usd(cashFlow.net)} red bold />
        <Line label="Ending cash" value={usd(balance.cash)} />
      </dl>
      <p className="mt-3 text-xs text-navy/50">From uploaded CF statement</p>
    </Card>
  );
}

function OpenLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-semibold text-blue-700 hover:underline">
      {children}
    </button>
  );
}
