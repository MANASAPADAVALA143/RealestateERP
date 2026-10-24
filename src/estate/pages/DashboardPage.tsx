import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Layers,
  TrendingUp,
  Banknote,
  ChevronDown,
} from 'lucide-react';
import { AppShell, Delta } from '@/estate/components/AppShell';
import { StatusBadge } from '@/estate/components/StatusBadge';
import { formatAED, formatAEDShort } from '@/estate/lib/format';
import {
  entities,
  type EntityBadge,
  commandCenterKpis,
  auditRows,
  projectProfitRows,
  cashFlowLines,
  netCashFlow,
  payablesAging,
  totalPayables,
} from '@/estate/lib/demoData';

const badgeStyles: Record<EntityBadge, string> = {
  Developer: 'bg-blue-50 text-[#2563EB] border-blue-200',
  SPV: 'bg-indigo-50 text-indigo-metric border-indigo-200',
  Fund: 'bg-gold/10 text-gold border-gold/30',
};

const kpiIcons = {
  building: Building2,
  layers: Layers,
  trending: TrendingUp,
  banknote: Banknote,
};

const alertLinks = [
  'Escrow reconciliation overdue',
  'IFRS 15 Q2 filing due in 7 days',
  'QPR deadline 15 Aug 2026',
];

export function DashboardPage() {
  const [selectedEntity, setSelectedEntity] = useState('e1');

  return (
    <AppShell>
      {/* Entity selector strip */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-6 py-3 overflow-x-auto scrollbar-hide">
        {entities.map((e) => {
          const selected = e.id === selectedEntity;
          return (
            <button
              key={e.id}
              onClick={() => setSelectedEntity(e.id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg border bg-white px-4 py-2.5 text-left transition ${
                selected
                  ? 'border-2 border-gold shadow-[0_2px_8px_rgba(199,154,43,0.25)]'
                  : 'border-border hover:border-gold/40'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-navy">{e.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeStyles[e.badge]}`}>
                    {e.badge}
                  </span>
                  <span className="text-xs font-semibold text-navy">{e.balance}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alert banner */}
      <div className="flex items-center justify-between bg-[#FFFBEB] border-l-4 border-gold px-6 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-alert" />
          <p className="text-sm text-navy">
            <span className="font-semibold">3 compliance items require attention</span> —{' '}
            {alertLinks.map((link, i) => (
              <span key={link}>
                <a href="#" className="font-medium text-gold transition hover:underline">{link}</a>
                {i < alertLinks.length - 1 && <span className="text-slate-label"> · </span>}
              </span>
            ))}
          </p>
        </div>
        <a href="#" className="shrink-0 text-[13px] font-medium text-gold transition hover:underline">View All →</a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-6">
        {commandCenterKpis.map((k) => {
          const Icon = kpiIcons[k.icon];
          return (
            <div key={k.label} className="relative rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="absolute right-5 top-5">
                <Icon size={20} className="text-gold" />
              </div>
              <p className="text-xs uppercase tracking-wide text-slate-label">{k.label}</p>
              <p className="mt-1.5 text-[28px] font-bold leading-tight text-navy-deep">{k.value}</p>
              <div className="mt-2">
                <Delta positive={k.positive}>{k.delta}</Delta>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid: 60/40 */}
      <div className="grid gap-5 px-6 pb-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Audit & Compliance Overview */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-navy-deep">Audit & Compliance Overview</h2>
              <a href="#" className="text-[13px] font-medium text-gold transition hover:underline">View All →</a>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-slate-label">
                  <th className="pb-2 font-medium">Audit Area</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due Date</th>
                  <th className="pb-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((r) => (
                  <tr key={r.area} className="border-b border-border transition last:border-0 hover:bg-ivory">
                    <td className="py-3 text-navy">{r.area}</td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3 text-slate-label">{r.due}</td>
                    <td className="py-3 text-slate-label">{r.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Projects by Profitability */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-navy-deep">Top Projects by Profitability</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-slate-label">
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 text-right font-medium">Total Revenue (AED)</th>
                  <th className="pb-2 text-right font-medium">Total Cost (AED)</th>
                  <th className="pb-2 text-right font-medium">Gross Profit (AED)</th>
                  <th className="pb-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {projectProfitRows.map((r) => (
                  <tr key={r.project} className="border-b border-border transition last:border-0 hover:bg-ivory">
                    <td className="py-3 text-navy">{r.project}</td>
                    <td className="py-3 text-right text-slate-label">{formatAED(r.revenue)}</td>
                    <td className="py-3 text-right text-slate-label">{formatAED(r.cost)}</td>
                    <td className="py-3 text-right font-medium text-navy">{formatAED(r.grossProfit)}</td>
                    <td className="py-3 text-right font-bold text-indigo-metric">{r.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Cash Flow Summary */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-navy-deep">Cash Flow Summary</h2>
              <button className="flex items-center gap-1 text-[13px] text-slate-label transition hover:text-navy">
                This Quarter <ChevronDown size={14} />
              </button>
            </div>
            <p className="text-[32px] font-bold leading-tight text-navy-deep">{formatAED(netCashFlow)}</p>
            <p className="mt-0.5 text-xs text-slate-label">Total Net Cash Flow</p>

            <div className="my-4 border-t border-border" />

            <div className="space-y-0">
              {cashFlowLines.map((c, i) => (
                <div
                  key={c.label}
                  className={`flex items-center justify-between py-2.5 ${
                    i < cashFlowLines.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span className="text-sm text-slate-label">{c.label}</span>
                  <span className={`text-sm font-semibold ${c.negative ? 'text-amber-alert' : 'text-indigo-metric'}`}>
                    {c.negative ? '(' : ''}{formatAED(Math.abs(c.amount))}{c.negative ? ')' : ''}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t-2 border-border pt-3">
                <span className="text-sm font-semibold text-navy-deep">Net Cash Flow</span>
                <span className="text-base font-bold text-navy-deep">{formatAED(netCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* Payables Aging */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-navy-deep">Payables Aging (AED)</h2>
            <div className="flex items-center gap-6">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payablesAging}
                      dataKey="amount"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {payablesAging.map((b) => (
                        <Cell key={b.label} fill={b.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-label">AED</span>
                  <span className="text-[22px] font-bold text-navy-deep">{formatAEDShort(totalPayables)}</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-2">
                {payablesAging.map((b) => (
                  <div key={b.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: b.color }} />
                      <span className="text-sm text-slate-label">{b.label}</span>
                    </div>
                    <span className="text-sm font-medium text-navy">{formatAED(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <a href="#" className="mt-3 flex items-center gap-1 text-[13px] font-medium text-gold transition hover:underline">
              View Aging Report <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between border-t border-border bg-white px-6 py-2.5 text-xs text-slate-label">
        <span>All amounts in AED · Last Updated: 12 May 2024 10:30 AM GST</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-active" /> Data is up to date
        </span>
      </div>
    </AppShell>
  );
}
