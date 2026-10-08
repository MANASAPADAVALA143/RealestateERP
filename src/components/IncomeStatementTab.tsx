import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { incomeStatementRows, revenueBridge, marginTrend, revenueMix, type FinRow } from '@/lib/demoData';

const rowStyles: Record<FinRow['type'], string> = {
  header: 'bg-navy text-white font-semibold text-xs uppercase tracking-wide',
  data: 'text-sm text-navy',
  subtotal: 'text-sm font-bold text-navy border-t border-border',
  total: 'text-sm font-bold text-navy-deep bg-gold/5 [border-left:3px_solid_#C79A2B]',
  grand: 'text-base font-bold text-navy-deep bg-gold/10 [border-left:3px_solid_#C79A2B]',
};

function FinTable({ rows }: { rows: FinRow[] }) {
  return (
    <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <thead>
        <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
          <th className="pb-2 font-medium">Line Item</th>
          <th className="pb-2 text-right font-medium">FY 2024</th>
          <th className="pb-2 text-right font-medium">FY 2023</th>
          <th className="pb-2 text-right font-medium">Variance</th>
          <th className="pb-2 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className={`border-b border-border/30 ${rowStyles[row.type]} ${row.type === 'data' && i % 2 === 0 ? 'bg-ivory/40' : ''}`}
          >
            <td className={`py-2 ${row.indent ? 'pl-6 text-slate-label' : ''} ${row.type === 'data' && !row.indent ? 'text-navy' : ''}`}>
              {row.label}
            </td>
            <td className={`py-2 text-right ${row.negative ? 'text-red-600' : ''} ${row.type === 'header' ? '' : 'font-medium'}`}>
              {row.fy2024}
            </td>
            <td className={`py-2 text-right text-slate-label ${row.negative ? 'text-red-600/70' : ''}`}>
              {row.fy2023}
            </td>
            <td className={`py-2 text-right ${row.negative ? 'text-red-600' : 'text-green-700'}`}>
              {row.variance}
            </td>
            <td className="py-2 text-right text-slate-label">{row.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function IncomeStatementTab() {
  const bridgeData = revenueBridge.map((s, i) => ({
    ...s,
    cumulative: i === 0 ? s.value : i === revenueBridge.length - 1 ? s.value : undefined,
  }));

  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Left — P&L Table */}
      <div className="col-span-2 rounded-xl border border-border bg-white p-5">
        <h3 className="text-base font-semibold text-navy">Consolidated Income Statement</h3>
        <p className="text-xs text-slate-label">All entities · FY 2024 · AED Millions</p>
        <div className="mt-4">
          <FinTable rows={incomeStatementRows} />
        </div>
        <p className="mt-4 text-[11px] italic text-slate-label">
          Revenue recognised per IFRS 15 percentage-of-completion method. IFRS 16 lease liabilities reflected in finance costs.
        </p>
      </div>

      {/* Right — Charts */}
      <div className="col-span-1 space-y-4">
        {/* Revenue Bridge */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Revenue Bridge FY2023 → FY2024</h3>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBridge} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={80} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={1000}>
                  {revenueBridge.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Margin Trend */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Margin Trend — Quarterly</h3>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marginTrend} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} domain={[5, 45]} />
                <Line type="monotone" dataKey="gross" name="Gross Margin" stroke="#C79A2B" strokeWidth={2} dot={false} isAnimationActive animationDuration={1200} />
                <Line type="monotone" dataKey="ebitda" name="EBITDA Margin" stroke="#0B1D33" strokeWidth={2} dot={false} isAnimationActive animationDuration={1200} />
                <Line type="monotone" dataKey="net" name="Net Margin" stroke="#94A3B8" strokeWidth={2} dot={false} isAnimationActive animationDuration={1200} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold" /> Gross</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-navy" /> EBITDA</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Net</span>
          </div>
        </div>

        {/* Revenue Mix Donut */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Revenue Mix by Entity</h3>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueMix} dataKey="pct" nameKey="label" innerRadius={32} outerRadius={56} paddingAngle={2}>
                    {revenueMix.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {revenueMix.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 text-slate-label">{s.label}</span>
                  <span className="font-medium text-navy">{s.pct}%</span>
                  <span className="text-slate-label">AED {s.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
