import { useState } from 'react';
import {
  RefreshCw,
  FileDown,
  Plus,
  AlertTriangle,
  Check,
  Clock,
  Circle,
  X,
  TrendingUp,
  Building2,
  ChevronRight,
  Send,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ApproveModal } from '@/components/ApproveModal';
import {
  constructionKpis,
  constructionAlerts,
  constructionSites,
  contractorRows,
  budgetRows,
  budgetTotals,
  mismatchRows,
  constructionCompliance,
  constructionAiInsights,
  type Milestone,
  type ConstructionSite,
} from '@/lib/demoData';

const milestoneStatusMap: Record<Milestone['status'], { icon: typeof Check; color: string; bg: string }> = {
  completed: { icon: Check, color: 'text-green-600', bg: 'bg-green-500' },
  in_progress: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500' },
  not_started: { icon: Circle, color: 'text-slate-300', bg: 'bg-slate-300' },
  delayed: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-500' },
  critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500' },
};

const siteStatusMap: Record<ConstructionSite['status'], { label: string; color: string; bar: string }> = {
  active: { label: 'On Schedule', color: 'text-green-700', bar: 'bg-green-500' },
  delayed: { label: 'Delayed', color: 'text-amber-700', bar: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'text-red-700', bar: 'bg-red-500' },
  completed: { label: 'Completed', color: 'text-green-700', bar: 'bg-green-500' },
};

const budgetStatusMap: Record<string, string> = {
  green: 'text-green-700 bg-green-50',
  amber: 'text-amber-700 bg-amber-50',
  red: 'text-red-700 bg-red-50',
};

const complianceColorMap: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  grey: 'bg-slate-400',
};

const insightStyles: Record<string, { border: string; gradient: string }> = {
  critical: { border: 'border-red-200', gradient: 'from-red-50 to-white' },
  warning: { border: 'border-amber-200', gradient: 'from-amber-50 to-white' },
  opportunity: { border: 'border-indigo-200', gradient: 'from-indigo-50 to-white' },
};

