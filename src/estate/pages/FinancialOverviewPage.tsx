import { useState } from 'react';
import { FileDown, FileSpreadsheet, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, FileText, Building2, Shield, Flag } from 'lucide-react';
import { AppShell } from '@/estate/components/AppShell';
import { IncomeStatementTab } from '@/estate/components/IncomeStatementTab';
import { BalanceSheetTab } from '@/estate/components/BalanceSheetTab';
import { CashFlowTab } from '@/estate/components/CashFlowTab';
import { finKpis, entityPerfRows, ifrsComplianceCards } from '@/estate/lib/demoData';

type StatementTab = 'Income Statement' | 'Balance Sheet' | 'Cash Flow';
type Period = 'Q1 2024' | 'Q2 2024' | 'Q3 2024' | 'Q4 2024' | 'FY 2024';
type EntityFilter = 'All Entities' | 'Dubai Holdings' | 'Marina Heights LLC' | 'Palm View Residences' | 'Desert Oasis Fund I';

const periods: Period[] = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'FY 2024'];
const statementTabs: StatementTab[] = ['Income Statement', 'Balance Sheet', 'Cash Flow'];
const entityPills: EntityFilter[] = ['All Entities', 'Dubai Holdings', 'Marina Heights LLC', 'Palm View Residences', 'Desert Oasis Fund I'];

const ifrsIconMap: Record<string, typeof FileText> = {
  FileText: FileText,
  Building2: Building2,
  Shield: Shield,
  Flag: Flag,
};

export function FinancialOverviewPage() {
  const [activeTab, setActiveTab] = useState<StatementTab>('Income Statement');
  const [period, setPeriod] = useState<Period>('FY 2024');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('All Entities');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredEntities = entityPerfRows.filter((r) => {
    if (entityFilter === 'All Entities') return true;
    return r.entity === entityFilter || r.isTotal;
  });

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-deep">Financial Overview</h1>
            <p className="mt-1 text-sm text-slate-label">
              Consolidated financial statements across all entities · {period} · Amounts in AED millions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 rounded-lg border border-border bg-white p-0.5">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    period === p
                      ? 'border-b-2 border-gold text-navy-deep'
                      : 'text-slate-label hover:text-navy'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => showToast('Exporting PDF of current view...')}
              className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition hover:bg-goldLight"
            >
              <FileDown size={15} /> Export PDF
            </button>
            <button
              onClick={() => showToast('Exporting Excel of current view...')}
              className="flex items-center gap-2 rounded-lg border border-navy bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy hover:text-white"
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
          </div>
        </div>

        {/* Entity filter pills */}
        <div className="mt-5 flex gap-2 overflow-x-auto">
          {entityPills.map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                entityFilter === e
                  ? 'bg-gold text-white'
                  : 'bg-white text-slate-label border border-border hover:border-gold/40 hover:text-navy'
              }`}
            >
              {e}
            </button>
          ))}
          <button className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-4 py-1.5 text-xs text-slate-label transition hover:border-gold hover:text-gold">
            + Consolidation View
          </button>
        </div>

        {/* KPI summary row */}
        <div className="mt-5 grid grid-cols-5 gap-4">
          {finKpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-label">{k.label}</p>
              <p className="mt-1.5 text-lg font-bold text-navy-deep" style={{ fontVariantNumeric: 'tabular-nums' }}>{k.value}</p>
              <p className="mt-1 text-[11px] text-slate-label">{k.sub}</p>
              <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${k.negative ? 'text-red-600' : 'text-green-700'}`}>
                {k.negative ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                {k.sub2}
              </p>
            </div>
          ))}
        </div>

        {/* Statement tabs */}
        <div className="mt-6 flex gap-1 border-b border-border">
          {statementTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? 'border-gold text-gold'
                  : 'border-transparent text-slate-label hover:text-navy'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {activeTab === 'Income Statement' && <IncomeStatementTab />}
          {activeTab === 'Balance Sheet' && <BalanceSheetTab />}
          {activeTab === 'Cash Flow' && <CashFlowTab />}
        </div>

        {/* Entity breakdown table */}
        <div className="mt-6 rounded-xl border border-border bg-white p-5">
          <h2 className="text-base font-semibold text-navy">Performance by Entity</h2>
          <p className="text-xs text-slate-label">FY 2024 · AED Millions</p>
          <table className="mt-4 w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="border-b-2 border-navy text-left text-[11px] uppercase tracking-wide text-slate-label">
                <th className="pb-2 font-medium">Entity</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Gross Profit</th>
                <th className="pb-2 text-right font-medium">Margin</th>
                <th className="pb-2 text-right font-medium">EBITDA</th>
                <th className="pb-2 text-right font-medium">Net Income</th>
                <th className="pb-2 text-right font-medium">Total Assets</th>
                <th className="pb-2 text-right font-medium">Cash</th>
                <th className="pb-2 text-right font-medium">ROE</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((row) => (
                <tr
                  key={row.entity}
                  className={`border-b border-border/30 transition hover:bg-ivory ${
                    row.isTotal ? 'bg-gold/5 font-bold [border-left:3px_solid_#C79A2B]' : ''
                  }`}
                >
                  <td className="py-2.5 text-navy-deep">{row.entity}</td>
                  <td className="py-2.5 text-right text-navy">{row.revenue}</td>
                  <td className="py-2.5 text-right text-navy">{row.grossProfit}</td>
                  <td className="py-2.5 text-right text-slate-label">{row.margin}</td>
                  <td className="py-2.5 text-right text-navy">{row.ebitda}</td>
                  <td className="py-2.5 text-right text-navy">{row.netIncome}</td>
                  <td className="py-2.5 text-right text-navy">{row.totalAssets}</td>
                  <td className="py-2.5 text-right text-slate-label">{row.cash}</td>
                  <td className="py-2.5 text-right font-medium text-indigo-metric">{row.roe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* IFRS Compliance Panel */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-navy-deep">IFRS Compliance Status</h2>
          <p className="text-sm text-slate-label">Key accounting standards applied</p>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {ifrsComplianceCards.map((card) => {
              const Icon = ifrsIconMap[card.icon] ?? FileText;
              const isCompliant = card.statusColor === 'green';
              return (
                <div
                  key={card.title}
                  className="group relative rounded-xl border border-border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                      <Icon size={20} className="text-gold" />
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isCompliant ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {isCompliant ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {card.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-navy">{card.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-label">{card.body}</p>
                  <p className="mt-3 border-t border-border pt-2 text-[11px] text-slate-label">{card.footnote}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </AppShell>
  );
}
