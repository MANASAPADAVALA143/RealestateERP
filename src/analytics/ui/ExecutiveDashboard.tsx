import { useNavigate } from "react-router-dom";
import {
  TrendingUp, AlertCircle, Wallet, Building2, Wrench, ShoppingCart,
  BarChart2, ArrowRight,
} from "lucide-react";
import { useExecKPIs } from "../hooks.ts";

function inr(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "gold" | "green" | "red" | "blue" | "navy";
}) {
  const c = {
    gold:  "bg-[#C79A2B]/10 text-[#C79A2B]",
    green: "bg-emerald-50 text-emerald-600",
    red:   "bg-red-50 text-red-600",
    blue:  "bg-blue-50 text-blue-600",
    navy:  "bg-[#0A1628]/10 text-[#0A1628]",
  }[color];
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-black/5 p-5 flex gap-4 items-start">
      <div className={`rounded-xl p-2.5 ${c}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#0A1628]">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-[#0A1628]/60">{label}</p>
        {sub && <p className="mt-1 text-xs text-[#0A1628]/40">{sub}</p>}
      </div>
    </div>
  );
}

function QuickLink({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className="flex items-center justify-between gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm font-medium text-[#0A1628] hover:border-[#C79A2B] hover:text-[#C79A2B] transition-colors"
    >
      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export function ExecutiveDashboard() {
  const { kpis, loading } = useExecKPIs();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-[#0A1628]">Executive Dashboard</h2>
        <p className="mt-1 text-sm text-[#0A1628]/50">Portfolio-wide KPIs — Meridian Ventures</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C79A2B]/30 border-t-[#C79A2B]" />
        </div>
      ) : (
        <>
          {/* Revenue & Collections */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#0A1628]/40">Revenue & Collections</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KPICard label="Rent Collected (All Time)" value={inr(kpis.totalRentCollected)} icon={Wallet} color="green" />
              <KPICard label="Open AR" value={inr(kpis.openInvoicesAmount)} sub="Outstanding invoices" icon={AlertCircle} color="blue" />
              <KPICard label="Overdue AR" value={inr(kpis.overdueInvoicesAmount)} sub="Past due date" icon={AlertCircle} color="red" />
              <KPICard label="Net Income (Journals)" value={inr(kpis.netIncome)} icon={TrendingUp} color={kpis.netIncome >= 0 ? "green" : "red"} />
            </div>
          </section>

          {/* Property & AP */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#0A1628]/40">Property & Payables</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KPICard label="Occupancy Rate" value={`${kpis.occupancyRate}%`} icon={Building2} color={kpis.occupancyRate >= 85 ? "green" : kpis.occupancyRate >= 70 ? "gold" : "red"} />
              <KPICard label="AP Liability" value={inr(kpis.apLiability)} sub="Approved vendor invoices" icon={Wallet} color="navy" />
              <KPICard label="Open Work Orders" value={String(kpis.openWorkOrders)} sub="Active + In Progress" icon={Wrench} color="gold" />
              <KPICard label="Pending POs" value={String(kpis.pendingPOs)} sub="Draft + Approved" icon={ShoppingCart} color="blue" />
            </div>
          </section>

          {/* Quick Links */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#0A1628]/40">Analytics</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <QuickLink to="/rental-os/analytics/ar-aging"       label="AR Aging Report"           icon={AlertCircle} />
              <QuickLink to="/rental-os/analytics/revenue-trend"  label="Revenue vs Expense Trend"  icon={TrendingUp} />
              <QuickLink to="/rental-os/analytics/occupancy"      label="Occupancy Heatmap"         icon={Building2} />
              <QuickLink to="/rental-os/analytics/maint-cost"     label="Maintenance Cost Analysis" icon={Wrench} />
              <QuickLink to="/rental-os/finance/reports/pnl"      label="P&L Statement"             icon={BarChart2} />
              <QuickLink to="/rental-os/finance/reports/trial-balance" label="Trial Balance"        icon={BarChart2} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
