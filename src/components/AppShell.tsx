import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  BarChart2,
  Building2,
  TrendingUp,
  Layers,
  FileText,
  ClipboardCheck,
  Settings,
  ChevronDown,
  Bell,
  FileDown,
  FileText as DocIcon,
  TrendingDown,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  { label: 'Command Center', icon: Zap, route: '/command-center' },
  { label: 'Financial Overview', icon: BarChart2, route: '/financial-overview' },
  { label: 'Projects', icon: Building2, route: '/projects' },
  { label: 'Cash Flow', icon: TrendingUp, route: null },
  { label: 'Assets', icon: Layers, route: null },
  { label: 'Liabilities', icon: FileText, route: null },
  { label: 'Reports', icon: FileText, route: null },
  { label: 'Audit & Compliance', icon: ClipboardCheck, route: null },
  { label: 'Settings', icon: Settings, route: null },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/command-center': 'Command Center',
  '/financial-overview': 'Financial Overview',
  '/projects': 'Projects',
  '/fund-management': 'Fund Management',
  '/ifrs': 'IFRS Hub',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const pageTitle = pageTitles[location.pathname] ?? 'Command Center';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleNav = (route: string | null, label: string) => {
    if (route) {
      navigate(route);
    } else {
      showToast(`${label} — Coming soon`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-ivory">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-white">
        <div className="flex h-16 items-center px-5">
          <button
            onClick={() => navigate('/')}
            className="text-xl font-bold tracking-tight text-white"
          >
            Estate<span className="text-gold">CFO</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.route && location.pathname === item.route) ||
              (!item.route && pageTitles[location.pathname] === item.label);
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.route, item.label)}
                className={`group mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-white/5 font-medium text-gold shadow-[inset_3px_0_0_0_#C79A2B]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>
        {/* Entity selector pill */}
        <div className="border-t border-[#1e3a5f] p-3">
          <button className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-gold" />
              <div>
                <p className="text-xs font-medium text-white">Dubai Holdings</p>
                <p className="text-[11px] text-white/50">FY 2024 · AED</p>
              </div>
            </div>
            <ChevronDown size={16} className="text-white/50" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
          <h1 className="text-xl font-semibold text-navy-deep">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-label transition hover:bg-ivory">
              <DocIcon size={18} />
            </button>
            <button
              onClick={() => showToast('Export coming soon')}
              className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-[13px] font-medium text-white transition hover:bg-goldLight"
            >
              <FileDown size={15} />
              Export PDF
            </button>
            <button className="relative rounded-lg p-2 text-slate-label transition hover:bg-ivory">
              <Bell size={18} />
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export function Delta({ positive, children }: { positive: boolean; children: React.ReactNode }) {
  return (
    <span className={`flex items-center gap-1 text-[13px] font-medium ${positive ? 'text-indigo-metric' : 'text-amber-alert'}`}>
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {children}
    </span>
  );
}
