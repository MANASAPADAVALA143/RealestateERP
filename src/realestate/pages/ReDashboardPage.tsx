import { Link } from "react-router-dom";
import {
  AllocationCard,
  BalanceTrend,
  Card,
  CompanySelect,
  DonutChart,
  Kpi,
  Line,
  Mini,
  Progress,
  RePage,
  StatusPill,
  Toggle,
  YearSelect,
} from "@/realestate/ui";
import {
  balance,
  capital,
  cashGap30,
  company,
  loanBook,
  loans,
  monthlyDebtService,
  obligations,
  partners,
  pnl,
  portfolio,
  properties,
  usd,
  usdSigned,
} from "@/realestate/data";

export function ReDashboardPage() {
  const equityPct = (balance.equity / balance.assets) * 100;
  return (
    <RePage
      page="Company Dashboard"
      title="Good morning"
      subtitle={`Here\u2019s what\u2019s happening with ${company} today.`}
      right={
        <>
          <Toggle options={["Yearly", "Quarterly", "Monthly"]} />
          <YearSelect />
        </>
      }
    >
      <CompanySelect />

      <section className="grid gap-3 lg:grid-cols-3">
        <Kpi label="Total assets" value={usd(balance.assets)} hint="2 properties" />
        <Kpi label="Total liabilities" value={usd(balance.liabilities)} tone="blue" hint={<Link to="/gnanova/realestate/loans" className="font-semibold text-blue-700 hover:underline">2 loans</Link>} />
        <Kpi label="Net worth" value={usd(balance.equity)} tone="blue" hint={<>D/E ratio <b>{balance.deRatio.toFixed(2)}x</b> · Working cap <b>—</b></>} />
      </section>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">{equityPct.toFixed(1)}% equity</span>
          <span className="text-navy/60">${(balance.equity / 1e6).toFixed(2)}M of ${(balance.assets / 1e6).toFixed(2)}M total assets</span>
        </div>
        <Progress pct={equityPct} />
      </Card>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Cash" value={usd(balance.cash)} />
        <Kpi label="Loan balance" value={usd(loanBook.outstanding)} tone="blue" hint="2 active loans" />
        <Kpi label="Monthly debt service" value={usd(monthlyDebtService)} tone="blue" hint={loans.map((loan) => `${loan.code} ${usd(loan.monthly)}`).join(" · ")} />
        <Kpi
          label="30-day cash gap"
          value={usdSigned(cashGap30)}
          tone={cashGap30 >= 0 ? "green" : "red"}
          hint={`$${Math.round(balance.cash / 1000)}K cash vs $${Math.round(monthlyDebtService / 1000)}K due`}
        />
        <Kpi label="Capital calls" value={usd(capital.dashboardPending)} hint="69% funded · $164K of $236K called" />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Land cost" value={usd(portfolio.landCost)} hint="Total invested" />
        <Kpi label="Market value" value={usd(portfolio.marketValue)} hint={<span className="text-emerald-700">+105.4% vs cost</span>} />
        <Kpi label="Unrealized G/L" value={usdSigned(portfolio.unrealized)} tone="green" />
        <Kpi label="Equity value" value={usd(portfolio.equityValue)} hint="Market – Debt" />
      </section>

      <Card title="Upcoming financial obligations" right={<StatusPill text="2 loans" tone="grey" />}>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Mini label="Next 30 days" value={usd(obligations.d30)} />
          <Mini label="Next 60 days" value={usd(obligations.d60)} />
          <Mini label="Next 90 days" value={usd(obligations.d90)} />
          <Mini label="Net cash flow" value={usd(obligations.net)} red />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Maturity</th>
                <th>Due day</th>
                <th className="text-right">Payment</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="font-medium">{loan.lender} – {loan.code}</td>
                  <td>{loan.maturity}</td>
                  <td>{loan.dueDay}</td>
                  <td className="text-right tabular-nums">{usd(loan.monthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Assets vs liabilities">
          <DonutChart
            center={usd(balance.assets)}
            centerSub="Total"
            slices={[
              { name: "Assets", value: balance.assets, color: "#2563EB", label: `${Math.round((balance.assets / (balance.assets + balance.liabilities)) * 100)}%` },
              { name: "Liabilities", value: balance.liabilities, color: "#0B1D33", label: `${Math.round((balance.liabilities / (balance.assets + balance.liabilities)) * 100)}%` },
            ]}
          />
        </Card>
        <Card title="Revenue & profitability">
          <dl className="space-y-3 text-sm">
            <Line label="Revenue" value={usd(pnl.revenue)} />
            <Line label="Operating expenses" value={usd(pnl.opex)} />
            <Line label="Net" value={usd(pnl.net)} red bold />
          </dl>
        </Card>
        <Card title="Cash flow">
          <dl className="space-y-3 text-sm">
            <Line label="Operating cash flow" value="-$44,632" />
            <Line label="Investing cash flow" value="-$20,147" />
            <Line label="Financing cash flow" value="-$200,972" />
            <Line label="Net change" value="-$265,752" red bold />
          </dl>
        </Card>
      </section>

      <Card title="Capital management">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Mini label="Capital invested" value={usd(portfolio.landCost)} />
          <Mini label="Investment value" value={usd(portfolio.marketValue)} />
          <Mini label="Returns" value="+$20,964,811 (105.4%)" green />
          <Mini label="Ownership" value="2 partners" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Property</th>
                <th className="text-right">Share</th>
                <th className="text-right">Invested</th>
                <th className="text-right">Value</th>
                <th className="text-right">Gain</th>
                <th className="text-right">ROI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((row) => (
                <tr key={row.name}>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.property}</td>
                  <td className="text-right tabular-nums">{row.share.toFixed(1)}%</td>
                  <td className="text-right tabular-nums">{usd(row.invested)}</td>
                  <td className="text-right tabular-nums">{usd(row.value)}</td>
                  <td className="text-right tabular-nums !text-emerald-700">{usdSigned(row.gain)}</td>
                  <td className="text-right tabular-nums">{row.roi.toFixed(1)}%</td>
                  <td><StatusPill text="Active" tone="green" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Property performance" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Property</th>
                  <th className="text-right">Cost</th>
                  <th className="text-right">Market</th>
                  <th className="text-right">Gain</th>
                  <th className="text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {[...properties].reverse().map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.shortName}</td>
                    <td className="text-right tabular-nums">{usd(row.cost)}</td>
                    <td className="text-right tabular-nums">{usd(row.market)}</td>
                    <td className="text-right tabular-nums !text-emerald-700">{usdSigned(row.gain)}</td>
                    <td className="text-right tabular-nums !text-emerald-700">+{row.roi.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Insurance & risk">
          <dl className="space-y-3 text-sm">
            <Line label="Annual premium" value="$16,350" />
            <Line label="Policies" value="4" />
            <Line label="Expiring soon" value="0" />
          </dl>
          <Link to="/gnanova/realestate/insurance" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">Open insurance →</Link>
        </Card>
      </section>

      <BalanceTrend />
      <AllocationCard />
    </RePage>
  );
}