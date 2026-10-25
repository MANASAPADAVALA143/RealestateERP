import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  ChartColumn,
  CreditCard,
  File,
  LayoutGrid,
  Banknote,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  HardHat,
  House,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Menu,
  Network,
  Receipt,
  Shield,
  Siren,
  Sparkles,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { alerts, getApprovals, subscribeApprovals } from "@/lib/demoData";

const groups: { label: string; items: { to: string; label: string; icon: ComponentType<{ className?: string }>; tag?: "red" | "gold" }[] }[] = [
  {
    label: "Command Center",
    items: [
      { to: "/", label: "CEO Dashboard", icon: LayoutDashboard },
      { to: "/actions", label: "Action Centre", icon: ListChecks },
      { to: "/companies", label: "Companies", icon: Building2 },
      { to: "/rentals", label: "Rentals", icon: House },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/ownership", label: "Ownership", icon: Network },
      { to: "/loans", label: "Loans & Notes", icon: Banknote },
      { to: "/insurance", label: "Insurance", icon: Shield },
    ],
  },
  {
    label: "Finance & Cash",
    items: [
      { to: "/cash", label: "Cash Overview", icon: Wallet },
      { to: "/cash-war-room", label: "Cash War Room", icon: Siren, tag: "red" },
      { to: "/receivables", label: "Receivables", icon: Receipt },
      { to: "/statements", label: "Financial Statements", icon: FileText },
      { to: "/snapshot", label: "Financial Snapshot", icon: Gauge },
      { to: "/assets", label: "Assets", icon: Landmark },
    ],
  },
  {
    label: "Feature OS",
    items: [
      { to: "/sales", label: "Sales Pipeline", icon: TrendingUp },
      { to: "/procurement", label: "Procurement", icon: ShoppingCart },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/hr", label: "HR & Payroll", icon: Users },
      { to: "/capex", label: "Projects & Capex", icon: HardHat },
      { to: "/approvals", label: "Approvals Queue", icon: ClipboardCheck },
    ],
  },
  {
    label: "Real Estate ERP",
    items: [
      { to: "/estate/dashboard", label: "Estate Dashboard", icon: LayoutDashboard },
      { to: "/estate/command-center", label: "Estate Command Center", icon: Zap },
      { to: "/estate/financial-overview", label: "Financial Overview", icon: TrendingUp },
      { to: "/estate/projects", label: "Projects", icon: Building2 },
      { to: "/estate/construction", label: "Construction Control Tower", icon: HardHat },
      { to: "/estate/fund-management", label: "Fund Management", icon: Landmark },
      { to: "/estate/ifrs", label: "IFRS 15 & 16 Hub", icon: ClipboardCheck },
      { to: "/estate", label: "EstateCFO Home & Login", icon: House },
    ],
  },
  {
    label: "Real Estate Portfolio",
    items: [
      { to: "/gnanova/realestate/dashboard", label: "Company Dashboard", icon: House },
      { to: "/gnanova/realestate/properties", label: "Properties", icon: LayoutGrid },
      { to: "/gnanova/realestate/loans", label: "Loans & Notes", icon: FileText },
      { to: "/gnanova/realestate/assets", label: "Assets Detail", icon: Briefcase },
      { to: "/gnanova/realestate/insurance", label: "Insurance", icon: Shield },
      { to: "/gnanova/realestate/ownership", label: "Ownership Detail", icon: Users },
      { to: "/gnanova/realestate/capital-calls", label: "Capital Calls", icon: CreditCard },
      { to: "/gnanova/realestate/financial-snapshot", label: "Financial Snapshot", icon: ChartColumn },
      { to: "/gnanova/realestate/accounts-payable", label: "Accounts Payable", icon: ArrowDown },
      { to: "/gnanova/realestate/accounts-receivable", label: "Accounts Receivable", icon: ArrowUp },
      { to: "/gnanova/realestate/treasury", label: "Treasury", icon: Landmark },
      { to: "/gnanova/realestate/statements", label: "Statements", icon: File },
    ],
  },
  {
    label: "System",
    items: [{ to: "/alerts", label: "Alerts", icon: Bell }],
  },
  {
    label: "AI Advisor",
    items: [{ to: "/decision-simulator", label: "Decision Simulator", icon: Sparkles, tag: "gold" }],
  },
];

