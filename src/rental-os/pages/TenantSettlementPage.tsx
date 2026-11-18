/**
 * Rental OS — Tenant Settlement (Lease Termination)
 *
 * Calculates final settlement: outstanding invoices + deposit balance + net payable/receivable.
 * Shows full statement of account. Approval required before refund execution.
 * Deposit refund calls arService.settleDeposit(); receipt calls arService.recordPayment().
 *
 * STATUS: In progress — settlement calculation and deposit refund are live; final invoice
 * clearance via receipt is wired. Full approval workflow (email/document generation) is
 * planned for Phase 6.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { balances, statementOfAccount } from "@/ar/engine/analytics";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";

function money(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const inputClass = "block w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-sm focus:border-[#C79A2B] focus:outline-none focus:ring-1 focus:ring-[#C79A2B]";

export function TenantSettlementPage() {
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [tenantId, setTenantId] = useState("");
  const [approved, setApproved] = useState(false);
  const [refundDate, setRefundDate] = useState(today());

  const settlement = useMemo(() => {
    if (!book || !tenantId) return null;
    const tenant = book.tenants.find((t) => t.id === tenantId);
    if (!tenant) return null;

    const allBalances = balances(book);
    const openInvoices = [...allBalances.values()].filter((b) => b.invoice.tenantId === tenantId && b.outstanding > 0);
    const totalOutstanding = openInvoices.reduce((s, b) => s + b.outstanding, 0);

    const heldDeposits = book.deposits.filter((d) => d.tenantId === tenantId && d.status === "Held");
    const depositTotal = heldDeposits.reduce((s, d) => s + d.amount, 0);

    const netRefund = depositTotal - totalOutstanding;
    const statement = statementOfAccount(book, tenantId);

    return { tenant, openInvoices, totalOutstanding, heldDeposits, depositTotal, netRefund, statement };
  }, [book, tenantId]);

  if (!book || !workspaceId) return null;

  async function handleRefundDeposits() {
    if (!settlement) return;
    for (const dep of settlement.heldDeposits) {
      await action.run(
        () => arService.settleDeposit(dep.id, { kind: "refund", date: refundDate }),
        `Deposit ${dep.id.slice(-6)} refunded.`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Tenant Settlement</h1>
        <p className="mt-1 text-sm text-navy/60">Final settlement at lease termination — outstanding invoices, security deposit balance and net payable.</p>
        <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 inline-block mt-2">
          In progress — settlement calculation and deposit refund are live. Full approval workflow (document generation, final invoice write-offs) planned for Phase 6.
        </p>
      </div>

      {/* Tenant selector */}
      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
        <h2 className="font-serif text-lg text-navy mb-4">Select Tenant</h2>
        <div className="max-w-sm">
          <select className={inputClass} value={tenantId} onChange={(e) => { setTenantId(e.target.value); setApproved(false); }}>
            <option value="">Choose tenant to settle…</option>
            {book.tenants.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
          </select>
        </div>
      </div>

      {settlement && (
        <>
          {action.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{action.error}</div>}
          {action.message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{action.message}</div>}

          {/* Settlement summary */}
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
            <h2 className="font-serif text-xl text-navy mb-1">Settlement Summary</h2>
            <p className="text-sm text-navy/60 mb-5">{settlement.tenant.name} · {settlement.tenant.unit}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-red-50 px-5 py-3">
                <span className="text-sm font-semibold text-red-700">Outstanding Invoices ({settlement.openInvoices.length})</span>
                <span className="font-serif text-lg font-semibold text-red-700">{money(settlement.totalOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-5 py-3">
                <span className="text-sm font-semibold text-emerald-700">Security Deposit Held ({settlement.heldDeposits.length})</span>
                <span className="font-serif text-lg font-semibold text-emerald-700">{money(settlement.depositTotal)}</span>
              </div>
              <div className={`flex items-center justify-between rounded-xl px-5 py-4 ${settlement.netRefund >= 0 ? "bg-[#C79A2B]/10" : "bg-red-100"}`}>
                <span className="text-sm font-bold text-navy">{settlement.netRefund >= 0 ? "Net Refund to Tenant" : "Net Amount Owed by Tenant"}</span>
                <span className={`font-serif text-2xl font-bold ${settlement.netRefund >= 0 ? "text-[#C79A2B]" : "text-red-700"}`}>
                  {money(Math.abs(settlement.netRefund))}
                </span>
              </div>
            </div>

            {/* Open invoices detail */}
            {settlement.openInvoices.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-navy/55 mb-2">Open Invoices</h3>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Invoice</th><th>Period</th><th>Due Date</th><th className="text-right">Outstanding</th><th></th></tr></thead>
                    <tbody>
                      {settlement.openInvoices.map((b) => (
                        <tr key={b.invoice.id}>
                          <td className="font-semibold text-navy">{b.invoice.number}</td>
                          <td className="text-xs">{b.invoice.billingPeriod}</td>
                          <td className="text-xs">{b.invoice.dueDate}</td>
                          <td className="text-right tabular-nums text-red-600 font-medium">{money(b.outstanding)}</td>
                          <td>
                            <Link to={`/rental-os/payments/create?tenant=${tenantId}`} className="text-xs text-[#C79A2B] hover:underline">Record payment →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Approval and refund */}
          {settlement.heldDeposits.length > 0 && (
            <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
              <h2 className="font-serif text-lg text-navy mb-1">Process Deposit Refund</h2>
              <p className="text-xs text-navy/55 mb-4">Requires approval before execution. Dr Security Deposit Liability / Cr Bank.</p>

              <div className="max-w-xs mb-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Refund Date</label>
                <input type="date" className={inputClass} value={refundDate} onChange={(e) => setRefundDate(e.target.value)} />
              </div>

              {!approved ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Approval Required</p>
                  <p className="text-xs text-amber-700 mb-3">
                    Confirm you have reviewed the settlement calculation and authorise refunding {money(settlement.depositTotal)} to {settlement.tenant.name}.
                  </p>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                    <span className="font-medium text-amber-800">I confirm this settlement is correct and approve the refund</span>
                  </label>
                </div>
              ) : (
                <button
                  onClick={handleRefundDeposits}
                  disabled={action.busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50"
                >
                  {action.busy ? "Processing…" : `Refund ${money(settlement.depositTotal)} to Tenant`}
                </button>
              )}
            </div>
          )}

          {/* Statement of account */}
          <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
              <h2 className="font-serif text-xl text-navy">Statement of Account</h2>
              <Link to={`/estate/ar/tenants/${tenantId}`} className="inline-flex items-center gap-1 text-xs font-medium text-[#C79A2B] hover:underline">
                Full tenant record <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {settlement.statement.map((line, i) => (
                    <tr key={i}>
                      <td>{line.date}</td>
                      <td><span className="inline-flex rounded-full border border-navy/15 px-2 py-0.5 text-[10px] font-medium text-navy/70">{line.type}</span></td>
                      <td className="font-semibold text-navy text-xs">{line.reference}</td>
                      <td className="text-xs text-navy/70 max-w-xs truncate">{line.description}</td>
                      <td className="text-right tabular-nums text-xs">{line.debit ? money(line.debit) : "—"}</td>
                      <td className="text-right tabular-nums text-xs">{line.credit ? money(line.credit) : "—"}</td>
                      <td className={`text-right tabular-nums text-xs font-medium ${line.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>{money(Math.abs(line.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {settlement.statement.length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-navy/50">No transactions for this tenant yet.</p>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            <Link to="/rental-os/payments/create" className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/70 hover:bg-ivory">
              <FileText className="h-4 w-4" /> Record final payment
            </Link>
            <Link to="/estate/ar/payments" className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/70 hover:bg-ivory">
              Payment register <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
