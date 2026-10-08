import { Play, Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { formatAED } from '@/lib/format';
import { ifrs15Kpis, ifrs15Rows, ifrs16Kpis, ifrs16Rows } from '@/lib/demoData';

export function IfrsHubPage() {
  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-2">
        {/* IFRS 15 Panel */}
        <div className="rounded-xl border border-border bg-white p-6 [border-top:3px_solid_#C79A2B]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-navy">Off-plan Revenue Recognition</h2>
              <p className="text-xs text-slate-label">IFRS 15 — Percentage of Completion</p>
            </div>
            <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-medium text-gold">IFRS 15</span>
          </div>

          {/* KPIs */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {ifrs15Kpis.map((k) => (
              <div key={k.label} className="rounded-lg bg-ivory p-3">
                <p className="text-[11px] text-slate-label">{k.label}</p>
                <p className="mt-0.5 text-sm font-bold text-navy-deep">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-label">Recognised YTD</span>
              <span className="font-medium text-gold">25%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ivory">
              <div className="h-full rounded-full bg-gold" style={{ width: '25%' }} />
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-label">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 text-right font-medium">SPAs</th>
                <th className="pb-2 text-right font-medium">POB %</th>
                <th className="pb-2 text-right font-medium">Recognised</th>
                <th className="pb-2 text-right font-medium">Contract Asset</th>
              </tr>
            </thead>
            <tbody>
              {ifrs15Rows.map((r) => (
                <tr key={r.project} className="border-b border-border/60 transition hover:bg-ivory/50">
                  <td className="py-2.5 text-navy">{r.project}</td>
                  <td className="py-2.5 text-right text-slate-label">{r.spas}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-ivory">
                        <span className="block h-full rounded-full bg-indigo-metric" style={{ width: `${r.pobPct}%` }} />
                      </span>
                      <span className="text-navy">{r.pobPct}%</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-medium text-navy">{formatAED(r.recognised)}</td>
                  <td className="py-2.5 text-right text-slate-label">{formatAED(r.contractAsset)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="mt-5 flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-white transition hover:bg-goldLight">
            <Play size={16} /> Run Recognition
          </button>
        </div>

        {/* IFRS 16 Panel */}
        <div className="rounded-xl border border-border bg-white p-6 [border-top:3px_solid_#4F46E5]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-navy">Lease Accounting</h2>
              <p className="text-xs text-slate-label">IFRS 16 — ROU Assets & Lease Liabilities</p>
            </div>
            <span className="rounded-full bg-indigo-metric/10 px-3 py-1 text-xs font-medium text-indigo-metric">IFRS 16</span>
          </div>

          {/* KPIs */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {ifrs16Kpis.map((k) => (
              <div key={k.label} className="rounded-lg bg-ivory p-3">
                <p className="text-[11px] text-slate-label">{k.label}</p>
                <p className="mt-0.5 text-sm font-bold text-navy-deep">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-label">
                <th className="pb-2 font-medium">Lease Ref</th>
                <th className="pb-2 font-medium">Start</th>
                <th className="pb-2 text-right font-medium">Term</th>
                <th className="pb-2 text-right font-medium">IBR</th>
                <th className="pb-2 text-right font-medium">Monthly</th>
                <th className="pb-2 text-right font-medium">ROU Balance</th>
              </tr>
            </thead>
            <tbody>
              {ifrs16Rows.map((r) => (
                <tr key={r.ref} className="border-b border-border/60 transition hover:bg-ivory/50">
                  <td className="py-2.5 font-medium text-navy">{r.ref}</td>
                  <td className="py-2.5 text-slate-label">{r.start}</td>
                  <td className="py-2.5 text-right text-slate-label">{r.term}</td>
                  <td className="py-2.5 text-right text-slate-label">{r.ibr.toFixed(1)}%</td>
                  <td className="py-2.5 text-right text-navy">{formatAED(r.monthly)}</td>
                  <td className="py-2.5 text-right font-medium text-navy">{formatAED(r.rouBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="mt-5 flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-navy transition hover:bg-ivory">
            <Plus size={16} /> Add Lease
          </button>
        </div>
      </div>
    </AppShell>
  );
}
