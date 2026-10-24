import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-navy/10 bg-ivory">{children}</div>;
}

export function Delta({ positive, children }: { positive: boolean; children: ReactNode }) {
  return (
    <span className={`flex items-center gap-1 text-[13px] font-medium ${positive ? 'text-indigo-metric' : 'text-amber-alert'}`}>
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {children}
    </span>
  );
}
