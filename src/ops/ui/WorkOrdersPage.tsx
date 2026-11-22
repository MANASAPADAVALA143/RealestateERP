import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useWorkOrders, opsService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";

export function WorkOrdersPage() {
  const { data: workOrders, loading } = useWorkOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statuses = ["Draft", "Approved", "Assigned", "In Progress", "Completed", "Verified", "Closed", "Cancelled"];

  const filtered = workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) return false;
    if (search && !`${wo.number} ${wo.propertyName} ${wo.vendorName ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work Orders"
        action={
          <Link to="/rental-os/maintenance/work-orders/new">
            <ActionButton><Plus className="h-4 w-4" /> New Work Order</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 rounded-xl border border-navy/15 px-3 py-2 text-sm"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No work orders found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["WO #", "Property / Unit", "Category", "Vendor / Technician", "Est. Cost", "Actual Cost", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((wo) => (
                  <tr key={wo.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{wo.number}</td>
                    <td className="px-4 py-3 text-navy">{wo.propertyName}{wo.unitNumber ? ` · ${wo.unitNumber}` : ""}</td>
                    <td className="px-4 py-3 text-navy/70">{wo.category}</td>
                    <td className="px-4 py-3 text-navy/70">{wo.vendorName ?? wo.technicianName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(wo.estimatedCost)}</td>
                    <td className="px-4 py-3 text-right text-navy/70">{wo.actualCost > 0 ? inr(wo.actualCost) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/maintenance/work-orders/${wo.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-navy/40 border-t border-navy/5">{filtered.length} work order{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

export function NewWorkOrderPage() {
  const { refresh } = useWorkOrders();
  const [form, setForm] = useState({
    propertyId: "PROP-001",
    propertyName: "Meridian Tower A",
    category: "General" as const,
    scopeOfWork: "",
    labourCost: 0,
    materialCost: 0,
    estimatedCost: 0,
    actualCost: 0,
    status: "Draft" as const,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const totalEst = Number(form.labourCost) + Number(form.materialCost);
      await opsService().createWorkOrder({ ...form, estimatedCost: totalEst });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Work order created!</p>
      <Link to="/rental-os/maintenance/work-orders" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to work orders</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Work Order" />
      <form onSubmit={handleSubmit} className="shadow-card rounded-2xl bg-white p-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-xs font-semibold text-navy/60 mb-1">Scope of Work *</label>
          <textarea required rows={3} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.scopeOfWork} onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Category</label>
            <select className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
              {["Electrical", "Plumbing", "HVAC", "Civil", "Painting", "Carpentry", "Lift", "Fire & Safety", "Water Supply", "General"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Labour Cost (₹)</label>
            <input type="number" min={0} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.labourCost} onChange={(e) => setForm({ ...form, labourCost: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-navy/60 mb-1">Material Cost (₹)</label>
            <input type="number" min={0} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.materialCost} onChange={(e) => setForm({ ...form, materialCost: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <ActionButton>{saving ? "Saving…" : "Create Work Order"}</ActionButton>
          <Link to="/rental-os/maintenance/work-orders"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}
