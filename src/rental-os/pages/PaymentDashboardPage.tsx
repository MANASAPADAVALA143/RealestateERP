/**
 * Rental OS — Payment Dashboard
 *
 * Live KPIs from the AR engine: receipts, unallocated cash, deposits held,
 * collection rate. Links to Create Receipt, Bank Import, Reconciliation.
 *
 * STATUS: Production — reads live AR data via useArBook().
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlusCircle, Upload, Scale, PiggyBank } from "lucide-react";
import { balances, unallocated, kpis } from "@/ar/engine/analytics";
import { today, useArBook } from "@/ar/ui/hooks";

function money(val: number) {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function KpiTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "gold" | "red" | "green" }) {
  const color = tone === "gold" ? "text-[#C79A2B]" : tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-navy";
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
      <p className="text-[11px] uppercase tracking-widest text-navy/50">{label}</p>
      <p className={`mt-2 font-serif text-2xl ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-navy/50">{sub}</p>}
    </div>
  );
}

export function PaymentDashboardPage() {
  const { book, workspaceId } = useArBook();
  const asOf = today();

  const stats = useMemo(() => {
    if (!book) return null;
    const k = kpis(book, asOf);
    const allBalances = balances(book);
    const totalReceipts = book.payments.filter((p) => p.status === "Posted").reduce((s, p) => s + p.amount, 0);
    const unallocatedTotal = book.payments.filter((p) => p.status === "Posted").reduce((s, p) => s + unallocated(p), 0);
    const depositsHeld = book.deposits.filter((d) => d.status === "Held").reduce((s, d) => s + d.amount, 0);
    const openInvoices = [...allBalances.values()].filter((b) => b.outstanding > 0).length;
    return { k, totalReceipts, unallocatedTotal, depositsHeld, openInvoices };
  }, [book, asOf]);

  if (!book || !workspaceId) {
    return <div className="flex h-64 items-center justify-center rounded-2xl border border-navy/10 bg-white"><p className="text-sm text-navy/50">Loading…</p></div>;
  }

  if (book.tenants.length === 0) {
    return (
      <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center shadow-card">
        <p className="text-sm text-navy/60">No AR data yet. Use <Link to="/rental-os/billing" className="text-[#C79A2B] underline">Rental Billing</Link> to sync leases and post invoices first.</p>
      </div>
    );
  }

  const { k, totalReceipts, unallocatedTotal, depositsHeld, openInvoices } = stats!;

  const recentPayments = book.payments.filter((p) => p.status !== "Reversed").slice(0, 8);
  const tenantMap = new Map(book.tenants.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Payment Operations</h1>
          <p className="mt-1 text-sm text-navy/60">Live cash receipts, bank reconciliation and security deposits</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/rental-os/payments/create" className="inline-flex items-center gap-2 rounded-xl bg-[#C79A2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8891e]">
            <PlusCircle className="h-4 w-4" /> Record Receipt
          </Link>
          <Link to="/rental-os/bank" className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            <Upload className="h-3.5 w-3.5" /> Import Bank Statement
          </Link>
          <Link to="/rental-os/reconciliation" className="inline-flex items-center gap-2 rounded-xl border border-navy/15 px-3 py-2 text-xs font-semibold text-navy/70 hover:bg-ivory">
            <Scale className="h-3.5 w-3.5" /> Reconcile
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total Receipts" value={money(totalReceipts)} sub={`${book.payments.filter((p) => p.status === "Posted").length} posted`} tone="gold" />
        <KpiTile label="Unallocated Cash" value={money(unallocatedTotal)} sub="Held in unapplied account" tone={unallocatedTotal > 0 ? "gold" : "green"} />
        <KpiTile label="Deposits Held" value={money(depositsHeld)} sub={`${book.deposits.filter((d) => d.status === "Held").length} deposits`} />
        <KpiTile label="Open Invoices" value={String(openInvoices)} sub={k.collectionRate !== null ? `${k.collectionRate}% collection rate` : "No collection rate"} tone={k.overdue > 0 ? "red" : "green"} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: "/rental-os/payments/create", icon: PlusCircle, title: "Create Receipt", desc: "Record a tenant payment against one or more invoices, or as advance cash." },
          { to: "/rental-os/bank", icon: Upload, title: "Import Bank Statement", desc: "Upload CSV or Excel bank statement. Auto-detect columns and stage transactions." },
          { to: "/rental-os/reconciliation", icon: Scale, title: "Bank Reconciliation", desc: "Match staged bank lines to tenant receipts. Approve or reject suggestions." },
          { to: "/rental-os/deposits", icon: PiggyBank, title: "Security Deposits", desc: "Register deposits, track balances, process refunds on lease end." },
          { to: "/estate/ar/payments", icon: ArrowRight, title: "Full Payment Register", desc: "Complete receipt register, unallocated cash and reversal workflow." },
          { to: "/estate/ar/ageing", icon: ArrowRight, title: "AR Ageing", desc: "Invoice ageing buckets with property and tenant drill-down." },
        ].map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="group flex items-start gap-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-card hover:border-[#C79A2B]/40 hover:shadow-md transition">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C79A2B]/10 text-[#C79A2B] group-hover:bg-[#C79A2B] group-hover:text-white transition">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="font-semibold text-navy text-sm">{title}</p>
              <p className="mt-0.5 text-xs text-navy/55">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent receipts */}
      <div className="rounded-2xl border border-navy/10 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-navy/5 px-5 py-4">
          <h2 className="font-serif text-xl text-navy">Recent Receipts</h2>
          <Link to="/estate/ar/payments" className="inline-flex items-center gap-1 text-xs font-medium text-[#C79A2B] hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-navy/50">No receipts recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Receipt</th><th>Tenant</th><th>Date</th><th>Bank / Method</th><th className="text-right">Amount</th><th className="text-right">Unallocated</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => {
                  const left = unallocated(p);
                  return (
                    <tr key={p.id}>
                      <td className="font-semibold text-navy">{p.number}</td>
                      <td>{tenantMap.get(p.tenantId) ?? p.tenantId}</td>
                      <td>{p.receivedDate}</td>
                      <td className="text-xs">{p.bankAccount} · {p.method}</td>
                      <td className="text-right tabular-nums font-medium">{money(p.amount)}</td>
                      <td className={`text-right tabular-nums text-xs ${left > 0 ? "text-amber-600 font-medium" : "text-navy/40"}`}>{left > 0 ? money(left) : "—"}</td>
                      <td><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === "Posted" ? "bg-emerald-100 text-emerald-700" : p.status === "Reversed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
