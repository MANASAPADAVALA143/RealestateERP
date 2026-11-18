import { Link } from "react-router-dom";
import {
  Building2, Home, Users, Wrench, FileText,
  ArrowRight, ChevronRight, Calendar, DollarSign, BarChart2,
} from "lucide-react";
import { properties, tenants, leases, maintenanceRequests, computeKpis, inrL } from "../data";

function KpiTile({
  label, value, sub, accent = "default", to,
}: {
  label: string; value: string; sub: string; accent?: "gold" | "green" | "red" | "blue" | "default"; to?: string;
}) {
  const borders: Record<string, string> = {
    gold: "border-t-[#C79A2B]",
    green: "border-t-emerald-500",
    red: "border-t-red-500",
    blue: "border-t-blue-500",
    default: "border-t-navy",
  };
  const content = (
    <div className={`rounded-2xl border border-navy/10 border-t-4 ${borders[accent]} bg-white p-4 shadow-card`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-navy/50">{label}</p>
      <p className="mt-2 font-serif text-[1.65rem] leading-none text-navy">{value}</p>
      <p className="mt-3 text-xs leading-relaxed text-navy/60">{sub}</p>
      {to && <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#C79A2B]">View details <ChevronRight className="h-3 w-3" /></div>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function SectionHeader({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="font-serif text-xl text-navy">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-navy/60">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-sm font-medium text-[#C79A2B] hover:underline">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function CommandCentrePage() {
  const kpis = computeKpis();
  const totalProperties = properties.length;
  const activeLeases = leases.filter((l) => l.status === "Active").length;
  const expiringLeases = leases.filter((l) => {
    const days = (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return l.status === "Active" && days <= 90 && days >= 0;
  }).length;
  const openMaintenance = maintenanceRequests.filter((m) => m.status !== "Completed" && m.status !== "Cancelled").length;
  const emergencyMaintenance = maintenanceRequests.filter((m) => m.priority === "Emergency" && m.status !== "Completed").length;
  const totalSecurityDeposit = leases.filter((l) => l.status === "Active").reduce((s, l) => s + l.securityDeposit, 0);
  const monthlyRevenuePotential = kpis.monthlyPotential;
  const monthlyBilled = kpis.monthlyBilled;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="rounded-2xl border border-[#C79A2B]/20 bg-gradient-to-br from-[#0A1628] to-[#0B1D33] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C79A2B]">
              Gnanova Pro AI · EstateCFO
            </p>
            <h1 className="mt-1 font-serif text-3xl leading-tight">Rental Property Operating System</h1>
            <p className="mt-2 text-sm text-white/60">
              Financial pulse across all rental properties · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#C79A2B]/40 bg-[#C79A2B]/10 px-3 py-1.5 text-xs font-medium text-[#C79A2B]">
              Demo Data · FY26
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Properties", value: String(totalProperties), icon: Building2 },
            { label: "Total Units", value: String(kpis.totalUnits), icon: Home },
            { label: "Active Tenants", value: String(tenants.filter((t) => t.status === "Active").length), icon: Users },
            { label: "Active Leases", value: String(activeLeases), icon: FileText },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl bg-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#C79A2B]" />
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">{s.label}</p>
                </div>
                <p className="mt-1 font-serif text-2xl text-white">{s.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <SectionHeader title="Money Position" subtitle="Month to date · all properties" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Monthly Rent Potential"
            value={inrL(monthlyRevenuePotential)}
            sub={`${kpis.totalUnits} units on register`}
            accent="gold"
            to="/rental-os/units"
          />
          <KpiTile
            label="Monthly Rent Billed"
            value={inrL(monthlyBilled)}
            sub={`${kpis.occupancyPct.toFixed(1)}% occupancy`}
            accent="green"
            to="/rental-os/billing"
          />
          <KpiTile
            label="Vacancy Loss"
            value={inrL(kpis.vacancyLoss)}
            sub={`${kpis.vacant} units vacant`}
            accent="red"
            to="/rental-os/occupancy"
          />
          <KpiTile
            label="Security Deposits Held"
            value={inrL(totalSecurityDeposit)}
            sub={`${activeLeases} active leases`}
            accent="blue"
            to="/rental-os/deposits"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Occupied Units"
            value={String(kpis.occupied)}
            sub={`of ${kpis.totalUnits} total units`}
            accent="green"
            to="/rental-os/occupancy"
          />
          <KpiTile
            label="Vacant Units"
            value={String(kpis.vacant)}
            sub="Available for letting"
            accent="red"
            to="/rental-os/units"
          />
          <KpiTile
            label="Leases Expiring (90d)"
            value={String(expiringLeases)}
            sub="Require renewal action"
            accent="gold"
            to="/rental-os/leases/renewals"
          />
          <KpiTile
            label="Maintenance Open"
            value={String(openMaintenance)}
            sub={`${emergencyMaintenance} emergency`}
            accent={emergencyMaintenance > 0 ? "red" : "default"}
            to="/rental-os/maintenance"
          />
        </div>
      </div>

      {/* Property Performance */}
      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
          <div>
            <h2 className="font-serif text-xl text-navy">Property Performance</h2>
            <p className="mt-1 text-sm text-navy/60">Rental income, occupancy and collection by property</p>
          </div>
          <Link to="/rental-os/properties" className="flex items-center gap-1 text-sm font-medium text-[#C79A2B] hover:underline">
            All properties <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr>
                <th>Property</th>
                <th>Category</th>
                <th>Entity</th>
                <th className="text-right">Total Units</th>
                <th className="text-right">Occupied</th>
                <th className="text-right">Occ%</th>
                <th className="text-right">Monthly Potential</th>
                <th className="text-right">Monthly Billed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop) => {
                const kpi = computeKpis(prop.id);
                const statusColor =
                  kpi.occupancyPct >= 85 ? "bg-emerald-50 text-emerald-800 ring-emerald-700/15"
                  : kpi.occupancyPct >= 70 ? "bg-amber-50 text-amber-900 ring-amber-700/20"
                  : "bg-red-50 text-red-800 ring-red-700/15";
                const statusLabel = kpi.occupancyPct >= 85 ? "Healthy" : kpi.occupancyPct >= 70 ? "Watch" : "Critical";
                return (
                  <tr key={prop.id}>
                    <td>
                      <Link to={`/rental-os/properties/${prop.id}`} className="font-semibold text-navy hover:text-[#C79A2B] hover:underline">
                        {prop.name}
                      </Link>
                      <p className="text-xs text-navy/50">{prop.city}</p>
                    </td>
                    <td>
                      <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-medium text-navy/70">{prop.category}</span>
                    </td>
                    <td className="text-sm text-navy/70">{prop.entityId}</td>
                    <td className="text-right tabular-nums">{kpi.totalUnits}</td>
                    <td className="text-right tabular-nums">{kpi.occupied}</td>
                    <td className="text-right tabular-nums font-medium">
                      <span className={kpi.occupancyPct >= 85 ? "text-emerald-600" : kpi.occupancyPct >= 70 ? "text-amber-600" : "text-red-600"}>
                        {kpi.occupancyPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{inrL(kpi.monthlyPotential)}</td>
                    <td className="text-right tabular-nums font-medium text-emerald-600">{inrL(kpi.monthlyBilled)}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Alerts & Lease Expiry */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Maintenance Alerts */}
        <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
            <h2 className="font-serif text-xl text-navy">Maintenance Alerts</h2>
            <Link to="/rental-os/maintenance" className="flex items-center gap-1 text-sm font-medium text-[#C79A2B] hover:underline">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-navy/5 p-2">
            {maintenanceRequests
              .filter((m) => m.status !== "Completed" && m.status !== "Cancelled")
              .slice(0, 5)
              .map((req) => {
                const priorityColor =
                  req.priority === "Emergency" ? "bg-red-100 text-red-700"
                  : req.priority === "High" ? "bg-orange-100 text-orange-700"
                  : req.priority === "Medium" ? "bg-amber-100 text-amber-700"
                  : "bg-navy/5 text-navy/60";
                return (
                  <Link
                    key={req.id}
                    to={`/rental-os/maintenance/${req.id}`}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-ivory transition"
                  >
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-navy/40" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{req.title}</p>
                      <p className="text-xs text-navy/50">{req.propertyName} · {req.unitNumber ?? "Common area"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColor}`}>
                      {req.priority}
                    </span>
                  </Link>
                );
              })}
            {maintenanceRequests.filter((m) => m.status !== "Completed").length === 0 && (
              <p className="p-4 text-sm text-navy/50">No open maintenance requests.</p>
            )}
          </div>
        </div>

        {/* Lease Expiry */}
        <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
            <h2 className="font-serif text-xl text-navy">Lease Expiry Calendar</h2>
            <Link to="/rental-os/leases/renewals" className="flex items-center gap-1 text-sm font-medium text-[#C79A2B] hover:underline">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-navy/5 p-2">
            {leases
              .filter((l) => l.status === "Active")
              .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
              .slice(0, 5)
              .map((lease) => {
                const daysLeft = Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const urgency = daysLeft <= 30 ? "text-red-600" : daysLeft <= 90 ? "text-amber-600" : "text-emerald-600";
                return (
                  <Link
                    key={lease.id}
                    to={`/rental-os/leases/${lease.id}`}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-ivory transition"
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-navy/40" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{lease.tenantName}</p>
                      <p className="text-xs text-navy/50">{lease.propertyName} · Unit {lease.unitNumber}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-semibold ${urgency}`}>{daysLeft}d left</p>
                      <p className="text-[10px] text-navy/50">{new Date(lease.endDate).toLocaleDateString("en-IN")}</p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <h2 className="font-serif text-xl text-navy">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Add Property", to: "/rental-os/properties", icon: Building2 },
            { label: "Add Tenant", to: "/rental-os/tenants", icon: Users },
            { label: "New Lease", to: "/rental-os/leases/create", icon: FileText },
            { label: "Run Billing", to: "/estate/ar/billing", icon: DollarSign },
            { label: "Maintenance", to: "/rental-os/maintenance", icon: Wrench },
            { label: "Reports", to: "/estate/ar/reports", icon: BarChart2 },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="flex flex-col items-center gap-2 rounded-xl border border-navy/10 bg-ivory p-3 text-center transition hover:border-[#C79A2B]/40 hover:bg-[#C79A2B]/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-navy">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
