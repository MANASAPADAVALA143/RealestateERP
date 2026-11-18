/**
 * Rental OS — Security Deposit Register
 *
 * Complete deposit lifecycle: collection, register, refunds, settlement.
 * Accounting: Dr Bank / Cr Security Deposit Liability on receipt.
 *             Dr Liability / Cr Bank on refund.
 * Security deposits are NEVER recognised as rental income.
 *
 * STATUS: Production — calls arService.recordDeposit() and arService.settleDeposit().
 */

import { useState } from "react";
import { PlusCircle, PiggyBank } from "lucide-react";
import { balances } from "@/ar/engine/analytics";
import { arService, today, useAction, useArBook } from "@/ar/ui/hooks";

function money(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const inputClass = "block w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-sm focus:border-[#C79A2B] focus:outline-none focus:ring-1 focus:ring-[#C79A2B]";

type Tab = "register" | "collect";

export function DepositRegisterPage() {
  const { book, workspaceId } = useArBook();
  const action = useAction();
  const [tab, setTab] = useState<Tab>("register");
  const [form, setForm] = useState({ tenantId: "", leaseId: "", amount: "", currency: "INR", receivedDate: today(), bankAccount: "" });
  const [settleId, setSettleId] = useState<string | null>(null);
  const [settleAction, setSettleAction] = useState<"refund" | "apply">("refund");
  const [settleDate, setSettleDate] = useState(today());
  const [settleInvoice, setSettleInvoice] = useState("");

  if (!book || !workspaceId) return null;

  const tenantMap = new Map(book.tenants.map((t) => [t.id, t.name]));
  const leaseMap = new Map(book.leases.map((l) => [l.id, l]));
  const openBalances = balances(book);

  const heldTotal = book.deposits.filter((d) => d.status === "Held").reduce((s, d) => s + d.amount, 0);
  const tenantLeases = book.leases.filter((l) => l.tenantId === form.tenantId);

  const settlingDeposit = book.deposits.find((d) => d.id === settleId);
  const settlingTenantInvoices = settlingDeposit
    ? [...openBalances.values()].filter((b) => b.invoice.tenantId === settlingDeposit.tenantId && b.outstanding > 0 && b.invoice.currency === settlingDeposit.currency)
    : [];

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    const ok = await action.run(
      () => arService.recordDeposit(workspaceId!, {
        tenantId: form.tenantId,
        leaseId: form.leaseId || undefined,
        amount: Number(form.amount),
        currency: form.currency,
        receivedDate: form.receivedDate,
        bankAccount: form.bankAccount || book!.settings.bankAccounts[0]?.name,
      }),
      "Security deposit recorded. Dr Bank / Cr Deposit Liability journal posted.",
    );
    if (ok) { setForm({ tenantId: "", leaseId: "", amount: "", currency: "INR", receivedDate: today(), bankAccount: "" }); setTab("register"); }
  }

  async function handleSettle() {
    if (!settleId) return;
    const ok = await action.run(
      () => arService.settleDeposit(settleId, settleAction === "refund" ? { kind: "refund", date: settleDate } : { kind: "apply", date: settleDate, invoiceId: settleInvoice }),
      settleAction === "refund" ? "Deposit refunded. Dr Liability / Cr Bank journal posted." : "Deposit applied to invoice.",
    );
    if (ok) { setSettleId(null); setSettleInvoice(""); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Security Deposits</h1>
          <p className="mt-1 text-sm text-navy/60">Collect, track and refund tenant security deposits · liability account only</p>
        </div>
        <button
          onClick={() => setTab("collect")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]"
        >
          <PlusCircle className="h-4 w-4" /> Record Deposit
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-widest text-navy/50">Deposits Held</p>
          <p className="mt-2 font-serif text-2xl text-[#C79A2B]">{money(heldTotal)}</p>
          <p className="mt-1 text-xs text-navy/50">{book.deposits.filter((d) => d.status === "Held").length} active deposits</p>
        </div>
        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-widest text-navy/50">Refunded</p>
          <p className="mt-2 font-serif text-2xl text-navy">{money(book.deposits.filter((d) => d.status === "Refunded").reduce((s, d) => s + d.amount, 0))}</p>
          <p className="mt-1 text-xs text-navy/50">{book.deposits.filter((d) => d.status === "Refunded").length} deposits</p>
        </div>
        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-widest text-navy/50">Applied to Invoices</p>
          <p className="mt-2 font-serif text-2xl text-navy">{money(book.deposits.filter((d) => d.status === "Applied").reduce((s, d) => s + d.amount, 0))}</p>
          <p className="mt-1 text-xs text-navy/50">{book.deposits.filter((d) => d.status === "Applied").length} deposits</p>
        </div>
      </div>

      {action.error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{action.error}</div>}
      {action.message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{action.message}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-navy/10 pb-0">
        {(["register", "collect"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${tab === t ? "border-[#C79A2B] text-navy" : "border-transparent text-navy/50 hover:text-navy"}`}
          >
            {t === "register" ? "Deposit Register" : "Record New Deposit"}
          </button>
        ))}
      </div>

      {/* Collect form */}
      {tab === "collect" && (
        <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-navy mb-1">Collect Security Deposit</h2>
          <p className="text-xs text-navy/55 mb-5">Records as a liability (account 2200). Never treated as income.</p>
          <form onSubmit={handleCollect} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Tenant *</label>
                <select className={inputClass} value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value, leaseId: "" })} required>
                  <option value="">Choose tenant…</option>
                  {book.tenants.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Lease (optional)</label>
                <select className={inputClass} value={form.leaseId} onChange={(e) => setForm({ ...form, leaseId: e.target.value })}>
                  <option value="">— not linked —</option>
                  {tenantLeases.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.start} to {l.end}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Required Deposit</label>
                <p className="mt-2 text-sm text-navy/60">
                  {form.leaseId && leaseMap.get(form.leaseId)?.depositRequired
                    ? <span className="font-semibold text-[#C79A2B]">{money(leaseMap.get(form.leaseId)!.depositRequired)} (from lease)</span>
                    : "—"}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Amount *</label>
                <input type="number" step="0.01" min="0.01" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Currency</label>
                <input className={inputClass} value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Received Date *</label>
                <input type="date" className={inputClass} value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Bank Account</label>
                <select className={inputClass} value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}>
                  {book.settings.bankAccounts.map((b) => <option key={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={action.busy} className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50">
                {action.busy ? "Recording…" : "Record Deposit"}
              </button>
              <button type="button" onClick={() => setTab("register")} className="rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy/70 hover:bg-ivory">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Register */}
      {tab === "register" && (
        <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
          <div className="border-b border-navy/5 px-5 py-4">
            <h2 className="font-serif text-xl text-navy">Deposit Register</h2>
            <p className="text-xs text-navy/55 mt-0.5">{book.deposits.length} deposits · all as liability (never income)</p>
          </div>
          {book.deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PiggyBank className="h-10 w-10 text-navy/15 mb-3" />
              <p className="text-sm text-navy/50">No deposits recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Tenant</th><th>Lease</th><th>Received</th><th className="text-right">Amount</th><th>Bank</th><th>Status</th><th>Settled</th><th></th></tr>
                </thead>
                <tbody>
                  {book.deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold text-navy">{tenantMap.get(d.tenantId) ?? d.tenantId}</td>
                      <td className="text-xs">{d.leaseId ? leaseMap.get(d.leaseId)?.code ?? "—" : "—"}</td>
                      <td>{d.receivedDate}</td>
                      <td className="text-right tabular-nums font-medium">{money(d.amount)}</td>
                      <td className="text-xs">{d.bankAccount}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.status === "Held" ? "bg-amber-100 text-amber-700" : d.status === "Refunded" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{d.status}</span>
                      </td>
                      <td className="text-xs text-navy/55">{d.settledDate ?? "—"}</td>
                      <td>
                        {d.status === "Held" && settleId !== d.id && (
                          <button onClick={() => { setSettleId(d.id); setSettleDate(today()); setSettleInvoice(""); }} className="text-xs font-medium text-[#C79A2B] hover:underline">Settle…</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settlement modal */}
      {settleId && settlingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-serif text-xl text-navy mb-1">Settle Deposit</h2>
            <p className="text-xs text-navy/55 mb-4">{tenantMap.get(settlingDeposit.tenantId)} · {money(settlingDeposit.amount)} {settlingDeposit.currency}</p>

            {action.error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{action.error}</div>}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Action</label>
                <div className="flex gap-3">
                  {(["refund", "apply"] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setSettleAction(a)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${settleAction === a ? "border-[#C79A2B] bg-[#C79A2B]/10 text-[#C79A2B]" : "border-navy/15 text-navy/60 hover:bg-ivory"}`}>
                      {a === "refund" ? "Refund to tenant" : "Apply to invoice"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Settlement Date</label>
                <input type="date" className={inputClass} value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
              </div>
              {settleAction === "apply" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/60">Apply to Invoice</label>
                  <select className={inputClass} value={settleInvoice} onChange={(e) => setSettleInvoice(e.target.value)} required>
                    <option value="">Choose invoice…</option>
                    {settlingTenantInvoices.map((b) => (
                      <option key={b.invoice.id} value={b.invoice.id}>{b.invoice.number} · {money(b.outstanding)} outstanding</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="rounded-xl bg-navy/5 px-4 py-3 text-xs text-navy/60">
                <p className="font-semibold text-navy mb-1">Accounting</p>
                {settleAction === "refund"
                  ? <p>Dr Security Deposit Liability 2200 / Cr Bank — liability extinguished, never income</p>
                  : <p>Dr Security Deposit Liability 2200 / Cr Tenant Receivables 1200 — applied against outstanding invoice</p>}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={handleSettle} disabled={action.busy || (settleAction === "apply" && !settleInvoice)}
                className="flex-1 rounded-xl bg-[#C79A2B] py-2.5 text-sm font-semibold text-white hover:bg-[#b8891e] disabled:opacity-50">
                {action.busy ? "Processing…" : settleAction === "refund" ? "Refund Deposit" : "Apply to Invoice"}
              </button>
              <button onClick={() => setSettleId(null)} className="rounded-xl border border-navy/15 px-4 py-2.5 text-sm font-semibold text-navy/60 hover:bg-ivory">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
