import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Wrench, ArrowLeft, ChevronRight } from "lucide-react";
import { maintenanceRequests, vendors } from "../data";
import type { MaintenancePriority, MaintenanceStatus } from "../types";

const PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  Emergency: "bg-red-50 text-red-800 ring-red-700/15",
  High: "bg-orange-50 text-orange-800 ring-orange-700/15",
  Medium: "bg-amber-50 text-amber-900 ring-amber-700/20",
  Low: "bg-navy/5 text-navy/60 ring-navy/10",
};

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  Open: "bg-blue-50 text-blue-800 ring-blue-700/15",
  "In Progress": "bg-purple-50 text-purple-800 ring-purple-700/15",
  "Pending Parts": "bg-amber-50 text-amber-900 ring-amber-700/20",
  Completed: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Cancelled: "bg-navy/5 text-navy/60 ring-navy/10",
};

function RequestDetail({ id }: { id: string }) {
  const req = maintenanceRequests.find((r) => r.id === id);
  if (!req) return <div className="p-8 text-navy/50">Request not found.</div>;
  const vendor = req.assignedVendorId ? vendors.find((v) => v.id === req.assignedVendorId) : null;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/rental-os/maintenance" className="flex items-center gap-1 text-sm text-[#C79A2B] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Maintenance
        </Link>
        <ChevronRight className="h-4 w-4 text-navy/30" />
        <span className="text-sm text-navy">{req.code}</span>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C79A2B]">{req.code}</p>
            <h1 className="mt-1 font-serif text-2xl text-navy">{req.title}</h1>
            <p className="mt-1 text-sm text-navy/60">{req.propertyName}{req.unitNumber ? ` · Unit ${req.unitNumber}` : " · Common area"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLORS[req.status]}`}>{req.status}</span>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-ivory p-4 text-sm leading-relaxed text-navy/80">{req.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-navy/5 pt-5 sm:grid-cols-3">
          {[
            { label: "Category", value: req.category },
            { label: "Reported Date", value: new Date(req.reportedDate).toLocaleDateString("en-IN") },
            { label: "Scheduled Date", value: req.scheduledDate ? new Date(req.scheduledDate).toLocaleDateString("en-IN") : "—" },
            { label: "Completed Date", value: req.completedDate ? new Date(req.completedDate).toLocaleDateString("en-IN") : "—" },
            { label: "Est. Cost", value: req.estimatedCost ? `₹${req.estimatedCost.toLocaleString()}` : "—" },
            { label: "Actual Cost", value: req.actualCost ? `₹${req.actualCost.toLocaleString()}` : "—" },
            { label: "Tenant", value: req.tenantName ?? "—" },
            { label: "Vendor", value: vendor ? vendor.name : req.assignedVendorId ?? "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-widest text-navy/40">{f.label}</p>
              <p className="mt-0.5 text-sm font-medium text-navy">{f.value}</p>
            </div>
          ))}
        </div>
        {req.notes && <p className="mt-4 text-sm text-navy/60 italic">{req.notes}</p>}
      </div>
    </div>
  );
}

export function MaintenancePage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <RequestDetail id={id} />;

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | "All">("All");
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "All">("All");

  const filtered = maintenanceRequests.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.propertyName.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "All" || r.priority === priorityFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchPriority && matchStatus;
  });

  const openCount = maintenanceRequests.filter((r) => r.status !== "Completed" && r.status !== "Cancelled").length;
  const emergencyCount = maintenanceRequests.filter((r) => r.priority === "Emergency" && r.status !== "Completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Maintenance Requests</h1>
          <p className="mt-1 text-sm text-navy/60">
            {openCount} open · {emergencyCount > 0 && <span className="font-semibold text-red-600">{emergencyCount} emergency</span>}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#b8891e]">
          <Wrench className="h-4 w-4" /> New Request
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", "Emergency", "High", "Medium", "Low"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${priorityFilter === p ? "bg-[#C79A2B] text-white" : "bg-white border border-navy/15 text-navy/60 hover:border-[#C79A2B]/40"}`}
          >
            {p}
          </button>
        ))}
        <div className="ml-2 h-5 w-px bg-navy/15" />
        {(["All", "Open", "In Progress", "Pending Parts", "Completed", "Cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${statusFilter === s ? "bg-navy text-white" : "bg-white border border-navy/15 text-navy/60 hover:border-navy/40"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="border-b border-navy/5 px-5 py-3">
          <input
            type="search"
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-navy/15 bg-ivory px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr><th>Code</th><th>Title</th><th>Property · Unit</th><th>Category</th><th>Priority</th><th>Status</th><th>Reported</th><th>Est. Cost</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs text-navy/50">{r.code}</td>
                  <td className="font-semibold text-navy max-w-[200px] truncate">{r.title}</td>
                  <td className="text-sm text-navy/70">
                    <Link to={`/rental-os/properties/${r.propertyId}`} className="hover:text-[#C79A2B] hover:underline">{r.propertyName}</Link>
                    {r.unitNumber && <span className="text-navy/40"> · {r.unitNumber}</span>}
                  </td>
                  <td><span className="rounded bg-navy/5 px-1.5 py-0.5 text-xs text-navy/70">{r.category}</span></td>
                  <td><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                  <td><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                  <td>{new Date(r.reportedDate).toLocaleDateString("en-IN")}</td>
                  <td className="text-right tabular-nums text-sm">{r.estimatedCost ? `₹${r.estimatedCost.toLocaleString()}` : "—"}</td>
                  <td><Link to={`/rental-os/maintenance/${r.id}`} className="text-xs font-medium text-[#C79A2B] hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-center text-sm text-navy/40">No requests match the current filters.</p>}
        </div>
      </div>
    </div>
  );
}
