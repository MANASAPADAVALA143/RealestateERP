import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import { cashFlowRows, cashFlowWaterfall, freeCashFlowTrend, type CashFlowRow } from '@/lib/demoData';

const rowStyles: Record<CashFlowRow['type'], string> = {
  header: 'bg-navy text-white font-semibold text-xs uppercase tracking-wide',
  data: 'text-sm text-navy',
  subtotal: 'text-sm font-bold text-navy border-t border-border',
  total: 'text-sm font-bold text-navy-deep bg-gold/5 [border-left:3px_solid_#C79A2B]',
  grand: 'text-base font-bold text-navy-deep bg-gold/10 [border-left:3px_solid_#C79A2B]',
};

export function CashFlowTab() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Left — Cash Flow Statement */}
      <div className="col-span-2 rounded-xl border border-border bg-white p-5">
        <h3 className="text-base font-semibold text-navy">Consolidated Cash Flow Statement</h3>
        <p className="text-xs text-slate-label">FY 2024 · AED Millions · Indirect Method</p>
        <div className="mt-4">
          <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Line Item</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowRows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/30 ${rowStyles[row.type]} ${row.type === 'data' && i % 2 === 0 ? 'bg-ivory/40' : ''}`}
                >
                  <td className={`py-2 ${row.indent ? 'pl-6 text-slate-label' : ''}`}>{row.label}</td>
                  <td className={`py-2 text-right ${row.negative ? 'text-red-600' : 'font-medium'} ${row.label === 'Closing Cash Balance' ? 'text-navy-deep' : ''}`}>
                    {row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-label">
          <CheckCircle2 size={13} className="text-green-600" /> Closing cash of AED 586.7M agrees to Balance Sheet cash position
        </p>
      </div>

      {/* Right — Charts */}
      <div className="col-span-1 space-y-4">
        {/* Cash Flow Waterfall */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Cash Flow Waterfall</h3>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowWaterfall} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000}>
                  {cashFlowWaterfall.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Free Cash Flow Trend */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Free Cash Flow Trend</h3>
          <p className="text-[11px] text-slate-label">Operating CF minus Capex · AED Millions</p>
          <div className="mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freeCashFlowTrend} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Bar dataKey="fcf" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000}>
                  {freeCashFlowTrend.map((_, i) => (
                    <Cell key={i} fill="#C79A2B" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
