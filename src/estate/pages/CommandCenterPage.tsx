import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  FileDown,
  Bell,
  AlertTriangle,
  ChevronRight,
  Check,
  Square,
  FileUp,
  Receipt,
  Mail,
  ClipboardList,
  SearchCheck,
  FileBarChart,
  Clock,
} from 'lucide-react';
import { AppShell } from '@/estate/components/AppShell';
import { ApproveModal } from '@/estate/components/ApproveModal';
import {
  alertStripItems,
  liveMetrics,
  initialTasks,
  quickActions,
  aiInsights,
  activityFeed,
  todayCollections,
  payablesToday,
  projectPulse,
  weeklyCashFlow,
  complianceCalendar,
  entitySnapshot,
  type TaskItem,
} from '@/estate/lib/demoData';

const dotColorMap: Record<string, string> = {
  green: 'bg-green-500',
  gold: 'bg-gold',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const badgeColorMap: Record<string, string> = {
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200',
};

const insightGradients: Record<string, string> = {
  red: 'from-red-50 to-white',
  amber: 'from-amber-50 to-white',
  blue: 'from-indigo-50 to-white',
};

const insightBorders: Record<string, string> = {
  red: 'border-red-200',
  amber: 'border-amber-200',
  blue: 'border-indigo-200',
};

const iconMap: Record<string, typeof FileUp> = {
  FileUp: FileUp,
  Receipt: Receipt,
  Mail: Mail,
  ClipboardList: ClipboardList,
  SearchCheck: SearchCheck,
  FileBarChart: FileBarChart,
};

const statusDotMap: Record<string, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const complianceColorMap: Record<string, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  blue: 'bg-indigo-500',
};

