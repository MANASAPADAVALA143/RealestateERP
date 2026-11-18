/**
 * Rental OS — Create Receipt
 *
 * Standalone receipt creation form. Supports full payment, partial payment,
 * multiple invoice allocation, and advance/unallocated receipts.
 *
 * STATUS: Production — calls arService.recordPayment() directly.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { balances } from "@/ar/engine/analytics";
import { round2 } from "@/ar/engine/dates";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";

function money(val: number, ccy = "INR") {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")} ${ccy}`;
}

const inputClass = "block w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/35 focus:border-[#C79A2B] focus:outline-none focus:ring-1 focus:ring-[#C79A2B]";

export function CreateReceiptPage() {
  const { book, workspaceId } = useArBook();
  const navigate = useNavigate();
  const action = useAction();

  const [form, setForm] = useState({
    tenantId: "",
    date: today(),
    amount: "",
    bank: "",
    method: "Bank transfer",
    reference: "",
  });
  const [allocation, setAllocation] = useState<Record<string, string>>({});

  if (!book || !workspaceId) return null;

  const tenant = book.tenants.find((t) => t.id === form.tenantId);
  const amount = Number(form.amount) || 0;
  const allBalances = balances(book);
  const tenantOpen = [...allBalances.values()]
    .filter((b) => b.invoice.tenantId === form.tenantId && b.outstanding > 0)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate));

  const allocated = round2(Object.values(allocation).reduce((s, v) => s + (Number(v) || 0), 0));
  const leftover = round2(amount - allocated);

  function allocateOldestFirst() {
    let left = amount;
    const next: Record<string, string> = {};
    for (const b of tenantOpen) {
      if (left <= 0) break;
      const v = round2(Math.min(left, b.outstanding));
      next[b.invoice.id] = String(v);
      left = round2(left - v);
    }
    setAllocation(next);
  }

  function allocateFull(invoiceId: string, outstanding: number) {
    const v = round2(Math.min(amount - allocated + (Number(allocation[invoiceId]) || 0), outstanding));
    setAllocation({ ...allocation, [invoiceId]: String(v) });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await action.run(
      () =>
        arService.recordPayment(workspaceId!, {
          tenantId: form.tenantId,
          receivedDate: form.date,
          amount,
          currency: tenant?.currency ?? "INR",
          bankAccount: form.bank || book!.settings.bankAccounts[0]?.name,
          method: form.method,
          reference: form.reference,
          allocations: Object.entries(allocation)
            .map(([invoiceId, v]) => ({ invoiceId, amount: Number(v) || 0 }))
            .filter((a) => a.amount > 0),
        }),
      "Receipt recorded and posted.",
    );
    if (ok) navigate("/rental-os/payments");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/rental-os/payments" className="inline-flex items-center gap-1.5 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div>
          <h1 className="font-serif text-2xl text-navy">Record Receipt</h1>
          <p className="text-sm text-navy/60">Post a tenant payment. Allocate to invoices or leave as advance cash.</p>
        </div>
      </div>

      {action.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{action.error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment details */}
        <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-navy mb-4">Payment Details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Tenant *</label>
              <select
                className={inputClass}
                value={form.tenantId}
                onChange={(e) => { setForm({ ...form, tenantId: e.target.value }); setAllocation({}); }}
                required
              >
                <option value="">Choose tenant…</option>
                {book.tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.code} · {t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Received Date *</label>
              <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Amount{tenant ? ` (${tenant.currency})` : ""} *</label>
              <input type="number" step="0.01" min="0.01" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Bank Account *</label>
              <select className={inputClass} value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} required>
                {book.settings.bankAccounts.map((b) => <option key={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Payment Method</label>
              <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {["Bank transfer", "NEFT", "RTGS", "IMPS", "Cheque", "Cash", "UPI", "Card"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Reference / UTR</label>
              <input className={inputClass} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Transaction reference" />
            </div>
          </div>
        </div>

        {/* Invoice allocation */}
        {form.tenantId && (
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-serif text-lg text-navy">Allocate to Invoices</h2>
                <p className="text-xs text-navy/55 mt-0.5">Leave blank to hold as advance/unallocated cash.</p>
              </div>
              {tenantOpen.length > 0 && (
                <div className="flex gap-2">
                  <button type="button" onClick={allocateOldestFirst} disabled={!amount} className="rounded-xl border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy/70 hover:bg-ivory disabled:opacity-40">Oldest first</button>
                  <button type="button" onClick={() => setAllocation({})} className="rounded-xl border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy/70 hover:bg-ivory">Clear</button>
                </div>
              )}
            </div>

            {tenantOpen.length === 0 ? (
              <p className="text-sm text-navy/55">No open invoices for {tenant?.name}. Receipt will be held as advance cash.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Invoice</th><th>Period</th><th>Due Date</th><th className="text-right">Outstanding</th><th className="text-right">Allocate</th><th></th></tr>
                  </thead>
                  <tbody>
                    {tenantOpen.map((b) => (
                      <tr key={b.invoice.id}>
                        <td className="font-semibold text-navy">{b.invoice.number}</td>
                        <td className="text-xs">{b.invoice.billingPeriod}</td>
                        <td className={b.invoice.dueDate < today() ? "text-red-600 text-xs font-medium" : "text-xs"}>{b.invoice.dueDate}</td>
                        <td className="text-right tabular-nums">{money(b.outstanding, b.invoice.currency)}</td>
                        <td className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={b.outstanding}
                            className="w-32 rounded-xl border border-navy/20 bg-white px-2 py-1 text-right text-sm focus:border-[#C79A2B] focus:outline-none"
                            value={allocation[b.invoice.id] ?? ""}
                            onChange={(e) => setAllocation({ ...allocation, [b.invoice.id]: e.target.value })}
                          />
                        </td>
                        <td>
                          <button type="button" onClick={() => allocateFull(b.invoice.id, b.outstanding)} className="text-xs text-[#C79A2B] hover:underline">Full</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 flex flex-wrap gap-6 rounded-xl bg-ivory px-5 py-3 text-sm">
              <div><span className="text-navy/55">Receipt amount: </span><span className="font-semibold">{money(amount)}</span></div>
              <div><span className="text-navy/55">Allocated: </span><span className="font-semibold">{money(allocated)}</span></div>
              <div className={leftover < 0 ? "text-red-600" : leftover > 0 ? "text-amber-600" : "text-emerald-600"}>
                <span className="text-navy/55">Unallocated: </span><span className="font-semibold">{money(leftover)}</span>
                {leftover > 0 && <span className="ml-1 text-xs">(held as advance cash)</span>}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={action.busy || !form.tenantId || !amount || allocated > amount}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50"
          >
            {action.busy ? "Posting…" : "Post Receipt"}
          </button>
          <Link to="/rental-os/payments" className="rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy/70 hover:bg-ivory">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
