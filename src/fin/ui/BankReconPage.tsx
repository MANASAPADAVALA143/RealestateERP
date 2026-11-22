import { useState } from "react";
import { useBankReconciliations, usePeriods, finService } from "../hooks.ts";
import { StatusBadge, EmptyState, LoadingSpinner, PageHeader, inr, SectionCard, ActionButton } from "./shared.tsx";

export function BankReconPage() {
  const { data: recons, loading, refresh } = useBankReconciliations();
  const { data: periods } = usePeriods();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    periodId: "",
    statementDate: new Date().toISOString().slice(0, 10),
    statementClosingBalance: 0,
    outstandingDeposits: 0,
    outstandingPayments: 0,
  });
  const [saved, setSaved] = useState(false);

  const bookBalance = form.statementClosingBalance - form.outstandingDeposits + form.outstandingPayments;
  const reconciledBalance = form.statementClosingBalance;
  const difference = reconciledBalance - bookBalance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await finService().createReconciliation({
      bankAccountId: "HDFC-001",
      periodId: form.periodId,
      statementDate: form.statementDate,
      statementClosingBalance: form.statementClosingBalance,
      bookBalance,
      outstandingDeposits: form.outstandingDeposits,
      outstandingPayments: form.outstandingPayments,
      reconciledBalance,
      difference,
      status: Math.abs(difference) < 1 ? "Reconciled" : "In Progress",
    });
    await refresh();
    setSaved(true);
    setCreating(false);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank Reconciliation"
        action={<ActionButton type="button" onClick={() => setCreating(!creating)}>+ New Reconciliation</ActionButton>}
      />

      {saved && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Reconciliation saved!</div>}

      {creating && (
        <form onSubmit={handleSubmit}>
          <SectionCard title="New Bank Reconciliation">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Period *</label>
                <select required className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}>
                  <option value="">Select period…</option>
                  {(periods ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-1">Statement Date *</label>
                <input required type="date" className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={form.statementDate} onChange={(e) => setForm({ ...form, statementDate: e.target.value })} />
              </div>
              {[
                ["Bank Statement Closing Balance (₹)", "statementClosingBalance"],
                ["Outstanding Deposits (not yet in books)", "outstandingDeposits"],
                ["Outstanding Payments (not yet in bank)", "outstandingPayments"],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-navy/60 mb-1">{label}</label>
                  <input type="number" className="w-full rounded-xl border border-navy/15 px-3 py-2 text-sm" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-[#F8F6F0] p-4 text-sm space-y-1">
              <div className="flex justify-between"><span>Bank Statement Balance</span><strong>{inr(form.statementClosingBalance)}</strong></div>
              <div className="flex justify-between text-navy/60"><span>Less: Outstanding Deposits</span><span>({inr(form.outstandingDeposits)})</span></div>
              <div className="flex justify-between text-navy/60"><span>Add: Outstanding Payments</span><span>{inr(form.outstandingPayments)}</span></div>
              <div className="flex justify-between font-semibold border-t border-navy/10 pt-2 mt-2"><span>Adjusted Book Balance</span><strong>{inr(bookBalance)}</strong></div>
              <div className={`flex justify-between font-bold ${Math.abs(difference) < 1 ? "text-emerald-700" : "text-red-600"}`}>
                <span>Difference</span><span>{difference >= 0 ? "" : "-"}{inr(Math.abs(difference))}{Math.abs(difference) < 1 ? " ✓ Reconciled" : " ⚠ Not Reconciled"}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <ActionButton>Save Reconciliation</ActionButton>
              <ActionButton type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</ActionButton>
            </div>
          </SectionCard>
        </form>
      )}

      {(recons ?? []).length === 0 && !creating ? (
        <EmptyState message="No reconciliations yet. Create one above." />
      ) : (
        <div className="shadow-card overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F6F0]">
              <tr>{["Statement Date", "Bank Balance", "Book Balance", "Difference", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-navy/50">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {(recons ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-[#F8F6F0]/60">
                  <td className="px-4 py-3 text-navy/60">{r.statementDate}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy">{inr(r.statementClosingBalance)}</td>
                  <td className="px-4 py-3 text-right text-navy/70">{inr(r.bookBalance)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Math.abs(r.difference) < 1 ? "text-emerald-700" : "text-red-600"}`}>{inr(Math.abs(r.difference))}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
