import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { CheckCircle2 } from 'lucide-react';
import { balanceSheetRows, assetComposition, capitalStructure, workingCapitalTrend, type FinRow } from '@/estate/lib/demoData';

const rowStyles: Record<FinRow['type'], string> = {
  header: 'bg-navy text-white font-semibold text-xs uppercase tracking-wide',
  data: 'text-sm text-navy',
  subtotal: 'text-sm font-bold text-navy border-t border-border',
  total: 'text-sm font-bold text-navy-deep bg-gold/5 [border-left:3px_solid_#C79A2B]',
  grand: 'text-base font-bold text-navy-deep bg-gold/10 [border-left:3px_solid_#C79A2B]',
};

export function BalanceSheetTab() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Left — BS Table */}
      <div className="col-span-2 rounded-xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-navy">Consolidated Balance Sheet</h3>
            <p className="text-xs text-slate-label">As at 31 December 2024 · AED Millions</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
            <CheckCircle2 size={14} /> Balanced
          </span>
        </div>
        <div className="mt-4">
          <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Line Item</th>
                <th className="pb-2 text-right font-medium">FY 2024</th>
                <th className="pb-2 text-right font-medium">FY 2023</th>
                <th className="pb-2 text-right font-medium">Movement</th>
              </tr>
            </thead>
            <tbody>
              {balanceSheetRows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/30 ${rowStyles[row.type]} ${row.type === 'data' && i % 2 === 0 ? 'bg-ivory/40' : ''}`}
                >
                  <td className={`py-2 ${row.indent ? 'pl-6' : ''}`}>{row.label}</td>
                  <td className={`py-2 text-right ${row.negative ? 'text-red-600' : ''} ${row.type === 'header' ? '' : 'font-medium'}`}>{row.fy2024}</td>
                  <td className={`py-2 text-right text-slate-label ${row.negative ? 'text-red-600/70' : ''}`}>{row.fy2023}</td>
                  <td className={`py-2 text-right ${row.negative ? 'text-red-600' : 'text-green-700'}`}>{row.variance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-label">
          <CheckCircle2 size={13} className="text-green-600" /> Balance sheet balances — Total Assets = Total Equity + Liabilities
        </p>
      </div>

      {/* Right — Charts */}
      <div className="col-span-1 space-y-4">
        {/* Asset Composition */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Asset Composition</h3>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetComposition} dataKey="pct" nameKey="label" innerRadius={32} outerRadius={56} paddingAngle={2}>
                    {assetComposition.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {assetComposition.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 truncate text-slate-label">{s.label}</span>
                  <span className="font-medium text-navy">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capital Structure */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Capital Structure</h3>
          <div className="mt-3 flex h-8 overflow-hidden rounded-lg">
            {capitalStructure.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-center text-[10px] font-medium text-white"
                style={{ width: `${s.value}%`, background: s.color }}
              >
                {s.value}%
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {capitalStructure.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                <span className="text-slate-label">{s.label}</span>
                <span className="ml-auto font-medium text-navy">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Working Capital Trend */}
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Working Capital Trend</h3>
          <div className="mt-3 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={workingCapitalTrend} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Line type="monotone" dataKey="ca" name="Current Assets" stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive animationDuration={1000} />
                <Line type="monotone" dataKey="cl" name="Current Liab." stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Current Assets</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Current Liab.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
