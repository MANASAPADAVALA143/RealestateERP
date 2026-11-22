import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useRequests, opsService } from "../hooks.ts";
import { StatusBadge, PriorityBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";
import type { MaintStatus, MaintCategory, Priority } from "../types.ts";

const ALL_STATUSES: MaintStatus[] = ["New", "Classified", "Assigned", "Inspection", "Estimate", "Approval", "Work Order", "In Progress", "Completed", "Verified", "Closed", "Rejected", "Cancelled"];
const ALL_CATS: MaintCategory[] = ["Electrical", "Plumbing", "HVAC", "Civil", "Painting", "Carpentry", "Lift", "Fire & Safety", "Water Supply", "General"];

export function MaintenanceRequestsPage() {
  const { data: requests, loading } = useRequests();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MaintStatus | "">("");
  const [catFilter, setCatFilter] = useState<MaintCategory | "">("");

  const filtered = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (search && !`${r.number} ${r.title} ${r.propertyName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Requests"
        action={
          <Link to="/rental-os/maintenance/requests/new">
            <ActionButton><Plus className="h-4 w-4" /> New Request</ActionButton>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <input
            className="w-full rounded-xl border border-navy/15 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30"
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MaintStatus | "")}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C79A2B]/30" value={catFilter} onChange={(e) => setCatFilter(e.target.value as MaintCategory | "")}>
          <option value="">All Categories</option>
          {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No maintenance requests found. Create one to get started." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["Number", "Title", "Property / Unit", "Category", "Priority", "Status", "Reported", "Est. Cost", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{r.number}</td>
                    <td className="px-4 py-3 font-medium text-navy max-w-xs truncate">{r.title}</td>
                    <td className="px-4 py-3 text-navy/70">{r.propertyName}{r.unitNumber ? ` · ${r.unitNumber}` : ""}</td>
                    <td className="px-4 py-3 text-navy/70">{r.category}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-navy/60">{r.reportedDate}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{r.estimatedCost ? inr(r.estimatedCost) : "—"}</td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/maintenance/requests/${r.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-navy/40 border-t border-navy/5">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

export function NewMaintenanceRequestPage() {
  const { refresh } = useRequests();
  const [form, setForm] = useState({
    source: "Property Manager" as const,
    propertyId: "PROP-001",
    propertyName: "Meridian Tower A",
    title: "",
    description: "",
    category: "General" as const,
    priority: "Medium" as Priority,
    reportedDate: new Date().toISOString().slice(0, 10),
    status: "New" as MaintStatus,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await opsService().createRequest(form);
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Request created successfully!</p>
      <Link to="/rental-os/maintenance/requests" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to requests</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Maintenance Request" />
      <form onSubmit={handleSubmit} className="shadow-card rounded-2xl bg-white p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Title *</label>
            <input required className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Category</label>
            <select className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
              {["Electrical", "Plumbing", "HVAC", "Civil", "Painting", "Carpentry", "Lift", "Fire & Safety", "Water Supply", "General"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Priority</label>
            <select className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              {["Emergency", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Reported Date</label>
            <input type="date" className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.reportedDate} onChange={(e) => setForm({ ...form, reportedDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-navy/60 mb-1">Description *</label>
          <textarea required rows={3} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <ActionButton>{saving ? "Saving…" : "Create Request"}</ActionButton>
          <Link to="/rental-os/maintenance/requests"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}
