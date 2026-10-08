import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import {
  Plus,
  FileDown,
  FileText,
  Check,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Download,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { WaterfallCalculator } from '@/components/WaterfallCalculator';
import { LpDetailDrawer } from '@/components/LpDetailDrawer';
import {
  funds,
  fundOverviewCards,
  lpRows,
  lpTotals,
  capitalCalls,
  distributionHistory,
  irrTrendData,
  reportChecklist,
  previousReports,
  type LpRow,
} from '@/lib/demoData';

export function FundManagementPage() {
  const [activeFund, setActiveFund] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const fund = funds[activeFund];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      showToast('Q2 2024 Report generated successfully. Download ready.');
    }, 2000);
  };

  const handleLpClick = (_lp: LpRow) => setDrawerOpen(true);

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-deep">Fund Management</h1>
            <p className="mt-1 text-sm text-slate-label">
              LP/GP structure, capital calls, distributions, IRR and waterfall across all funds
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-navy bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy hover:text-white">
              <FileText size={15} /> Investor Report
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-goldLight">
              <Plus size={16} /> New Capital Call
            </button>
          </div>
        </div>

        {/* Fund selector tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {funds.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActiveFund(i)}
              className={`shrink-0 rounded-lg border px-5 py-3 text-left transition-all ${
                activeFund === i
                  ? 'border-gold border-b-2 border-b-gold bg-white shadow-sm'
                  : 'border-border bg-white/60 hover:bg-white'
              }`}
            >
              <p className={`text-sm font-medium ${activeFund === i ? 'text-navy-deep' : 'text-slate-label'}`}>{f.name}</p>
              <p className="text-xs text-slate-label">{f.aumLabel}</p>
            </button>
          ))}
          <button className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border px-5 py-3 text-sm text-slate-label transition hover:border-gold hover:text-gold">
            <Plus size={16} /> Add Fund
          </button>
        </div>

        {/* Fund overview cards */}
        <div className="mt-5 grid grid-cols-5 gap-4">
          {fundOverviewCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-label">{c.label}</p>
              <p className="mt-1.5 text-xl font-bold text-navy-deep">{c.value}</p>
              <p className="mt-1 text-[11px] text-slate-label">{c.subtitle}</p>
              {c.delta && (
                <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${c.positive ? 'text-green-600' : 'text-amber-600'}`}>
                  <TrendingUp size={11} /> {c.delta}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div className="mt-6 grid grid-cols-5 gap-6">
          {/* Left column — 60% */}
          <div className="col-span-3 space-y-6">
            {/* LP Register */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">Limited Partners</h2>
                  <p className="text-xs text-slate-label">{fund.name} · 8 investors</p>
                </div>
                <button className="text-sm font-medium text-gold transition hover:underline">Add LP</button>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate-label">
                    <th className="pb-2 font-medium">LP Name</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-right font-medium">Commitment</th>
                    <th className="pb-2 text-right font-medium">Called</th>
                    <th className="pb-2 text-right font-medium">Uncalled</th>
                    <th className="pb-2 text-right font-medium">Distributions</th>
                    <th className="pb-2 text-right font-medium">Net IRR</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lpRows.map((lp) => (
                    <tr
                      key={lp.name}
                      onClick={() => handleLpClick(lp)}
                      className={`cursor-pointer border-b border-border/40 transition hover:bg-ivory hover:[border-left:3px_solid_#C79A2B] ${
                        lp.isGp ? 'bg-gold/5' : ''
                      }`}
                    >
                      <td className="py-2.5 pl-2 font-medium text-navy">{lp.name}</td>
                      <td className="py-2.5 text-slate-label">{lp.type}</td>
                      <td className="py-2.5 text-right text-navy">AED {lp.commitment}</td>
                      <td className="py-2.5 text-right text-slate-label">AED {lp.called}</td>
                      <td className="py-2.5 text-right text-slate-label">AED {lp.uncalled}</td>
                      <td className="py-2.5 text-right text-slate-label">AED {lp.distributions}</td>
                      <td className="py-2.5 text-right font-medium text-indigo-metric">{lp.netIrr}</td>
                      <td className="py-2.5 text-center">
                        {lp.isGp ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gold">
                            <Star size={12} fill="#C79A2B" /> GP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <Check size={12} /> Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-navy/20 font-bold">
                    <td className="py-3 text-navy-deep">Total</td>
                    <td className="py-3 text-slate-label">—</td>
                    <td className="py-3 text-right text-navy-deep">AED {lpTotals.commitment}</td>
                    <td className="py-3 text-right text-navy-deep">AED {lpTotals.called}</td>
                    <td className="py-3 text-right text-navy-deep">AED {lpTotals.uncalled}</td>
                    <td className="py-3 text-right text-navy-deep">AED {lpTotals.distributions}</td>
                    <td className="py-3 text-right text-navy-deep">{lpTotals.netIrr}</td>
                    <td className="py-3 text-center text-slate-label">—</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-[11px] italic text-slate-label">
                All figures net of management fees (1.5% p.a.) and carried interest (20% above 8% hurdle)
              </p>
            </div>

            {/* Capital Call History */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-navy">Capital Call Schedule</h2>
                <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-ivory">
                  <Plus size={14} /> New Call
                </button>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate-label">
                    <th className="pb-2 font-medium">Call #</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">% of Commit.</th>
                    <th className="pb-2 font-medium">Purpose</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                    <th className="pb-2 font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {capitalCalls.map((call) => (
                    <tr
                      key={call.callNum}
                      className={`border-b border-border/40 transition hover:bg-ivory ${
                        call.upcoming ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="py-2.5 font-medium text-navy">{call.callNum}</td>
                      <td className="py-2.5 text-slate-label">{call.date}</td>
                      <td className="py-2.5 text-right font-medium text-navy">{call.amount}</td>
                      <td className="py-2.5 text-right text-slate-label">{call.pct}</td>
                      <td className="py-2.5 text-slate-label">{call.purpose}</td>
                      <td className="py-2.5 text-center">
                        {call.status === 'Funded' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <Check size={12} /> Funded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-label">{call.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Amber alert */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    Capital Call #6 of AED 180M due 30 Jun 2024. Notices sent to 8 LPs on 01 Jun 2024. 2 LPs yet to confirm receipt.
                  </p>
                </div>
                <button className="shrink-0 rounded-lg border border-gold px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold hover:text-white">
                  Send Reminder
                </button>
              </div>
            </div>
          </div>

          {/* Right column — 40% */}
          <div className="col-span-2 space-y-6">
            {/* Waterfall */}
            <WaterfallCalculator />

            {/* IRR Chart */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-base font-semibold text-navy">Fund IRR Trend</h3>
              <p className="text-xs text-slate-label">Net to LP, since inception</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={irrTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="quarter"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 22]}
                      ticks={[0, 5, 10, 15, 20]}
                    />
                    <ReferenceLine
                      y={8}
                      stroke="#C79A2B"
                      strokeDasharray="5 5"
                      label={{ value: 'Hurdle 8%', position: 'right', fill: '#C79A2B', fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="irr"
                      stroke="#0B1D33"
                      strokeWidth={2.5}
                      dot={(props: { cx?: number; cy?: number; index?: number }) => {
                        const isLast = props.index === irrTrendData.length - 1;
                        if (isLast) {
                          return <Dot cx={props.cx} cy={props.cy} r={6} fill="#C79A2B" stroke="#fff" strokeWidth={2} />;
                        }
                        return <Dot cx={props.cx} cy={props.cy} r={3} fill="#0B1D33" />;
                      }}
                      isAnimationActive
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution History */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-base font-semibold text-navy">Distributions to LPs</h3>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate-label">
                    <th className="pb-2 font-medium">Dist #</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionHistory.map((d) => (
                    <tr
                      key={d.distNum}
                      className={`border-b border-border/40 transition hover:bg-ivory ${
                        d.projected ? 'bg-ivory/40' : ''
                      }`}
                    >
                      <td className="py-2.5 font-medium text-navy">{d.distNum}</td>
                      <td className="py-2.5 text-slate-label">{d.date}</td>
                      <td className="py-2.5 text-right font-medium text-navy">{d.amount}</td>
                      <td className="py-2.5 text-slate-label">{d.type}</td>
                      <td className="py-2.5 text-center">
                        {d.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <Check size={12} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock size={12} /> Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Investor Report Section */}
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-navy-deep">Quarterly Investor Report — Q2 2024</h2>
            <p className="text-sm text-slate-label">Ready to generate · Last generated: 15 Apr 2024</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {/* Generate card */}
            <div className="rounded-xl border border-border bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gold/30 bg-gold/5">
                  <FileText size={24} className="text-gold" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-navy">Generate Q2 2024 Report</h3>
                  <p className="text-xs text-slate-label">All components ready</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {reportChecklist.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-navy/80">
                    <Check size={15} className="text-green-600" /> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-goldLight disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Clock size={16} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Generate Report
                  </>
                )}
              </button>
            </div>

            {/* Previous reports */}
            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="text-base font-semibold text-navy">Previous Reports</h3>
              <div className="mt-4 space-y-3">
                {previousReports.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-lg border border-border bg-ivory/50 px-4 py-3 transition hover:border-gold/40 hover:bg-ivory"
                  >
                    <div>
                      <p className="text-sm font-medium text-navy">{r.label}</p>
                      <p className="text-xs text-slate-label">{r.date}</p>
                    </div>
                    <button className="flex items-center gap-1 text-sm font-medium text-gold transition hover:underline">
                      Download PDF <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LP Detail Drawer */}
      <LpDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
