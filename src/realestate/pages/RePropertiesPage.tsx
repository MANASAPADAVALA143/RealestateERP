import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSort } from "@/components/drill";
import { Card, DemoButton, DonutChart, Kpi, Progress, RePage } from "@/realestate/ui";
import { company, debt, portfolio, properties, usd, usdSigned } from "@/realestate/data";

const chartData = [
  { name: "AUSTIN BLVD", "Land cost": 19.7, Book: 28, Market: 40 },
  { name: "Meridian Blvd", "Land cost": 0.189, Book: 0.821, Market: 0.85 },
];

export function RePropertiesPage() {
  const perf = useSort(properties);
  return (
    <RePage
      page="Properties"
      title="Properties Overview"
      subtitle={`Land / property portfolio for ${company}`}
      right={
        <>
          <select className="rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm">
            <option>All Properties</option>
            {properties.map((row) => (
              <option key={row.id}>{row.shortName}</option>
            ))}
          </select>
          <DemoButton primary>Export Report</DemoButton>
        </>
      }
    >
      <section className="grid gap-3 lg:grid-cols-2">
        <Kpi label="Property-linked debt" value={usd(debt.propertyAllocated)} hint={`${debt.propertyRepaidPct}% repaid · $26,888 of $800,000`}>
          <Progress pct={debt.propertyRepaidPct} />
        </Kpi>
        <article className="grid grid-cols-3 gap-3 rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
          <Stat label="Unrealized gain" value={usdSigned(portfolio.unrealized)} className="text-emerald-700" />
          <Stat label="Equity value" value={usd(portfolio.propertyEquityValue)} />
          <Stat label="LTV" value={`${debt.ltv}%`} className="text-blue-700" hint="Healthy leverage" />
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Total properties" value="2" />
        <Kpi label="Land cost" value={usd(portfolio.landCost)} />
        <Kpi label="Book value" value={usd(portfolio.bookValue)} hint={<span className="text-emerald-700">+45.0%</span>} />
        <Kpi label="Market value" value={usd(portfolio.marketValue)} hint={<span className="text-emerald-700">+105.4%</span>} />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Entity debt" value={usd(debt.entity)} />
        <Kpi label="Property-allocated debt" value={usd(debt.propertyAllocated)} />
        <Kpi label="Unallocated entity debt" value={usd(debt.unallocated)} />
        <Kpi label="Monthly EMI" value={usd(debt.monthlyEmi)} />
        <Kpi label="Annual debt service" value={usd(debt.annualService)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Property value comparison">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value: number) => `$${value}M`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `$${value}M`} />
                <Legend />
                <Bar dataKey="Land cost" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Book" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Market" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-navy/50">AUSTIN BLVD $19.7M / $28M / $40M · Meridian Blvd $189K / $821K / $850K</p>
        </Card>
        <Card title="Debt vs equity">
          <DonutChart
            center="$40.85M"
            centerSub="Total"
            slices={[
              { name: "Equity", value: 98, color: "#0B1D33", label: "98%" },
              { name: "Debt", value: 2, color: "#2563EB", label: "2%" },
            ]}
          />
          <p className="mt-4 text-sm font-semibold text-emerald-700">Portfolio LTV 1.9% — Healthy leverage</p>
        </Card>
      </section>

      <Card title="Properties & ownership">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Property</th>
                <th>Partner</th>
                <th>Type</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {[...properties].reverse().map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.partner}</td>
                  <td>Property</td>
                  <td className="text-right tabular-nums">{row.share % 1 === 0 ? row.share.toFixed(0) : row.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Property performance" right={<span className="text-xs text-navy/50">Click a heading to sort</span>}>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1080px]">
            <thead>
              <tr>
                <SortTh label="Property" onClick={() => perf.toggle("shortName")} />
                <th>Partners</th>
                <SortTh label="Cost" right onClick={() => perf.toggle("cost")} />
                <SortTh label="Book value" right onClick={() => perf.toggle("book")} />
                <SortTh label="Market value" right onClick={() => perf.toggle("market")} />
                <SortTh label="Unrealized gain" right onClick={() => perf.toggle("gain")} />
                <SortTh label="ROI" right onClick={() => perf.toggle("roi")} />
                <th className="text-right">Debt</th>
                <th className="text-right">EMI</th>
              </tr>
            </thead>
            <tbody>
              {perf.sorted.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.shortName}</td>
                  <td>{row.partners} partner</td>
                  <td className="text-right tabular-nums">{usd(row.cost)}</td>
                  <td className="text-right tabular-nums">{usd(row.book)}</td>
                  <td className="text-right tabular-nums">{usd(row.market)}</td>
                  <td className="text-right tabular-nums text-emerald-700">{usdSigned(row.gain)}</td>
                  <td className="text-right tabular-nums">{row.roi.toFixed(1)}%</td>
                  <td className="text-right tabular-nums">{row.debt ? usd(row.debt) : "—"}</td>
                  <td className="text-right tabular-nums">{row.emi ? `${usd(row.emi)}/mo` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </RePage>
  );
}

function Stat({ label, value, className = "text-navy", hint }: { label: string; value: string; className?: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-navy/50">{label}</p>
      <p className={`mt-2 font-serif text-xl ${className}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-emerald-700">{hint}</p> : null}
    </div>
  );
}

function SortTh({ label, onClick, right }: { label: string; onClick: () => void; right?: boolean }) {
  return (
    <th className={right ? "text-right" : undefined}>
      <button type="button" onClick={onClick} className="uppercase tracking-[0.14em]">{label} ↕</button>
    </th>
  );
}
