import { Crumb, useSort } from "@/components/drill";
import {
  bufferCr,
  cashPath,
  cashPositions,
  collectionPath,
  fmtCr,
  fmtLakh,
  fmtSignedCr,
  groupCash,
  pcsBreachWeek,
  upcomingPayments,
  weekLabels,
  type CashPosition,
  type UpcomingPayment,
} from "@/lib/commandData";

const categoryClass: Record<UpcomingPayment["category"], string> = {
  EMI: "bg-navy text-ivory",
  Vendor: "bg-amber-100 text-amber-900",
  Salary: "bg-emerald-100 text-emerald-800",
  Tax: "bg-red-100 text-red-800",
  Insurance: "bg-gold/20 text-navy",
};

export function CashWarRoomPage() {
  const positions = useSort(cashPositions);
  const payments = useSort(upcomingPayments);
  const paymentTotal = upcomingPayments.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6">
      <Crumb items={[{ label: "Group CFO", to: "/" }, { label: "Cash War Room" }]} />
      <div>
        <h2 className="font-serif text-3xl text-navy">Cash War Room</h2>
        <p className="mt-1 text-sm text-navy/60">90-day liquidity position across all entities</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available now" value="₹3.20 Cr" className="bg-navy text-white" />
        <Metric label="Committed payments (30d)" value="₹1.45 Cr" className="bg-red-700 text-white" />
        <Metric label="Expected collections (30d)" value="₹1.12 Cr" className="bg-emerald-700 text-white" />
        <Metric label="Projected buffer" value="₹2.87 Cr" className="bg-gold text-navy" />
      </section>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-4">
          <h3 className="font-serif text-xl text-navy">Entity cash positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th><button type="button" onClick={() => positions.toggle("id")}>Entity</button></th>
                <th className="text-right">Bank balance</th>
                <th className="text-right">Restricted</th>
                <th className="text-right">Available</th>
                <th className="text-right">Committed (30d)</th>
                <th className="text-right">Expected in (30d)</th>
                <th className="text-right">Net 30d</th>
                <th className="text-right">Min required</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.sorted.map((row) => (
                <CashRow key={row.id} row={row} />
              ))}
            </tbody>
            <tfoot>
              <CashRow row={groupCash} foot />
            </tfoot>
          </table>
        </div>
      </div>
      <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <h3 className="font-serif text-xl text-navy">90-day cash flow</h3>
        <p className="mt-1 text-sm text-navy/55">Weekly path from 20 Oct to 18 Jan. The red mark is the week PCS slips under its own buffer.</p>
        <CashChart />
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-navy/70">
          <li className="flex items-center gap-2"><span className="h-0.5 w-6 bg-navy" /> Projected cash</li>
          <li className="flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dashed border-red-600" /> Minimum buffer ₹1.75 Cr</li>
          <li className="flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dotted border-gold" /> Collections expected</li>
        </ul>
      </section>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/10 px-5 py-4">
          <h3 className="font-serif text-xl text-navy">Upcoming payments · next 30 days</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th><button type="button" onClick={() => payments.toggle("date")}>Date</button></th>
                <th>Description</th>
                <th>Entity</th>
                <th>Category</th>
                <th className="text-right"><button type="button" onClick={() => payments.toggle("amount")}>Amount</button></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.sorted.map((row) => (
                <tr key={`${row.date}-${row.description}`} className="even:bg-ivory/60">
                  <td>{row.date}</td>
                  <td className="font-medium">{row.description}</td>
                  <td>{row.entity}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryClass[row.category]}`}>{row.category}</span></td>
                  <td className="text-right tabular-nums">{fmtLakh(row.amount)}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="text-right tabular-nums">{fmtLakh(paymentTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashRow({ row, foot }: { row: CashPosition; foot?: boolean }) {
  const cells = (
    <>
      <td>{row.id}</td>
      <td className="text-right tabular-nums">{fmtCr(row.bank)}</td>
      <td className="text-right tabular-nums">{row.restricted === 0 ? "₹0" : fmtCr(row.restricted)}</td>
      <td className="text-right tabular-nums">{fmtCr(row.available)}</td>
      <td className="text-right tabular-nums">{fmtCr(row.committed)}</td>
      <td className="text-right tabular-nums">{fmtCr(row.incoming)}</td>
      <td className={`text-right tabular-nums ${row.net < 0 ? "text-red-700" : "text-emerald-700"}`}>{fmtSignedCr(row.net)}</td>
      <td className="text-right tabular-nums">{fmtCr(row.minimum)}</td>
      <td>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.status === "Safe" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {row.status === "Safe" ? "Safe" : "Watch"}
        </span>
      </td>
    </>
  );
  if (foot) return <tr>{cells}</tr>;
  return <tr className="even:bg-ivory/60">{cells}</tr>;
}

function Metric({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <article className={`rounded-2xl p-4 shadow-card ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </article>
  );
}

function CashChart() {
  const width = 760;
  const height = 280;
  const pad = { l: 48, r: 16, t: 16, b: 36 };
  const max = 3.6;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const x = (index: number) => pad.l + (index / (cashPath.length - 1)) * innerW;
  const y = (value: number) => pad.t + innerH - (value / max) * innerH;
  const line = (series: number[]) => series.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const bufferY = y(bufferCr);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label="Projected cash starts at 3.20 crore, dips to 2.10 crore in the first week of December, and recovers to 2.80 crore by 18 January. PCS is marked below its buffer on 1 December.">
      {[0, 1, 2, 3].map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={y(tick)} y2={y(tick)} stroke="#0B1D33" strokeOpacity="0.08" />
          <text x={8} y={y(tick) + 4} fontSize="10" fill="#0B1D33" opacity="0.55">{tick}</text>
        </g>
      ))}
      <line x1={pad.l} x2={width - pad.r} y1={bufferY} y2={bufferY} stroke="#DC2626" strokeDasharray="6 4" />
      <path d={line(collectionPath)} fill="none" stroke="#C79A2B" strokeWidth="2" strokeDasharray="2 4" />
      <path d={line(cashPath)} fill="none" stroke="#0B1D33" strokeWidth="2.5" />
      <circle cx={x(pcsBreachWeek)} cy={y(cashPath[pcsBreachWeek])} r="5" fill="#DC2626" />
      <text x={x(pcsBreachWeek) + 8} y={y(cashPath[pcsBreachWeek]) - 8} fontSize="11" fill="#DC2626">PCS below buffer</text>
      {weekLabels.map((label, index) => (
        index % 2 === 0 ? <text key={label} x={x(index)} y={height - 10} fontSize="10" textAnchor="middle" fill="#0B1D33" opacity="0.55">{label}</text> : null
      ))}
    </svg>
  );
}