const titles: Record<string, string> = {
  "/": "CEO Dashboard",
  "/actions": "Action Centre",
  "/companies": "Companies",
  "/cash": "Cash & Liquidity",
  "/cash-war-room": "Cash War Room",
  "/receivables": "Receivables",
  "/decision-simulator": "Decision Simulator",
  "/ownership": "Ownership",
  "/loans": "Loans & Notes",
  "/insurance": "Insurance",
  "/statements": "Financial Statements",
  "/snapshot": "Financial Snapshot",
  "/assets": "Assets",
  "/sales": "Sales Pipeline",
  "/procurement": "Procurement",
  "/inventory": "Inventory",
  "/hr": "HR & Payroll",
  "/capex": "Projects & Capex",
  "/approvals": "Approvals Queue",
  "/alerts": "Alerts",
};

const sections: Record<string, string> = {
  "/": "Command Center",
  "/actions": "Command Center",
  "/companies": "Command Center",
  "/cash": "Finance & Cash",
  "/cash-war-room": "Finance & Cash",
  "/receivables": "Finance & Cash",
  "/decision-simulator": "AI Advisor",
  "/ownership": "Manage",
  "/loans": "Manage",
  "/insurance": "Manage",
  "/statements": "Finance & Cash",
  "/snapshot": "Finance & Cash",
  "/assets": "Finance & Cash",
  "/sales": "Feature OS",
  "/procurement": "Feature OS",
  "/inventory": "Feature OS",
  "/hr": "Feature OS",
  "/capex": "Feature OS",
  "/approvals": "Feature OS",
  "/alerts": "System",
};

function resolveChrome(pathname: string): { title: string; section: string } {
  const estate: Record<string, string> = {
    "/estate/dashboard": "Estate Dashboard",
    "/estate/command-center": "Estate Command Center",
    "/estate/financial-overview": "Financial Overview",
    "/estate/projects": "Projects",
    "/estate/construction": "Construction Control Tower",
    "/estate/fund-management": "Fund Management",
    "/estate/ifrs": "IFRS 15 & 16 Hub",
  };
  if (estate[pathname]) return { title: estate[pathname], section: "Real Estate ERP" };
  const portfolioTitles: Record<string, string> = {
    dashboard: "Company Dashboard",
    properties: "Properties",
    loans: "Loans & Notes",
    assets: "Assets Detail",
    insurance: "Insurance",
    ownership: "Ownership Detail",
    "capital-calls": "Capital Calls",
    "financial-snapshot": "Financial Snapshot",
    "accounts-payable": "Accounts Payable",
    "accounts-receivable": "Accounts Receivable",
    treasury: "Treasury",
    statements: "Statements",
  };
  const portfolioMatch = pathname.match(/^\/gnanova\/realestate\/([^/]+)$/);
  if (portfolioMatch && portfolioTitles[portfolioMatch[1]]) {
    return { title: portfolioTitles[portfolioMatch[1]], section: "Real Estate Portfolio" };
  }
  if (pathname === "/gnanova/integrations") return { title: "Integrations", section: "Real Estate Portfolio" };
  if (pathname === "/rentals") return { title: "Rentals", section: "Command Center" };
  if (pathname.startsWith("/rentals/")) return { title: "Unit register", section: "Command Center" };
  const loanParts = pathname.split("/").filter(Boolean);
  if (loanParts[0] === "loans" && loanParts[1]) {
    return { title: loanParts[2] === "edit" ? "Edit loan" : "Loan detail", section: "Manage" };
  }
  if (titles[pathname]) return { title: titles[pathname], section: sections[pathname] ?? "Command" };
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "companies" && parts[1]) {
    const names: Record<string, string> = {
      snapshot: "Financial Snapshot",
      statements: "Statements",
      loans: "Loans & Notes",
      assets: "Assets",
      insurance: "Insurance",
      ownership: "Ownership",
      "capital-calls": "Capital Calls",
    };
    if (parts[2] === "loans" && parts[3]) return { title: "Loan detail", section: "Manage" };
    if (parts[2] && names[parts[2]]) return { title: names[parts[2]], section: "Manage" };
    return { title: "Company Dashboard", section: "Manage" };
  }
  return { title: "Gnanova", section: "Command" };
}