export function CommandCenterPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [toast, setToast] = useState('');
  const [approveModal, setApproveModal] = useState<{ vendor: string; amount: string } | null>(null);
  const [feedExpanded, setFeedExpanded] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed, badge: !t.completed ? 'Completed' : t.badge, badgeColor: !t.completed ? 'green' : t.badgeColor, due: !t.completed ? 'Done now' : t.due } : t))
    );
  };

  const openCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter((t) => !t.completed && t.badgeColor === 'red').length;

  const visibleFeed = feedExpanded ? activityFeed : activityFeed.slice(0, 6);

  const handleApproveConfirm = () => {
    setApproveModal(null);
    showToast('Payment approved and queued for processing.');
  };

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-deep">Command Center</h1>
            <p className="mt-1 text-sm text-slate-label">
              Real-time operations across all entities and projects — 12 May 2024 · 10:30 AM GST
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
            <button className="flex items-center gap-2 rounded-lg bg-gold px-4 py-1.5 text-sm font-medium text-white transition hover:bg-goldLight">
              <FileDown size={15} /> Export PDF
            </button>
            <button className="relative rounded-lg border border-border bg-white p-2 text-slate-label transition hover:bg-ivory">
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
            </button>
          </div>
        </div>

        {/* Alert strip */}
        <div className="mt-5 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900">
              <span className="font-semibold">3 items need immediate attention —</span>{' '}
              {alertStripItems.map((item, i) => (
                <span key={i}>
                  <a href={item.href} className="font-medium text-gold underline-offset-2 hover:underline">{item.text}</a>
                  {i < alertStripItems.length - 1 && <span className="text-amber-700"> · </span>}
                </span>
              ))}
            </p>
          </div>
          <a href="#" className="shrink-0 text-sm font-medium text-navy transition hover:underline">View All Compliance →</a>
        </div>

        {/* Live metrics row */}
        <div className="mt-5 grid grid-cols-6 gap-4">
          {liveMetrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-label">{m.label}</p>
                <span className="relative flex h-2 w-2">
                  {(m.dotColor === 'green' || m.dotColor === 'gold') && (
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColorMap[m.dotColor]} opacity-60`} />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColorMap[m.dotColor]}`} />
                </span>
              </div>
              <p className="mt-1.5 text-lg font-bold text-navy-deep">{m.value}</p>
              <p className="text-[11px] text-slate-label">{m.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Three column layout */}
        <div className="mt-6 grid grid-cols-10 gap-5">
          {/* Left column — 35% */}
          <div className="col-span-4 space-y-5">
            {/* My Tasks */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">My Tasks</h2>
                  <p className="text-xs text-slate-label">Assigned to Finance Team</p>
                </div>
                <a href="#" className="text-sm font-medium text-gold transition hover:underline">View All</a>
              </div>
              <div className="mt-3 space-y-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-ivory ${task.completed ? 'opacity-60' : ''}`}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 shrink-0 ${task.completed ? 'text-green-600' : 'text-slate-300 hover:text-gold'}`}
                    >
                      {task.completed ? <Check size={18} /> : <Square size={18} />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm text-navy ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeColorMap[task.badgeColor]}`}>
                          {task.badge}
                        </span>
                        <span className="text-[11px] text-slate-label">{task.due}</span>
                        {task.amount && <span className="text-[11px] font-medium text-navy">{task.amount}</span>}
                        <span className="text-[11px] text-slate-label">· {task.assignee}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-border pt-2 text-[11px] text-slate-label">
                {openCount} open · {completedCount} completed · {overdueCount} overdue
              </p>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h2 className="text-base font-semibold text-navy">Quick Actions</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {quickActions.map((action) => {
                  const Icon = iconMap[action.icon] ?? FileUp;
                  return (
                    <button
                      key={action.label}
                      onClick={() => showToast(`${action.label} — Coming soon`)}
                      className="flex items-center gap-2 rounded-lg border border-gold/40 bg-ivory px-3 py-2.5 text-sm font-medium text-navy transition-all hover:bg-gold hover:text-white"
                    >
                      <Icon size={16} className="text-gold" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Insights */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="rounded-lg bg-gradient-to-r from-gold/15 to-transparent px-3 py-2">
                <h2 className="text-base font-semibold text-navy">AI Insights</h2>
                <p className="text-xs text-slate-label">Powered by EstateCFO Intelligence</p>
              </div>
              <div className="mt-3 space-y-3">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.title}
                    className={`rounded-lg border bg-gradient-to-b p-4 ${insightBorders[insight.level]} ${insightGradients[insight.level]}`}
                  >
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
                ))}
              </div>
            </div>
          </div>

          {/* Middle column — 35% */}
          <div className="col-span-4 space-y-5">
            {/* Live Activity Feed */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">Live Activity</h2>
                  <p className="text-xs text-slate-label">All entities · Last updated 10:30 AM</p>
                </div>
                <select className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-navy outline-none focus:border-gold">
                  <option>All Activities</option>
                  <option>Collections</option>
                  <option>Compliance</option>
                  <option>Accounting</option>
                </select>
              </div>
              <div className="mt-4 space-y-1">
                {visibleFeed.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg py-2.5 pl-3"
                    style={{ borderLeft: `3px solid ${item.borderColor}` }}
                  >
                    <span className="text-base">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy">{item.title}</p>
                        <span className="text-[10px] text-slate-label">{item.time}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-label">{item.detail}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-full bg-ivory px-2 py-0.5 text-[10px] font-medium text-slate-label">{item.tag}</span>
                        {item.button && (
                          <button
                            onClick={() => item.button?.text === 'Approve'
                              ? setApproveModal({ vendor: 'Al Futtaim Contracting', amount: 'AED 4.2M' })
                              : showToast(item.button?.text === 'Send Reminder' ? 'Reminder sent via WhatsApp and email' : `${item.button?.text} — Coming soon`)}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium text-white transition ${
                              item.button.color === 'gold' ? 'bg-gold hover:bg-goldLight' : 'bg-red-500 hover:bg-red-600'
                            }`}
                          >
                            {item.button.text}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!feedExpanded && activityFeed.length > 6 && (
                <button
                  onClick={() => setFeedExpanded(true)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-slate-label transition hover:bg-ivory hover:text-navy"
                >
                  View all activity <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Right column — 30% */}
          <div className="col-span-3 space-y-5">
            {/* Collections Tracker */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h2 className="text-base font-semibold text-navy">Today's Collections</h2>
              <p className="text-xs text-slate-label">12 May 2024 · AED 18.0M expected</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-label">AED 12.4M received of AED 18.0M expected</span>
                  <span className="font-semibold text-gold">69%</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ivory">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: '69%' }} />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {todayCollections.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-xs">
                    {c.status === 'received' && <Check size={14} className="shrink-0 text-green-600" />}
                    {c.status === 'expected' && <Clock size={14} className="shrink-0 text-slate-400" />}
                    {c.status === 'overdue' && <AlertTriangle size={14} className="shrink-0 text-red-500" />}
                    <span className="flex-1 text-navy">{c.label}</span>
                    <span className="font-medium text-navy">{c.amount}</span>
                    <span className="text-slate-label">{c.time}</span>
                    {c.status === 'overdue' && (
                      <button
                        onClick={() => showToast('Reminder sent via WhatsApp and email')}
                        className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 transition hover:bg-amber-200"
                      >
                        Send Reminder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payables Due Today */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h2 className="text-base font-semibold text-navy">Payables Due Today</h2>
              <p className="text-xs text-slate-label">AED 8.2M across 5 bills</p>
              <div className="mt-3 space-y-2">
                {payablesToday.map((p) => (
                  <div key={p.vendor} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotMap[p.dotColor]}`} />
                      <span className="flex-1 text-sm font-medium text-navy">{p.vendor}</span>
                      <span className="text-sm font-bold text-navy-deep">{p.amount}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-label">{p.project} · Due today · {p.status}</p>
                    {p.autoPay && (
                      <p className="mt-1 text-[11px] font-medium text-green-600">{p.autoPay}</p>
                    )}
                    {p.action && (
                      <button
                        onClick={() =>
                          p.action!.text === 'Approve'
                            ? setApproveModal({ vendor: p.vendor, amount: p.amount })
                            : showToast(`Payment to ${p.vendor} queued.`)
                        }
                        className={`mt-2 rounded px-3 py-1 text-xs font-medium text-white transition ${
                          p.action.color === 'gold' ? 'bg-gold hover:bg-goldLight' : 'bg-navy hover:bg-navy-deep'
                        }`}
                      >
                        {p.action.text}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Project Pulse */}
            <div className="rounded-xl border border-border bg-white p-5">
              <h2 className="text-base font-semibold text-navy">Project Pulse</h2>
              <p className="text-xs text-slate-label">Live construction status</p>
              <div className="mt-3 space-y-2.5">
                {projectPulse.map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-navy">{p.name}</span>
                      <span className="shrink-0 font-medium text-navy-deep">{p.pct}%</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotMap[p.badgeColor]}`} />
                      <span className="text-[10px] text-slate-label">{p.updated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row — 3 panels */}
        <div className="mt-6 grid grid-cols-3 gap-5">
          {/* Cash Flow This Week */}
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-navy">Cash Flow — This Week</h2>
            <p className="text-xs text-slate-label">12–17 May 2024</p>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCashFlow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="inflow" name="Inflow" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={1200}>
                    {weeklyCashFlow.map((_, i) => (
                      <Cell key={i} fill="#C79A2B" />
                    ))}
                  </Bar>
                  <Bar dataKey="outflow" name="Outflow" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={1200}>
                    {weeklyCashFlow.map((_, i) => (
                      <Cell key={i} fill="#0B1D33" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Inflow</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-navy" /> Outflow</span>
            </div>
          </div>

          {/* Compliance Calendar */}
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-navy">Compliance Calendar</h2>
            <p className="text-xs text-slate-label">Next 30 days</p>
            <div className="mt-3 space-y-2">
              {complianceCalendar.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-ivory">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${complianceColorMap[item.color]}`} />
                  <span className={`text-xs font-medium ${item.date === 'TODAY' ? 'text-red-600' : 'text-navy'}`}>{item.date}</span>
                  <span className="text-xs text-slate-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Entity Snapshot */}
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-navy">Entity Snapshot</h2>
            <p className="text-xs text-slate-label">Portfolio summary · All entities</p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] text-slate-label">
                  <th className="pb-1.5 font-medium">Entity</th>
                  <th className="pb-1.5 text-right font-medium">Assets</th>
                  <th className="pb-1.5 text-right font-medium">Cash</th>
                  <th className="pb-1.5 text-center font-medium">Proj.</th>
                  <th className="pb-1.5 text-center font-medium">St.</th>
                </tr>
              </thead>
              <tbody>
                {entitySnapshot.map((e) => (
                  <tr key={e.entity} className="border-b border-border/40 transition hover:bg-ivory">
                    <td className="py-2 text-xs font-medium text-navy">{e.entity}</td>
                    <td className="py-2 text-right text-xs text-slate-label">{e.assets}</td>
                    <td className="py-2 text-right text-xs text-slate-label">{e.cash}</td>
                    <td className="py-2 text-center text-xs text-navy">{e.projects}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-block h-2 w-2 rounded-full ${statusDotMap[e.status]}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