export function ConstructionControlTowerPage() {
  const [toast, setToast] = useState('');
  const [approveModal, setApproveModal] = useState<{ vendor: string; amount: string } | null>(null);
  const [detailSite, setDetailSite] = useState<ConstructionSite | null>(null);
  const [alerts, setAlerts] = useState(constructionAlerts);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const unresolvedAlerts = alerts.filter((a) => !('resolved' in a));
  const sortedContractors = [...contractorRows].sort((a, b) => b.variance - a.variance);

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    showToast('Alert resolved and logged.');
  };

  const handleApproveConfirm = () => {
    setApproveModal(null);
    showToast('Contractor bill approved and queued for payment.');
  };

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-deep">Construction Control Tower</h1>
            <p className="mt-1 text-sm text-slate-label">
              Live site intelligence across all active projects — 08 Oct 2026 · 10:30 AM GST
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-navy bg-white px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white">
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={() => showToast('Exporting Construction Control Tower PDF...')}
              className="flex items-center gap-2 rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-white transition hover:bg-goldLight"
            >
              <FileDown size={15} /> Export PDF
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-navy bg-white px-3 py-1.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white">
              <Plus size={15} /> Add Site Report
            </button>
          </div>
        </div>

        {/* Alert banner */}
        {unresolvedAlerts.length > 0 && (
          <div className="mt-5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">
                <span className="font-semibold">{unresolvedAlerts.length} items need immediate attention —</span>{' '}
                {unresolvedAlerts.slice(0, 3).map((a, i) => (
                  <span key={a.id}>
                    <a href="#" className={`font-medium ${a.severity === 'critical' ? 'text-red-600' : 'text-gold'} hover:underline`}>{a.title}</a>
                    {i < Math.min(2, unresolvedAlerts.length - 1) && <span className="text-amber-700"> · </span>}
                  </span>
                ))}
              </p>
            </div>
            <a href="#" className="shrink-0 text-sm font-medium text-navy transition hover:underline">View All Alerts →</a>
          </div>
        )}

        {/* KPI cards */}
        <div className="mt-5 grid grid-cols-6 gap-4">
          {constructionKpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-label">{k.label}</p>
              <p className="mt-1.5 text-lg font-bold text-navy-deep">{k.value}</p>
              <p className="text-[11px] text-slate-label">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Project progress cards */}
        <div className="mt-6 grid grid-cols-3 gap-5">
          {constructionSites.map((site) => {
            const status = siteStatusMap[site.status];
            return (
              <div
                key={site.id}
                className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-navy-deep">{site.name}</h3>
                    <p className="text-[11px] text-slate-label">{site.entity} · {site.location}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color} bg-current/10`} style={{ background: 'transparent' }}>
                    <span className={`inline-flex items-center gap-1 ${status.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.bar}`} />
                      {status.label}
                    </span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-label">Overall completion</span>
                    <span className="font-bold text-navy-deep">{site.overallPct}%</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ivory">
                    <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${site.overallPct}%` }} />
                  </div>
                </div>

                {/* Milestone timeline */}
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-medium text-slate-label">Milestones</p>
                  <div className="flex items-center justify-between">
                    {site.milestones.map((m, i) => {
                      const ms = milestoneStatusMap[m.status];
                      const Icon = ms.icon;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${ms.bg} text-white`}>
                            <Icon size={13} />
                          </div>
                          <span className="text-[9px] text-slate-label">{m.name}</span>
                          {m.status === 'in_progress' && <span className="text-[9px] font-medium text-amber-600">{m.pct}%</span>}
                          {m.status === 'critical' && <span className="text-[9px] font-medium text-red-600">{m.pct}%</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key numbers */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] text-slate-label">Units</p>
                    <p className="text-xs font-medium text-navy">{site.unitsSold}/{site.unitsTotal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-label">Budget</p>
                    <p className="text-xs font-medium text-navy">{site.budgetUsed}</p>
                    <p className="text-[9px] text-slate-label">of {site.budgetTotal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-label">Bills Pending</p>
                    <p className="text-xs font-medium text-navy">{site.billsPending}</p>
                  </div>
                </div>

                {/* Alert badges */}
                {site.alertBadges.length > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    {site.alertBadges.map((b, i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full ${b === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}
                      />
                    ))}
                    <span className="ml-1 text-[10px] text-slate-label">{site.alertCount} alert{site.alertCount > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* View detail */}
                <button
                  onClick={() => setDetailSite(site)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-navy transition hover:bg-ivory"
                >
                  View Full Detail <ChevronRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Contractor performance table */}
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <h2 className="text-base font-semibold text-navy">Contractor Performance</h2>
          <p className="text-xs text-slate-label">Sorted by variance — worst first</p>
          <table className="mt-4 w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Contractor</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 text-right font-medium">Contract Value</th>
                <th className="pb-2 text-right font-medium">Certified %</th>
                <th className="pb-2 text-right font-medium">Claimed %</th>
                <th className="pb-2 text-right font-medium">Variance</th>
                <th className="pb-2 text-right font-medium">Bills Submitted</th>
                <th className="pb-2 text-right font-medium">Bills Approved</th>
                <th className="pb-2 text-center font-medium">Score</th>
                <th className="pb-2 text-center font-medium">Status</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedContractors.map((c) => {
                const isCritical = c.variance > 5;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border/30 transition hover:bg-ivory ${isCritical ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="py-2.5 font-medium text-navy">{c.contractorName}</td>
                    <td className="py-2.5 text-slate-label">{c.project}</td>
                    <td className="py-2.5 text-right text-navy">{c.contractValue}</td>
                    <td className="py-2.5 text-right text-navy">{c.certifiedPct}%</td>
                    <td className={`py-2.5 text-right ${isCritical ? 'font-bold text-red-600' : 'text-navy'}`}>{c.claimedPct}%</td>
                    <td className={`py-2.5 text-right font-medium ${c.variance > 5 ? 'text-red-600' : c.variance > 0 ? 'text-amber-600' : 'text-green-700'}`}>
                      {c.variance > 0 ? '+' : ''}{c.variance}%
                    </td>
                    <td className="py-2.5 text-right text-slate-label">{c.billsSubmitted}</td>
                    <td className="py-2.5 text-right text-slate-label">{c.billsApproved}</td>
                    <td className="py-2.5 text-center">
                      <span className={`font-bold ${c.performanceScore >= 8 ? 'text-green-700' : c.performanceScore >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                        {c.performanceScore}/10
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      {c.status === 'critical' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">Critical</span>}
                      {c.status === 'flag' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Flag</span>}
                      {c.status === 'healthy' && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Healthy</span>}
                    </td>
                    <td className="py-2.5">
                      <button
                        onClick={() => setApproveModal({ vendor: c.contractorName, amount: c.billsSubmitted })}
                        className="rounded bg-gold px-2 py-1 text-[10px] font-medium text-white transition hover:bg-goldLight"
                      >
                        Approve Bill
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Budget vs Actual vs Forecast */}
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <h2 className="text-base font-semibold text-navy">Budget vs Actual vs Forecast</h2>
          <p className="text-xs text-slate-label">All projects · AED Millions</p>
          <table className="mt-4 w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 text-right font-medium">Budgeted</th>
                <th className="pb-2 text-right font-medium">Committed</th>
                <th className="pb-2 text-right font-medium">Actual Spent</th>
                <th className="pb-2 text-right font-medium">Forecast Final</th>
                <th className="pb-2 text-right font-medium">Variance</th>
                <th className="pb-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgetRows.map((r, i) => {
                const showProject = i === 0 || budgetRows[i - 1].siteId !== r.siteId;
                return (
                  <tr key={i} className="border-b border-border/30 transition hover:bg-ivory">
                    <td className="py-2 text-xs text-slate-label">{showProject ? r.projectName : ''}</td>
                    <td className="py-2 text-navy">{r.category}</td>
                    <td className="py-2 text-right text-navy">{r.budgeted}</td>
                    <td className="py-2 text-right text-slate-label">{r.committed}</td>
                    <td className="py-2 text-right text-slate-label">{r.actualSpent}</td>
                    <td className="py-2 text-right font-medium text-navy">{r.forecastFinal}</td>
                    <td className={`py-2 text-right font-medium ${r.status === 'red' ? 'text-red-600' : r.status === 'amber' ? 'text-amber-600' : 'text-green-700'}`}>
                      {r.variance}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${budgetStatusMap[r.status]}`}>
                        {r.status === 'green' ? 'On Budget' : r.status === 'amber' ? 'Over 0-5%' : 'Over 5%'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Grand total */}
              <tr className="border-t-2 border-navy bg-gold/5 font-bold [border-left:3px_solid_#C79A2B]">
                <td className="py-3 text-navy-deep">GRAND TOTAL</td>
                <td className="py-3 text-slate-label">—</td>
                <td className="py-3 text-right text-navy-deep">{budgetTotals.budgeted}</td>
                <td className="py-3 text-right text-navy-deep">{budgetTotals.committed}</td>
                <td className="py-3 text-right text-navy-deep">{budgetTotals.actualSpent}</td>
                <td className="py-3 text-right text-navy-deep">{budgetTotals.forecastFinal}</td>
                <td className="py-3 text-right text-red-600">{budgetTotals.variance}</td>
                <td className="py-3 text-center">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Over 2.7%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sales vs Construction mismatch matrix */}
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <h2 className="text-base font-semibold text-navy">Units at Handover Risk</h2>
          <p className="text-xs text-slate-label">Sold units where construction status is below handover threshold · {mismatchRows.length} units flagged</p>
          <table className="mt-4 w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Unit No</th>
                <th className="pb-2 font-medium">Floor</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Sold Date</th>
                <th className="pb-2 font-medium">Buyer</th>
                <th className="pb-2 font-medium">Construction Status</th>
                <th className="pb-2 font-medium">Handover Due</th>
                <th className="pb-2 font-medium">Forecast Handover</th>
                <th className="pb-2 text-right font-medium">Delay (days)</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {mismatchRows.map((m) => (
                <tr key={m.id} className="border-b border-border/30 transition hover:bg-ivory">
                  <td className="py-2.5 font-medium text-navy">{m.unitNo}</td>
                  <td className="py-2.5 text-slate-label">{m.floor}</td>
                  <td className="py-2.5 text-slate-label">{m.project}</td>
                  <td className="py-2.5 text-slate-label">{m.soldDate}</td>
                  <td className="py-2.5 text-slate-label">{m.buyer}</td>
                  <td className="py-2.5 text-amber-700">{m.constructionStatus}</td>
                  <td className="py-2.5 text-slate-label">{m.handoverDue}</td>
                  <td className="py-2.5 font-medium text-red-600">{m.handoverForecast}</td>
                  <td className="py-2.5 text-right">
                    <span className={`font-bold ${m.delayDays > 120 ? 'text-red-600' : 'text-amber-600'}`}>{m.delayDays}</span>
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => showToast(`Delay notice sent to ${m.buyer} for ${m.unitNo}`)}
                      className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700 transition hover:bg-amber-200"
                    >
                      <Send size={11} /> Send Delay Notice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Two column: Compliance Calendar + AI Insights */}
        <div className="mt-6 grid grid-cols-2 gap-5">
          {/* Compliance Calendar */}
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-navy">Construction Compliance Calendar</h2>
            <p className="text-xs text-slate-label">RERA · DLD · Escrow · Handover deadlines</p>
            <div className="mt-3 space-y-2">
              {constructionCompliance.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-ivory">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${complianceColorMap[item.color]}`} />
                  <span className={`text-xs font-medium ${item.date === 'TODAY' ? 'text-red-600' : 'text-navy'} w-20 shrink-0`}>{item.date}</span>
                  <span className="flex-1 text-xs text-slate-label">{item.label}</span>
                  <span className="text-[10px] text-slate-label">{item.project}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="rounded-lg bg-gradient-to-r from-gold/15 to-transparent px-3 py-2">
              <h2 className="text-base font-semibold text-navy">AI Site Intelligence</h2>
              <p className="text-xs text-slate-label">Powered by Gnanova AI</p>
            </div>
            <div className="mt-3 space-y-3">
              {constructionAiInsights.map((insight) => {
                const style = insightStyles[insight.level];
                return (
                  <div key={insight.title} className={`rounded-lg border bg-gradient-to-b p-4 ${style.border} ${style.gradient}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{insight.icon}</span>
                      <h3 className="text-sm font-semibold text-navy">{insight.title}</h3>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-label">{insight.body}</p>
                    <button
                      onClick={() => showToast(`${insight.title} — Opening...`)}
                      className="mt-2.5 text-xs font-medium text-gold transition hover:underline"
                    >
                      {insight.buttonText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Site Detail Drawer */}
      {detailSite && (
        <>
          <div className="fixed inset-0 z-40 bg-navy/30" onClick={() => setDetailSite(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-full flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-navy-deep">{detailSite.name}</h2>
                <p className="text-xs text-slate-label">{detailSite.entity} · {detailSite.location}</p>
              </div>
              <button onClick={() => setDetailSite(null)} className="rounded-lg p-1.5 text-slate-label transition hover:bg-ivory">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-ivory p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-label">Overall Completion</p>
                  <p className="mt-1 text-lg font-bold text-navy-deep">{detailSite.overallPct}%</p>
                </div>
                <div className="rounded-lg border border-border bg-ivory p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-label">Status</p>
                  <p className="mt-1 text-sm font-bold text-navy-deep">{siteStatusMap[detailSite.status].label}</p>
                  {detailSite.delayDays > 0 && <p className="text-[11px] text-red-600">{detailSite.delayDays} days delayed</p>}
                </div>
                <div className="rounded-lg border border-border bg-ivory p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-label">Units Sold</p>
                  <p className="mt-1 text-lg font-bold text-navy-deep">{detailSite.unitsSold}/{detailSite.unitsTotal}</p>
                </div>
                <div className="rounded-lg border border-border bg-ivory p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-label">Budget Used</p>
                  <p className="mt-1 text-sm font-bold text-navy-deep">{detailSite.budgetUsed}</p>
                  <p className="text-[11px] text-slate-label">of {detailSite.budgetTotal}</p>
                </div>
              </div>

              {/* Milestones detail */}
              <h3 className="mb-3 mt-6 text-sm font-semibold text-navy">Milestone Detail</h3>
              <div className="space-y-2.5">
                {detailSite.milestones.map((m, i) => {
                  const ms = milestoneStatusMap[m.status];
                  const Icon = ms.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${ms.bg} text-white`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-navy">{m.name}</p>
                        <p className="text-[11px] capitalize text-slate-label">{m.status.replace('_', ' ')}</p>
                      </div>
                      <span className="text-sm font-bold text-navy-deep">{m.pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Timeline */}
              <h3 className="mb-3 mt-6 text-sm font-semibold text-navy">Project Timeline</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-label">Start Date</span><span className="font-medium text-navy">{detailSite.startDate}</span></div>
                <div className="flex justify-between"><span className="text-slate-label">Planned Completion</span><span className="font-medium text-navy">{detailSite.plannedCompletion}</span></div>
              </div>

              {/* Alerts for this site */}
              {alerts.filter((a) => a.siteId === detailSite.id).length > 0 && (
                <>
                  <h3 className="mb-3 mt-6 text-sm font-semibold text-navy">Active Alerts ({alerts.filter((a) => a.siteId === detailSite.id).length})</h3>
                  <div className="space-y-2">
                    {alerts.filter((a) => a.siteId === detailSite.id).map((a) => (
                      <div key={a.id} className={`rounded-lg border p-3 ${a.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-start justify-between">
                          <p className={`text-xs font-semibold ${a.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>{a.title}</p>
                          <button
                            onClick={() => resolveAlert(a.id)}
                            className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-white transition"
                            style={{ background: a.severity === 'critical' ? '#dc2626' : '#d97706' }}
                          >
                            Resolve
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-label">{a.description}</p>
                        <p className="mt-1 text-[11px] font-medium text-navy">Impact: {a.aedImpact} · {a.actionRequired}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="mt-6 space-y-2.5">
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-goldLight">
                  <FileDown size={16} /> Download Site Report
                </button>
                <button
                  onClick={() => { showToast('Daily log form opened'); setDetailSite(null); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy py-2.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white"
                >
                  <Plus size={16} /> Submit Daily Log
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Approve Modal */}
      <ApproveModal
        open={!!approveModal}
        vendor={approveModal?.vendor ?? ''}
        amount={approveModal?.amount ?? ''}
        onCancel={() => setApproveModal(null)}
        onConfirm={handleApproveConfirm}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
