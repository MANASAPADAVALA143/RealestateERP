import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useVendorInvoices, finService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr, SectionCard } from "./shared.tsx";
import type { InvoiceStatus, InvoiceLine } from "../types.ts";

// ─── List ─────────────────────────────────────────────────────────────────────

export function VendorInvoicesPage() {
  const { data: invoices, loading } = useVendorInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [searchParams] = useSearchParams();

  if (loading) return <LoadingSpinner />;

  const overdueOnly = searchParams.get("filter") === "overdue";
  const today = new Date().toISOString().slice(0, 10);

  const filtered = invoices.filter((inv) => {
    if (overdueOnly && inv.dueDate >= today) return false;
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search && !`${inv.invoiceNumber} ${inv.vendorName} ${inv.vendorInvoiceRef}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={overdueOnly ? "Overdue Invoices" : "Vendor Invoices"}
        action={
          <Link to="/rental-os/finance/invoices/new">
            <ActionButton type="button"><Plus className="h-4 w-4" /> New Invoice</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
          <input className="w-full rounded-xl border border-navy/15 pl-9 pr-3 py-2 text-sm" placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="rounded-xl border border-navy/15 px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}>
          <option value="">All Statuses</option>
          {["Draft", "Submitted", "Under Review", "Approved", "Partially Paid", "Paid", "Disputed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No invoices found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["INV #", "Vendor", "Vendor Ref", "Invoice Date", "Due Date", "Total", "Amount Due", "Match", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {filtered.map((inv) => {
                  const overdue = inv.dueDate < today && !["Paid", "Cancelled"].includes(inv.status);
                  return (
                    <tr key={inv.id} className={`hover:bg-[#F8F6F0]/60 transition ${overdue ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-navy">{inv.vendorName}</td>
                      <td className="px-4 py-3 text-navy/60">{inv.vendorInvoiceRef}</td>
                      <td className="px-4 py-3 text-navy/60">{inv.invoiceDate}</td>
                      <td className={`px-4 py-3 ${overdue ? "font-semibold text-red-600" : "text-navy/60"}`}>{inv.dueDate}{overdue ? " ⚠" : ""}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#C79A2B]">{inr(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-navy/80">{inv.amountDue > 0 ? inr(inv.amountDue) : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.threeWayMatchStatus} /></td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/rental-os/finance/invoices/${inv.id}`} className="text-xs text-[#C79A2B] hover:underline">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-navy/5 px-4 py-2 text-xs text-navy/40">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

// ─── New Invoice Form ─────────────────────────────────────────────────────────

const EXPENSE_ACCOUNTS = [
  { code: "5000", name: "Maintenance & Repairs" },
  { code: "5100", name: "HVAC Expenses" },
  { code: "5200", name: "Security & Housekeeping" },
  { code: "5300", name: "Utilities" },
  { code: "5400", name: "Professional Fees" },
  { code: "5500", name: "Depreciation" },
  { code: "5600", name: "Insurance" },
  { code: "5700", name: "Administrative Expenses" },
];

export function NewVendorInvoicePage() {
  const { refresh } = useVendorInvoices();
  const [form, setForm] = useState({
    vendorId: "", vendorName: "", vendorInvoiceRef: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    currency: "INR",
  });
  const [lines, setLines] = useState<Omit<InvoiceLine, "taxAmount" | "totalAmount">[]>([
    { id: "1", description: "", quantity: 1, unit: "Job", rate: 0, taxPct: 18, amount: 0, accountCode: "5000", accountName: "Maintenance & Repairs" },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function computedLines(): InvoiceLine[] {
    return lines.map((l) => {
      const amount = l.quantity * l.rate;
      const taxAmount = amount * l.taxPct / 100;
      return { ...l, amount, taxAmount, totalAmount: amount + taxAmount };
    });
  }

  const computed = computedLines();
  const subtotal = computed.reduce((s, l) => s + l.amount, 0);
  const taxTotal = computed.reduce((s, l) => s + l.taxAmount, 0);
  const grandTotal = subtotal + taxTotal;

  function updateLine(idx: number, field: string, val: string | number) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: val };
      if (field === "accountCode") {
        const acc = EXPENSE_ACCOUNTS.find((a) => a.code === val);
        if (acc) updated.accountName = acc.name;
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await finService().createVendorInvoice({
        ...form,
        lines: computed,
        subtotal,
        taxAmount: taxTotal,
        totalAmount: grandTotal,
        amountPaid: 0,
        threeWayMatchStatus: "Not Checked",
        status: "Draft",
      });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Invoice created!</p>
      <Link to="/rental-os/finance/invoices" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to invoices</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New Vendor Invoice" />
      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="Invoice Details">
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Vendor Name *", "vendorName", "text"],
              ["Vendor Invoice Ref *", "vendorInvoiceRef", "text"],
              ["Invoice Date *", "invoiceDate", "date"],
              ["Due Date *", "dueDate", "date"],
            ].map(([label, key, type]) => (
              <div key={key as string}>
                <label className="block text-xs font-semibold text-navy/60 mb-1">{label}</label>
                <input required type={type as string} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={(form as any)[key as string]} onChange={(e) => setForm({ ...form, [key as string]: e.target.value })} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Line Items">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-navy/8">{["Description", "Qty", "Rate (₹)", "Tax %", "Account", "Amount", "Tax", "Total", ""].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
              <tbody>
                {lines.map((line, idx) => {
                  const cl = computed[idx];
                  return (
                    <tr key={line.id} className="border-b border-navy/5">
                      <td className="py-1.5 pr-2"><input required className="w-full min-w-32 rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} /></td>
                      <td className="py-1.5 pr-2 w-14"><input type="number" min={1} className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))} /></td>
                      <td className="py-1.5 pr-2 w-24"><input type="number" min={0} className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.rate} onChange={(e) => updateLine(idx, "rate", Number(e.target.value))} /></td>
                      <td className="py-1.5 pr-2 w-14"><input type="number" min={0} max={100} className="w-full rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.taxPct} onChange={(e) => updateLine(idx, "taxPct", Number(e.target.value))} /></td>
                      <td className="py-1.5 pr-2">
                        <select className="rounded-lg border border-navy/15 px-2 py-1 text-sm" value={line.accountCode} onChange={(e) => updateLine(idx, "accountCode", e.target.value)}>
                          {EXPENSE_ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2 text-right font-semibold text-navy/70">{inr(cl.amount)}</td>
                      <td className="py-1.5 pr-2 text-right text-navy/50">{inr(cl.taxAmount)}</td>
                      <td className="py-1.5 pr-2 text-right font-bold text-[#C79A2B]">{inr(cl.totalAmount)}</td>
                      <td><button type="button" className="text-red-400 hover:text-red-600 text-xs" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-navy/10">
                  <td colSpan={5} className="pt-3 text-right text-xs font-semibold text-navy/60">Subtotal</td>
                  <td className="pt-3 text-right font-bold text-navy">{inr(subtotal)}</td>
                  <td className="pt-3 text-right font-bold text-navy/60">{inr(taxTotal)}</td>
                  <td className="pt-3 text-right text-base font-bold text-[#C79A2B]">{inr(grandTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" className="mt-3 text-xs text-[#C79A2B] hover:underline" onClick={() => setLines([...lines, { id: String(lines.length + 1), description: "", quantity: 1, unit: "Job", rate: 0, taxPct: 18, amount: 0, accountCode: "5000", accountName: "Maintenance & Repairs" }])}>+ Add Line</button>
        </SectionCard>

        <div className="flex gap-3">
          <ActionButton>{saving ? "Saving…" : "Create Invoice"}</ActionButton>
          <Link to="/rental-os/finance/invoices"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}

// ─── Invoice Detail ───────────────────────────────────────────────────────────

export function VendorInvoiceDetailPage({ id }: { id: string }) {
  const { data: invoices, loading, refresh } = useVendorInvoices();
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  if (loading) return <LoadingSpinner />;
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return <EmptyState message="Invoice not found." />;

  async function approveAndPost() {
    setActing(true);
    try {
      await finService().approveAndPostInvoice(id, "current-user");
      await refresh();
      setMsg("Invoice approved and journal entry posted.");
    } catch (e) {
      setMsg(`Error: ${e}`);
    } finally {
      setActing(false);
    }
  }

  async function runMatch() {
    setActing(true);
    try {
      const result = await finService().performThreeWayMatch(id);
      await refresh();
      setMsg(`3-way match: ${result.status} — ${result.notes}`);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        action={
          <div className="flex gap-2">
            {inv.status === "Draft" && <ActionButton type="button" onClick={approveAndPost} variant="primary">{acting ? "Processing…" : "Approve & Post"}</ActionButton>}
            {inv.poId && inv.grnId && inv.threeWayMatchStatus === "Not Checked" && <ActionButton type="button" onClick={runMatch} variant="secondary">Run 3-Way Match</ActionButton>}
          </div>
        }
      />

      {msg && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{msg}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SectionCard>
          <p className="text-xs text-navy/50">Vendor</p>
          <p className="font-semibold text-navy">{inv.vendorName}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-navy/50">Vendor Ref</p>
          <p className="font-semibold text-navy">{inv.vendorInvoiceRef}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-navy/50">Status</p>
          <StatusBadge status={inv.status} />
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-navy/50">3-Way Match</p>
          <StatusBadge status={inv.threeWayMatchStatus} />
        </SectionCard>
      </div>

      <SectionCard title="Line Items">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-navy/8">{["Description", "Qty", "Rate", "Tax %", "Amount", "Tax", "Total"].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold text-navy/50">{h}</th>)}</tr></thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-navy/5">
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right">{l.quantity}</td>
                <td className="py-2 text-right">{inr(l.rate)}</td>
                <td className="py-2 text-right">{l.taxPct}%</td>
                <td className="py-2 text-right">{inr(l.amount)}</td>
                <td className="py-2 text-right text-navy/60">{inr(l.taxAmount)}</td>
                <td className="py-2 text-right font-bold text-[#C79A2B]">{inr(l.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-navy/10 font-bold">
              <td colSpan={4} className="pt-3 text-right text-sm text-navy/60">Grand Total</td>
              <td className="pt-3 text-right">{inr(inv.subtotal)}</td>
              <td className="pt-3 text-right text-navy/60">{inr(inv.taxAmount)}</td>
              <td className="pt-3 text-right text-[#C79A2B]">{inr(inv.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-4 flex gap-6 border-t border-navy/5 pt-4 text-sm">
          <span>Paid: <strong>{inr(inv.amountPaid)}</strong></span>
          <span>Due: <strong className="text-red-600">{inr(inv.amountDue)}</strong></span>
          <span>Due Date: <strong>{inv.dueDate}</strong></span>
          {inv.journalEntryId && <span className="text-emerald-700">✓ Journal posted</span>}
        </div>
      </SectionCard>
    </div>
  );
}
