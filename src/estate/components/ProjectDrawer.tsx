import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { X, Check, Clock } from 'lucide-react';
import {
  marinaHeightsIfrsSchedule,
  marinaHeightsCostCategories,
} from '@/estate/lib/demoData';
import { formatAED } from '@/estate/lib/format';

type Tab = 'Overview' | 'IFRS 15 Schedule' | 'Cost Breakdown' | 'Contractor Bills' | 'Unit Sales' | 'Documents';

const tabs: Tab[] = ['Overview', 'IFRS 15 Schedule', 'Cost Breakdown', 'Contractor Bills', 'Unit Sales', 'Documents'];

const projectInfo = [
  { label: 'Developer', value: 'Marina Heights Group' },
  { label: 'Entity', value: 'Marina Heights LLC' },
  { label: 'Type', value: 'Residential' },
  { label: 'Location', value: 'Dubai Marina' },
  { label: 'Permit Number', value: 'DXB-PERM-2023-0042' },
  { label: 'RERA Registration', value: 'RERA-8291' },
  { label: 'Start Date', value: '01 Jan 2023' },
  { label: 'Expected Handover', value: 'Q4 2025' },
  { label: 'Architect', value: 'WS Atkins & Partners' },
  { label: 'Main Contractor', value: 'Arabtec Construction LLC' },
];

const financialSummary = [
  { label: 'Project Value', value: 'AED 1.24B' },
  { label: 'Total Costs', value: 'AED 823.4M' },
  { label: 'Gross Profit', value: 'AED 416.6M' },
  { label: 'Margin', value: '33.6%' },
  { label: 'Land Cost', value: 'AED 180M' },
  { label: 'Finance Cost', value: 'AED 45M' },
];

export function ProjectDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  if (!open) return null;

  const costVariance = marinaHeightsCostCategories.map((c) => ({
    ...c,
    variance: c.actual - c.budget,
    status: c.actual <= c.budget ? 'Under Budget' : 'Over Budget',
  }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-navy/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[600px] max-w-full flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-navy-deep">Marina Heights Towers — Full Detail</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-label transition hover:bg-ivory">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium transition ${
                activeTab === tab
                  ? 'border-gold text-gold'
                  : 'border-transparent text-slate-label hover:text-navy'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-label">Project Information</h3>
                <div className="space-y-2.5">
                  {projectInfo.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-slate-label">{item.label}</span>
                      <span className="font-medium text-navy-deep text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-label">Financial Summary</h3>
                <div className="space-y-2.5">
                  {financialSummary.map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-border/50 pb-2 text-sm">
                      <span className="text-slate-label">{item.label}</span>
                      <span className="font-bold text-navy-deep">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'IFRS 15 Schedule' && (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate-label">
                    <th className="pb-2 font-medium">Quarter</th>
                    <th className="pb-2 font-medium">% Completion</th>
                    <th className="pb-2 text-right font-medium">Revenue to Recognise</th>
                    <th className="pb-2 text-right font-medium">Cumulative Recognised</th>
                    <th className="pb-2 text-center font-medium">Journal Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {marinaHeightsIfrsSchedule.map((row) => (
                    <tr key={row.quarter} className="border-b border-border/50 transition hover:bg-ivory">
                      <td className="py-2.5 text-navy">{row.quarter}</td>
                      <td className="py-2.5 text-slate-label">{row.pct}%</td>
                      <td className="py-2.5 text-right text-slate-label">{formatAED(row.recognise)}</td>
                      <td className="py-2.5 text-right font-medium text-navy">{formatAED(row.cumulative)}</td>
                      <td className="py-2.5 text-center">
                        {row.status === 'Posted' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <Check size={13} /> Posted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock size={13} /> Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 rounded-lg bg-ivory px-4 py-3 text-xs text-slate-label italic">
                Revenue recognition per IFRS 15.35(b) — output method, % certified by quantity surveyor
              </p>
            </div>
          )}

          {activeTab === 'Cost Breakdown' && (
            <div>
              <div className="mb-6 flex items-center gap-8">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={marinaHeightsCostCategories}
                        dataKey="actual"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {marinaHeightsCostCategories.map((c) => (
                          <Cell key={c.label} fill={c.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {marinaHeightsCostCategories.map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-sm" style={{ background: c.color }} />
                      <span className="text-slate-label">{c.label}</span>
                      <span className="ml-auto font-medium text-navy">{formatAED(c.actual)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-slate-label">
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 text-right font-medium">Budget</th>
                    <th className="pb-2 text-right font-medium">Actual</th>
                    <th className="pb-2 text-right font-medium">Variance</th>
                    <th className="pb-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {costVariance.map((c) => (
                    <tr key={c.label} className="border-b border-border/50 transition hover:bg-ivory">
                      <td className="py-2.5 text-navy">{c.label}</td>
                      <td className="py-2.5 text-right text-slate-label">{formatAED(c.budget)}</td>
                      <td className="py-2.5 text-right text-slate-label">{formatAED(c.actual)}</td>
                      <td className={`py-2.5 text-right font-medium ${c.variance <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {c.variance <= 0 ? '' : '('}{formatAED(Math.abs(c.variance))}{c.variance <= 0 ? '' : ')'}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          c.variance <= 0
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Contractor Bills' && (
            <div className="flex h-full items-center justify-center text-slate-label">
              <p className="text-sm">24 contractor bills tracked — full invoice matching available in the Accounting module.</p>
            </div>
          )}

          {activeTab === 'Unit Sales' && (
            <div className="flex h-full items-center justify-center text-slate-label">
              <p className="text-sm">287 of 342 units sold (83.9%) — detailed SPA tracker available in the IFRS Hub.</p>
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="flex h-full items-center justify-center text-slate-label">
              <p className="text-sm">Project documents — permits, RERA filings, contracts, and QS reports.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