export function AppShell() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const chrome = resolveChrome(location.pathname);
  const title = chrome.title;
  const section = chrome.section;
  const criticals = alerts.filter((alert) => alert.severity === "Critical").length;
  const approvals = useSyncExternalStore(subscribeApprovals, getApprovals, getApprovals);
  const pendingApprovals = approvals.filter((item) => item.state === "pending").length;

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    document.title = `${title} · Gnanova Group CFO`;
  }, [location.pathname, title]);

  const toggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  };

  return (
    <div className="min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-navy"
      >
        Skip to content
      </a>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-navy/60 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-gold/25 bg-navy text-ivory transition-all duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "w-72 lg:w-[4.75rem]" : "w-72"}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-navy">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className={collapsed ? "min-w-0 lg:hidden" : "min-w-0"}>
            <p className="font-serif text-xl leading-none text-ivory">Gnanova</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-gold">Group CFO</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 text-ivory/70 hover:bg-white/10 hover:text-ivory lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary">
          {groups.map((group) => (
            <div key={group.label} className="pb-2">
              <p className={`px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80 ${collapsed ? "lg:sr-only" : ""}`}>
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge =
                  item.to === "/alerts" && criticals > 0
                    ? criticals
                    : item.to === "/approvals" && pendingApprovals > 0
                      ? pendingApprovals
                      : 0;
                const badgeClass = item.to === "/alerts" ? "bg-red-600 text-white" : "bg-gold text-navy";
                const dotClass = item.to === "/alerts" ? "bg-red-500" : "bg-gold";
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/" || item.to === "/estate"}
                    title={item.label}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-gold ${
                        collapsed ? "lg:justify-center lg:px-2" : ""
                      } ${
                        isActive
                          ? "bg-gold text-navy"
                          : "text-ivory/75 hover:bg-white/10 hover:text-ivory"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
                    {badge > 0 ? (
                      <span
                        className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${badgeClass} ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                    {item.tag ? (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          item.tag === "red" ? "bg-red-600 text-white" : "bg-gold text-navy"
                        } ${collapsed ? "lg:hidden" : ""}`}
                      >
                        NEW
                      </span>
                    ) : null}
                    {badge > 0 && collapsed ? (
                      <span className={`absolute right-2 top-2 hidden h-2 w-2 rounded-full lg:block ${dotClass}`} />
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={`border-t border-white/10 px-4 py-4 text-[11px] text-ivory/50 ${collapsed ? "lg:hidden" : ""}`}>
          <p>Agarwal Group</p>
          <p className="mt-1 text-gold/90">Hyderabad · FY26</p>
        </div>
      </aside>

      <div className={`transition-[padding] duration-300 ${collapsed ? "lg:pl-[4.75rem]" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-navy/10 bg-ivory/90 px-4 py-3 backdrop-blur-md md:px-8">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy/10 bg-white text-navy shadow-sm hover:border-gold/50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy/45">{section}</p>
            <h1 className="truncate font-serif text-xl text-navy md:text-2xl">{title}</h1>
          </div>
          <span className="hidden items-center rounded-full border border-gold/40 bg-white px-3 py-1.5 text-xs font-medium text-navy sm:inline-flex">
            Agarwal Group · Hyderabad
          </span>
        </header>

        <main id="content" className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <Outlet />
            <p className="pt-2 text-center text-[11px] tracking-wide text-navy/40">
              {location.pathname.startsWith("/gnanova/")
                ? "Illustrative demo data · US dollars · Meridian Holdings LP, Meridian Ventures Group"
                : location.pathname.startsWith("/estate/")
                  ? "Illustrative demo data · AED · Dubai Holdings real estate book"
                  : "Unaudited management accounts in ₹ Crore · Demonstration data for Agarwal Group, Hyderabad"}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
