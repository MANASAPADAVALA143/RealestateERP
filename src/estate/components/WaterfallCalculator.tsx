import { ChevronDown, Check, Clock, Circle } from 'lucide-react';
import { waterfallSteps, waterfallSummary, waterfallTotals } from '@/estate/lib/demoData';

const stepStyles: Record<string, { box: string; icon: typeof Check; iconColor: string; badge: string }> = {
  reached: { box: 'border-gold bg-gold/5', icon: Check, iconColor: 'text-gold', badge: 'bg-gold/10 text-gold' },
  'in-progress': { box: 'border-gold/50 bg-gold/5', icon: Clock, iconColor: 'text-amber-600', badge: 'bg-amber-50 text-amber-700' },
  'not-reached': { box: 'border-border bg-slate-50', icon: Circle, iconColor: 'text-slate-300', badge: 'bg-slate-100 text-slate-500' },
};

const statusLabels: Record<string, string> = {
  reached: 'Reached',
  'in-progress': 'In progress',
  'not-reached': 'Not yet reached',
};

export function WaterfallCalculator() {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <h3 className="text-base font-semibold text-navy">Distribution Waterfall</h3>
      <p className="text-xs text-slate-label">Desert Oasis Fund I — Projected at exit</p>

      {/* Waterfall steps */}
      <div className="mt-4 space-y-0">
        {waterfallSteps.map((step, i) => {
          const style = stepStyles[step.status];
          const Icon = style.icon;
          return (
            <div key={step.step}>
              <div className={`rounded-lg border-2 p-3.5 ${style.box}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={style.iconColor} />
                    <div>
                      <p className="text-xs font-semibold text-slate-label">{step.step}</p>
                      <p className="text-sm font-medium text-navy">{step.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-navy-deep">{step.amount}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
                      {statusLabels[step.status]}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-label">{step.description}</p>
              </div>
              {i < waterfallSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ChevronDown size={18} className="text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary box */}
      <div className="mt-5 rounded-lg border-2 border-gold/40 bg-ivory p-4">
        <div className="space-y-1.5">
          {waterfallSummary.map((item) => (
            <div key={item.label} className="flex justify-between text-xs">
              <span className="text-slate-label">{item.label}</span>
              <span className="font-medium text-navy" style={{ fontFamily: 'monospace' }}>{item.value}</span>
            </div>
          ))}
          <div className="my-2 border-t border-gold/30" />
          {waterfallTotals.map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="font-medium text-navy">{item.label}</span>
              <span className="font-bold text-gold" style={{ fontFamily: 'monospace' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
