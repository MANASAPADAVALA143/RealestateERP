import { Link } from "react-router-dom";
import { Wrench, ClipboardCheck, AlertTriangle, Clock, Calendar } from "lucide-react";
import { useOpsDashboard } from "../hooks.ts";
import { StatCard, StatusBadge, PriorityBadge, LoadingSpinner, inr } from "./shared.tsx";

export function MaintenanceDashboard() {
  const { summary, loading } = useOpsDashboard();

  if (loading) return <LoadingSpinner />;
  if (!summary) return null;

  const { openRequests, overdueRequests, activeWOs, pmDueSoon } = summary;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Open Requests" value={openRequests.length} icon={Wrench} color="navy" />
        <StatCard label="Overdue / SLA Breach" value={overdueRequests.length} icon={AlertTriangle} color="red" />
        <StatCard label="Active Work Orders" value={activeWOs.length} icon={ClipboardCheck} color="gold" />
        <StatCard label="PM Due / Overdue" value={pmDueSoon.length} icon={Calendar} color="green" />
      </div>

      {/* Overdue requests */}
      {overdueRequests.length > 0 && (
        <div className="shadow-card rounded-2xl bg-red-50 p-5 border border-red-100">
          <h3 className="mb-3 font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> SLA Breached / Overdue ({overdueRequests.length})
          </h3>
          <div className="space-y-2">
            {overdueRequests.slice(0, 5).map((r) => (
              <Link key={r.id} to={`/rental-os/maintenance/requests/${r.id}`} className="flex items-center justify-between rounded-xl bg-white p-3 hover:shadow-sm transition">
                <div>
                  <p className="text-sm font-medium text-navy">{r.number} — {r.title}</p>
                  <p className="text-xs text-navy/50">{r.propertyName} · SLA: {r.slaDeadline}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={r.priority} />
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Requests */}
        <div className="shadow-card rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Recent Requests</h3>
            <Link to="/rental-os/maintenance/requests" className="text-xs text-[#C79A2B] hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {openRequests.slice(0, 6).map((r) => (
              <Link key={r.id} to={`/rental-os/maintenance/requests/${r.id}`} className="flex items-center justify-between rounded-xl border border-navy/8 p-3 hover:border-[#C79A2B]/30 transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{r.number} — {r.title}</p>
                  <p className="text-xs text-navy/50">{r.propertyName} · {r.category}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={r.priority} />
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
            {openRequests.length === 0 && <p className="py-6 text-center text-sm text-navy/40">No open requests</p>}
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="shadow-card rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Active Work Orders</h3>
            <Link to="/rental-os/maintenance/work-orders" className="text-xs text-[#C79A2B] hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {activeWOs.slice(0, 6).map((wo) => (
              <div key={wo.id} className="flex items-center justify-between rounded-xl border border-navy/8 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{wo.number}</p>
                  <p className="text-xs text-navy/50">{wo.propertyName} · {wo.vendorName ?? "In-house"}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-[#C79A2B]">{inr(wo.estimatedCost)}</span>
                  <StatusBadge status={wo.status} />
                </div>
              </div>
            ))}
            {activeWOs.length === 0 && <p className="py-6 text-center text-sm text-navy/40">No active work orders</p>}
          </div>
        </div>
      </div>

      {/* PM Due Soon */}
      {pmDueSoon.length > 0 && (
        <div className="shadow-card rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#C79A2B]" /> Preventive Maintenance Due
            </h3>
            <Link to="/rental-os/maintenance/preventive" className="text-xs text-[#C79A2B] hover:underline">View all</Link>
          </div>
          <div className="data-table overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy/8">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">Schedule</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">Property</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">Frequency</th>
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">Next Due</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-navy/50">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {pmDueSoon.map((s) => (
                  <tr key={s.id} className="border-b border-navy/5 last:border-0">
                    <td className="py-2 font-medium text-navy">{s.name}</td>
                    <td className="py-2 text-navy/70">{s.propertyName}</td>
                    <td className="py-2 text-navy/70">{s.frequency}</td>
                    <td className="py-2 text-red-600 font-medium">{s.nextDue}</td>
                    <td className="py-2 text-right font-semibold text-[#C79A2B]">{inr(s.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
