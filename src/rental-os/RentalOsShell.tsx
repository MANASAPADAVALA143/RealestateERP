import { useState, useEffect, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { NotificationBell } from "../alerts/ui/NotificationBell.tsx";
import {
  LayoutDashboard, Building2, Home, Users, FileText, Receipt, Wallet, Wrench,
  ShoppingCart, BookOpen, BarChart2, Bell, Settings, BrainCircuit, ClipboardCheck,
  Menu, X, ChevronDown, ChevronRight, Layers, Building, DollarSign, AlertCircle,
  TrendingUp, Scale, PiggyBank, Truck, Zap, PlusCircle, Landmark, PieChart,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tag?: "new" | "ai";
}

interface NavGroup {
  label: string;
  icon: ComponentType<{ className?: string }>;
  items: NavItem[];
  baseHref?: string;
}

const navGroups: NavGroup[] = [
  {
    label: "Command Centre",
    icon: LayoutDashboard,
    baseHref: "/rental-os",
    items: [
      { to: "/rental-os", label: "Rental Command Centre", icon: LayoutDashboard },
    ],
  },
  {
    label: "Properties",
    icon: Building2,
    baseHref: "/rental-os/properties",
    items: [
      { to: "/rental-os/properties", label: "Property Register", icon: Building2 },
      { to: "/rental-os/buildings", label: "Buildings", icon: Building },
      { to: "/rental-os/units", label: "Units", icon: Layers },
      { to: "/rental-os/occupancy", label: "Occupancy", icon: Home },
    ],
  },
  {
    label: "Tenants",
    icon: Users,
    baseHref: "/rental-os/tenants",
    items: [
      { to: "/rental-os/tenants", label: "Tenant Register", icon: Users },
      { to: "/rental-os/tenants/onboarding", label: "Onboarding", icon: ClipboardCheck },
    ],
  },
  {
    label: "Leasing",
    icon: FileText,
    baseHref: "/rental-os/leases",
    items: [
      { to: "/rental-os/leases", label: "Lease Register", icon: FileText },
      { to: "/rental-os/leases/create", label: "New Lease", icon: FileText },
      { to: "/rental-os/leases/renewals", label: "Renewals", icon: ChevronRight },
      { to: "/rental-os/leases/terminations", label: "Terminations", icon: X },
    ],
  },
  {
    label: "Revenue & Billing",
    icon: Receipt,
    baseHref: "/rental-os/billing",
    items: [
      { to: "/rental-os/billing", label: "Rental Schedules", icon: Receipt },
      { to: "/estate/ar/billing", label: "Billing Run", icon: Receipt },
      { to: "/estate/ar/invoices", label: "Invoice Register", icon: FileText },
    ],
  },
  {
    label: "Collections",
    icon: AlertCircle,
    baseHref: "/rental-os/collections",
    items: [
      { to: "/estate/ar", label: "Collections Dashboard", icon: LayoutDashboard },
      { to: "/estate/ar/ageing", label: "AR Ageing", icon: Scale },
      { to: "/estate/ar/collections", label: "Follow-ups", icon: AlertCircle },
      { to: "/estate/ar/disputes", label: "Disputes", icon: AlertCircle },
    ],
  },
  {
    label: "Payments",
    icon: Wallet,
    baseHref: "/rental-os/payments",
    items: [
      { to: "/rental-os/payments", label: "Payment Dashboard", icon: Wallet },
      { to: "/rental-os/payments/create", label: "Record Receipt", icon: PlusCircle },
      { to: "/estate/ar/payments", label: "Payment Register (AR)", icon: Wallet },
      { to: "/rental-os/bank", label: "Bank Import", icon: DollarSign },
      { to: "/rental-os/reconciliation", label: "Reconciliation", icon: Scale },
    ],
  },
  {
    label: "Deposits",
    icon: PiggyBank,
    baseHref: "/rental-os/deposits",
    items: [
      { to: "/rental-os/deposits", label: "Deposit Register", icon: PiggyBank },
      { to: "/rental-os/deposits/refunds", label: "Refunds & Applications", icon: DollarSign },
      { to: "/rental-os/settlement", label: "Tenant Settlement", icon: Scale },
    ],
  },
  {
    label: "Maintenance",
    icon: Wrench,
    baseHref: "/rental-os/maintenance",
    items: [
      { to: "/rental-os/maintenance", label: "Dashboard", icon: LayoutDashboard },
      { to: "/rental-os/maintenance/requests", label: "Requests", icon: Wrench, tag: "new" },
      { to: "/rental-os/maintenance/work-orders", label: "Work Orders", icon: ClipboardCheck },
      { to: "/rental-os/maintenance/preventive", label: "Preventive PM", icon: Settings },
    ],
  },
  {
    label: "Facilities",
    icon: Building,
    baseHref: "/rental-os/facilities",
    items: [
      { to: "/rental-os/facilities/assets", label: "Asset Register", icon: Layers },
    ],
  },
  {
    label: "Vendors",
    icon: Truck,
    baseHref: "/rental-os/vendors",
    items: [
      { to: "/rental-os/vendors", label: "Vendor Register", icon: Truck },
      { to: "/rental-os/vendors/contracts", label: "Contracts", icon: FileText },
    ],
  },
  {
    label: "Procurement",
    icon: ShoppingCart,
    baseHref: "/rental-os/procurement",
    items: [
      { to: "/rental-os/procurement/requisitions", label: "Requisitions", icon: ShoppingCart },
      { to: "/rental-os/procurement/purchase-orders", label: "Purchase Orders", icon: FileText },
      { to: "/rental-os/procurement/grn", label: "Goods Receipts", icon: ClipboardCheck },
    ],
  },
  {
    label: "Ops Reports",
    icon: BarChart2,
    baseHref: "/rental-os/ops-reports",
    items: [
      { to: "/rental-os/ops-reports", label: "Operations Reports", icon: BarChart2 },
    ],
  },
  {
    label: "Finance",
    icon: BookOpen,
    baseHref: "/rental-os/finance",
    items: [
      { to: "/rental-os/finance", label: "Finance Dashboard", icon: LayoutDashboard },
      { to: "/rental-os/finance/invoices", label: "Vendor Invoices", icon: FileText },
      { to: "/rental-os/finance/payments", label: "AP Payments", icon: Wallet },
      { to: "/rental-os/finance/journals", label: "Journal Entries", icon: BookOpen },
      { to: "/rental-os/finance/accounts", label: "Chart of Accounts", icon: Layers },
      { to: "/rental-os/finance/periods", label: "Period Closing", icon: Settings },
    ],
  },
  {
    label: "GL Reports",
    icon: TrendingUp,
    baseHref: "/rental-os/finance/reports",
    items: [
      { to: "/rental-os/finance/reports/trial-balance", label: "Trial Balance", icon: Scale },
      { to: "/rental-os/finance/reports/pnl", label: "P&L Statement", icon: TrendingUp },
      { to: "/rental-os/finance/reports/balance-sheet", label: "Balance Sheet", icon: Scale },
      { to: "/rental-os/finance/bank-recon", label: "Bank Reconciliation", icon: DollarSign },
    ],
  },
  {
    label: "Portfolio Intelligence",
    icon: TrendingUp,
    baseHref: "/rental-os/portfolio",
    items: [
      { to: "/rental-os/portfolio", label: "Property Performance", icon: TrendingUp },
      { to: "/rental-os/portfolio/yield", label: "Rental Yield", icon: BarChart2 },
      { to: "/rental-os/portfolio/cashflow", label: "Cash Flow", icon: DollarSign },
    ],
  },
  {
    label: "AI Assistant",
    icon: BrainCircuit,
    baseHref: "/rental-os/ai",
    items: [
      { to: "/rental-os/ai", label: "AI Rental Advisor", icon: BrainCircuit, tag: "ai" },
      { to: "/ai-analyst", label: "AI Financial Analyst", icon: Zap },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart2,
    baseHref: "/rental-os/analytics",
    items: [
      { to: "/rental-os/analytics",             label: "Executive Dashboard",         icon: LayoutDashboard, tag: "new" as const },
      { to: "/rental-os/analytics/ar-aging",    label: "AR Aging Report",             icon: Scale },
      { to: "/rental-os/analytics/revenue-trend", label: "Revenue vs Expense Trend",  icon: TrendingUp },
      { to: "/rental-os/analytics/occupancy",   label: "Occupancy Heatmap",           icon: Building2 },
      { to: "/rental-os/analytics/maint-cost",  label: "Maintenance Cost Analysis",   icon: Wrench },
      { to: "/rental-os/alerts",                label: "Alerts Centre",               icon: Bell,          tag: "new" as const },
    ],
  },
  {
    label: "Budgeting",
    icon: PieChart,
    baseHref: "/rental-os/budgeting",
    items: [
      { to: "/rental-os/entities",             label: "Entity Registry",    icon: Landmark,  tag: "new" as const },
      { to: "/rental-os/budgeting",            label: "Budgets",            icon: PieChart,  tag: "new" as const },
      { to: "/rental-os/budgeting/variance",    label: "Actual vs Budget",   icon: TrendingUp, tag: "new" as const },
      { to: "/rental-os/budgeting/forecasts",   label: "Forecasting",        icon: Zap,        tag: "new" as const },
    ],
  },
  {
    label: "Admin",
    icon: Settings,
    baseHref: "/rental-os/admin",
    items: [
      { to: "/estate/ar/settings", label: "AR Settings", icon: Settings },
      { to: "/rental-os/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/rental-os/admin/users", label: "Users & Roles", icon: Users },
    ],
  },
];

function resolveTitle(pathname: string): { title: string; section: string } {
  const map: Record<string, { title: string; section: string }> = {
    "/rental-os": { title: "Rental Command Centre", section: "Command Centre" },
    "/rental-os/properties": { title: "Property Register", section: "Properties" },
    "/rental-os/buildings": { title: "Buildings", section: "Properties" },
    "/rental-os/units": { title: "Units", section: "Properties" },
    "/rental-os/occupancy": { title: "Occupancy", section: "Properties" },
    "/rental-os/tenants": { title: "Tenant Register", section: "Tenants" },
    "/rental-os/tenants/onboarding": { title: "Tenant Onboarding", section: "Tenants" },
    "/rental-os/leases": { title: "Lease Register", section: "Leasing" },
    "/rental-os/leases/create": { title: "New Lease", section: "Leasing" },
    "/rental-os/leases/renewals": { title: "Lease Renewals", section: "Leasing" },
    "/rental-os/leases/terminations": { title: "Lease Terminations", section: "Leasing" },
    "/rental-os/billing": { title: "Rental Schedules", section: "Revenue & Billing" },
    "/rental-os/deposits": { title: "Deposit Register", section: "Deposits" },
    "/rental-os/deposits/refunds": { title: "Deposit Refunds", section: "Deposits" },
    "/rental-os/maintenance": { title: "Maintenance Dashboard", section: "Maintenance" },
    "/rental-os/maintenance/requests": { title: "Maintenance Requests", section: "Maintenance" },
    "/rental-os/maintenance/requests/new": { title: "New Request", section: "Maintenance" },
    "/rental-os/maintenance/work-orders": { title: "Work Orders", section: "Maintenance" },
    "/rental-os/maintenance/work-orders/new": { title: "New Work Order", section: "Maintenance" },
    "/rental-os/maintenance/preventive": { title: "Preventive Maintenance", section: "Maintenance" },
    "/rental-os/facilities/assets": { title: "Asset Register", section: "Facilities" },
    "/rental-os/facilities/assets/new": { title: "New Asset", section: "Facilities" },
    "/rental-os/vendors": { title: "Vendor Register", section: "Vendors" },
    "/rental-os/vendors/new": { title: "New Vendor", section: "Vendors" },
    "/rental-os/vendors/contracts": { title: "Vendor Contracts", section: "Vendors" },
    "/rental-os/vendors/contracts/new": { title: "New Contract", section: "Vendors" },
    "/rental-os/procurement/requisitions": { title: "Purchase Requisitions", section: "Procurement" },
    "/rental-os/procurement/requisitions/new": { title: "New Requisition", section: "Procurement" },
    "/rental-os/procurement/purchase-orders": { title: "Purchase Orders", section: "Procurement" },
    "/rental-os/procurement/purchase-orders/new": { title: "New Purchase Order", section: "Procurement" },
    "/rental-os/procurement/grn": { title: "Goods Receipts", section: "Procurement" },
    "/rental-os/ops-reports": { title: "Operations Reports", section: "Ops Reports" },
    "/rental-os/finance": { title: "Finance Dashboard", section: "Finance" },
    "/rental-os/finance/invoices": { title: "Vendor Invoices", section: "Finance" },
    "/rental-os/finance/invoices/new": { title: "New Vendor Invoice", section: "Finance" },
    "/rental-os/finance/payments": { title: "AP Payments", section: "Finance" },
    "/rental-os/finance/payments/new": { title: "New AP Payment", section: "Finance" },
    "/rental-os/finance/journals": { title: "Journal Entries", section: "Finance" },
    "/rental-os/finance/journals/new": { title: "New Journal Entry", section: "Finance" },
    "/rental-os/finance/accounts": { title: "Chart of Accounts", section: "Finance" },
    "/rental-os/finance/periods": { title: "Period Management", section: "Finance" },
    "/rental-os/finance/bank-recon": { title: "Bank Reconciliation", section: "GL Reports" },
    "/rental-os/finance/reports/trial-balance": { title: "Trial Balance", section: "GL Reports" },
    "/rental-os/finance/reports/pnl": { title: "P&L Statement", section: "GL Reports" },
    "/rental-os/finance/reports/balance-sheet": { title: "Balance Sheet", section: "GL Reports" },
    "/rental-os/procurement": { title: "Procurement", section: "Procurement" },
    "/rental-os/analytics": { title: "Executive Dashboard", section: "Analytics" },
    "/rental-os/analytics/ar-aging": { title: "AR Aging Report", section: "Analytics" },
    "/rental-os/analytics/revenue-trend": { title: "Revenue vs Expense Trend", section: "Analytics" },
    "/rental-os/analytics/occupancy": { title: "Occupancy Heatmap", section: "Analytics" },
    "/rental-os/analytics/maint-cost": { title: "Maintenance Cost Analysis", section: "Analytics" },
    "/rental-os/alerts": { title: "Alerts Centre", section: "Analytics" },
    "/rental-os/entities": { title: "Entity Registry", section: "Budgeting" },
    "/rental-os/budgeting": { title: "Budgets", section: "Budgeting" },
    "/rental-os/budgeting/new": { title: "New Budget", section: "Budgeting" },
    "/rental-os/budgeting/variance":   { title: "Actual vs Budget", section: "Budgeting" },
    "/rental-os/budgeting/forecasts":  { title: "Forecasting",      section: "Budgeting" },
    "/rental-os/portfolio": { title: "Property Performance", section: "Portfolio Intelligence" },
    "/rental-os/portfolio/yield": { title: "Rental Yield Analysis", section: "Portfolio Intelligence" },
    "/rental-os/portfolio/cashflow": { title: "Cash Flow Forecast", section: "Portfolio Intelligence" },
    "/rental-os/ai": { title: "AI Rental Advisor", section: "AI Assistant" },
    "/rental-os/payments": { title: "Payment Dashboard", section: "Payments" },
    "/rental-os/payments/create": { title: "Record Receipt", section: "Payments" },
    "/rental-os/bank": { title: "Bank Statement Import", section: "Payments" },
    "/rental-os/reconciliation": { title: "Bank Reconciliation", section: "Payments" },
    "/rental-os/settlement": { title: "Tenant Settlement", section: "Deposits" },
    "/rental-os/finance/ap": { title: "Accounts Payable", section: "Finance" },
    "/rental-os/finance/gl": { title: "General Ledger", section: "Finance" },
    "/rental-os/admin/notifications": { title: "Notifications", section: "Admin" },
    "/rental-os/admin/users": { title: "Users & Roles", section: "Admin" },
  };
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith("/rental-os/properties/")) return { title: "Property Detail", section: "Properties" };
  if (pathname.startsWith("/rental-os/tenants/")) return { title: "Tenant Account", section: "Tenants" };
  if (pathname.startsWith("/rental-os/leases/")) return { title: "Lease Detail", section: "Leasing" };
  if (pathname.startsWith("/rental-os/maintenance/")) return { title: "Maintenance Detail", section: "Maintenance" };
  return { title: "Rental OS", section: "EstateCFO" };
}

export function RentalOsShell() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Command Centre", "Properties"]));

  const { title, section } = resolveTitle(location.pathname);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    document.title = `${title} · EstateCFO Rental OS`;
  }, [location.pathname, title]);

  // Auto-expand group whose item is active
  useEffect(() => {
    for (const group of navGroups) {
      if (group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"))) {
        setExpandedGroups((prev) => new Set([...prev, group.label]));
      }
    }
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((v) => !v);
    else setOpen((v) => !v);
  };

  return (
    <div className="min-h-screen bg-ivory">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-navy/60 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col bg-[#0A1628] text-white transition-all duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${collapsed ? "lg:w-[4.75rem]" : "w-72"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <Link to="/rental-os" className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C79A2B] text-[#0A1628]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className={collapsed ? "lg:hidden" : ""}>
              <p className="font-serif text-base leading-tight text-white">EstateCFO</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#C79A2B]">Rental OS</p>
            </div>
          </Link>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Back to Group CFO */}
        <div className={`border-b border-white/10 px-3 py-2 ${collapsed ? "lg:px-2" : ""}`}>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <ChevronRight className="h-3 w-3 rotate-180 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Back to Group CFO</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups.has(group.label);
            const hasActive = group.items.some(
              (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/")
            );

            if (collapsed) {
              // Collapsed: show only icons
              return (
                <div key={group.label} className="hidden lg:block">
                  {group.items.slice(0, 1).map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/rental-os"}
                        title={item.label}
                        className={({ isActive }) =>
                          `flex items-center justify-center rounded-xl p-2.5 transition ${
                            isActive ? "bg-[#C79A2B] text-[#0A1628]" : "text-white/60 hover:bg-white/10 hover:text-white"
                          }`
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] transition
                    ${hasActive ? "text-[#C79A2B]" : "text-white/40 hover:text-white/70"}`}
                >
                  <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{group.label}</span>
                  <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                </button>

                {isExpanded && (
                  <div className="mt-0.5 ml-2 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/rental-os" || item.to === "/estate/ar"}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition
                            ${isActive ? "bg-[#C79A2B] font-semibold text-[#0A1628]" : "text-white/65 hover:bg-white/10 hover:text-white"}`
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.tag === "new" && (
                            <span className="rounded-full bg-[#C79A2B] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0A1628]">New</span>
                          )}
                          {item.tag === "ai" && (
                            <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI</span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-white/10 px-4 py-3 ${collapsed ? "lg:hidden" : ""}`}>
          <p className="text-[11px] text-white/40">Gnanova Pro AI Technologies</p>
          <p className="mt-0.5 text-[11px] text-[#C79A2B]/80">EstateCFO · Rental OS · FY26</p>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-[padding] duration-300 ${collapsed ? "lg:pl-[4.75rem]" : "lg:pl-72"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-navy/10 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy/10 bg-white text-navy shadow-sm hover:border-[#C79A2B]/50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C79A2B]">{section}</p>
            <h1 className="truncate font-serif text-xl text-navy md:text-2xl">{title}</h1>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-[#C79A2B]/30 bg-[#C79A2B]/5 px-3 py-1.5 text-xs font-medium text-navy">
              Gnanova Group · Hyderabad
            </span>
            <NotificationBell />
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <Outlet />
            <p className="pt-2 text-center text-[11px] tracking-wide text-navy/40">
              Gnanova Pro AI Technologies · EstateCFO Rental OS · Demo data · ₹ Indian Rupee
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
