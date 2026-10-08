import { X, Download, Send, User } from 'lucide-react';
import { lpDetailKpis, lpTransactions, lpProjectedExit } from '@/lib/demoData';

export function LpDetailDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-navy/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[520px] max-w-full flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-navy-deep">Abu Dhabi Investment Office — Capital Account</h2>
            <p className="text-xs text-slate-label">Desert Oasis Fund I · Institutional LP</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-label transition hover:bg-ivory">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            {lpDetailKpis.map((k) => (
              <div key={k.label} className="rounded-lg border border-border bg-ivory p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-label">{k.label}</p>
                <p className="mt-1 text-lg font-bold text-navy-deep">{k.value}</p>
                {k.sub && <p className="text-[11px] text-indigo-metric">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Capital account statement */}
          <h3 className="mb-3 mt-6 text-sm font-semibold text-navy">Capital Account Statement</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-slate-label">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Transaction</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 text-right font-medium">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {lpTransactions.map((t, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/50 ${t.pending ? 'bg-amber-50/50' : ''} transition hover:bg-ivory`}
                >
                  <td className="py-2.5 text-slate-label">{t.date}</td>
                  <td className="py-2.5 text-navy">{t.transaction}</td>
                  <td className={`py-2.5 text-right font-medium ${t.amount.startsWith('(') ? 'text-red-600' : 'text-green-700'}`}>
                    {t.amount.startsWith('(') ? `AED ${t.amount}` : `AED ${t.amount}`}
                  </td>
                  <td className="py-2.5 text-right text-navy-deep">AED {t.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Projected exit return */}
          <div className="mt-6 rounded-xl border-2 border-gold/40 bg-ivory p-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Projected Exit Return</h3>
            <div className="space-y-2">
              {lpProjectedExit.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-label">{item.label}</span>
                  <span className="font-bold text-navy-deep">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 space-y-2.5">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-goldLight">
              <Download size={16} /> Download Capital Account Statement
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy py-2.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white">
              <Send size={16} /> Send Q2 Report to LP
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-slate-label transition hover:bg-ivory">
              <User size={16} /> View Contact Details
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
