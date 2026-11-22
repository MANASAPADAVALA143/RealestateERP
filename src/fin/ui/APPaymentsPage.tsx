import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApPayments, useVendorInvoices, finService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, ActionButton, inr, SectionCard } from "./shared.tsx";
import type { PaymentMode } from "../types.ts";

// ─── List ─────────────────────────────────────────────────────────────────────

export function APPaymentsPage() {
  const { data: payments, loading } = useApPayments();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="AP Payments"
        action={
          <Link to="/rental-os/finance/payments/new">
            <ActionButton type="button"><Plus className="h-4 w-4" /> New Payment</ActionButton>
          </Link>
        }
      />

      {(payments ?? []).length === 0 ? (
        <EmptyState message="No payments found." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F6F0]">
                <tr>
                  {["PAY #", "Vendor", "Date", "Mode", "Ref", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {(payments ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8F6F0]/60">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">{p.paymentNumber}</td>
                    <td className="px-4 py-3 font-medium text-navy">{p.vendorName}</td>
                    <td className="px-4 py-3 text-navy/60">{p.paymentDate}</td>
                    <td className="px-4 py-3 text-navy/70">{p.mode}</td>
                    <td className="px-4 py-3 text-navy/60">{p.referenceNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#C79A2B]">{inr(p.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-[#C79A2B] hover:underline disabled:text-navy/30"
                        disabled={p.status !== "Approved"}
                        onClick={async () => {
                          await finService().processPayment(p.id, "current-user");
                          window.location.reload();
                        }}
                      >
                        {p.status === "Approved" ? "Process" : "View"}
                      </button>
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

// ─── New Payment ──────────────────────────────────────────────────────────────

export function NewAPPaymentPage() {
  const { data: invoices } = useVendorInvoices();
  const { refresh } = useApPayments();

  const payableInvoices = (invoices ?? []).filter((inv) =>
    ["Approved", "Partially Paid"].includes(inv.status)
  );

  const [form, setForm] = useState({
    vendorId: "",
    vendorName: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    mode: "NEFT" as PaymentMode,
    referenceNumber: "",
  });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedInvoice = payableInvoices.find((inv) => inv.id === selectedInvoiceId);

  function pickInvoice(id: string) {
    setSelectedInvoiceId(id);
    const inv = payableInvoices.find((i) => i.id === id);
    if (inv) {
      setForm((f) => ({ ...f, vendorId: inv.vendorId, vendorName: inv.vendorName }));
      setAllocatedAmount(inv.amountDue);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await finService().createPayment({
        ...form,
        amount: allocatedAmount,
        allocations: [{ invoiceId: selectedInvoice.id, invoiceNumber: selectedInvoice.invoiceNumber, amountAllocated: allocatedAmount }],
        status: "Approved",
      });
      await refresh();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) return (
    <div className="rounded-2xl bg-emerald-50 p-8 text-center">
      <p className="font-semibold text-emerald-700 text-lg">Payment created!</p>
      <Link to="/rental-os/finance/payments" className="mt-3 inline-block text-sm text-[#C79A2B] hover:underline">← Back to payments</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="New AP Payment" />
      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <SectionCard>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy/60 mb-1">Select Invoice *</label>
              {payableInvoices.length === 0 ? (
                <p className="text-sm text-navy/50">No approved invoices available for payment. First approve a vendor invoice.</p>
              ) : (
                <select required className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={selectedInvoiceId} onChange={(e) => pickInvoice(e.target.value)}>
                  <option value="">Select an invoice…</option>
                  {payableInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.vendorName} — Due: {inr(inv.amountDue)}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedInvoice && (
              <div className="rounded-xl bg-[#F8F6F0] p-3 text-sm">
                <p className="text-navy/60">Invoice total: <strong>{inr(selectedInvoice.totalAmount)}</strong> · Amount due: <strong className="text-red-600">{inr(selectedInvoice.amountDue)}</strong></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Payment Date *</label>
                <input required type="date" className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Mode *</label>
                <select required className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PaymentMode })}>
                  {["NEFT", "RTGS", "Cheque", "UPI", "Cash"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Reference (UTR / Cheque)</label>
                <input className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Amount (₹) *</label>
                <input required type="number" min={1} className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={allocatedAmount} onChange={(e) => setAllocatedAmount(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="flex gap-3">
          <ActionButton disabled={!selectedInvoice || payableInvoices.length === 0}>{saving ? "Saving…" : "Create Payment"}</ActionButton>
          <Link to="/rental-os/finance/payments"><ActionButton variant="secondary" type="button">Cancel</ActionButton></Link>
        </div>
      </form>
    </div>
  );
}
