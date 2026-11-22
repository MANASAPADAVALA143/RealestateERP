import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useRequisitions, usePurchaseOrders, useGoodsReceipts, opsService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr } from "./shared.tsx";

// ─── Purchase Requisitions ────────────────────────────────────────────────────

export function RequisitionsPage() {
  const { data: prs, loading } = useRequisitions();
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = prs.filter((pr) => !statusFilter || pr.status === statusFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Requisitions"
        action={
          <Link to="/rental-os/procurement/requisitions/new">
            <ActionButton><Plus className="h-4 w-4" /> New PR</ActionButton>
          </Link>
        }
      />
      <div className="flex gap-3">
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft", "Submitted", "Approved", "Rejected", "Cancelled", "PO Raised"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No purchase requisitions found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["PR #", "Department / Requester", "Items", "Est. Total", "Required By", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((pr) => (
                  <tr key={pr.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{pr.prNumber}</td>
                    <td className="px-4 py-3 text-navy">{pr.department} · {pr.requester}</td>
                    <td className="px-4 py-3 text-navy/70">{pr.items.length} item{pr.items.length !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(pr.estimatedTotal)}</td>
                    <td className="px-4 py-3 text-navy/60">{pr.requiredDate}</td>
                    <td className="px-4 py-3"><StatusBadge status={pr.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/procurement/requisitions/${pr.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
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

export function NewRequisitionPage() {
  const { refresh } = useRequisitions();
  const [form, setForm] = useState({ department: "", requester: "", requiredDate: "", justification: "" });
  const [items, setItems] = useState([{ id: "1", description: "", quantity: 1, unit: "Nos", estimatedRate: 0, estimatedAmount: 0 }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalEst = items.reduce((s, i) => s + i.estimatedAmount, 0);

  function updateItem(idx: number, field: string, val: string | number) {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: val };
      next.estimatedAmount = next.quantity * next.estimatedRate;
      return next;
    });
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await opsService().createRequisition({ ...form, items, estimatedTotal: totalEst, status: "Draft" });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Requisition created!</p>
      <Link to="/rental-os/procurement/requisitions" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Purchase Requisition" />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="shadow-card rounded-2xl bg-white p-6 grid grid-cols-2 gap-4">
          {[["Department *", "department"], ["Requester *", "requester"], ["Required Date *", "requiredDate"]].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-navy/60 mb-1">{label}</label>
              <input required type={key === "requiredDate" ? "date" : "text"} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-navy/60 mb-1">Justification</label>
            <textarea rows={2} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
          </div>
        </div>

        <div className="shadow-card rounded-2xl bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Line Items</h3>
            <button type="button" className="text-xs text-[#C79A2B] hover:underline" onClick={() => setItems([...items, { id: String(items.length + 1), description: "", quantity: 1, unit: "Nos", estimatedRate: 0, estimatedAmount: 0 }])}>+ Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy/8">{["Description", "Qty", "Unit", "Rate (₹)", "Amount (₹)", ""].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-navy/5">
                    <td className="py-1.5 pr-3"><input required className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></td>
                    <td className="py-1.5 pr-3 w-16"><input type="number" min={1} className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} /></td>
                    <td className="py-1.5 pr-3 w-20"><input className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} /></td>
                    <td className="py-1.5 pr-3 w-28"><input type="number" min={0} className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={item.estimatedRate} onChange={(e) => updateItem(idx, "estimatedRate", Number(e.target.value))} /></td>
                    <td className="py-1.5 pr-3 text-right font-semibold text-[#C79A2B]">{inr(item.estimatedAmount)}</td>
                    <td><button type="button" className="text-red-400 hover:text-red-600 text-xs" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4} className="pt-2 text-right text-xs font-semibold text-navy/60">Total</td><td className="pt-2 text-right font-bold text-[#C79A2B]">{inr(totalEst)}</td><td /></tr></tfoot>
            </table>
          </div>
        </div>

        <div className="flex gap-3">
          <ActionButton>{saving ? "Saving…" : "Create Requisition"}</ActionButton>
          <Link to="/rental-os/procurement/requisitions"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export function PurchaseOrdersPage() {
  const { data: pos, loading } = usePurchaseOrders();
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = pos.filter((p) => !statusFilter || p.status === statusFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        action={
          <Link to="/rental-os/procurement/purchase-orders/new">
            <ActionButton><Plus className="h-4 w-4" /> New PO</ActionButton>
          </Link>
        }
      />
      <div className="flex gap-3">
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft", "Approved", "Issued", "Partially Received", "Fully Received", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No purchase orders found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["PO #", "Vendor", "Total", "Tax", "Grand Total", "Delivery", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{po.poNumber}</td>
                    <td className="px-4 py-3 font-medium text-navy">{po.vendorName}</td>
                    <td className="px-4 py-3 text-right text-navy/70">{inr(po.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-navy/60">{inr(po.taxAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#C79A2B]">{inr(po.totalAmount)}</td>
                    <td className="px-4 py-3 text-navy/60">{po.deliveryDate ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/procurement/purchase-orders/${po.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
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

// ─── Goods Receipts ───────────────────────────────────────────────────────────

export function GoodsReceiptsPage() {
  const { data: grns, loading } = useGoodsReceipts();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader title="Goods Receipt Notes" />
      {grns.length === 0 ? (
        <EmptyState message="No goods receipts found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["GRN #", "PO #", "Vendor", "Receipt Date", "Total Received", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {grns.map((g) => (
                  <tr key={g.id} className="hover:bg-[#F8F6F0]/60 transition">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{g.grnNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-navy/70">{g.poNumber}</td>
                    <td className="px-4 py-3 text-navy">{g.vendorName}</td>
                    <td className="px-4 py-3 text-navy/60">{g.receiptDate}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(g.totalReceived)}</td>
                    <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                    <td className="px-4 py-3">
                      <Link to={`/rental-os/procurement/grn/${g.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                    </td>
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
